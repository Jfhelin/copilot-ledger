// Install this canvas extension into the Copilot CLI user extensions directory.
//
// The Copilot CLI discovers extensions by scanning real subdirectories that
// contain `extension.mjs`. It does NOT follow symlinked extension directories,
// so this script copies real files (extension.mjs, copilot-extension.json, and
// the cost-view dist/) into the target instead of linking.
//
// Usage:
//   node scripts/install-local.mjs              # stage a real copy
//   node scripts/install-local.mjs --uninstall  # remove the installed copy

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const extDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(extDir, "..", "cost-view", "dist");
const target = join(homedir(), ".copilot", "extensions", "copilot-ledger-canvas");
const uninstall = process.argv.includes("--uninstall");

// rmSync removes a symlink itself (not its target), which also cleans up the
// old symlink-based installs that never got discovered.
rmSync(target, { recursive: true, force: true });

if (uninstall) {
  console.log(`Removed ${target}`);
  process.exit(0);
}

if (!existsSync(join(distDir, "index.html"))) {
  console.error(
    `cost-view build not found at ${distDir}.\n` +
      `Run \`npm run build\` at the repo root first (or use \`npm run install-local\`, which builds it for you).`,
  );
  process.exit(1);
}

mkdirSync(target, { recursive: true });
for (const file of ["extension.mjs", "copilot-extension.json"]) {
  cpSync(join(extDir, file), join(target, file));
}
cpSync(distDir, join(target, "dist"), { recursive: true });

console.log(
  `Installed (real copy) -> ${target}\n` +
    `Now run \`extensions_reload\` in your Copilot CLI session to pick it up.`,
);
