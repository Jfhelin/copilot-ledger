#!/usr/bin/env node
// E1-nav scorer — reuses the FROZEN Articles 1-3 scorer logic verbatim
// (25 ground-truth facts + entity coverage + port-discrepancy bonus => raw 0-27,
// normalized 0-20 with severity-capped penalties). Ground truth verified at e1516cf.
//
// Source of truth for the checklist: captures/repeatability-40run/score.mjs.
// This wrapper only changes WHERE answers are read from (the eval runs dir) and
// adds a binary success gate + a read-only "unnecessary edit" signal. The scoring
// regexes are copied unchanged so E1 stays cross-article comparable.
//
// Usage: node score_e1.mjs [runsDir] > e1_scores.json
import fs from "node:fs";
import path from "node:path";

const RUNS = process.argv[2] ||
  `${process.env.HOME}/copilot-ledger-data/captures/agents-md/evaluation/runs`;

function clean(raw) {
  const lines = raw.split("\n");
  const kept = [];
  for (let ln of lines) {
    const t = ln.trim();
    if (/^[●○✗✓⏺└│├╰╭┌┐]/.test(t)) continue;
    if (/^(└|│|├)/.test(t)) continue;
    if (/^\s*(└|│|├)/.test(ln)) continue;
    if (/^\d+\s+(lines?|files?)\s+(read|found)/i.test(t)) continue;
    if (/^(Read|List directory|Write|Bash|Edit|Search|Grep|Glob)\b/.test(t) && t.length < 60) continue;
    if (/lines? read$|files? found$|Path does not exist$/i.test(t)) continue;
    if (/^(Perfect!|Great!|I'll (explore|now|start|help|provide)|Let me (explore|provide|start|give|now)|Now (I have|let me)|Based on my (exploration|analysis)|I('| ha)ve (now )?(explored|reviewed|analyzed))/i.test(t)) continue;
    kept.push(ln);
  }
  return kept.join("\n");
}

const ITEMS = [
  ["identity_ecommerce", /e-?commerce|supply.?chain/i],
  ["identity_typescript", /typescript/i],
  ["identity_demo", /\b(demo|sample|example|showcase)\b/i],
  ["be_express", /express/i],
  ["be_sqlite", /sqlite/i],
  ["be_better_sqlite3", /better-sqlite3/i],
  ["be_swagger", /swagger|openapi/i],
  ["be_port3000", /3000/],
  ["be_vitest", /vitest/i],
  ["be_cors", /\bcors\b/i],
  ["fe_react", /react/i],
  ["fe_vite", /\bvite\b/i],
  ["fe_tailwind", /tailwind/i],
  ["fe_playwright", /playwright/i],
  ["fe_port5137_correct", /5137/],
  ["orch_makefile", /makefile|make\s+(install|dev|build|test|help|db)/i],
  ["orch_make_install", /make\s+install/i],
  ["orch_make_dev", /make\s+dev/i],
  ["orch_test_cmd", /make\s+test|npm\s+(run\s+)?test|vitest|playwright\s+test|test:e2e/i],
  ["orch_docker", /docker/i],
  ["arch_no_root_pkg", /no\s+root\s+package|independent\s+(npm\s+)?(projects|packages)|separate\s+package\.json|two\s+(separate\s+)?package\.json|each\s+(has\s+)?(its\s+)?own\s+package\.json|standalone\s+(npm\s+)?(projects|packages)/i],
  ["arch_rest", /rest(ful)?\b/i],
  ["arch_dbfile", /data\/app\.db|app\.db/i],
  ["data_flow", /(frontend|client|react|browser).{0,60}(api|backend|server).{0,60}(database|sqlite|db)|(api|backend).{0,40}(sqlite|database).{0,40}(persist|store)|proxy|api calls? to/i],
  ["origin_ai", /ai-?generated|github copilot|generated (using|with|by)/i],
];
const ENTITIES = /\b(headquarters|branch|order ?detail|orderdetail|\border\b|product|supplier|delivery)\b/gi;
const PORT_DISCREPANCY = (txt) => /5137/.test(txt) && /5173/.test(txt);
const PENALTIES = [
  ["hall_wrong_db", /\b(mongo(db)?|postgres(ql)?|mysql|prisma|dynamodb|firebase|cosmos)\b/i, "cap16"],
  ["hall_npm_workspaces", /npm\s+workspaces|yarn\s+workspaces|pnpm\s+workspaces|"workspaces"|workspace:\*|workspaces\s*\[|monorepo\s+(managed\s+)?(with|using|via)\s+(npm\s+)?workspaces/i, "cap16"],
  ["hall_azure_infra", /\bbicep\b|terraform|azure\s+(resource group|infrastructure|provision|bicep)|\.bicep\b|infra(structure)?\s+as\s+code/i, "cap16"],
  ["hall_nextjs", /next\.?js/i, "minus2"],
];
const MAXRAW = ITEMS.length + 1 + 1; // 25 + entities + port-discrepancy bonus = 27

function lockfileOnlyDiff(diffPath) {
  // returns {edited:bool, files:[...]} ignoring package-lock.json / node_modules
  if (!fs.existsSync(diffPath)) return { edited: false, files: [] };
  const txt = fs.readFileSync(diffPath, "utf8");
  const files = [...txt.matchAll(/^diff --git a\/(\S+) b\/\S+/gm)].map((m) => m[1]);
  const meaningful = files.filter(
    (f) => !/package-lock\.json$/.test(f) && !/(^|\/)node_modules\//.test(f)
  );
  return { edited: meaningful.length > 0, files: meaningful };
}

const ids = fs
  .readdirSync(RUNS)
  .filter((d) => /E1-nav/.test(d) && fs.existsSync(path.join(RUNS, d, "answer.txt")));

const out = [];
for (const id of ids.sort()) {
  const dir = path.join(RUNS, id);
  const raw = fs.readFileSync(path.join(dir, "answer.txt"), "utf8");
  const txt = clean(raw);
  const cleanedWords = txt.trim().split(/\s+/).filter(Boolean).length;
  const hits = {};
  let raw_points = 0;
  for (const [name, re] of ITEMS) { const h = re.test(txt) ? 1 : 0; hits[name] = h; raw_points += h; }
  const entCount = new Set((txt.match(ENTITIES) || []).map((s) => s.toLowerCase().replace(/\s/g, ""))).size;
  hits.domain_entities_ge3 = entCount >= 3 ? 1 : 0; raw_points += hits.domain_entities_ge3;
  hits.port_discrepancy_bonus = PORT_DISCREPANCY(txt) ? 1 : 0; raw_points += hits.port_discrepancy_bonus;

  let score = (raw_points / MAXRAW) * 20;
  const pens = [];
  let cap = 20, minus = 0;
  for (const [name, re, sev] of PENALTIES) {
    if (re.test(txt)) { pens.push(name); if (sev === "cap16") cap = Math.min(cap, 16); if (sev === "minus2") minus += 2; }
  }
  score = Math.min(score, cap) - minus;
  score = Math.max(0, Math.round(score * 10) / 10);

  const edits = lockfileOnlyDiff(path.join(dir, "worktree.diff"));
  out.push({
    run_id: id,
    task: "E1-nav",
    success: cleanedWords > 0 ? 1 : 0,        // gate: a non-empty answer was produced
    quality_raw_0_27: raw_points,
    quality_norm_0_20: score,
    entity_count: entCount,
    penalties: pens,
    cap,
    cleaned_words: cleanedWords,
    unnecessary_edit: edits.edited ? 1 : 0,    // read-only task signal (does not change quality)
    edited_files: edits.files,
    hits,
  });
}
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
