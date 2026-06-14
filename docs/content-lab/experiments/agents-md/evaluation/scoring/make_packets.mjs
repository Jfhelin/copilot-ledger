#!/usr/bin/env node
// Build condition-blind scoring packets for the judgment tasks (E2, E4, E5).
//
// Each packet gets an opaque code = sha1(salt + run_id)[:8]. The packet body has
// run-id / condition / AGENTS|BARE / harness scrubbed from the text so the scorer
// cannot infer the arm. A sealed map (code -> run_id) is written separately and is
// NOT consulted until scores are committed. Packets are emitted in code-sorted
// (i.e. arm-shuffled) order.
//
// Usage: node make_packets.mjs <E2-local|E4-multifile|E5-review> [outDir]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const TASK = process.argv[2];
const OUT = process.argv[3] || `${process.env.HOME}/copilot-ledger-data/captures/agents-md/evaluation/scoring/packets`;
const RUNS = `${process.env.HOME}/copilot-ledger-data/captures/agents-md/evaluation/runs`;
const SALT = "a4-phase6-blind";

function scrub(s) {
  return s
    .replace(/evaluation-E\d-[a-z]+-(AGENTS|BARE)-\d+/gi, "[RUN]")
    .replace(/\b(AGENTS|BARE)\b/g, "[COND]")
    .replace(/AGENTS\.md/g, "[INSTR].md");
}

function stripDiff(raw) {
  const lines = raw.split("\n");
  const out = [];
  let skip = false;
  for (const ln of lines) {
    const m = ln.match(/^diff --git a\/(\S+) b\/(\S+)/);
    if (m) skip = /package-lock\.json$/.test(m[1]) || /(^|\/)node_modules\//.test(m[1]);
    if (!skip) out.push(ln);
  }
  return out.join("\n");
}

fs.mkdirSync(path.join(OUT, TASK), { recursive: true });
const ids = fs.readdirSync(RUNS).filter((d) => d.includes(TASK));
const map = {};
const codes = [];
for (const id of ids) {
  const code = crypto.createHash("sha1").update(SALT + id).digest("hex").slice(0, 8);
  map[code] = id;
  const dir = path.join(RUNS, id);
  let body = `# PACKET ${code} — task ${TASK}\n\n`;
  if (TASK === "E5-review") {
    body += "## Agent review output\n\n" + scrub(fs.readFileSync(path.join(dir, "answer.txt"), "utf8"));
  } else {
    const ans = fs.existsSync(path.join(dir, "answer.txt")) ? fs.readFileSync(path.join(dir, "answer.txt"), "utf8") : "";
    const diff = fs.existsSync(path.join(dir, "worktree.diff")) ? stripDiff(fs.readFileSync(path.join(dir, "worktree.diff"), "utf8")) : "";
    body += "## Agent summary\n\n" + scrub(ans) + "\n\n## Code diff (lockfiles stripped)\n\n```diff\n" + scrub(diff) + "\n```\n";
  }
  fs.writeFileSync(path.join(OUT, TASK, `${code}.txt`), body);
  codes.push(code);
}
fs.writeFileSync(path.join(OUT, `${TASK}.sealed_map.json`), JSON.stringify(map, null, 2));
codes.sort();
fs.writeFileSync(path.join(OUT, `${TASK}.codes.json`), JSON.stringify(codes, null, 2));
console.log(`${TASK}: ${codes.length} packets -> ${path.join(OUT, TASK)}`);
console.log("codes (arm-shuffled):", codes.join(" "));
