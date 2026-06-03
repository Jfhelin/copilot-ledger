import { describe, expect, it } from "vitest";
import { prettifyRunName, inferTechniqueFromRunNames } from "../lib/runDisplayName";

describe("prettifyRunName", () => {
  it("falls back to 'session' for empty input", () => {
    expect(prettifyRunName("")).toBe("session");
    expect(prettifyRunName(null)).toBe("session");
    expect(prettifyRunName(undefined)).toBe("session");
  });

  it("strips directory paths", () => {
    expect(prettifyRunName("/path/to/copilot_all_prompts_caveman.json")).toBe("caveman");
    expect(prettifyRunName("C:\\logs\\session-abc.jsonl")).toBe("session-abc");
  });

  it("strips known extensions and export prefixes", () => {
    expect(prettifyRunName("copilot_all_prompts_polite.json")).toBe("polite");
    expect(prettifyRunName("copilot-chat-export-foo.log")).toBe("foo");
  });

  it("reformats an ISO-ish timestamp stem", () => {
    expect(prettifyRunName("copilot_all_prompts_2026-04-29T14-41-16.json")).toBe(
      "2026-04-29 14:41",
    );
    expect(prettifyRunName("2026-04-29T14:41:16.json")).toBe("2026-04-29 14:41");
  });

  it("keeps meaningful names and trims stray separators", () => {
    expect(prettifyRunName("session-3a8c9d1.jsonl")).toBe("session-3a8c9d1");
    expect(prettifyRunName("copilot_all_prompts_.json")).toBe("session");
  });
});

describe("inferTechniqueFromRunNames", () => {
  it("extracts shared scenario and differing variants", () => {
    const h = inferTechniqueFromRunNames("munich3-baseline", "munich3-no-tools");
    expect(h.nameA).toBe("munich3-baseline");
    expect(h.nameB).toBe("munich3-no-tools");
    expect(h.sharedContext).toBe("munich3");
    expect(h.variantA).toBe("baseline");
    expect(h.variantB).toBe("no-tools");
    expect(h.hypothesis).toBe("A=baseline vs B=no-tools (shared scenario: munich3)");
  });

  it("uses full names when there is no shared context", () => {
    const h = inferTechniqueFromRunNames("claude-sonnet", "claude-haiku");
    // "claude" is shared prefix but is a noise token, so it is stripped from
    // the shared context; variants remain sonnet vs haiku.
    expect(h.variantA).toBe("sonnet");
    expect(h.variantB).toBe("haiku");
    expect(h.hypothesis).toContain("A=sonnet vs B=haiku");
  });

  it("produces no hypothesis for pure timestamp names", () => {
    const h = inferTechniqueFromRunNames(
      "copilot_all_prompts_2026-04-29T14-41-16.json",
      "copilot_all_prompts_2026-04-30T09-00-00.json",
    );
    expect(h.hypothesis).toBeNull();
  });

  it("produces no hypothesis when both sides are identical", () => {
    const h = inferTechniqueFromRunNames("munich3-baseline", "munich3-baseline");
    expect(h.hypothesis).toBeNull();
    expect(h.sharedContext).toBe("munich3-baseline");
  });

  it("falls back to whole-name hypothesis with no shared tokens", () => {
    const h = inferTechniqueFromRunNames("caveman", "polite");
    expect(h.sharedContext).toBeNull();
    expect(h.hypothesis).toBe("A=caveman vs B=polite");
  });
});
