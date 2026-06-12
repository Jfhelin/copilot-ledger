// Unit tests for verify-capture.mjs — the PASS/FAIL gate that confirms a relay
// capture really contains an IDE/extension's wire payload. Uses a temp dir;
// importing the module must NOT run main() or exit.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verify, parseArgs } from "../verify-capture.mjs";

function tmp() {
  return mkdtempSync(join(tmpdir(), "verify-capture-"));
}

function writeCapture(dir, name, sizing, opts = {}) {
  writeFileSync(
    join(dir, name),
    JSON.stringify({
      endpoint: opts.endpoint || "/v1/messages",
      model: "claude-sonnet-4-5",
      sizing,
      messages: opts.messages || [{ role: "user", content: "hi" }],
    }),
  );
}

test("FAIL when capture dir is missing", () => {
  const r = verify(join(tmpdir(), "does-not-exist-xyz"));
  assert.equal(r.pass, false);
});

test("FAIL when relay was never routed through (no REQ lines)", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "index.log"), "2026  REQ GET /v1/models Host=x\n");
    writeCapture(dir, "a.json", { systemTokens: 100, toolsTokens: 200, toolCount: 5, messagesTokens: 5, messageCount: 1 });
    const r = verify(dir);
    assert.equal(r.pass, false);
    assert.equal(r.checks.routedRequests, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("PASS with a routed /v1/messages request and a real wire body", () => {
  const dir = tmp();
  try {
    writeFileSync(
      join(dir, "index.log"),
      "2026  REQ POST /v1/messages Host=127.0.0.1:8788\n",
    );
    writeCapture(dir, "a.json", {
      systemTokens: 6653,
      toolsTokens: 37000,
      toolCount: 30,
      messagesTokens: 25,
      messageCount: 1,
    });
    const r = verify(dir);
    assert.equal(r.pass, true);
    assert.equal(r.checks.routedRequests, 1);
    assert.equal(r.checks.bestCapture.total, 6653 + 37000 + 25);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("count_tokens-only captures do not satisfy the wire-body check", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "index.log"), "2026  REQ POST /v1/messages/count_tokens Host=x\n");
    writeCapture(dir, "a.json", { systemTokens: 6653, toolsTokens: 37000, toolCount: 30, messagesTokens: 25, messageCount: 1 }, { endpoint: "/v1/messages/count_tokens" });
    const r = verify(dir);
    // count_tokens is not counted as a routed /v1/messages, and is skipped as a body.
    assert.equal(r.pass, false);
    assert.equal(r.checks.bestCapture, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("reconciles with transcript turn-0 cache_creation within 10%", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "index.log"), "REQ POST /v1/messages Host=x\n");
    writeCapture(dir, "a.json", { systemTokens: 6653, toolsTokens: 37000, toolCount: 30, messagesTokens: 25, messageCount: 1 });
    const tpath = join(dir, "transcript.jsonl");
    writeFileSync(
      tpath,
      JSON.stringify({ type: "assistant", message: { usage: { cache_creation_input_tokens: 46364 } } }) + "\n",
    );
    const r = verify(dir, { transcript: tpath });
    assert.equal(r.pass, true);
    assert.equal(r.checks.transcriptCacheCreation, 46364);
    assert.ok(r.checks.transcriptDelta <= 0.1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--expect mismatch beyond 10% fails", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "index.log"), "REQ POST /v1/messages Host=x\n");
    writeCapture(dir, "a.json", { systemTokens: 1000, toolsTokens: 1000, toolCount: 5, messagesTokens: 25, messageCount: 1 });
    const r = verify(dir, { expect: 46364 });
    assert.equal(r.pass, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("parseArgs reads positional dir and flags", () => {
  const o = parseArgs(["/some/dir", "--transcript", "/t.jsonl", "--expect", "46364", "--json"]);
  assert.equal(o.captureDir, "/some/dir");
  assert.equal(o.transcript, "/t.jsonl");
  assert.equal(o.expect, 46364);
  assert.equal(o.json, true);
});
