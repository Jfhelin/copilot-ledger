// Sync the canonical skill source (this package) into the project's deployed
// copy under `.github/skills/copilot-chat-export/`.
//
// `packages/skill/` is the source of truth: it carries the tests and the
// package manifest. The `.github/skills/` copy is what the Copilot CLI actually
// loads. Without this script the two drift apart silently. The companion test
// (`scripts/__tests__/sync.test.mjs`) fails when they are out of sync, so CI /
// `npm test` will catch a missed sync.
//
// Usage:
//   node scripts/sync.mjs           # copy source -> deployed
//   node scripts/sync.mjs --check   # exit non-zero if they differ (no writes)

import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Walk up from the skill package to the repo root (the dir containing .github).
function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, ".github"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not locate repo root (no .github/) above ${start}`);
}

const repoRoot = findRepoRoot(skillDir);
const deployedDir = join(repoRoot, ".github", "skills", "copilot-chat-export");

// Files that make up the deployable skill. `copilot-behavior-lab/` and other
// material that only exists in the deployed copy is intentionally left alone.
const FILES = ["SKILL.md", join("scripts", "digest.mjs"), join("scripts", "claude-digest.mjs")];

const check = process.argv.includes("--check");
const drift = [];

for (const rel of FILES) {
  const src = readFileSync(join(skillDir, rel), "utf8");
  const destPath = join(deployedDir, rel);
  const dest = existsSync(destPath) ? readFileSync(destPath, "utf8") : null;
  if (src === dest) continue;
  drift.push(rel);
  if (!check) {
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, src);
  }
}

if (check) {
  if (drift.length) {
    console.error(
      `Skill copies are out of sync (${drift.join(", ")}).\n` +
        `Run \`npm run sync --workspace=@copilot-ledger/skill\` to update ${deployedDir}.`,
    );
    process.exit(1);
  }
  console.log("Skill copies are in sync.");
} else {
  console.log(
    drift.length
      ? `Synced ${drift.length} file(s) -> ${deployedDir}: ${drift.join(", ")}`
      : `Already in sync -> ${deployedDir}`,
  );
}
