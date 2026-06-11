// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import CostView from "../components/CostView.jsx";
import CliRunView from "../components/CliRunView.jsx";
import { parseSession } from "../lib/parseSession.ts";

function text(container) {
  return container.textContent || "";
}

// digestVersion 2 -- carries a per-call `timeline`. Self-emitted (Copilot): real
// native-credit cost, tool names kept.
const copilotDigest = {
  session: { digestVersion: 2, kind: "copilot-cli", copilotVersion: "1.0.60", redactionProfile: "self-emitted-full", textRedacted: false, callFlowVisible: true },
  rollups: {
    prompts: 1,
    requests: 2,
    toolCalls: 3,
    promptTokens: 80835,
    freshInputTokens: 3422,
    completionTokens: 2371,
    cachedTokens: 63077,
    cacheHitRate: 0.78,
    primaryModel: "claude-sonnet-4-5-20250929",
    cost: { native: { authoritative: true, credits: 11.85, impliedUsd: 0.118514 } },
  },
  prefix: {
    representative: {
      systemApproxTokens: 6657,
      toolDefsApproxTokens: 8064,
      messagesApproxTokens: 156,
      prefixApproxTokens: 14877,
      toolDefsShareOfPrefix: 0.542,
      skillBlockCount: 0,
      topTools: [{ name: "task", approxTokens: 1544 }],
    },
  },
  prompts: [
    {
      ref: "p0",
      requestCount: 2,
      toolCallCount: 3,
      promptTokens: 80835,
      completionTokens: 2371,
      promptPreview: "You are helping a new developer",
      timeline: [
        { kind: "llm", model: "claude-sonnet-4-5-20250929", tokens: { fresh: 200, cached: 9000, cacheWrite: 7000, output: 300, reasoning: 80 }, cost: { unit: "credits", total: 7.4, fresh: 0.06, cached: 0.27, cacheWrite: 6.6, output: 0.47 } },
        { kind: "tool", name: "report_intent", contextTokens: 4 },
        { kind: "tool", name: "view", contextTokens: 956 },
        { kind: "llm", model: "claude-sonnet-4-5-20250929", tokens: { fresh: 100, cached: 9071, cacheWrite: 0, output: 200 }, cost: { unit: "credits", total: 4.45, fresh: 0.05, cached: 0.2, cacheWrite: 0, output: 0.3 } },
        { kind: "tool", name: "view", contextTokens: 24 },
      ],
    },
  ],
};

// Proxy-captured (Claude): modelled cost, flow + tool names kept, but system
// prompt / tool definitions / text withheld.
const claudeDigest = {
  session: { digestVersion: 2, kind: "claude-code", redactionProfile: "proxy-modelled", textRedacted: true, toolDefinitionsRedacted: true, callFlowVisible: true },
  rollups: {
    prompts: 1,
    requests: 2,
    toolCalls: 2,
    promptTokens: 639084,
    completionTokens: 6100,
    primaryModel: "claude-sonnet-4-5-20250929",
    cost: { totalUsd: 0.495944 },
  },
  prefix: { representative: { systemApproxTokens: 7015, toolDefsApproxTokens: 18877, messagesApproxTokens: 1325, prefixApproxTokens: 27217, toolDefsShareOfPrefix: 0.6936, topTools: [] } },
  prompts: [
    {
      ref: "p0",
      requestCount: 2,
      toolCallCount: 2,
      promptTokens: 639084,
      completionTokens: 6100,
      costUsd: 0.495944,
      timeline: [
        { kind: "llm", model: "claude-sonnet-4-5-20250929", tokens: { fresh: 10, cached: 21264, cacheWrite: 8179, output: 249 }, cost: { unit: "usd", total: 0.0408, fresh: 0.00003, cached: 0.0063, cacheWrite: 0.0306, output: 0.0037 } },
        { kind: "tool", name: "Bash", contextTokens: 188 },
        { kind: "tool", name: "Read", contextTokens: 924 },
      ],
    },
  ],
};

// Legacy v1 digest (no timeline) -- exercises the per-prompt aggregate fallback.
const legacyDigest = {
  session: { digestVersion: 1, kind: "copilot-cli", redactionProfile: "self-emitted-full" },
  rollups: { prompts: 1, requests: 4, toolCalls: 13, promptTokens: 80835, completionTokens: 2371, cachedTokens: 63077, cacheHitRate: 0.78, primaryModel: "claude-sonnet-4-5-20250929", cost: { native: { authoritative: true, credits: 11.85, impliedUsd: 0.118514 } } },
  prefix: { representative: { systemApproxTokens: 6657, toolDefsApproxTokens: 8064, messagesApproxTokens: 156, prefixApproxTokens: 14877, toolDefsShareOfPrefix: 0.542, topTools: [] } },
  prompts: [{ ref: "p0", requestCount: 4, toolCallCount: 13, promptTokens: 80835, cachedTokens: 63077, cacheCreationTokens: 14336, completionTokens: 2371, models: ["claude-sonnet-4-5-20250929"], tools: ["report_intent", "view"], nativeCredits: 11.85, promptPreview: "Explain the repo" }],
};

let container;
let root;

beforeEach(function () {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(function () {
  act(function () { root.unmount(); });
  container.remove();
});

describe("CliRunView -- timeline (digestVersion 2)", () => {
  it("renders Copilot native credits, composition, and the call timeline", () => {
    act(function () { root.render(<CliRunView digest={copilotDigest} />); });
    const t = text(container);
    expect(t).toContain("Copilot CLI run");
    expect(t).toContain("GitHub AI credits");
    expect(t).toContain("11.85");
    expect(t).toContain("Tool defs");
    expect(t).toContain("task"); // top tool name kept for self-emitted
    expect(t).toContain("Call timeline");
    expect(t).toContain("LLM call #1");
    expect(t).toContain("LLM call #2");
  });

  it("shows tool-call rows with their names and context-added tokens, in order", () => {
    act(function () { root.render(<CliRunView digest={copilotDigest} />); });
    const t = text(container);
    expect(t).toContain("report_intent");
    expect(t).toContain("view");
    expect(t).toContain("tool");
    // each tool row reports how much new content entered the context window
    expect(t).toContain("ctx");
  });

  it("renders LLM-call rows statically (no expand control, no per-call detail panel)", () => {
    act(function () { root.render(<CliRunView digest={copilotDigest} />); });
    const t = text(container);
    // the old expandable detail labels are gone; the row is no longer interactive
    expect(t).not.toContain("Input (total)");
    expect(t).not.toContain("cached read");
    expect(t).not.toContain("This call");
    // but the compact per-call token summary is shown inline
    expect(t).toContain("out");
  });

  it("renders Claude modelled cost, the new badge, and keeps called tool names", () => {
    act(function () { root.render(<CliRunView digest={claudeDigest} />); });
    const t = text(container);
    expect(t).toContain("Claude CLI run");
    expect(t).toContain("Modelled cost");
    expect(t).toContain("modelled cost"); // badge copy
    expect(t).toContain("withheld");
    expect(t).toContain("69%"); // composition proportions still shown
    expect(t).toContain("Bash"); // called tool names ARE shown now (Option B)
    expect(t).toContain("Read");
    expect(t).not.toContain("task"); // advertised tool-def names still withheld
    expect(t).not.toContain("Largest tool definitions");
  });

  it("renders the cumulative run-cost legend and caption", () => {
    act(function () { root.render(<CliRunView digest={copilotDigest} />); });
    const t = text(container);
    expect(t).toContain("cumulative run cost");
    expect(t).toContain("Fresh input");
    expect(t).toContain("Cache write");
    expect(t).toContain("context window");
  });
});

describe("CliRunView -- legacy fallback (no timeline)", () => {
  it("falls back to per-prompt LLM/tool sub-headers", () => {
    act(function () { root.render(<CliRunView digest={legacyDigest} />); });
    const t = text(container);
    expect(t).toContain("LLM calls");
    expect(t).toContain("Tool calls");
    expect(t).toContain("cumulative");
    expect(t).not.toContain("Call timeline");
  });
});

describe("CostView branch", () => {
  it("delegates to CliRunView when metadata.cliDigest is present", () => {
    const parsed = parseSession(JSON.stringify(copilotDigest));
    act(function () { root.render(<CostView events={parsed.events} metadata={parsed.metadata} />); });
    expect(text(container)).toContain("Copilot CLI run");
  });
});
