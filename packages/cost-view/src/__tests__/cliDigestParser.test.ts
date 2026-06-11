import { describe, it, expect } from "vitest";
import { detectCliDigest, parseCliDigest } from "../lib/cliDigestParser";
import { detectFormat, parseSession } from "../lib/parseSession";

const copilotDigestJson = JSON.stringify({
  session: { digestVersion: 1, kind: "copilot-cli", copilotVersion: "1.0.60" },
  rollups: {
    prompts: 1,
    requests: 4,
    toolCalls: 13,
    promptTokens: 80835,
    completionTokens: 2371,
    cachedTokens: 63077,
    cacheCreationTokens: 14336,
    cacheHitRate: 0.7803,
    primaryModel: "claude-sonnet-4-5-20250929",
    cost: { native: { impliedUsd: 0.118514, credits: 11.85 }, tokenNormalized: { totalUsd: 0.1185 } },
  },
  prefix: { representative: { systemApproxTokens: 6657, toolDefsApproxTokens: 8064 } },
  prompts: [{ ref: "p0", requestCount: 4 }],
});

const claudeDigestJson = JSON.stringify({
  session: { digestVersion: 1, kind: "claude-code" },
  rollups: {
    prompts: 1,
    requests: 19,
    toolCalls: 16,
    promptTokens: 639084,
    completionTokens: 6100,
    wallSpanMs: 77223,
    primaryModel: "claude-sonnet-4-5-20250929",
    cost: { totalUsd: 0.495944 },
  },
  prompts: [{ ref: "p0" }],
});

const chatExportJson = JSON.stringify({
  exportedAt: "2026-06-08T10:07:13.416Z",
  totalPrompts: 1,
  prompts: [{ prompt: "hi", logs: [{ kind: "request" }] }],
});

describe("detectCliDigest", () => {
  it("detects copilot + claude digests", () => {
    expect(detectCliDigest(copilotDigestJson)).toBe(true);
    expect(detectCliDigest(claudeDigestJson)).toBe(true);
  });
  it("does not detect a VS Code chat export as a digest", () => {
    expect(detectCliDigest(chatExportJson)).toBe(false);
  });
  it("rejects junk", () => {
    expect(detectCliDigest("not json")).toBe(false);
    expect(detectCliDigest("[]")).toBe(false);
  });
});

describe("detectFormat routing", () => {
  it("routes the digest to cli-digest, not copilot-chat-export", () => {
    expect(detectFormat(copilotDigestJson)).toBe("cli-digest");
    expect(detectFormat(chatExportJson)).toBe("copilot-chat-export");
  });
});

describe("parseCliDigest", () => {
  it("maps copilot rollups + native cost into metadata", () => {
    const parsed = parseCliDigest(copilotDigestJson);
    expect(parsed).not.toBeNull();
    const m = parsed.metadata;
    expect(m.format).toBe("copilot-cli");
    expect(m.totalTurns).toBe(1);
    expect(m.totalToolCalls).toBe(13);
    expect(m.primaryModel).toBe("claude-sonnet-4-5-20250929");
    expect(m.tokenUsage?.inputTokens).toBe(80835);
    expect(m.tokenUsage?.cacheRead).toBe(63077);
    // Native authoritative USD is preferred over the token-normalized estimate.
    expect(m.totalCost).toBeCloseTo(0.118514, 6);
    expect(m.totalCostUnit).toBe("usd");
    expect(m.cliDigest).toBeTruthy();
    expect(parsed.events).toEqual([]);
  });

  it("uses totalUsd for claude (no native block)", () => {
    const parsed = parseCliDigest(claudeDigestJson);
    expect(parsed.metadata.format).toBe("claude-code");
    expect(parsed.metadata.totalCost).toBeCloseTo(0.495944, 6);
    expect(parsed.metadata.duration).toBe(77223);
  });

  it("is reachable through the top-level parseSession router", () => {
    const parsed = parseSession(claudeDigestJson);
    expect(parsed?.metadata.cliDigest).toBeTruthy();
  });
});
