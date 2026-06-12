#!/usr/bin/env node
// Rebuild runs.jsonl — the canonical "every run that has happened" ledger.
//
// The 40 repeatability rows are derived from the committed captures.sql (self-contained,
// runs in CI). The structural / IDE session rows are appended from STATIC_ROWS below,
// because their raw sources live in the external ~/copilot-ledger-data/ dir (not in git).
//
// Usage:  node docs/content-lab/data/db/build-runs.mjs > docs/content-lab/data/db/runs.jsonl
//
// Unified schema (one JSON object per line):
//   run_id, date, harness, task, model, mcp_on, condition, rep,
//   source_path, prefix_tokens, requests, tool_calls, cost_usd, quality_score, notes
//
// When you capture a NEW run, append a row here (or to runs.jsonl directly) and re-run.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const TASK = "explain-repo"; // the verbatim "explain this repo to a new dev" prompt
const REPO = "octodemo/octocat_supply@e1516cf";

const HARNESS = { copilot: "CO-CLI", claude: "CL-CLI" };

// --- 1. Parse the 40 repeatability rows out of the committed captures.sql -------------
function parseCaptures() {
  const sql = readFileSync(join(here, "captures.sql"), "utf8");
  const rows = [];
  // Column order from the CREATE TABLE in captures.sql:
  const cols = [
    "run_id", "condition", "harness", "rep", "cold_warm", "started_at_ms",
    "exit_code", "wall_ms_measured", "wall_span_ms", "model", "requests",
    "tool_calls", "total_tokens", "prompt_tokens", "fresh_input_tokens",
    "cached_tokens", "cache_creation_tokens", "completion_tokens",
    "cache_hit_rate", "cost_token_norm_usd", "native_credits", "quality_score",
  ];
  const re = /INSERT INTO captures VALUES\(([\s\S]*?)\);/g;
  let m;
  while ((m = re.exec(sql))) {
    // split on commas not inside quotes
    const vals = m[1].match(/'(?:[^']|'')*'|[^,]+/g).map((v) => {
      v = v.trim();
      if (v === "NULL") return null;
      if (v.startsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
      return Number(v);
    });
    const r = Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
    rows.push(r);
  }
  return rows;
}

function captureToLedger(r) {
  const date = new Date(r.started_at_ms).toISOString().slice(0, 10);
  const native = typeof r.native_credits === "number" ? r.native_credits : null;
  const cost = r.harness === "copilot" && native != null
    ? +(native / 100).toFixed(4)            // GitHub credits -> USD (16.3cr = $0.163)
    : (typeof r.cost_token_norm_usd === "number" ? +r.cost_token_norm_usd.toFixed(4) : null);
  return {
    run_id: r.run_id,
    date,
    harness: HARNESS[r.harness] || r.harness,
    task: TASK,
    model: r.model,
    mcp_on: false,
    condition: r.condition,
    rep: r.rep,
    source_path: "~/copilot-ledger-data/captures/repeatability-40run/captures.jsonl",
    prefix_tokens: null, // per-run prefix not a single value; ~22k/request, see structural rows
    requests: r.requests,
    tool_calls: r.tool_calls,
    cost_usd: cost,
    quality_score: r.quality_score,
    notes: `${r.cold_warm}; repeatability-40run; cache_hit=${r.cache_hit_rate}` +
      (native != null ? `; native_credits=${native}` : ""),
  };
}

// --- 2. Structural / IDE session rows (raw sources are external, recorded statically) --
const STATIC_ROWS = [
  {
    run_id: "structural-CO-CLI", date: "2026-06-09", harness: "CO-CLI", task: TASK,
    model: "claude-sonnet-4-5-20250929", mcp_on: false, condition: "structural", rep: null,
    source_path: "~/copilot-ledger-data/captures/structural-prefix/copilot/digest.json",
    prefix_tokens: 14877, requests: 7, tool_calls: null, cost_usd: 0.163, quality_score: null,
    notes: "Per-request prefix decomposition. system~6657 + toolDefs~8064 (19 tools); toolDefs ~54% of prefix. native_credits=16.30.",
  },
  {
    run_id: "structural-CL-CLI", date: "2026-06-09", harness: "CL-CLI", task: TASK,
    model: "claude-sonnet-4-5-20250929", mcp_on: false, condition: "structural", rep: null,
    source_path: "~/copilot-ledger-data/captures/structural-prefix/claude/digest.json",
    prefix_tokens: 27200, requests: 19, tool_calls: null, cost_usd: 0.4959, quality_score: null,
    notes: "Relay-captured prefix. 27 tools, very verbose descs; toolDefs ~73% of prefix. token-normalized cost.",
  },
  {
    run_id: "CL-IDE-MCPoff", date: "2026-06-09", harness: "CL-IDE", task: TASK,
    model: "claude-sonnet-4-5", mcp_on: false, condition: "MCPoff", rep: null,
    source_path: "~/copilot-ledger-data/captures/cl-ide-transcripts/CL-IDE_extension_OFF.jsonl",
    prefix_tokens: 46364, requests: null, tool_calls: null, cost_usd: null, quality_score: null,
    notes: "Cold prefix = cache_creation_input_tokens. Claude Code VS Code extension.",
  },
  {
    run_id: "CL-IDE-MCPon", date: "2026-06-09", harness: "CL-IDE", task: TASK,
    model: "claude-sonnet-4-5", mcp_on: true, condition: "MCPon", rep: null,
    source_path: "~/copilot-ledger-data/captures/cl-ide-transcripts/CL-IDE_extension_ON.jsonl",
    prefix_tokens: 46418, requests: null, tool_calls: null, cost_usd: null, quality_score: null,
    notes: "Extension does NOT inject project .mcp.json into prefix; 46418 vs 46364 OFF = noise.",
  },
  {
    run_id: "CO-IDE-MCPon", date: "2026-06-09", harness: "CO-IDE", task: TASK,
    model: "claude-sonnet-4.5", mcp_on: true, condition: "MCPon", rep: null,
    source_path: "~/copilot-ledger-data/captures/co-ide-exports/CO-IDE_CopilotChat_sonnet4.5_MCPon.json",
    prefix_tokens: 46428, requests: 1, tool_calls: null, cost_usd: null, quality_score: null,
    notes: "Cold prefix = first claude-sonnet request prompt_tokens with cached_tokens==0. 4 MCP servers, 56 tools. MCP-off CO-IDE run still a GAP.",
  },
  {
    run_id: "CO-IDE-t6_A_agent", date: "2026-06-09", harness: "CO-IDE", task: TASK,
    model: "claude-sonnet-4.5", mcp_on: true, condition: "agent", rep: 1,
    source_path: "~/copilot-ledger-data/captures/co-ide-exports/t6_A_agent_sonnet_warm_r1.json",
    prefix_tokens: null, requests: 3, tool_calls: null, cost_usd: null, quality_score: null,
    notes: "Ask-vs-agent experiment (exp 10), AGENT mode, warm. 8 MCP servers; fires gpt-4o-mini aux calls.",
  },
  {
    run_id: "CO-IDE-t6_A_ask", date: "2026-06-09", harness: "CO-IDE", task: TASK,
    model: "claude-sonnet-4.5", mcp_on: true, condition: "ask", rep: 1,
    source_path: "~/copilot-ledger-data/captures/co-ide-exports/t6_A_ask_sonnet_warm_r1.json",
    prefix_tokens: null, requests: 3, tool_calls: null, cost_usd: null, quality_score: null,
    notes: "Ask-vs-agent experiment (exp 10), ASK mode, warm. 8 MCP servers.",
  },
  {
    run_id: "CO-IDE-t6_B_agent", date: "2026-06-09", harness: "CO-IDE", task: TASK,
    model: "claude-sonnet-4.5", mcp_on: true, condition: "agent", rep: 1,
    source_path: "~/copilot-ledger-data/captures/co-ide-exports/t6_B_agent_sonnet_warm_r1.json",
    prefix_tokens: null, requests: 3, tool_calls: null, cost_usd: null, quality_score: null,
    notes: "Ask-vs-agent experiment (exp 10), AGENT mode, condition B, warm. 8 MCP servers.",
  },
];

const all = [...parseCaptures().map(captureToLedger), ...STATIC_ROWS];

if (process.argv.includes("--sql")) {
  // Emit a loadable dump (mirrors captures.sql / levers.sql) so the ledger can be
  // queried in any session: sqlite3 session.db < runs.sql
  const cols = Object.keys(all[0]);
  const sqlVal = (v) =>
    v === null ? "NULL"
    : typeof v === "number" ? String(v)
    : typeof v === "boolean" ? (v ? "1" : "0")
    : `'${String(v).replace(/'/g, "''")}'`;
  const decl = cols.map((c) => {
    if (c === "run_id") return "run_id TEXT PRIMARY KEY";
    if (["rep", "prefix_tokens", "requests", "tool_calls"].includes(c)) return `${c} INTEGER`;
    if (["cost_usd", "quality_score"].includes(c)) return `${c} REAL`;
    if (c === "mcp_on") return "mcp_on INTEGER";
    return `${c} TEXT`;
  }).join(", ");
  process.stdout.write("PRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n");
  process.stdout.write(`CREATE TABLE runs (${decl});\n`);
  for (const r of all) {
    process.stdout.write(
      `INSERT INTO runs VALUES(${cols.map((c) => sqlVal(r[c])).join(",")});\n`
    );
  }
  process.stdout.write("COMMIT;\n");
} else {
  for (const row of all) process.stdout.write(JSON.stringify(row) + "\n");
}
