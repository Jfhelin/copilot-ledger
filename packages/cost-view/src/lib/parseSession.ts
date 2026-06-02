// Slim format router for copilot-ledger.
//
// Only knows about VS Code Copilot Chat exports (two shapes):
//   1. `copilot_all_prompts_*.json`  -- the rich nested shape with prompts[].logs[]
//   2. The flattened "prompts" shape used by older copilot-cost tooling
//
// Anything else returns null -- we are intentionally not a generic session viewer.

import {
  detectCopilotChatExport,
  parseCopilotChatExport,
} from "./copilotChatExportParser";
import {
  detectCopilotPrompts,
  parseCopilotPromptsJSON,
} from "./copilotCostParser";
import type { ParsedSession } from "./sessionTypes";

export type SessionFormat = "copilot-chat-export" | "copilot-prompts" | "unknown";

export function detectFormat(text: string): SessionFormat {
  if (detectCopilotChatExport(text)) return "copilot-chat-export";
  if (detectCopilotPrompts(text)) return "copilot-prompts";
  return "unknown";
}

export function parseSession(text: string): ParsedSession | null {
  const format = detectFormat(text);
  switch (format) {
    case "copilot-chat-export":
      return parseCopilotChatExport(text);
    case "copilot-prompts":
      return parseCopilotPromptsJSON(text);
    default:
      return null;
  }
}
