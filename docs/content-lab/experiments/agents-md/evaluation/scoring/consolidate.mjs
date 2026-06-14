#!/usr/bin/env node
// Merge the five per-task score files into one per-run quality table and print the
// H2 (quality, non-inferiority) summary. Cost (H1) is read fresh from captures.jsonl.
// Condition is derived from the run_id only at this consolidation step.
import fs from "node:fs";
import path from "node:path";

const SCORING = path.dirname(new URL(import.meta.url).pathname);
const RES = path.join(SCORING, "results");
const PKT = `${process.env.HOME}/copilot-ledger-data/captures/agents-md/evaluation/scoring/packets`;
const CAP = `${process.env.HOME}/copilot-ledger-data/captures/agents-md/evaluation/captures.jsonl`;
const cond = (id) => (/-AGENTS-/.test(id) ? "AGENTS" : /-ORIG-/.test(id) ? "ORIG" : /-INIT-/.test(id) ? "INIT" : "BARE");
const mean = (a) => +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2);
const median = (a) => { a = [...a].sort((x, y) => x - y); const n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };

const e1 = JSON.parse(fs.readFileSync(path.join(RES, "e1_scores.json"), "utf8"));
const e2 = JSON.parse(fs.readFileSync(path.join(RES, "e2_scores.json"), "utf8"));
const e3 = JSON.parse(fs.readFileSync(path.join(RES, "e3_scores.json"), "utf8"));
const e4s = JSON.parse(fs.readFileSync(path.join(RES, "E4-multifile.scores.json"), "utf8"));
const e5s = JSON.parse(fs.readFileSync(path.join(RES, "E5-review.scores.json"), "utf8"));
const e4map = JSON.parse(fs.readFileSync(path.join(PKT, "E4-multifile.sealed_map.json"), "utf8"));
const e5map = JSON.parse(fs.readFileSync(path.join(PKT, "E5-review.sealed_map.json"), "utf8"));

const rows = [];
for (const r of e1) rows.push({ run_id: r.run_id, task: "E1-nav", scale: "0-27", condition: cond(r.run_id), success: r.success, quality: r.quality_raw_0_27 });
for (const r of e2) rows.push({ run_id: r.run_id, task: "E2-local", scale: "0-6", condition: r.condition, success: r.success, quality: r.quality });
for (const r of e3) rows.push({ run_id: r.run_id, task: "E3-debug", scale: "0-5", condition: r.condition, success: r.success, quality: r.quality });
for (const r of e4s) { const id = e4map[r.code]; rows.push({ run_id: id, task: "E4-multifile", scale: "0-6", condition: cond(id), success: r.p1 === 1, quality: r.quality }); }
for (const r of e5s) { const id = e5map[r.code]; rows.push({ run_id: id, task: "E5-review", scale: "net(tp-fp)", condition: cond(id), success: r.matched && r.matched.includes("D1"), quality: r.net }); }

fs.writeFileSync(path.join(RES, "quality_by_run.json"), JSON.stringify(rows, null, 2));

const cap = fs.readFileSync(CAP, "utf8").trim().split("\n").map(JSON.parse);
const tasks = ["E1-nav", "E2-local", "E3-debug", "E4-multifile", "E5-review"];
const CONDS = ["BARE", "AGENTS", "ORIG", "INIT"];
const n = (t, c) => rows.filter((r) => r.task === t && r.condition === c).length;
console.log("H2 quality by arm (mean), success gate per arm:");
for (const t of tasks) {
  const scale = rows.find((r) => r.task === t).scale;
  const parts = CONDS.map((c) => {
    const q = rows.filter((r) => r.task === t && r.condition === c).map((r) => r.quality);
    return q.length ? `${c} ${mean(q)} (n=${q.length})` : `${c} --`;
  });
  console.log(`  ${t.padEnd(13)} ${scale.padEnd(11)} ${parts.join("  ")}`);
}
console.log("H1 cost credits by arm (mean | median):");
for (const t of tasks) {
  const parts = CONDS.map((c) => {
    const cc = cap.filter((r) => r.task === t && r.condition === c).map((r) => r.native_credits);
    return cc.length ? `${c} ${mean(cc)}|${median(cc)} (n=${cc.length})` : `${c} --`;
  });
  console.log(`  ${t.padEnd(13)} ${parts.join("   ")}`);
}
console.log("OVERALL cost (mean | median):");
for (const c of CONDS) {
  const cc = cap.filter((r) => r.condition === c).map((r) => r.native_credits);
  if (cc.length) console.log(`  ${c.padEnd(7)} mean ${mean(cc)} median ${median(cc)} (n=${cc.length})`);
}
console.log(`Wrote ${rows.length} rows -> results/quality_by_run.json`);
