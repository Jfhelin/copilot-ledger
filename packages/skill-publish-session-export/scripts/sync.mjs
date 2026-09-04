import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
const deployedDir = join(repoRoot, ".github", "skills", "publish-session-export");
const files = ["SKILL.md"];
const check = process.argv.includes("--check");
const drift = [];

for (const rel of files) {
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
        `Run \`npm run sync --workspace=@copilot-ledger/skill-publish-session-export\` to update ${deployedDir}.`,
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

