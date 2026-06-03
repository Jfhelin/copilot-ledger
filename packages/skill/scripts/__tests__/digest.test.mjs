// Smoke / golden test for the digest.mjs sidecar generator.
//
// Runs the real CLI against a tiny fixture export (via --stdout so nothing is
// written to disk) and asserts the digest's shape and key computed values.
// Uses Node's built-in test runner so the skill package stays zero-dependency.
//
//   node --test  (from packages/skill)

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const digestScript = path.join(here, "..", "digest.mjs");
const fixture = path.join(here, "fixtures", "mini-export.json");

function runDigest() {
  const out = execFileSync("node", [digestScript, fixture, "--stdout"], {
    encoding: "utf8",
  });
  return JSON.parse(out);
}

test("emits a versioned digest with all top-level sections", () => {
  const d = runDigest();
  for (const key of [
    "session",
    "rollups",
    "pricing",
    "models",
    "tools",
    "files",
    "mcpServers",
    "prompts",
    "timeline",
  ]) {
    assert.ok(key in d, `missing top-level key: ${key}`);
  }
  assert.equal(typeof d.session.digestVersion, "number");
});

test("rolls up prompts, requests, tool calls and tokens", () => {
  const d = runDigest();
  assert.equal(d.rollups.prompts, 2);
  assert.equal(d.rollups.requests, 2);
  assert.equal(d.rollups.toolCalls, 2);
  // 12000 + 3000 prompt tokens across the two requests.
  assert.equal(d.rollups.promptTokens, 15000);
  assert.equal(d.rollups.completionTokens, 800);
  assert.equal(d.rollups.cachedTokens, 9000);
});

test("discovers models, tools, files and mcp servers", () => {
  const d = runDigest();
  assert.deepEqual(
    d.models.map((m) => m.name).sort(),
    ["claude-haiku-4", "claude-sonnet-4"],
  );
  assert.deepEqual(d.tools.map((t) => t.name).sort(), ["read_file", "runSubagent"]);
  assert.deepEqual(
    d.files.map((f) => f.path),
    ["src/auth.ts"],
  );
  assert.deepEqual(d.mcpServers.map((m) => m.label), ["github"]);
});

test("prices known models and reports credits", () => {
  const d = runDigest();
  assert.equal(d.rollups.cost.allModelsPriced, true);
  assert.ok(d.rollups.cost.credits.total > 0, "expected a positive credit total");
  assert.equal(d.pricing.creditsPerUsd, 100);
});

test("links a spawned subagent prompt back to its runSubagent call", () => {
  const d = runDigest();
  const sub = d.prompts.find((p) => p.promptId === "prompt-sub");
  const parent = d.prompts.find((p) => p.promptId === "prompt-main");
  assert.equal(sub.isSubagent, true);
  assert.equal(sub.spawnedBy, "p0.l2");
  assert.equal(parent.spawnedSubagents.length, 1);
  assert.equal(parent.spawnedSubagents[0].subagentRef, "p1");
});

test("exits non-zero with a usage message when no input is given", () => {
  let threw = false;
  try {
    execFileSync("node", [digestScript], { encoding: "utf8", stdio: "pipe" });
  } catch (err) {
    threw = true;
    assert.equal(err.status, 2);
    assert.match(String(err.stderr), /usage:/);
  }
  assert.ok(threw, "expected digest.mjs to exit non-zero without an argument");
});
