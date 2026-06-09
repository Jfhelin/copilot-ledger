// Smoke / golden test for the claude-digest.mjs sidecar generator.
//
// Runs the real CLI against tiny fixtures (via --stdout so nothing is written
// to disk) and asserts the digest shape and key computed values. Uses Node's
// built-in test runner so the skill package stays zero-dependency.
//
//   node --test  (from packages/skill)

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "..", "claude-digest.mjs");
const transcript = path.join(here, "fixtures", "mini-claude-transcript.jsonl");
const capture = path.join(here, "fixtures", "mini-claude-capture.json");

function runDigest(extra = []) {
  const out = execFileSync("node", [script, transcript, "--stdout", ...extra], {
    encoding: "utf8",
  });
  return JSON.parse(out);
}

test("emits a versioned claude-code digest with all top-level sections", () => {
  const d = runDigest(["--no-capture"]);
  for (const key of [
    "session", "rollups", "pricing", "models", "toolsUsed",
    "toolCatalog", "skills", "mcpInstructions", "prefix", "prompts",
  ]) {
    assert.ok(key in d, `missing top-level key: ${key}`);
  }
  assert.equal(d.session.kind, "claude-code");
  assert.equal(typeof d.session.digestVersion, "number");
});

test("reads session metadata by merging across line types", () => {
  const d = runDigest(["--no-capture"]);
  assert.equal(d.session.claudeVersion, "2.1.169");
  assert.equal(d.session.entrypoint, "cli");
  assert.equal(d.session.cwd, "/work/proj");
  assert.equal(d.session.gitBranch, "main");
});

test("excludes slash-command echoes and system-reminders from turns", () => {
  const d = runDigest(["--no-capture"]);
  // Only "add a hello function" is a genuine prompt; the sidechain is a subagent.
  assert.equal(d.rollups.prompts, 1);
  assert.equal(d.rollups.subagentPrompts, 1);
  assert.equal(d.prompts[0].promptPreview, "add a hello function");
});

test("maps Anthropic usage to total-input token semantics", () => {
  const d = runDigest(["--no-capture"]);
  const r = d.rollups;
  assert.equal(r.requests, 3);
  // promptTokens = input + cacheRead + cacheCreate, summed across 3 assistant turns.
  assert.equal(r.promptTokens, 25380);
  assert.equal(r.completionTokens, 185);
  assert.equal(r.cachedTokens, 17000);
  assert.equal(r.cacheCreationTokens, 8200);
  assert.equal(r.cacheHitRate, Number((17000 / 25380).toFixed(4)));
});

test("counts tool calls, tool catalog, skills and thinking", () => {
  const d = runDigest(["--no-capture"]);
  assert.equal(d.rollups.toolCalls, 1);
  assert.deepEqual(d.toolsUsed, [{ name: "Read", calls: 1 }]);
  // `tools` is the digest.mjs-compatible alias of toolsUsed.
  assert.deepEqual(d.tools, d.toolsUsed);
  assert.equal(d.rollups.toolCount, 1);
  assert.deepEqual(d.toolCatalog.names, ["Bash", "Edit", "Read"]);
  assert.equal(d.toolCatalog.count, 3);
  assert.equal(d.skills.skillCount, 2);
  assert.equal(d.rollups.thinking.totalBlocks, 1);
  assert.equal(d.rollups.thinking.present, true);
});

test("excludes orphan (assistant-before-user) turns from the prompt count", () => {
  const orphanFixture = path.join(here, "fixtures", "mini-claude-orphan.jsonl");
  const out = execFileSync("node", [script, orphanFixture, "--stdout", "--no-capture"], {
    encoding: "utf8",
  });
  const d = JSON.parse(out);
  // Two assistant turns, but the first has no preceding user line -> orphan.
  assert.equal(d.rollups.requests, 2);
  assert.equal(d.rollups.prompts, 1);
  assert.equal(d.rollups.orphanPrompts, 1);
  assert.equal(d.prompts[0].isOrphan, true);
});

test("prices the session and reports modelled credits", () => {
  const d = runDigest(["--no-capture"]);
  const c = d.rollups.cost;
  assert.equal(c.allModelsPriced, true);
  assert.ok(c.totalUsd > 0);
  assert.ok(c.credits.total > 0);
  assert.equal(c.credits.billingModel, "anthropic-api-token-pricing");
  // withoutCache should exceed cached cost (cache saved money).
  assert.ok(c.withoutCacheUsd > c.totalUsd);
});

test("prefix is absent with --no-capture, present when a capture is paired", () => {
  const without = runDigest(["--no-capture"]);
  assert.equal(without.prefix.available, false);

  const withCap = runDigest(["--capture", capture]);
  assert.equal(withCap.prefix.available, true);
  const rep = withCap.prefix.representative;
  assert.equal(rep.systemApproxTokens, 500);
  assert.equal(rep.toolDefsApproxTokens, 3000);
  assert.equal(rep.toolCount, 3);
  assert.equal(rep.topTools[0].name, "Bash");
});

test("refuses to attribute an unrelated capture from a directory", () => {
  // A capture dir whose only file is from a different day/model must NOT be
  // attributed as this session's prefix.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "claude-cap-"));
  try {
    fs.writeFileSync(
      path.join(tmp, "unrelated.json"),
      JSON.stringify({
        capturedAt: "2020-01-01T00:00:00.000Z",
        model: "gpt-4o",
        sizing: { systemTokens: 9, toolsTokens: 9, messagesTokens: 9, toolCount: 99 },
        tools: [],
      }),
    );
    const out = execFileSync("node", [script, transcript, "--stdout", "--capture", tmp], {
      encoding: "utf8",
    });
    const d = JSON.parse(out);
    assert.equal(d.prefix.available, false);
    assert.equal(d.prefix.reason, "no-paired-capture");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
