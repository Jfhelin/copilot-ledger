import { describe, expect, it } from "vitest";
import { parseCopilotChatExport } from "../lib/copilotChatExportParser";

// Build a minimal Copilot Chat export with one request log. `tools` is the full
// IDE catalog; the environment message may advertise a subset as deferred via
// an <availableDeferredTools> block (VS Code's virtual-tools grouping). The
// parser must size the tool_defs bucket from the DIRECTLY-sent schemas only.
function makeExport(opts: {
  catalog: string[];
  deferredBlock?: { role: number; names: string[] } | null;
}): string {
  const tools = opts.catalog.map((name) => ({
    type: "function",
    function: {
      name,
      description: "Tool " + name + " does a thing with several parameters.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, query: { type: "string" } },
        required: ["path"],
      },
    },
  }));
  const messages: unknown[] = [
    { role: 0, content: [{ type: 1, text: "You are an assistant. <toolSearchInstructions>Use tool_search.</toolSearchInstructions>" }] },
  ];
  if (opts.deferredBlock) {
    const block =
      "<availableDeferredTools>\nAvailable deferred tools (must be loaded with tool_search before use):\n" +
      opts.deferredBlock.names.join("\n") +
      "\n</availableDeferredTools>";
    messages.push({ role: opts.deferredBlock.role, content: [{ type: 1, text: "<environment_info>env</environment_info>\n" + block }] });
  }
  messages.push({ role: 1, content: [{ type: 1, text: "hi" }] });

  return JSON.stringify({
    totalPrompts: 1,
    totalLogEntries: 1,
    prompts: [
      {
        promptId: "p0",
        prompt: "hi",
        logs: [
          {
            id: "p0-r0",
            kind: "request",
            name: "request",
            metadata: {
              model: "claude-sonnet-4.5",
              usage: { prompt_tokens: 12000, completion_tokens: 50, prompt_tokens_details: { cached_tokens: 0 } },
              tools,
            },
            requestMessages: { messages },
            response: { type: "success", message: ["ok"] },
          },
        ],
      },
    ],
  });
}

function firstLlm(text: string): any {
  const parsed = parseCopilotChatExport(text) as any;
  const events = parsed.metadata.costAnalysis.prompts.flatMap((p: any) => p.events);
  return events.find((e: any) => e.kind === "llm");
}

const CATALOG = ["read_file", "create_file", "grep_search", "tool_search", "mcp_azure_acr", "mcp_azure_aks", "mcp_gh_issue"];

describe("deferred (virtualized) tool accounting", () => {
  it("non-grouped run: no deferred block -> all catalog tools are direct", () => {
    const ev = firstLlm(makeExport({ catalog: CATALOG, deferredBlock: null }));
    expect(ev.totalTools).toBe(CATALOG.length);
    expect(ev.catalogToolsCount).toBe(CATALOG.length);
    expect(ev.deferredToolsCount).toBe(0);
    expect(ev.deferredIndexCount).toBe(0);
    const offered = ev.toolGroups.reduce((a: number, g: any) => a + g.tools.length, 0);
    expect(offered).toBe(CATALOG.length);
  });

  it("grouped run: deferred names are excluded from sent tools + toolGroups", () => {
    const deferred = ["mcp_azure_acr", "mcp_azure_aks", "mcp_gh_issue"];
    const ev = firstLlm(makeExport({ catalog: CATALOG, deferredBlock: { role: 1, names: deferred } }));
    expect(ev.catalogToolsCount).toBe(7);
    expect(ev.totalTools).toBe(4); // 7 catalog - 3 deferred
    expect(ev.deferredToolsCount).toBe(3);
    expect(ev.deferredIndexCount).toBe(3);
    // direct + deferred reconciles to catalog
    expect(ev.totalTools + ev.deferredToolsCount).toBe(ev.catalogToolsCount);
    // toolGroups (the sized tool_defs) contains ONLY the 4 direct tools
    const names = ev.toolGroups.flatMap((g: any) => g.tools.map((t: any) => t.name));
    expect(names.sort()).toEqual(["create_file", "grep_search", "read_file", "tool_search"]);
    expect(names).not.toContain("mcp_azure_acr");
    // tool_defs bucket is smaller than it would be if all 7 schemas counted
    const grouped = ev.components.tool_defs;
    const flat = firstLlm(makeExport({ catalog: CATALOG, deferredBlock: null })).components.tool_defs;
    expect(grouped).toBeLessThan(flat);
  });

  it("deferred index may exceed catalog (names not in IDE catalog tracked separately)", () => {
    const deferred = ["mcp_azure_acr", "mcp_azure_aks", "phantom_not_in_catalog"];
    const ev = firstLlm(makeExport({ catalog: CATALOG, deferredBlock: { role: 1, names: deferred } }));
    expect(ev.deferredIndexCount).toBe(3); // all advertised names
    expect(ev.deferredToolsCount).toBe(2); // only the 2 that are in the catalog were skipped
    expect(ev.totalTools).toBe(5); // 7 - 2
  });

  it("defensive: a deferred block quoted in an assistant message does NOT filter tools", () => {
    // role 2 = assistant. The block here is discussion, not a real advertisement.
    const ev = firstLlm(makeExport({ catalog: CATALOG, deferredBlock: { role: 2, names: ["read_file", "create_file"] } }));
    expect(ev.totalTools).toBe(CATALOG.length);
    expect(ev.deferredToolsCount).toBe(0);
  });
});
