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
import os from "node:os";
import fs from "node:fs";

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

test("strips the workspace root from file paths using <workspace_info>", () => {
  const root = "/Users/dev/Code/octo/supply-psychic-disco";
  const exportObj = {
    exportedAt: "2026-05-25T00:00:00.000Z",
    prompts: [
      {
        promptId: "p-paths",
        promptText: "edit a file",
        logs: [
          {
            kind: "request",
            time: "2026-05-25T00:00:00.000Z",
            name: "chat/completions",
            metadata: {
              model: "claude-sonnet-4",
              duration: 1000,
              usage: {
                prompt_tokens: 4000,
                completion_tokens: 5,
                prompt_tokens_details: { cached_tokens: 0 },
              },
            },
            requestMessages: {
              messages: [
                {
                  role: 1,
                  content: `<workspace_info>\n<workspaceFolder path="${root}">\n</workspace_info>`,
                },
              ],
            },
            response: { message: [{ text: "ok" }] },
          },
          {
            kind: "toolCall",
            time: "2026-05-25T00:00:01.000Z",
            name: "read_file",
            id: "tc-1",
            args: JSON.stringify({ filePath: `${root}/frontend/src/api/config.ts` }),
            response: "contents",
          },
        ],
      },
    ],
    mcpServers: [],
  };

  const tmp = path.join(os.tmpdir(), `digest-paths-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify(exportObj));
  try {
    const out = execFileSync("node", [digestScript, tmp, "--stdout"], { encoding: "utf8" });
    const d = JSON.parse(out);
    assert.equal(d.session.workspaceRoot, root);
    assert.deepEqual(d.session.workspaceFolders, [root]);
    const f = d.files.find((x) => x.path.endsWith("config.ts"));
    assert.equal(f.path, "./frontend/src/api/config.ts", "path is workspace-relative");
    assert.equal(f.rawPath, `${root}/frontend/src/api/config.ts`, "rawPath preserves the absolute path");
    const p = d.prompts.find((x) => x.promptId === "p-paths");
    assert.ok(
      p.filesTouched.includes("./frontend/src/api/config.ts"),
      "filesTouched is stripped too",
    );
  } finally {
    fs.rmSync(tmp, { force: true });
  }
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

test("splits tool-defs into sent (direct) vs deferred when virtual tools are active", () => {
  // A grouped run: the catalog has 5 tools, but the environment message defers
  // 3 of them name-only (<availableDeferredTools>), so only 2 full schemas are
  // sent. The tool-defs bucket must be sized from the SENT tools, not catalog.
  const catalog = ["t1", "t2", "t3", "t4", "t5"].map((n) => ({
    type: "function",
    function: { name: n, description: `desc ${n}`, parameters: { type: "object" } },
  }));
  const grouped = {
    exportedAt: "2026-05-25T00:00:00.000Z",
    prompts: [
      {
        promptId: "p-grouped",
        promptText: "hi",
        logs: [
          {
            kind: "request",
            time: "2026-05-25T00:00:00.000Z",
            name: "chat/completions",
            metadata: {
              model: "claude-sonnet-4",
              duration: 1000,
              tools: catalog,
              usage: {
                prompt_tokens: 5000,
                completion_tokens: 10,
                prompt_tokens_details: { cached_tokens: 0 },
              },
            },
            requestMessages: {
              messages: [
                { role: 0, content: "system <toolSearchInstructions>...</toolSearchInstructions>" },
                {
                  role: 1,
                  content:
                    "env <availableDeferredTools>\nAvailable deferred tools (must be loaded with tool_search before use):\nt3\nt4\nt5\n</availableDeferredTools> end",
                },
              ],
            },
            response: { message: [{ text: "hello" }] },
          },
        ],
      },
    ],
    mcpServers: [],
  };

  const tmp = path.join(os.tmpdir(), `digest-grouped-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify(grouped));
  try {
    const out = execFileSync("node", [digestScript, tmp, "--stdout"], { encoding: "utf8" });
    const d = JSON.parse(out);
    const row = d.timeline.find((r) => r.kind === "request");
    assert.equal(row.toolDefsCount, 2, "only 2 schemas were sent");
    assert.equal(row.toolDefsCatalogCount, 5, "catalog is 5");
    assert.equal(row.toolDefsDeferredCount, 3, "3 catalog tools deferred");
    assert.equal(row.toolDefsDeferredIndexCount, 3, "index lists 3 names");
    assert.ok(
      row.toolDefsApproxTokens < row.toolDefsCatalogIfFlatApproxTokens,
      "sent tokens are smaller than the flat-catalog worst case",
    );
    assert.ok(
      d.rollups.toolDefs.groupingSavedApproxTokens > 0,
      "grouping reports positive savings",
    );
    assert.equal(
      d.rollups.toolDefs.catalogIfFlatApproxTokens,
      d.rollups.toolDefs.approxTokensTotal + d.rollups.toolDefs.groupingSavedApproxTokens,
    );
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});
