#!/usr/bin/env node
// scan-captures.mjs — discover every capture-like file on this machine and reconcile
// it against the run ledger (docs/content-lab/data/db/runs.jsonl), so nothing logged
// is missing from the catalog.
//
// Usage:
//   node .github/skills/data-catalog-backfill/scan-captures.mjs [--all] [--json]
//
//   (default)  Print a grouped report: covered vs UNACCOUNTED capture files.
//   --all      Also list files matched by the ignore rules (scratch/derived/operational).
//   --json     Emit machine-readable JSON instead of the text report.
//
// "Covered" = the file's path, or a parent directory of it, appears in some ledger
// row's source_path (after expanding ~). Everything else is either matched by an
// IGNORE rule (scratch / derived sidecars / operational logs) or surfaced as a
// candidate that needs triage (add a ledger row + an INDEX entry, or add to IGNORE).

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const HOME = homedir();
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LEDGER = join(REPO, "docs/content-lab/data/db/runs.jsonl");
const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(SKILL_DIR, "catalog-roots.json");
const manifest = existsSync(MANIFEST)
  ? JSON.parse(readFileSync(MANIFEST, "utf8"))
  : { datasetGlobs: [], sessionMarkers: [] };

// --- capture roots to scan (add new ones here if the project grows) -------------------
function hasMarker(filesDir) {
  return (manifest.sessionMarkers || []).some((m) => existsSync(join(filesDir, m)));
}
const ROOTS = [
  join(HOME, "copilot-ledger-data/captures"),
  join(HOME, "CopilotLogExports"),
  join(HOME, ".claude/projects"),
  // Only Copilot CLI session-state dirs that look like harness-research sessions
  // (contain a research marker dir) — avoids scanning every unrelated session.
  ...safeReaddir(join(HOME, ".copilot/session-state"))
    .map((d) => join(HOME, ".copilot/session-state", d, "files"))
    .filter((f) => existsSync(f) && hasMarker(f)),
];

// A file is a "capture" if it looks like an export / transcript / digest / CLI log.
const CAPTURE_RE = /(\.jsonl$|\.json$|process-.*\.log$)/i;

// Files we deliberately do NOT expect as ledger rows. Each rule is {re, why}.
const IGNORE = [
  { re: /\/\.agentviz\//, why: "derived digest sidecar (regenerable)" },
  { re: /\/db-snapshots\//, why: "mirror of repo db/" },
  { re: /\.digest\.json$/, why: "derived digest sidecar" },
  { re: /\/\.copilot\/logs\//, why: "operational CLI log (not a curated capture)" },
  { re: /\/(01-hello(-\d+)?|02-one-tool|04-plan-implement-cart|HelloWorld|t1|t2|t2_2|readme-cold-nocontext)\.json$/, why: "scratch/early throwaway export" },
  { re: /\/test\.json\.json$/, why: "scratch throwaway export" },
  { re: /\.idx$|\/index\.log$|\/meta\.txt$|\/answer\.txt$|\/run\.err$|\/digest\.err$|\/stderr\.txt$/, why: "sidecar/metadata, not a capture body" },
  { re: /\/subagents\//, why: "sub-agent transcript fragment" },
];

function safeReaddir(p) { try { return readdirSync(p); } catch { return []; } }
function walk(dir, out = []) {
  for (const e of safeReaddir(dir)) {
    const full = join(dir, e);
    let st; try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
const expand = (p) => (p || "").replace(/^~(?=$|\/)/, HOME).replace(/\/+$/, "");

// --- load ledger coverage -------------------------------------------------------------
if (!existsSync(LEDGER)) { console.error(`No ledger at ${LEDGER}`); process.exit(1); }
const ledger = readFileSync(LEDGER, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const covered = ledger.map((r) => expand(r.source_path)).filter(Boolean);
const datasetGlobs = manifest.datasetGlobs || [];
const knownSessions = manifest.knownResearchSessions || [];
const sessionId = (file) => (file.match(/\/session-state\/([^/]+)\/files\//) || [])[1];
const isCovered = (file) => {
  const sid = sessionId(file);
  if (sid && knownSessions.includes(sid)) return true; // INDEX D catalogs these wholesale
  return (
    covered.some((c) => file === c || file.startsWith(c + "/") || c.startsWith(file)) ||
    datasetGlobs.some((g) => file.includes(g))
  );
};

// --- scan -----------------------------------------------------------------------------
const report = { covered: [], ignored: [], unaccounted: [] };
for (const root of ROOTS) {
  if (!existsSync(root)) continue;
  for (const f of walk(root)) {
    if (!CAPTURE_RE.test(f)) continue;
    if (isCovered(f)) { report.covered.push(f); continue; }
    const ig = IGNORE.find((r) => r.re.test(f));
    if (ig) { report.ignored.push({ f, why: ig.why }); continue; }
    report.unaccounted.push(f);
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const showAll = process.argv.includes("--all");
const newSessions = ROOTS.map(sessionId).filter((s) => s && !knownSessions.includes(s));
console.log(`Run ledger: ${ledger.length} rows  (${LEDGER.replace(HOME, "~")})`);
console.log(`Scanned roots:\n${ROOTS.map((r) => "  " + r.replace(HOME, "~")).join("\n")}\n`);
console.log(`✅ covered captures:     ${report.covered.length}`);
console.log(`➖ ignored (scratch/derived/operational): ${report.ignored.length}`);
console.log(`⚠️  UNACCOUNTED captures: ${report.unaccounted.length}\n`);

if (newSessions.length) {
  console.log(`🆕 NEW research session(s) not in catalog-roots.json knownResearchSessions:`);
  for (const s of newSessions) console.log(`      ${s}  — add to manifest + INDEX section D`);
  console.log("");
}

if (report.unaccounted.length) {
  console.log("⚠️  These capture files are NOT covered by any ledger row and matched no");
  console.log("   ignore rule. Triage each: add a ledger row + INDEX entry, or extend IGNORE.\n");
  // group by parent dir for readability
  const byDir = {};
  for (const f of report.unaccounted) (byDir[dirname(f)] ??= []).push(basename(f));
  for (const [d, files] of Object.entries(byDir).sort()) {
    console.log(`  ${d.replace(HOME, "~")}/  (${files.length})`);
    for (const b of files.slice(0, 12)) console.log(`      ${b}`);
    if (files.length > 12) console.log(`      … +${files.length - 12} more`);
  }
} else {
  console.log("🎉 Nothing unaccounted. Every discovered capture is covered or ignored.");
}

if (showAll) {
  console.log("\n--- ignored (with reason) ---");
  for (const { f, why } of report.ignored) console.log(`  ${f.replace(HOME, "~")}  — ${why}`);
}
