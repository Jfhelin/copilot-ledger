import { describe, it, expect } from "vitest";
import { sanitizeDigest, isCliDigest } from "../lib/sanitizeDigest.js";

function copilotDigest() {
  return {
    session: {
      digestVersion: 2,
      kind: "copilot-cli",
      copilotVersion: "1.0.60",
      sourceFile: "/Users/someone/.copilot/x/logs/process-1.log",
      sourceSizeBytes: 1001590,
      sourceMtimeMs: 1781030450553,
      workspaceId: "3682cadc-e3f6-49a8-92e1-3bc8118b18e6",
      cwd: "/private/tmp/octocat_supply_ak",
      lineCount: 16978,
      groupingConfidence: "high",
      warnings: ["could not read /Users/someone/secret/path.json"],
    },
    rollups: { prompts: 1, requests: 4, toolCalls: 13, cacheHitRate: 0.78 },
    files: [{ path: "/private/tmp/octocat_supply_ak/README.md" }],
    tools: [{ name: "view", calls: 12 }],
    toolsUsed: [{ name: "view", calls: 12 }],
    toolCatalog: { count: 19, names: ["bash", "create", "edit"] },
    skills: { skillCount: 3, names: ["security-review", "run", "init"], approxCatalogTokens: 900 },
    mcpInstructions: { names: ["github"], approxTokens: 120 },
    prefix: {
      source: "process log /Users/someone/.copilot/x/logs/process-1.log",
      captures: [{ file: "2026-06-09T18-18-47-402Z-008.json", systemApproxTokens: 6657 }],
      representative: {
        model: "claude-sonnet-4.5",
        systemApproxTokens: 6657,
        toolDefsApproxTokens: 8064,
        messagesApproxTokens: 156,
        toolDefsShareOfPrefix: 0.542,
        topTools: [{ name: "task", approxTokens: 1544 }],
      },
    },
    prompts: [
      {
        ref: "p0",
        promptText: "You are helping a new developer ... (full verbatim)",
        promptPreview: "You are helping a new developer ...",
        requestCount: 4,
        toolCallCount: 13,
        tools: ["view"],
        finalAssistantPreview: "This repo is ...",
        timeline: [
          {
            kind: "llm",
            model: "claude-sonnet-4.5",
            tokens: { fresh: 200, cached: 9000, cacheWrite: 7000, output: 300, reasoning: 80 },
            cost: { unit: "credits", total: 7.4, fresh: 0.06, cached: 0.27, cacheWrite: 6.6, output: 0.47 },
            // sneaky fields that MUST be dropped by the key whitelist:
            input: "SECRET wire request body",
            text: "secret assistant text",
          },
          { kind: "tool", name: "view", contextTokens: 956, input: { file: "/private/tmp/secret.md" } },
        ],
      },
    ],
  };
}

function claudeDigest() {
  const d = copilotDigest();
  d.session.kind = "claude-code";
  d.session.sessionId = "795b486b";
  d.session.gitBranch = "HEAD";
  d.session.captureSignature = '{"mode":"relay"}';
  d.prefix.source = "relay-capture";
  d.prefix.representative.file = "2026-06-09T18-18-47-402Z-008.json";
  return d;
}

describe("isCliDigest", () => {
  it("accepts a CLI digest", () => {
    expect(isCliDigest(copilotDigest())).toBe(true);
  });
  it("rejects a VS Code chat export shape", () => {
    expect(isCliDigest({ exportedAt: "x", prompts: [] })).toBe(false);
  });
  it("rejects null / non-objects", () => {
    expect(isCliDigest(null)).toBe(false);
    expect(isCliDigest("nope")).toBe(false);
  });
});

describe("sanitizeDigest -- always-on stripping", () => {
  it("removes local identifiers and verbatim prompt for any kind", () => {
    const out = sanitizeDigest(copilotDigest());
    expect(out.session.sourceFile).toBeUndefined();
    expect(out.session.sourceSizeBytes).toBeUndefined();
    expect(out.session.sourceMtimeMs).toBeUndefined();
    expect(out.session.workspaceId).toBeUndefined();
    expect(out.session.cwd).toBeUndefined();
    expect(out.files).toBeUndefined();
    expect(out.prompts[0].promptText).toBeUndefined();
    expect(out.session.redacted).toBe(true);
  });

  it("scrubs absolute paths out of warnings", () => {
    const out = sanitizeDigest(copilotDigest());
    expect(out.session.warnings[0]).not.toContain("/Users/");
    expect(out.session.warnings[0]).toContain("<path>");
  });

  it("does not mutate the input object", () => {
    const input = copilotDigest();
    sanitizeDigest(input);
    expect(input.session.sourceFile).toBe("/Users/someone/.copilot/x/logs/process-1.log");
    expect(input.prompts[0].promptText).toContain("verbatim");
  });

  it("throws on non-digest input", () => {
    expect(() => sanitizeDigest({ exportedAt: "x" })).toThrow();
  });
});

describe("sanitizeDigest -- self-emitted profile (copilot-cli)", () => {
  const out = sanitizeDigest(copilotDigest());
  it("is labelled self-emitted-full and flags text as not redacted", () => {
    expect(out.session.redactionProfile).toBe("self-emitted-full");
    expect(out.session.textRedacted).toBe(false);
    expect(out.session.callFlowVisible).toBe(true);
  });
  it("keeps tool names, skill names, and the catalog", () => {
    expect(out.toolCatalog.names).toEqual(["bash", "create", "edit"]);
    expect(out.tools[0].name).toBe("view");
    expect(out.prefix.representative.topTools[0].name).toBe("task");
    expect(out.prompts[0].tools).toEqual(["view"]);
    expect(out.skills.names).toEqual(["security-review", "run", "init"]);
  });
  it("keeps previews", () => {
    expect(out.prompts[0].promptPreview).toBeTruthy();
    expect(out.prompts[0].finalAssistantPreview).toBeTruthy();
  });
  it("keeps composition proportions", () => {
    expect(out.prefix.representative.systemApproxTokens).toBe(6657);
    expect(out.prefix.representative.toolDefsShareOfPrefix).toBe(0.542);
  });
  it("keeps the timeline but whitelists entry keys (drops sneaky input/text)", () => {
    const t = out.prompts[0].timeline;
    expect(Array.isArray(t)).toBe(true);
    const llm = t.find((e) => e.kind === "llm");
    expect(llm.model).toBe("claude-sonnet-4.5");
    expect(llm.tokens.cached).toBe(9000);
    expect(llm.cost.total).toBe(7.4);
    expect(llm.input).toBeUndefined();
    expect(llm.text).toBeUndefined();
    const tool = t.find((e) => e.kind === "tool");
    expect(tool.name).toBe("view");
    expect(tool.input).toBeUndefined();
    expect(tool.contextTokens).toBe(956); // size kept (a number, not content)
  });
});

describe("sanitizeDigest -- proxy-modelled profile (claude-code)", () => {
  const out = sanitizeDigest(claudeDigest());
  it("is labelled proxy-modelled with text + tool-defs redaction flags", () => {
    expect(out.session.redactionProfile).toBe("proxy-modelled");
    expect(out.session.textRedacted).toBe(true);
    expect(out.session.toolDefinitionsRedacted).toBe(true);
    expect(out.session.callFlowVisible).toBe(true);
  });
  it("keeps composition proportions (the article-2 stat)", () => {
    expect(out.prefix.representative.systemApproxTokens).toBe(6657);
    expect(out.prefix.representative.toolDefsApproxTokens).toBe(8064);
    expect(out.prefix.representative.toolDefsShareOfPrefix).toBe(0.542);
  });
  it("drops advertised tool-definition NAMES and the catalog", () => {
    expect(out.prefix.representative.topTools).toEqual([]);
    expect(out.toolCatalog).toEqual({ count: 19 });
    expect(out.tools).toBeUndefined();
    expect(out.toolsUsed).toBeUndefined();
    expect(out.prompts[0].tools).toBeUndefined();
  });
  it("reduces skill and MCP listings to counts (no names)", () => {
    expect(out.skills).toEqual({ skillCount: 3, approxCatalogTokens: 900 });
    expect(out.skills.names).toBeUndefined();
    expect(out.mcpInstructions.names).toBeUndefined();
    expect(out.mcpInstructions.count).toBe(1);
  });
  it("drops previews, relay capture filenames, and scrubs the prefix source", () => {
    expect(out.prompts[0].promptPreview).toBeUndefined();
    expect(out.prompts[0].finalAssistantPreview).toBeUndefined();
    expect(out.prefix.representative.file).toBeUndefined();
    expect(out.prefix.captures).toBeUndefined();
    expect(out.prefix.captureCount).toBe(1);
  });
  it("KEEPS the call timeline incl. called tool NAMES (Option B), no text", () => {
    const t = out.prompts[0].timeline;
    expect(Array.isArray(t)).toBe(true);
    const llm = t.find((e) => e.kind === "llm");
    expect(llm.cost.total).toBe(7.4);
    expect(llm.input).toBeUndefined();
    expect(llm.text).toBeUndefined();
    const tool = t.find((e) => e.kind === "tool");
    expect(tool.name).toBe("view"); // called-tool name retained
    expect(tool.input).toBeUndefined(); // but never the tool input
    expect(tool.contextTokens).toBe(956); // result SIZE kept (number, not content)
  });
  it("still strips session identifiers", () => {
    expect(out.session.sessionId).toBeUndefined();
    expect(out.session.gitBranch).toBeUndefined();
    expect(out.session.captureSignature).toBeUndefined();
  });
  it("keeps headline rollups", () => {
    expect(out.rollups.requests).toBe(4);
    expect(out.rollups.toolCalls).toBe(13);
  });
});
