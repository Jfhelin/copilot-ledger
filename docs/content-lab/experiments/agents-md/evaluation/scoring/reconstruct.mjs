#!/usr/bin/env node
// Phase 6 mechanical reconstruction for E2/E3/E4.
//
// For each run it rebuilds the agent's end state in a clean scoring checkout and
// runs the repo's OWN gates (objective, blind to condition — we only ever run code):
//   * reset scoring checkout to e1516cf (clean, node_modules preserved)
//   * E3 only: apply the planted fixture.patch first
//   * strip package-lock.json / node_modules hunks from the run's worktree.diff,
//     then apply the rest (= exactly what the agent changed to source)
//   * run `npx vitest run` in api/ (all tasks); for E4 also `npm run build` in frontend/
//   * derive file-level flags from the (lockfile-stripped) diff
//
// Emits one JSON object per run on stdout (array). Behaviour-correctness and the
// subjective quality points are scored separately, blind, from anonymized packets.
//
// Usage: node reconstruct.mjs <E2-local|E3-debug|E4-multifile> [runsDir] [checkout]
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const TASK = process.argv[2];
if (!/^E[234]-/.test(TASK || "")) { console.error("task must be E2-local|E3-debug|E4-multifile"); process.exit(2); }
const RUNS = process.argv[3] || `${process.env.HOME}/copilot-ledger-data/captures/agents-md/evaluation/runs`;
const CO = process.argv[4] || "/tmp/a4_score";
const SHA = "e1516cf";
const EXP = "/Users/jfhelin/Code/GitHub/jfhelin/copilot-worktrees/copilot-ledger/jfhelin-miniature-disco/docs/content-lab/experiments/agents-md";
const FIXTURE = `${EXP}/evaluation/tasks/E3-debug/fixture.patch`;

function sh(cmd, opts = {}) {
  try { return { ok: true, out: execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }) }; }
  catch (e) { return { ok: false, out: (e.stdout || "") + (e.stderr || ""), code: e.status }; }
}

// strip package-lock.json + node_modules file sections from a unified diff
function stripDiff(raw) {
  const lines = raw.split("\n");
  const out = [];
  let skip = false;
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^diff --git a\/(\S+) b\/(\S+)/);
    if (m) {
      const f = m[1];
      skip = /package-lock\.json$/.test(f) || /(^|\/)node_modules\//.test(f);
      if (!skip) kept.push(f);
    }
    if (!skip) out.push(lines[i]);
  }
  return { text: out.join("\n"), files: kept };
}

// per-file add/modify/delete status from the stripped diff
function fileStatus(raw) {
  const status = {};
  const blocks = raw.split(/^diff --git /m).slice(1);
  for (const b of blocks) {
    const fm = b.match(/^a\/(\S+) b\/(\S+)/);
    if (!fm) continue;
    const f = fm[2];
    if (/^new file mode/m.test(b)) status[f] = "A";
    else if (/^deleted file mode/m.test(b)) status[f] = "D";
    else status[f] = "M";
  }
  return status;
}

function vitestSummary(out) {
  const m = out.match(/Tests\s+(.+?)\n/);
  const f = out.match(/Test Files\s+(.+?)\n/);
  return { tests: m ? m[1].trim() : null, files: f ? f[1].trim() : null };
}

const ids = fs.readdirSync(RUNS).filter((d) => d.includes(TASK) && fs.existsSync(path.join(RUNS, d, "worktree.diff")));
const results = [];

for (const id of ids.sort()) {
  const dir = path.join(RUNS, id);
  // 1. reset clean (keep node_modules: clean -fd, not -fdx; reset restores package-lock)
  sh(`git -C ${CO} reset --hard ${SHA} -q`);
  sh(`git -C ${CO} clean -fd -q`);
  // 2. E3 fixture
  let fixture_ok = true;
  if (TASK === "E3-debug") {
    const r = sh(`git -C ${CO} apply ${FIXTURE}`);
    fixture_ok = r.ok;
  }
  // 3. apply stripped agent diff
  const rawDiff = fs.readFileSync(path.join(dir, "worktree.diff"), "utf8");
  const { text, files } = stripDiff(rawDiff);
  const status = fileStatus(text);
  const tmp = `/tmp/recon_${id}.patch`;
  fs.writeFileSync(tmp, text);
  let apply = { ok: true, out: "" };
  if (files.length) {
    apply = sh(`git -C ${CO} apply --whitespace=nowarn ${tmp}`);
    if (!apply.ok) apply = sh(`git -C ${CO} apply --3way --whitespace=nowarn ${tmp}`); // fallback
  }
  // 4. gates
  const api = sh(`cd ${CO}/api && npx vitest run`, { timeout: 180000 });
  let fe = null;
  if (TASK === "E4-multifile") {
    const b = sh(`cd ${CO}/frontend && npm run build`, { timeout: 180000 });
    fe = { exit: b.ok ? 0 : 1, tail: b.out.split("\n").slice(-3).join(" | ").slice(0, 300) };
  }
  // 5. flags
  const meaningful = files;
  const testEdits = meaningful.filter((f) => /\.test\.ts$/.test(f));
  const swaggerEdit = meaningful.filter((f) => /api-swagger\.json$/.test(f));
  const newMigration = meaningful.filter((f) => /api\/database\/migrations\/\d+.*\.sql$/.test(f) && status[f] === "A");
  const frontendTouched = meaningful.filter((f) => f.startsWith("frontend/"));

  results.push({
    run_id: id,
    task: TASK,
    fixture_ok,
    apply_ok: apply.ok,
    apply_err: apply.ok ? null : apply.out.split("\n").slice(0, 4).join(" | ").slice(0, 300),
    api_test_exit: api.ok ? 0 : 1,
    api_test: vitestSummary(api.out),
    fe_build: fe,
    files_touched: meaningful,
    file_status: status,
    n_files: meaningful.length,
    edited_test_files: testEdits,
    touched_swagger: swaggerEdit,
    added_migration: newMigration,
    frontend_touched: frontendTouched,
  });
  process.stderr.write(`  ${id}: apply=${apply.ok} api=${api.ok ? "green" : "RED"}${fe ? " fe=" + (fe.exit === 0 ? "green" : "RED") : ""}\n`);
}
process.stdout.write(JSON.stringify(results, null, 2) + "\n");
