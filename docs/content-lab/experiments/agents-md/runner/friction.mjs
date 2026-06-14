#!/usr/bin/env node
// friction.mjs — Phase-2 discovery analysis for the AGENTS.md experiment.
//
// Parses each discovery run's raw Copilot-CLI log (process-*.log) to recover the
// exact tool calls (name + arguments) the agent issued and the tool RESULTS it got
// back, then classifies recurring, correctable, generalizable friction events.
//
// Output: NDJSON of friction events on stdout (one per line), plus a human summary
// on stderr. Each event row is shaped for the `friction_events` SQL table:
//   { run_id, task, event_class, detail, correctable_by, generalizes }
//
// Usage:
//   node friction.mjs <runsDir>            # all runs under dir
//   node friction.mjs <runsDir> --json     # also emit per-run rollup to stderr
//
// Friction taxonomy (only events that are recurring AND fixable by a doc line):
//   phantom_file        view/read of a path that does not exist (e.g. root package.json)
//   wrong_install       `npm ci` (fails on this repo — lockfile out of sync)
//   redundant_install   the SAME install command run >1x in one run
//   failed_command      a bash tool-result that reported an error / non-zero exit
//   split_layout_probe  had to discover the api/ + frontend/ two-project split
//   generated_file_edit hand-edited a generated artifact (api-swagger.json)
//   over_exploration    unique source files read above a per-task threshold (metric)

import fs from "node:fs";
import path from "node:path";

const PREFIX_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}) \[(?:DEBUG|INFO|WARN|WARNING|ERROR|TRACE|ALL)\] /;

// The Copilot CLI log records each LLM turn as a `request` block whose `messages[]`
// use the Anthropic/Bedrock wire shape: assistant `tool_use` content blocks carry the
// call (name + structured `input` + id), and the following `user` message carries the
// matching `tool_result` blocks (tool_use_id + content text). Later request blocks
// re-send the whole prefix, so we walk EVERY request and dedup by id — the largest
// prefix therefore yields every call/result pair (only the run's final 1-2 results,
// which are never echoed back into a request, are unavailable, which is negligible).
function parseLog(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const callsById = new Map(); // id -> {name, args(obj), id}  (preserves issue order)
  const order = [];
  const resultsById = new Map(); // tool_use_id -> result text (first seen)
  for (let i = 0; i < lines.length; i++) {
    if (!PREFIX_RE.test(lines[i])) continue;
    const content = lines[i].replace(PREFIX_RE, "");
    if (!content.trimEnd().endsWith("{")) continue;
    const braceIdx = content.lastIndexOf("{");
    const buf = [content.slice(braceIdx)];
    let j = i + 1;
    while (j < lines.length && !PREFIX_RE.test(lines[j])) {
      buf.push(lines[j]);
      j++;
    }
    i = j - 1;
    let obj = null;
    try {
      obj = JSON.parse(buf.join("\n").trim());
    } catch {
      continue;
    }
    if (!obj || !Array.isArray(obj.messages)) continue;
    for (const m of obj.messages) {
      if (!Array.isArray(m.content)) continue;
      for (const b of m.content) {
        if (!b || typeof b !== "object") continue;
        if (b.type === "tool_use" && b.id && !callsById.has(b.id)) {
          callsById.set(b.id, { name: b.name, args: b.input || {}, id: b.id });
          order.push(b.id);
        } else if (b.type === "tool_result" && b.tool_use_id != null && !resultsById.has(b.tool_use_id)) {
          let text = "";
          if (typeof b.content === "string") text = b.content;
          else if (Array.isArray(b.content))
            text = b.content.map((x) => (typeof x === "string" ? x : x?.text ?? "")).join("");
          resultsById.set(b.tool_use_id, text);
        }
      }
    }
  }
  const calls = order.map((id) => callsById.get(id));
  return { calls, resultsById };
}

// Precise result signatures (avoid matching "error"/"NotFound" inside healthy source).
// A genuine missing-path view returns exactly this phrasing from the view tool:
const NOT_FOUND_RE = /does not exist\. Please provide a valid|no such file or directory/i;
// A dev tool invoked before deps were installed (node_modules/.bin missing):
const MISSING_TOOL_RE = /\b(vitest|tsc|tsx|ts-node|eslint|vite|jest)\b:?\s*(command )?not found|sh:\s*\w+:\s*command not found/i;

// Generated artifacts that should be regenerated, not hand-edited.
const GENERATED_RE = /(api-swagger\.json|swagger\.json|\.generated\.)/i;

// Distinct ways to start/serve the API — issuing several in one run = "how do I run this?" thrash.
function serverStartKind(cmd) {
  if (/\bnpm\s+start\b/.test(cmd)) return "npm start";
  if (/\bnpm\s+run\s+dev\b/.test(cmd)) return "npm run dev";
  if (/\bnpm\s+run\s+build\b/.test(cmd)) return "npm run build";
  if (/\bnode\s+dist\//.test(cmd)) return "node dist/";
  if (/\bPORT=\d+\s+node\b/.test(cmd)) return "PORT= node";
  if (/\bmake\s+(start|dev|run)\b/.test(cmd)) return "make start";
  return null;
}

function classify(runId, task, { calls, resultsById }) {
  const events = [];
  const filesRead = new Set();
  const installCmds = [];
  const serverKinds = new Set();
  let sawApiPkg = false;
  let sawFrontendPkg = false;

  for (const c of calls) {
    const res = (c.id && resultsById.get(c.id)) || "";

    if (c.name === "view" || c.name === "read_file" || c.name === "glob") {
      const p = c.args?.path || c.args?.pattern || "";
      if (c.name !== "glob" && p) filesRead.add(p);
      // phantom-file: the agent guessed a path that does not exist (precise signature only)
      if (p && NOT_FOUND_RE.test(res)) {
        const rel = p.replace(/^.*octocat_supply_a4\//, "");
        events.push({
          run_id: runId, task, event_class: "phantom_file",
          detail: rel,
          correctable_by: /package\.json|tsconfig|node_modules/.test(rel)
            ? "no root package.json/tsconfig — the two npm projects live in api/ and frontend/"
            : "name the real entry points so the agent stops guessing paths",
          generalizes: 1,
        });
      }
      if (/\/api\/package\.json$/.test(p)) sawApiPkg = true;
      if (/\/frontend\/package\.json$/.test(p)) sawFrontendPkg = true;
    }

    if (c.name === "bash") {
      const cmd = c.args?.command || "";
      // missing-deps: a dev tool (vitest/tsc/…) was not found because deps weren't installed yet
      if (MISSING_TOOL_RE.test(res)) {
        const tool = (res.match(MISSING_TOOL_RE) || [, "tool"])[1] || "vitest";
        events.push({
          run_id: runId, task, event_class: "missing_deps_run",
          detail: `${tool} not found — ran "${cmd.replace(/\s+/g, " ").slice(0, 60)}" before install`,
          correctable_by: "install deps before tests/build; canonical entry is `make install` / `npm install` in api/",
          generalizes: 1,
        });
      }
      // wrong-install: npm ci fails on this repo (lockfile out of sync)
      if (/\bnpm\s+ci\b/.test(cmd)) {
        events.push({
          run_id: runId, task, event_class: "wrong_install",
          detail: cmd.slice(0, 120),
          correctable_by: "use `npm install` (or `make install`); `npm ci` fails — lockfile is out of sync",
          generalizes: 1,
        });
      }
      if (/\bnpm\s+(install|i|ci)\b|\bmake\s+install\b|\byarn\b|\bpnpm\b/.test(cmd)) {
        installCmds.push(cmd.replace(/\s+/g, " ").trim());
      }
      const sk = serverStartKind(cmd);
      if (sk) serverKinds.add(sk);
      // generated-file edit via shell redirection/sed
      if (GENERATED_RE.test(cmd) && /(>|>>|sed -i|tee )/.test(cmd)) {
        events.push({
          run_id: runId, task, event_class: "generated_file_edit",
          detail: cmd.slice(0, 120),
          correctable_by: "api-swagger.json is generated — regenerate via `make swagger`, do not hand-edit",
          generalizes: 1,
        });
      }
    }

    if (c.name === "edit" || c.name === "create") {
      const p = c.args?.path || "";
      if (p && GENERATED_RE.test(p)) {
        events.push({
          run_id: runId, task, event_class: "generated_file_edit",
          detail: p.replace(/^.*octocat_supply_a4\//, ""),
          correctable_by: "api-swagger.json is generated — regenerate via `make swagger`, do not hand-edit",
          generalizes: 1,
        });
      }
    }
  }

  // redundant-install: same normalized install command issued more than once in one run
  const counts = {};
  for (const c of installCmds) counts[c] = (counts[c] || 0) + 1;
  for (const [cmd, n] of Object.entries(counts)) {
    if (n > 1) {
      events.push({
        run_id: runId, task, event_class: "redundant_install",
        detail: `${n}× ${cmd.slice(0, 90)}`,
        correctable_by: "name the canonical install/test entry once (Makefile) so the agent doesn't retry installs",
        generalizes: 1,
      });
    }
  }

  // server-start thrash: ≥2 distinct ways to launch the server in one run
  if (serverKinds.size >= 2) {
    events.push({
      run_id: runId, task, event_class: "server_start_probe",
      detail: `${serverKinds.size} start methods tried: ${[...serverKinds].join(", ")}`,
      correctable_by: "state how to run the API (canonical start command / port) so the agent doesn't probe",
      generalizes: 1,
    });
  }

  // split-layout probe: had to read both project manifests to learn the layout
  if (sawApiPkg && sawFrontendPkg) {
    events.push({
      run_id: runId, task, event_class: "split_layout_probe",
      detail: "read both api/package.json and frontend/package.json",
      correctable_by: "state the two-project layout up front (api/ = Express+TS+vitest, frontend/ = Vite)",
      generalizes: 1,
    });
  }

  return { events, uniqueFilesRead: filesRead.size, installCount: installCmds.length, callCount: calls.length };
}

// over-exploration is reported as a per-run METRIC only (not a friction event) — file-read
// counts are too task-dependent to assert as repo friction without a stronger signal.
const EXPLORE_THRESHOLD = {};

const runsDir = process.argv[2];
if (!runsDir) {
  console.error("usage: node friction.mjs <runsDir> [--json]");
  process.exit(1);
}
const verbose = process.argv.includes("--json");
const runDirs = fs
  .readdirSync(runsDir)
  .filter((d) => /^discovery-/.test(d) && fs.statSync(path.join(runsDir, d)).isDirectory())
  .sort();

const allEvents = [];
const perRun = [];
for (const dir of runDirs) {
  const m = dir.match(/^discovery-(.+)-BARE-(\d+)$/);
  const task = m ? m[1] : dir;
  const logDir = path.join(runsDir, dir, "logs");
  if (!fs.existsSync(logDir)) continue;
  const log = fs.readdirSync(logDir).find((f) => /^process-.*\.log$/.test(f));
  if (!log) continue;
  const parsed = parseLog(path.join(logDir, log));
  const { events, uniqueFilesRead, installCount, callCount } = classify(dir, task, parsed);
  // over-exploration as a per-run metric event
  const thr = EXPLORE_THRESHOLD[task] ?? 999;
  if (uniqueFilesRead > thr) {
    events.push({
      run_id: dir, task, event_class: "over_exploration",
      detail: `${uniqueFilesRead} unique files read (task median+slack ${thr})`,
      correctable_by: "point to the canonical entry points so the agent reads fewer files to orient",
      generalizes: 1,
    });
  }
  for (const e of events) allEvents.push(e);
  perRun.push({ run_id: dir, task, callCount, uniqueFilesRead, installCount, events: events.length });
}

// stdout: NDJSON of events for SQL load
for (const e of allEvents) process.stdout.write(JSON.stringify(e) + "\n");

// stderr: human summary
const byClass = {};
for (const e of allEvents) (byClass[e.event_class] ??= new Set()).add(e.run_id);
console.error("\n=== per-run ===");
for (const r of perRun)
  console.error(
    `${r.run_id.padEnd(30)} calls=${String(r.callCount).padStart(3)} files=${String(r.uniqueFilesRead).padStart(3)} installs=${String(r.installCount).padStart(2)} events=${r.events}`,
  );
console.error("\n=== friction by class (runs hit / 15) ===");
for (const [cls, runs] of Object.entries(byClass).sort((a, b) => b[1].size - a[1].size)) {
  const tasks = new Set(allEvents.filter((e) => e.event_class === cls).map((e) => e.task));
  console.error(`${cls.padEnd(22)} runs=${String(runs.size).padStart(2)}  tasks=${[...tasks].join(",")}`);
}
console.error(`\ntotal events: ${allEvents.length}`);
