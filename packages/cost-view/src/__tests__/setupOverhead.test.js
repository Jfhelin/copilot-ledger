import { describe, expect, it } from "vitest";
import { computeUnusedToolDefsCost } from "../lib/setupOverhead.js";

// Build a minimal LLM event shaped like the parser output, with a single
// tool_defs input bucket so the per-call reconciliation scale factor is 1
// (cost === provisional tool_defs cost, no other buckets, no output).
function llmCall(opts) {
  return {
    kind: "llm",
    model: "claude-sonnet-4-5",
    fresh: opts.fresh || 0,
    cacheWrite: opts.cacheWrite || 0,
    output: 0,
    cost: opts.cost,
    components: { tool_defs: opts.toolDefsTok, system: 0, history: 0, tool_results: 0, current: 0 },
    newPerBucket: { tool_defs: opts.newToolDefsTok, system: 0, history: 0, tool_results: 0, current: 0 },
    toolGroups: [{ source: "builtin", tools: opts.tools }],
  };
}

// Sonnet rates: input $3/M, cache-read 0.1x ($0.30/M), cache-write 1.25x ($3.75/M).
const READ_PER_TOK = (3 * 0.1) / 1e6;
const WRITE_PER_TOK = (3 * 1.25) / 1e6;

describe("computeUnusedToolDefsCost", function () {
  it("prices a stable unused tool: one cache-write on first call, cache-reads after", function () {
    // 1000 tok of tool defs, half is the dead tool. Call 1 writes all of it,
    // call 2 reads all of it.
    var tools = [
      { name: "used_tool", chars: 2000 },
      { name: "dead_tool", chars: 2000 },
    ];
    var prompts = [{
      events: [
        llmCall({ toolDefsTok: 1000, newToolDefsTok: 1000, cacheWrite: 1000, cost: 1000 * WRITE_PER_TOK, tools: tools }),
        llmCall({ toolDefsTok: 1000, newToolDefsTok: 0, cost: 1000 * READ_PER_TOK, tools: tools }),
      ],
    }];

    var r = computeUnusedToolDefsCost(prompts, ["dead_tool"]);

    // share = 2000/4000 = 0.5 each call.
    // write call: 1000 tok @ write rate * 0.5
    expect(r.writeCost).toBeCloseTo(1000 * WRITE_PER_TOK * 0.5, 8);
    // read call: 1000 tok @ read rate * 0.5
    expect(r.readCost).toBeCloseTo(1000 * READ_PER_TOK * 0.5, 8);
    expect(r.totalCost).toBeCloseTo(r.writeCost + r.readCost, 10);
    // The one-time write dominates the recurring read -- dropping the tool does
    // not save the (already sunk) write, so we must not over-promise.
    expect(r.writeCost).toBeGreaterThan(r.readCost * 5);
    expect(r.callsWithDefs).toBe(2);
    expect(r.unusedTokensPerCall).toBe(500); // 2000 chars / 4
  });

  it("attributes the re-warm cache-write to the call where a tool is added mid-session", function () {
    var used = [{ name: "used_tool", chars: 2000 }];
    var both = [{ name: "used_tool", chars: 2000 }, { name: "dead_tool", chars: 2000 }];
    var prompts = [{
      events: [
        // Call 1: only the used tool offered -> no dead weight.
        llmCall({ toolDefsTok: 500, newToolDefsTok: 500, cacheWrite: 500, cost: 500 * WRITE_PER_TOK, tools: used }),
        // Call 2: dead tool added -> its 500-tok suffix is a fresh cache-write,
        // the prior 500 tok read from cache.
        llmCall({ toolDefsTok: 1000, newToolDefsTok: 500, cacheWrite: 500, cost: 500 * WRITE_PER_TOK + 500 * READ_PER_TOK, tools: both }),
      ],
    }];

    var r = computeUnusedToolDefsCost(prompts, ["dead_tool"]);

    // Call 1 contributes nothing (dead tool absent). Call 2 share = 2000/4000 = 0.5.
    // tool_defs cost on call 2: write 500@write + read 500@read.
    expect(r.writeCost).toBeCloseTo(500 * WRITE_PER_TOK * 0.5, 8);
    expect(r.readCost).toBeCloseTo(500 * READ_PER_TOK * 0.5, 8);
    expect(r.callsWithDefs).toBe(2);
  });

  it("returns zeros when there are no unused tools", function () {
    var tools = [{ name: "used_tool", chars: 2000 }];
    var prompts = [{
      events: [llmCall({ toolDefsTok: 500, newToolDefsTok: 500, cacheWrite: 500, cost: 500 * WRITE_PER_TOK, tools: tools })],
    }];
    var r = computeUnusedToolDefsCost(prompts, []);
    expect(r.totalCost).toBe(0);
    expect(r.writeCost).toBe(0);
    expect(r.readCost).toBe(0);
  });

  it("skips events without model pricing", function () {
    var prompts = [{
      events: [{
        kind: "llm",
        model: "gemini-pro",
        cost: 1,
        components: { tool_defs: 1000 },
        newPerBucket: { tool_defs: 1000 },
        toolGroups: [{ source: "builtin", tools: [{ name: "dead_tool", chars: 4000 }] }],
      }],
    }];
    var r = computeUnusedToolDefsCost(prompts, ["dead_tool"]);
    expect(r.totalCost).toBe(0);
    expect(r.callsWithDefs).toBe(0);
  });
});
