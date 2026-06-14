#!/usr/bin/env node
// Mechanical scorer for E2-local (0-6) and E3-debug (0-5). Consumes the reconstruct.mjs
// outputs (apply + gate + per-file A/M/D status) and the per-run metrics.json (tool_calls,
// condition). No human judgment: every point is a deterministic predicate over the diff
// shape and the repo's own test gate, per the frozen rubrics. Condition is read ONLY to
// group the final summary (not used in any per-run decision).
//
// Usage: node score_e2_e3.mjs   (writes results/e2_scores.json + results/e3_scores.json)
import fs from "node:fs";
import path from "node:path";

const RUNS = `${process.env.HOME}/copilot-ledger-data/captures/agents-md/evaluation/runs`;
const OUTDIR = path.join(path.dirname(new URL(import.meta.url).pathname), "results");
fs.mkdirSync(OUTDIR, { recursive: true });

const E2 = JSON.parse(fs.readFileSync("/tmp/e2_recon.json", "utf8"));
const E3 = JSON.parse(fs.readFileSync("/tmp/e3_recon.json", "utf8"));

const meta = (id) => {
  const m = JSON.parse(fs.readFileSync(path.join(RUNS, id, "metrics.json"), "utf8"));
  return { condition: m.condition, tool_calls: m.tool_calls, requests: m.requests, credits: m.native_credits };
};
const isTest = (f) => /\.test\.ts$/.test(f);
const modifiedExistingTest = (r) =>
  Object.entries(r.file_status || {}).some(([f, s]) => isTest(f) && s !== "A");

// ---- E2-local (0-6) ----
const E2_ALLOWED = (f) =>
  /^api\/src\/models\/product\.ts$/.test(f) ||
  /^api\/database\/migrations\//.test(f) ||
  /^api\/src\/repositories\/productsRepo\.ts$/.test(f) ||
  /^api\/src\/routes\/product/.test(f) ||
  /^api\/api-swagger\.json$/.test(f) ||
  isTest(f);

const e2 = E2.map((r) => {
  const mt = meta(r.run_id);
  const apiGreen = r.api_test_exit === 0;
  const migAdded = (r.added_migration || []).length > 0;
  const noModTest = !modifiedExistingTest(r);
  const noSwaggerHandEdit = (r.touched_swagger || []).length === 0; // none touched the generated json
  const roundTrip = migAdded && apiGreen; // buildInsertSQL inserts barcode generically; mapDatabaseRows reads it back
  const surgical = (r.files_touched || []).every(E2_ALLOWED) && (r.frontend_touched || []).length === 0 && r.n_files <= 5;
  const noUnrelated = (r.frontend_touched || []).length === 0 && (r.files_touched || []).every(E2_ALLOWED);
  const p1 = apiGreen && roundTrip && noModTest && noSwaggerHandEdit ? 1 : 0;
  const p2 = apiGreen && noModTest ? 1 : 0;
  const p3 = migAdded ? 1 : 0;
  const p4 = surgical ? 1 : 0;
  const p5 = noSwaggerHandEdit ? 1 : 0;
  const p6 = noUnrelated ? 1 : 0;
  const quality = p1 + p2 + p3 + p4 + p5 + p6;
  return {
    run_id: r.run_id, condition: mt.condition, success: !!p1, quality,
    p1, p2, p3, p4, p5, p6, n_files: r.n_files, tool_calls: mt.tool_calls,
    added_test: (r.files_touched || []).some(isTest), files: r.files_touched,
  };
});

// ---- E3-debug (0-5) ----
const e3tools = E3.map((r) => meta(r.run_id).tool_calls).sort((a, b) => a - b);
const e3median = e3tools[Math.floor(e3tools.length / 2)];
const e3 = E3.map((r) => {
  const mt = meta(r.run_id);
  const apiGreen = r.api_test_exit === 0;
  const touchedRepo = (r.files_touched || []).includes("api/src/repositories/suppliersRepo.ts");
  const noTestEdit = (r.edited_test_files || []).length === 0;
  const onlyRepo = r.n_files === 1 && touchedRepo;
  const p1 = apiGreen ? 1 : 0;
  const p2 = apiGreen && touchedRepo && noTestEdit ? 1 : 0;
  const p3 = onlyRepo ? 1 : 0;
  const p4 = noTestEdit ? 1 : 0;
  const p5 = mt.tool_calls <= 2 * e3median ? 1 : 0; // efficient: not a flailing outlier
  const quality = p1 + p2 + p3 + p4 + p5;
  return {
    run_id: r.run_id, condition: mt.condition, success: !!(p1 && p2), quality,
    p1, p2, p3, p4, p5, n_files: r.n_files, tool_calls: mt.tool_calls, files: r.files_touched,
  };
});

const summ = (rows, max) => {
  const by = { BARE: [], AGENTS: [], ORIG: [] };
  for (const r of rows) (by[r.condition] || (by[r.condition] = [])).push(r.quality);
  const stat = (a) => a.length ? { n: a.length, mean: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2), min: Math.min(...a), max: Math.max(...a) } : null;
  return { max, success: rows.filter((r) => r.success).length + "/" + rows.length, BARE: stat(by.BARE), AGENTS: stat(by.AGENTS), ORIG: stat(by.ORIG) };
};

fs.writeFileSync(path.join(OUTDIR, "e2_scores.json"), JSON.stringify(e2, null, 2));
fs.writeFileSync(path.join(OUTDIR, "e3_scores.json"), JSON.stringify(e3, null, 2));
console.log("E2-local (0-6):", JSON.stringify(summ(e2, 6)));
console.log("  E2 added own barcode test:", e2.filter((r) => r.added_test).length + "/20");
console.log("E3-debug (0-5):", JSON.stringify(summ(e3, 5)), "median tool_calls=", e3median);
console.log("  E3 quality<max runs:", e3.filter((r) => r.quality < 5).map((r) => `${r.run_id}(q${r.quality},tc${r.tool_calls})`).join(", ") || "none");
console.log("  E2 quality<max runs:", e2.filter((r) => r.quality < 6).map((r) => `${r.run_id}(q${r.quality})`).join(", ") || "none");
