// Unit tests for the relay's summarize() — the pure body-decoder that turns a
// raw /v1/messages request into a sized { system, tools, messages } capture.
// Importing the module must NOT bind a port (guarded by the run-directly check).

import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize, approxTokens } from "../claude-relay.mjs";

test("approxTokens estimates chars/4 and tolerates empty input", () => {
  assert.equal(approxTokens(""), 0);
  assert.equal(approxTokens(null), 0);
  assert.equal(approxTokens("abcd"), 1);
  assert.equal(approxTokens("a".repeat(40)), 10);
});

test("summarize returns null for non-JSON bodies", () => {
  assert.equal(summarize("not json", "/v1/messages"), null);
});

test("summarize sizes system (string), tools and messages, and labels endpoint", () => {
  const body = JSON.stringify({
    model: "claude-sonnet-4-5",
    stream: true,
    max_tokens: 8192,
    system: "x".repeat(400), // ~100 tok
    tools: [
      { name: "Read", description: "y".repeat(200), input_schema: { type: "object" } },
    ],
    messages: [{ role: "user", content: "hello" }],
  });

  const out = summarize(body, "/v1/messages");
  assert.equal(out.endpoint, "/v1/messages");
  assert.equal(out.model, "claude-sonnet-4-5");
  assert.equal(out.sizing.toolCount, 1);
  assert.equal(out.sizing.messageCount, 1);
  assert.equal(out.sizing.systemTokens, 100);
  assert.ok(out.sizing.toolsTokens > 50, "tool tokens include name+desc+schema");
  assert.equal(out.tools[0].name, "Read");
  assert.equal(out.messages[0].contentTypes, "string");
});

test("summarize flattens an array-form system prompt", () => {
  const body = JSON.stringify({
    system: [
      { type: "text", text: "aaaa" },
      { type: "text", text: "bbbb" },
    ],
    messages: [],
  });
  const out = summarize(body, "/v1/messages");
  // "aaaa\nbbbb" = 9 chars -> round(9/4) = 2
  assert.equal(out.system, "aaaa\nbbbb");
  assert.equal(out.sizing.systemTokens, 2);
});

test("summarize records structured message content types", () => {
  const body = JSON.stringify({
    messages: [
      { role: "user", content: [{ type: "text", text: "hi" }, { type: "image" }] },
    ],
  });
  const out = summarize(body, "/v1/messages/count_tokens");
  assert.equal(out.endpoint, "/v1/messages/count_tokens");
  assert.deepEqual(out.messages[0].contentTypes, ["text", "image"]);
});

test("summarize defaults endpoint when not provided", () => {
  const out = summarize(JSON.stringify({ messages: [] }));
  assert.equal(out.endpoint, "/v1/messages");
});
