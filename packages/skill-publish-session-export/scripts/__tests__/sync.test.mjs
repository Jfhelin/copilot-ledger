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

const deployedDir = join(findRepoRoot(skillDir), ".github", "skills", "publish-session-export");

test("deployed copy of SKILL.md matches source", () => {
  const src = readFileSync(join(skillDir, "SKILL.md"), "utf8");
  const dest = readFileSync(join(deployedDir, "SKILL.md"), "utf8");
  assert.equal(
    dest,
    src,
    "SKILL.md drifted. Run `npm run sync --workspace=@copilot-ledger/skill-publish-session-export`.",
  );
});

