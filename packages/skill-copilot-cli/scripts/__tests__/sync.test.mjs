// Guards against drift between the canonical skill source
// (packages/skill-copilot-cli) and the deployed copy the Copilot CLI loads
// (.github/skills/copilot-cli-export).
// If this fails, run: npm run sync --workspace=@copilot-ledger/skill-copilot-cli

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, ".github"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not locate repo root above ${start}`);
}

const deployedDir = join(findRepoRoot(skillDir), ".github", "skills", "copilot-cli-export");

for (const rel of [
  "SKILL.md",
  join("scripts", "copilot-cli-digest.mjs"),
  join("scripts", "copilot-run.mjs"),
]) {
  test(`deployed copy of ${rel} matches source`, () => {
    const src = readFileSync(join(skillDir, rel), "utf8");
    const dest = readFileSync(join(deployedDir, rel), "utf8");
    assert.equal(
      dest,
      src,
      `${rel} drifted. Run \`npm run sync --workspace=@copilot-ledger/skill-copilot-cli\`.`,
    );
  });
}
