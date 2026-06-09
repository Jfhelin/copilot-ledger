#!/usr/bin/env node
// Run GitHub Copilot CLI headlessly, capture its debug log, and digest it —
// the "good way of working" for gathering comparable Copilot CLI data.
//
// For each repetition it runs:
//   copilot -p "<prompt>" --allow-all-tools --model <model> \
//           --log-dir <repdir> --log-level all
// then digests the produced log with copilot-cli-digest.mjs and prints a table.
//
// Usage:
//   node copilot-run.mjs --prompt "explain this repo" [options]
//   node copilot-run.mjs --prompt-file ./prompt.txt --model claude-sonnet-4.5 --reps 3
//
// Options:
//   --prompt <text>        the prompt (or use --prompt-file)
//   --prompt-file <path>   read the prompt from a file
//   --model <name>         model to pin (default: leave Copilot's default)
//   --cwd <dir>            working directory for the run (default: process.cwd())
//   --reps <n>             repetitions (default: 1)
//   --out <dir>            where to store rep dirs (default: ./copilot-runs/<label>)
//   --label <name>         label for this batch (default: derived from model)
//   --timeout <seconds>    per-rep timeout (default: 600)
//   --json                 print the per-rep summary as JSON
//   --keep-going           continue remaining reps if one fails
//
// Requires the `copilot` CLI on PATH.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DIGEST = path.join(here, "copilot-cli-digest.mjs");

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}

let prompt = arg("prompt");
const promptFile = arg("prompt-file");
if (!prompt && promptFile) prompt = fs.readFileSync(path.resolve(promptFile), "utf8").trim();
if (!prompt) {
  console.error("error: provide --prompt \"...\" or --prompt-file <path>");
  process.exit(2);
}

const model = arg("model");
const cwd = path.resolve(arg("cwd", process.cwd()));
const reps = Math.max(1, parseInt(arg("reps", "1"), 10) || 1);
const timeoutSec = parseInt(arg("timeout", "600"), 10) || 600;
const asJson = flag("json");
const keepGoing = flag("keep-going");
const label = arg("label", model ? `run-${model}` : "run").replace(/[^\w.-]+/g, "-");
const outBase = path.resolve(arg("out", path.join(process.cwd(), "copilot-runs", label)));

if (!fs.existsSync(cwd)) {
  console.error(`error: cwd does not exist: ${cwd}`);
  process.exit(2);
}
fs.mkdirSync(outBase, { recursive: true });

function findLog(dir) {
  if (!fs.existsSync(dir)) return null;
  const hits = fs
    .readdirSync(dir)
    .filter((f) => /^process-.*\.log$/.test(f))
    .map((f) => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return hits[0] ?? null;
}

const results = [];
for (let rep = 1; rep <= reps; rep++) {
  const repDir = path.join(outBase, `rep-${rep}`);
  fs.mkdirSync(repDir, { recursive: true });
  const logDir = path.join(repDir, "logs");
  fs.mkdirSync(logDir, { recursive: true });

  const cliArgs = ["-p", prompt, "--allow-all-tools", "--log-dir", logDir, "--log-level", "all"];
  if (model) cliArgs.push("--model", model);

  process.stderr.write(`[rep ${rep}/${reps}] running copilot in ${cwd} …\n`);
  const started = Date.now();
  const run = spawnSync("copilot", cliArgs, {
    cwd,
    encoding: "utf8",
    timeout: timeoutSec * 1000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const wallMs = Date.now() - started;

  fs.writeFileSync(path.join(repDir, "stdout.txt"), run.stdout || "");
  if (run.stderr) fs.writeFileSync(path.join(repDir, "stderr.txt"), run.stderr);
  fs.writeFileSync(
    path.join(repDir, "meta.json"),
    JSON.stringify(
      { rep, model: model ?? "(default)", cwd, prompt, wallMs, exitCode: run.status, ranAt: new Date(started).toISOString() },
      null,
      2,
    ),
  );

  if (run.error) {
    process.stderr.write(`[rep ${rep}] spawn error: ${run.error.message}\n`);
    if (!keepGoing) process.exit(1);
    results.push({ rep, ok: false, error: String(run.error.message) });
    continue;
  }

  const logPath = findLog(logDir);
  if (!logPath) {
    process.stderr.write(`[rep ${rep}] no log produced (exit ${run.status}). See stdout/stderr.\n`);
    if (!keepGoing) process.exit(1);
    results.push({ rep, ok: false, error: "no-log" });
    continue;
  }

  const dig = spawnSync("node", [DIGEST, logPath, "--stdout", "--force"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (dig.status !== 0) {
    process.stderr.write(`[rep ${rep}] digest failed: ${dig.stderr}\n`);
    if (!keepGoing) process.exit(1);
    results.push({ rep, ok: false, error: "digest-failed" });
    continue;
  }
  let digest;
  try {
    digest = JSON.parse(dig.stdout);
  } catch {
    results.push({ rep, ok: false, error: "digest-parse" });
    continue;
  }
  fs.writeFileSync(path.join(repDir, "digest.json"), JSON.stringify(digest, null, 2));

  const r = digest.rollups;
  results.push({
    rep,
    ok: true,
    model: r.primaryModel,
    requests: r.requests,
    toolCalls: r.toolCalls,
    promptTokens: r.promptTokens,
    cachedTokens: r.cachedTokens,
    completionTokens: r.completionTokens,
    nativeCredits: r.cost.native.credits,
    nativeComplete: r.cost.native.complete,
    cacheHitRate: r.cacheHitRate,
    wallMs,
    logPath,
    repDir,
  });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
if (asJson) {
  process.stdout.write(JSON.stringify({ label, model: model ?? "(default)", cwd, prompt, reps, results }, null, 2));
  process.stdout.write("\n");
} else {
  const ok = results.filter((r) => r.ok);
  console.log(`\nCopilot CLI batch "${label}"  (${ok.length}/${reps} ok)`);
  console.log(`model=${model ?? "(default)"}  cwd=${cwd}`);
  console.log(`prompt: ${prompt.slice(0, 100)}${prompt.length > 100 ? "…" : ""}\n`);
  const header = ["rep", "credits", "reqs", "tools", "prompt_tok", "cached", "out_tok", "cacheHit", "wall_s"];
  console.log(header.join("\t"));
  for (const r of results) {
    if (!r.ok) {
      console.log(`${r.rep}\tFAILED (${r.error})`);
      continue;
    }
    console.log(
      [
        r.rep,
        r.nativeCredits,
        r.requests,
        r.toolCalls,
        r.promptTokens,
        r.cachedTokens,
        r.completionTokens,
        r.cacheHitRate,
        (r.wallMs / 1000).toFixed(1),
      ].join("\t"),
    );
  }
  if (ok.length > 1) {
    const cr = ok.map((r) => r.nativeCredits);
    const min = Math.min(...cr);
    const max = Math.max(...cr);
    const mean = cr.reduce((a, b) => a + b, 0) / cr.length;
    console.log(
      `\ncredits: min ${round(min)}  mean ${round(mean)}  max ${round(max)}  spread ${
        min > 0 ? round(max / min) : "n/a"
      }×`,
    );
  }
  console.log(`\nartifacts: ${outBase}`);
}

function round(n) {
  return Math.round(n * 100) / 100;
}
