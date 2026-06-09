// Golden test for copilot-cli-digest.mjs.
//
// Runs the real CLI against a tiny fixture log (via --stdout so nothing is
// written) and asserts the digest shape and key computed values. Uses Node's
// built-in test runner so the package stays zero-dependency.
//
//   node --test  (from packages/skill-copilot-cli)

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "..", "copilot-cli-digest.mjs");
const log = path.join(here, "fixtures", "mini-copilot-cli.log");

function runDigest(extra = []) {
  const out = execFileSync("node", [script, log, "--stdout", ...extra], { encoding: "utf8" });
  return JSON.parse(out);
}

test("emits a versioned copilot-cli digest with all top-level sections", () => {
  const d = runDigest();
  for (const key of [
    "session", "rollups", "pricing", "models", "toolsUsed",
    "toolCatalog", "prefix", "prompts",
  ]) {
    assert.ok(key in d, `missing top-level key: ${key}`);
  }
  assert.equal(d.session.kind, "copilot-cli");
  assert.equal(typeof d.session.digestVersion, "number");
});

test("reads session metadata from plain log lines", () => {
  const d = runDigest();
  assert.equal(d.session.copilotVersion, "1.0.60");
  assert.equal(d.session.workspaceId, "f91bffa0-0b1e-433c-94a2-80f6a9fb2483");
  assert.equal(d.session.groupingConfidence, "high");
  assert.deepEqual(d.session.warnings, []);
});

test("groups a single -p prompt with its follow-up requests", () => {
  const d = runDigest();
  assert.equal(d.rollups.prompts, 1);
  assert.equal(d.rollups.orphanPrompts, 0);
  // CLI plumbing (<current_datetime>, <system_reminder>) is stripped from the preview.
  assert.equal(d.prompts[0].promptPreview, "Explain the repo.");
  assert.equal(d.prompts[0].finalAssistantPreview, "The repo is a demo.");
});

test("dedupes responses by id so native credits are not double counted", () => {
  const d = runDigest();
  // Two unique responses (msg_1, msg_2); the poorer msg_1 duplicate is dropped.
  assert.equal(d.rollups.requests, 2);
  assert.equal(d.rollups.responsesWithNativeBilling, 2);
  assert.equal(d.rollups.nativeBillingComplete, true);
});

test("maps usage to total-input token semantics and surfaces fresh input", () => {
  const r = runDigest().rollups;
  // promptTokens = fresh + cacheRead + cacheCreation, summed over the 2 responses.
  assert.equal(r.promptTokens, 2200);
  assert.equal(r.freshInputTokens, 200);
  assert.equal(r.cachedTokens, 1000);
  assert.equal(r.cacheCreationTokens, 1000);
  assert.equal(r.completionTokens, 130);
  assert.equal(r.reasoningTokens, 30);
  assert.equal(r.cacheHitRate, Number((1000 / 2200).toFixed(4)));
});

test("reports EXACT native GitHub credits from copilot_usage.total_nano_aiu", () => {
  const c = runDigest().rollups.cost;
  assert.equal(c.primary, "native-github-credits");
  // 442_500_000 + 217_500_000 = 660_000_000 nano-AIU = 0.66 credits.
  assert.equal(c.native.credits, 0.66);
  assert.equal(c.native.totalNanoAiu, "660000000");
  assert.equal(c.native.authoritative, true);
  assert.equal(c.native.billingModel, "github-ai-credits-native");
  // byType decomposition sums back to the total.
  const byType = c.native.byTypeCredits;
  const sum = byType.input + byType.cache_read + byType.cache_write + byType.output;
  assert.ok(Math.abs(sum - 0.66) < 1e-6, `byType sum ${sum} != 0.66`);
});

test("emits a clearly-labelled, non-authoritative token-normalized estimate", () => {
  const c = runDigest().rollups.cost;
  assert.equal(c.tokenNormalized.authoritative, false);
  assert.equal(c.tokenNormalized.billingModel, "token-normalized-model-estimate");
  assert.ok(c.tokenNormalized.totalUsd > 0);
  assert.equal(c.tokenNormalized.allModelsPriced, true);
});

test("counts tool calls and the advertised tool catalog with schemas", () => {
  const d = runDigest();
  assert.equal(d.rollups.toolCalls, 1);
  assert.deepEqual(d.toolsUsed, [{ name: "view", calls: 1 }]);
  assert.deepEqual(d.tools, d.toolsUsed);
  assert.deepEqual(d.toolCatalog.names, ["bash", "view"]);
  assert.equal(d.toolCatalog.count, 2);
});

test("reconstructs context-window shape from the wire request, incl. skill blocks", () => {
  const rep = runDigest().prefix.representative;
  assert.equal(rep.toolCount, 2);
  assert.ok(rep.systemApproxTokens > 0);
  assert.ok(rep.toolDefsApproxTokens > 0);
  assert.equal(rep.skillBlockCount, 1);
  assert.ok(rep.toolDefsShareOfPrefix > 0 && rep.toolDefsShareOfPrefix <= 1);
  assert.ok(rep.topTools.length > 0);
});

test("authoritative model is the full snapshot from the response", () => {
  const d = runDigest();
  assert.equal(d.rollups.primaryModel, "claude-sonnet-4-5-20250929");
});
