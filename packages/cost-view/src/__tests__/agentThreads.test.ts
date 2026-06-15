import { describe, expect, it } from "vitest";
import { buildAgentThreads } from "../lib/agentThreads";
import type {
  CostAnalysisPrompt,
  CostAnalysisEvent,
} from "../lib/copilotChatExportParser";

// Minimal fixture builders. The real type is large; tests only exercise the
// fields buildAgentThreads reads, so we construct partial objects and cast.
function runSubagentEvent(argsPrompt: string): CostAnalysisEvent {
  return {
    kind: "tool",
    name: "runSubagent",
    subagent: { description: "", promptChars: 0, promptTokensEst: 0, argsPrompt },
  } as unknown as CostAnalysisEvent;
}

function prompt(
  partial: Partial<CostAnalysisPrompt> & { promptId: string },
): CostAnalysisPrompt {
  return {
    index: 0,
    name: "panel/editAgent",
    label: "",
    userMessage: "",
    events: [],
    promptTokens: 0,
    output: 0,
    cached: 0,
    cacheWrite: 0,
    fresh: 0,
    cost: 0,
    cacheHitRate: 0,
    llmCount: 0,
    toolCount: 0,
    ...partial,
  } as CostAnalysisPrompt;
}

describe("buildAgentThreads", () => {
  it("returns an empty result for no prompts", () => {
    expect(buildAgentThreads([]).threads).toEqual([]);
    expect(buildAgentThreads(undefined as any).threads).toEqual([]);
  });

  it("always emits a single main thread even for one prompt", () => {
    const { threads, promptIdToThreadId } = buildAgentThreads([
      prompt({ promptId: "p0", cost: 0.5, llmCount: 2, toolCount: 1, promptTokens: 100, output: 20 }),
    ]);
    expect(threads).toHaveLength(1);
    expect(threads[0].id).toBe("main");
    expect(threads[0].slot).toBe("main");
    expect(threads[0].label).toBe("Main agent");
    expect(threads[0].promptIds).toEqual(["p0"]);
    expect(promptIdToThreadId.get("p0")).toBe("main");
  });

  it("folds all main-agent prompts into one thread and sums their metrics", () => {
    const { threads } = buildAgentThreads([
      prompt({ promptId: "p0", cost: 1, llmCount: 1, toolCount: 1, promptTokens: 100, output: 10 }),
      prompt({ promptId: "p1", cost: 2, llmCount: 3, toolCount: 2, promptTokens: 200, output: 20 }),
    ]);
    expect(threads).toHaveLength(1);
    const main = threads[0];
    expect(main.promptIds).toEqual(["p0", "p1"]);
    expect(main.totalCost).toBe(3);
    expect(main.llmCount).toBe(4);
    expect(main.toolCount).toBe(3);
    expect(main.inputTokens).toBe(300);
    expect(main.outputTokens).toBe(30);
  });

  it("creates one labelled thread per subagent and links it to its spawner", () => {
    const task = "Investigate the auth module and report findings.";
    const parent = prompt({
      promptId: "parent",
      events: [runSubagentEvent(task)],
    });
    const sub = prompt({
      promptId: "sub-1",
      name: "tool/runSubagent",
      userMessage: task,
      cost: 0.25,
      llmCount: 4,
      toolCount: 2,
      promptTokens: 500,
      output: 80,
    });

    const { threads, promptIdToThreadId } = buildAgentThreads([parent, sub]);
    expect(threads).toHaveLength(2);

    const subThread = threads[1];
    expect(subThread.slot).toBe("sub");
    expect(subThread.label).toBe("Subagent A");
    expect(subThread.letter).toBe("A");
    expect(subThread.id).toBe("sub-1");
    expect(subThread.parentPromptId).toBe("parent");
    expect(subThread.totalCost).toBe(0.25);
    expect(subThread.taskSnippet).toBe(task);
    expect(promptIdToThreadId.get("sub-1")).toBe("sub-1");
    // The parent prompt itself stays on the main thread.
    expect(promptIdToThreadId.get("parent")).toBe("main");
  });

  it("assigns sequential letters and cycles colors across subagents", () => {
    const prompts: CostAnalysisPrompt[] = [prompt({ promptId: "main0" })];
    for (let i = 0; i < 5; i++) {
      prompts.push(prompt({ promptId: `s${i}`, name: "tool/runSubagent", userMessage: `task ${i}` }));
    }
    const { threads } = buildAgentThreads(prompts);
    const subs = threads.filter((t) => t.slot === "sub");
    expect(subs.map((t) => t.letter)).toEqual(["A", "B", "C", "D", "E"]);
    // Palette has 4 keys, so the 5th subagent wraps back to the first.
    expect(subs[0].colorKey).toBe(subs[4].colorKey);
  });

  it("leaves parentPromptId null when the spawn site is absent", () => {
    const { threads } = buildAgentThreads([
      prompt({ promptId: "orphan-sub", name: "tool/runSubagent", userMessage: "do a thing" }),
    ]);
    const sub = threads.find((t) => t.slot === "sub")!;
    expect(sub.parentPromptId).toBeNull();
  });
});
