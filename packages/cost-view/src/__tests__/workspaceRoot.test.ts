import { describe, expect, it } from "vitest";
import { parseCopilotChatExport, type CostAnalysis } from "../lib/copilotChatExportParser";
import { inferWorkspaceRoot, stripRoot } from "../components/CostViewChatExport.jsx";

const ROOT = "/Users/dev/Code/GitHub/acme/octocat_supply-psychic-disco";

// Minimal nested chat-export shape: one prompt, one model request whose
// requestMessages carry the VS Code <workspace_info> block, plus tool-call
// logs that read files under the workspace root.
function exportWith(workspaceInfo: string, paths: string[]) {
  const toolLogs = paths.map((p, i) => ({
    id: "tc" + i,
    kind: "toolCall",
    tool: "read_file",
    args: { filePath: p },
    time: "2026-06-05T11:37:00Z",
  }));
  return JSON.stringify({
    exportedAt: "2026-06-05T11:37:05Z",
    totalPrompts: 1,
    prompts: [
      {
        prompt: "How does mapDatabaseRows work?",
        promptId: "p1",
        logs: [
          {
            id: "r1",
            kind: "request",
            type: "ChatMLSuccess",
            name: "panel/editAgent",
            metadata: {
              model: "claude-sonnet-4.6",
              duration: 1000,
              usage: { prompt_tokens: 1000, completion_tokens: 50 },
              tools: [{ name: "read_file", input_schema: { type: "object" } }],
            },
            requestMessages: {
              messages: [
                { role: 0, content: [{ type: 1, text: "You are a coding assistant." }] },
                {
                  role: 1,
                  content: [
                    {
                      type: 1,
                      text:
                        "<environment_info>\nThe user's current OS is: macOS\n</environment_info>\n" +
                        "<workspace_info>\n" + workspaceInfo + "\n</workspace_info>",
                    },
                  ],
                },
                { role: 1, content: [{ type: 1, text: "How does mapDatabaseRows work?" }] },
              ],
            },
            response: { type: "ChatMLSuccess", message: { 0: "" } },
          },
          ...toolLogs,
        ],
      },
    ],
  });
}

describe("workspace root extraction", function () {
  it("parses the <workspaceFolder path=...> format into workspaceFolders", function () {
    const json = exportWith(
      'The following tasks can be executed:\n<workspaceFolder path="' + ROOT + '">\n<task id="x">{}</task>',
      [ROOT + "/api/src/utils/sql.ts"],
    );
    const parsed = parseCopilotChatExport(json);
    expect(parsed).not.toBeNull();
    expect((parsed!.metadata.costAnalysis as CostAnalysis).workspaceFolders).toEqual([ROOT]);
  });

  it("still supports the older bullet-list workspace_info format", function () {
    const json = exportWith("- " + ROOT, [ROOT + "/api/src/utils/sql.ts"]);
    const parsed = parseCopilotChatExport(json);
    expect((parsed!.metadata.costAnalysis as CostAnalysis).workspaceFolders).toEqual([ROOT]);
  });

  it("strips a trailing slash from the workspace folder", function () {
    const json = exportWith('<workspaceFolder path="' + ROOT + '/">', [ROOT + "/api/x.ts"]);
    const parsed = parseCopilotChatExport(json);
    expect((parsed!.metadata.costAnalysis as CostAnalysis).workspaceFolders).toEqual([ROOT]);
  });
});

describe("inferWorkspaceRoot", function () {
  function analysisFrom(json: string) {
    const parsed = parseCopilotChatExport(json);
    return parsed!.metadata.costAnalysis as CostAnalysis;
  }

  it("uses the authoritative root so paths strip without the project folder name", function () {
    // Three reads of the real path plus one corrupted outlier path. The old
    // longest-common-prefix heuristic would stop at the parent of the project
    // folder (leaving "octocat_supply-psychic-disco/..." in the displayed
    // path); the authoritative <workspace_info> root fixes that.
    const json = exportWith('<workspaceFolder path="' + ROOT + '">', [
      ROOT + "/api/src/utils/sql.ts",
      ROOT + "/api/src/utils/sql.ts",
      "/Users/dev/Code/GitHub/acme/octocat_supply-ychic-disco/api/src/utils/sql.ts",
      ROOT + "/api/src/utils/sql.ts",
    ]);
    const analysis = analysisFrom(json);
    const root = inferWorkspaceRoot(analysis);
    expect(root).toBe(ROOT);
    expect(stripRoot(ROOT + "/api/src/utils/sql.ts", root)).toBe("./api/src/utils/sql.ts");
  });

  it("falls back to the path heuristic when no workspace info is present", function () {
    const json = JSON.stringify({
      exportedAt: "2026-06-05T11:37:05Z",
      totalPrompts: 1,
      prompts: [
        {
          prompt: "x",
          promptId: "p1",
          logs: [
            {
              id: "r1",
              kind: "request",
              type: "ChatMLSuccess",
              name: "panel/editAgent",
              metadata: { model: "m", duration: 1, usage: { prompt_tokens: 1, completion_tokens: 1 }, tools: [] },
              requestMessages: { messages: [{ role: 1, content: [{ type: 1, text: "x" }] }] },
              response: { type: "ChatMLSuccess", message: { 0: "" } },
            },
            { id: "t1", kind: "toolCall", tool: "read_file", args: { filePath: ROOT + "/api/a.ts" }, time: "t" },
            { id: "t2", kind: "toolCall", tool: "read_file", args: { filePath: ROOT + "/frontend/b.ts" }, time: "t" },
          ],
        },
      ],
    });
    const analysis = analysisFrom(json);
    expect(analysis!.workspaceFolders).toEqual([]);
    // Heuristic still infers a usable common root (no crash, non-empty).
    expect(typeof inferWorkspaceRoot(analysis)).toBe("string");
  });
});
