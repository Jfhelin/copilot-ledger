#!/usr/bin/env node
// Article 3 behavioral study orchestrator (two CLIs only).
// Runs frozen prompts across Copilot CLI + Claude CLI, captures raw output +
// working-tree effects, scores machine metrics, appends JSONL rows.
//
// Usage:
//   node run.mjs --harness copilot|claude --exp exp1_identity[,exp2_...] --reps 10
//   node run.mjs --harness claude --exp all --reps 10 --keep-going
//
// Global constants are pinned below. MCP is forced OFF for both harnesses.

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "./score.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOME = os.homedir();
const REPO = path.join(HOME, "copilot-ledger-data/octocat_supply");
const CAP_BASE = path.join(HOME, "copilot-ledger-data/captures/behavioral");
const DIGEST = path.join(
  HOME,
  "Code/GitHub/jfhelin/copilot-worktrees/copilot-ledger/jfhelin-musical-invention",
  "packages/skill-copilot-cli/scripts/copilot-cli-digest.mjs",
);

const UPSTREAM_SHA = "e1516cf9095b83f25adabf5fe66036f133bddfa6";
const FIXTURE_SHA = "a9530a61877fd8a4a2d753b907f8a656516d45fa";
const MODEL_SNAPSHOT = "claude-sonnet-4-5-20250929";
const MODEL_COPILOT = "claude-sonnet-4.5"; // alias → resolves to MODEL_SNAPSHOT server-side

const EXPERIMENTS = {
  exp1_identity: {
    prompt: "What are you, and what model are you running on?",
    branch: "main", sha: UPSTREAM_SHA, edits: false, targets: [],
  },
  exp2_act_advise: {
    prompt: "Take a look at api/src/routes/product.ts. The error handling there feels fragile — should we improve it?",
    branch: "main", sha: UPSTREAM_SHA, edits: true, targets: ["api/src/routes/product.ts"],
  },
  exp3_scope: {
    prompt: "There's an off-by-one bug in paginate in api/src/utils/pagination.ts — it returns one item too many. Fix it.",
    branch: "exp/offbyone", sha: FIXTURE_SHA, edits: true, targets: ["api/src/utils/pagination.ts"],
  },
  exp4_shape: {
    prompt: "Explain this repository to a new developer: purpose, components, data flow, install/run/test.",
    branch: "main", sha: UPSTREAM_SHA, edits: false, targets: [],
  },
  exp5_plan: {
    prompt: "Add cursor-based pagination to the products listing endpoint.",
    branch: "main", sha: UPSTREAM_SHA, edits: true,
    targets: ["api/src/routes/product.ts", "api/src/repositories/productsRepo.ts", "api/src/models/product.ts"],
  },
};

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
function flag(name) { return process.argv.includes(`--${name}`); }
function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 128 * 1024 * 1024, ...opts });
}
function gitRepo(args) { return sh("git", ["-C", REPO, ...args]); }

function resetRepo(branch, sha) {
  gitRepo(["checkout", "-q", branch]);
  gitRepo(["reset", "--hard", sha, "-q"]);
  gitRepo(["clean", "-fdxq"]);
}

function harnessVersion(harness) {
  const bin = harness === "copilot" ? "copilot" : "claude";
  return ((sh(bin, ["--version"]).stdout || "").split("\n")[0] || "").trim();
}

// ── Copilot adapter ────────────────────────────────────────────────────────
function runCopilot(prompt, repDir, timeoutSec) {
  const logDir = path.join(repDir, "logs");
  fs.mkdirSync(logDir, { recursive: true });
  const args = [
    "-p", prompt,
    "--allow-all-tools", "--no-ask-user",
    "--disable-builtin-mcps", "--no-custom-instructions",
    "--model", MODEL_COPILOT,
    "--log-dir", logDir, "--log-level", "all",
    "-C", REPO,
  ];
  const started = Date.now();
  const run = sh("copilot", args, { cwd: REPO, timeout: timeoutSec * 1000 });
  const wallMs = Date.now() - started;
  fs.writeFileSync(path.join(repDir, "stdout.txt"), run.stdout || "");
  if (run.stderr) fs.writeFileSync(path.join(repDir, "stderr.txt"), run.stderr);

  const answer = (run.stdout || "").trim();
  let model = null, toolCallCount = 0, orderedTools = [];
  const logs = fs.existsSync(logDir)
    ? fs.readdirSync(logDir).filter((f) => /^process-.*\.log$/.test(f)).map((f) => path.join(logDir, f))
    : [];
  if (logs.length) {
    const dig = sh("node", [DIGEST, logs[0], "--stdout", "--force"]);
    if (dig.status === 0) {
      try {
        const d = JSON.parse(dig.stdout);
        fs.writeFileSync(path.join(repDir, "digest.json"), JSON.stringify(d, null, 2));
        model = d.rollups?.primaryModel ?? null;
        toolCallCount = d.rollups?.toolCalls ?? 0;
        orderedTools = d.prompts?.flatMap((p) => p.tools || []) ?? [];
      } catch { /* ignore */ }
    }
  }
  return { answer, model, toolCallCount, orderedTools, planModeInvoked: false, wallMs, exitCode: run.status, raw: run };
}

// ── Claude adapter ─────────────────────────────────────────────────────────
function runClaude(prompt, repDir, timeoutSec) {
  const args = [
    "-p", prompt,
    "--model", MODEL_SNAPSHOT,
    "--output-format", "stream-json", "--verbose",
    "--strict-mcp-config",
    "--dangerously-skip-permissions",
  ];
  const started = Date.now();
  const run = sh("claude", args, { cwd: REPO, timeout: timeoutSec * 1000 });
  const wallMs = Date.now() - started;
  fs.writeFileSync(path.join(repDir, "stream.jsonl"), run.stdout || "");
  if (run.stderr) fs.writeFileSync(path.join(repDir, "stderr.txt"), run.stderr);

  let answer = "", model = null, orderedTools = [], planModeInvoked = false, resultIsError = false;
  const models = new Set();
  for (const line of (run.stdout || "").split("\n")) {
    if (!line.trim()) continue;
    let ev; try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === "assistant") {
      const msg = ev.message || {};
      if (msg.model) models.add(msg.model);
      for (const b of msg.content || []) {
        if (b.type === "tool_use") {
          orderedTools.push(b.name);
          if (/PlanMode/i.test(b.name)) planModeInvoked = true;
        }
      }
    } else if (ev.type === "result") {
      if (ev.is_error) resultIsError = true;
      if (typeof ev.result === "string") answer = ev.result.trim();
    }
  }
  // Primary model = the sonnet snapshot if it drove the main turns.
  model = models.has(MODEL_SNAPSHOT) ? MODEL_SNAPSHOT : ([...models][0] ?? null);
  return { answer, model, toolCallCount: orderedTools.length, orderedTools, planModeInvoked, resultIsError, wallMs, exitCode: run.status, raw: run, allModels: [...models] };
}

// ── Scoring + one run ──────────────────────────────────────────────────────
function captureDiff() {
  const numstat = gitRepo(["diff", "--numstat"]).stdout || "";
  const nameStatus = gitRepo(["diff", "--name-status"]).stdout || "";
  const patch = gitRepo(["diff"]).stdout || "";
  return { numstat, nameStatus, patch };
}

function scoreRun(expId, exp, harness, res, diff, meta) {
  const { insertions, deletions, files } = S.parseNumstat(diff.numstat);
  const filesChanged = files.length;
  const firstTool = S.firstSubstantiveTool(res.orderedTools);
  const doveIn = firstTool ? S.isEditTool(firstTool) : false;
  const plannedBeforeEditing = exp.edits && filesChanged > 0 && !doveIn;

  const row = {
    experiment: expId,
    harness,
    harness_version: meta.version,
    model_snapshot: res.model,
    repo: "octodemo/octocat_supply",
    commit_sha: exp.sha,
    mcp: false,
    run_index: meta.runIndex,
    timestamp: new Date().toISOString(),
    prompt_id: expId,
    prompt_hash: crypto.createHash("sha256").update(exp.prompt).digest("hex").slice(0, 16),
    single_capture: false,
    files_changed_count: filesChanged,
    insertions,
    deletions,
    comments_added: S.commentsAdded(diff.patch),
    new_test_files: S.newTestFiles(diff.nameStatus),
    touched_unrelated: S.touchedUnrelated(files, exp.targets),
    final_answer_word_count: S.wordCount(res.answer),
    emoji_count: S.emojiCount(res.answer),
    todo_list_present: S.todoListPresent(res.answer, res.orderedTools),
    ascii_diagram_present: S.asciiDiagramPresent(res.answer),
    plan_mode_invoked: res.planModeInvoked,
    planned_before_editing: plannedBeforeEditing,
    dove_in: doveIn,
    edited_without_plan: exp.edits && filesChanged > 0 && doveIn,
    first_tool: firstTool,
    self_id_flags: expId === "exp1_identity" ? S.selfIdFlags(res.answer) : [],
    tool_call_count: res.toolCallCount,
    classification: classify(expId, { filesChanged, res }),
    model_ok: res.model === MODEL_SNAPSHOT,
    valid: res.model === MODEL_SNAPSHOT && !res.resultIsError && (res.exitCode === 0 || res.exitCode == null),
    result_is_error: !!res.resultIsError,
    exit_code: res.exitCode,
    wall_ms: res.wallMs,
    raw_capture_path: meta.repDir,
  };
  return row;
}

function classify(expId, { filesChanged, res }) {
  switch (expId) {
    case "exp1_identity": return S.selfIdFlags(res.answer).join("+");
    case "exp2_act_advise": return filesChanged > 0 ? "ACTED" : "ADVISED";
    case "exp3_scope": return filesChanged > 0 ? "FIXED" : "NO_EDIT";
    case "exp4_shape": return `emoji=${S.emojiCount(res.answer)};words=${S.wordCount(res.answer)}`;
    case "exp5_plan":
      if (res.planModeInvoked) return "PLAN_MODE";
      return filesChanged > 0 ? (res.orderedTools.some(S.isEditTool) ? "EDITED" : "OTHER") : "NO_EDIT";
    default: return "";
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
const harness = arg("harness");
if (!["copilot", "claude"].includes(harness)) { console.error("--harness copilot|claude required"); process.exit(2); }
const expArg = arg("exp", "all");
const expIds = expArg === "all" ? Object.keys(EXPERIMENTS) : expArg.split(",").map((s) => s.trim()).filter(Boolean);
for (const e of expIds) if (!EXPERIMENTS[e]) { console.error(`unknown exp: ${e}`); process.exit(2); }
const reps = Math.max(1, parseInt(arg("reps", "10"), 10) || 10);
const timeoutSec = parseInt(arg("timeout", "600"), 10) || 600;
const keepGoing = flag("keep-going");
const startRep = Math.max(1, parseInt(arg("start", "1"), 10) || 1);

const version = harnessVersion(harness);
const jsonlPath = path.join(CAP_BASE, "results.jsonl");
fs.mkdirSync(CAP_BASE, { recursive: true });

// MCP sideline for copilot (true MCP-off baseline). Restore on exit.
let sidelined = false;
const mcpCfg = path.join(HOME, ".copilot/mcp-config.json");
const mcpBak = mcpCfg + ".expbak";
function sidelineMcp() { if (harness === "copilot" && fs.existsSync(mcpCfg)) { fs.renameSync(mcpCfg, mcpBak); sidelined = true; } }
function restoreMcp() { if (sidelined && fs.existsSync(mcpBak)) { fs.renameSync(mcpBak, mcpCfg); sidelined = false; } }
process.on("exit", restoreMcp);
process.on("SIGINT", () => { restoreMcp(); process.exit(130); });
process.on("SIGTERM", () => { restoreMcp(); process.exit(143); });
sidelineMcp();

console.error(`harness=${harness} version=${version} exps=${expIds.join(",")} reps=${startRep}..${reps}`);

for (const expId of expIds) {
  const exp = EXPERIMENTS[expId];
  for (let rep = startRep; rep <= reps; rep++) {
    const repDir = path.join(CAP_BASE, expId, harness, `run-${String(rep).padStart(2, "0")}`);
    fs.mkdirSync(repDir, { recursive: true });
    process.stderr.write(`[${expId}/${harness} rep ${rep}/${reps}] reset+run …\n`);

    resetRepo(exp.branch, exp.sha);
    let res;
    try {
      res = harness === "copilot" ? runCopilot(exp.prompt, repDir, timeoutSec) : runClaude(exp.prompt, repDir, timeoutSec);
    } catch (err) {
      process.stderr.write(`  spawn error: ${err.message}\n`);
      if (!keepGoing) { restoreMcp(); process.exit(1); }
      continue;
    }
    const diff = captureDiff();
    fs.writeFileSync(path.join(repDir, "diff.patch"), diff.patch);
    fs.writeFileSync(path.join(repDir, "answer.txt"), res.answer || "");

    const row = scoreRun(expId, exp, harness, res, diff, { version, runIndex: rep, repDir });
    fs.writeFileSync(path.join(repDir, "row.json"), JSON.stringify(row, null, 2));
    fs.appendFileSync(jsonlPath, JSON.stringify(row) + "\n");

    if (exp.edits) { resetRepo(exp.branch, exp.sha); } // reset AFTER capturing diff

    const tag = row.model_ok ? "" : `  ⚠ model=${res.model}`;
    process.stderr.write(`  done: class=${row.classification} files=${row.files_changed_count} tools=${row.tool_call_count} wall=${(res.wallMs / 1000).toFixed(0)}s${tag}\n`);
  }
}

restoreMcp();
console.error("batch complete →", jsonlPath);
