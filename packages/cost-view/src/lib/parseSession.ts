// Slim format router for copilot-ledger.
//
// Knows about VS Code Copilot Chat exports (two shapes):
//   1. `copilot_all_prompts_*.json`  -- the rich nested shape with prompts[].logs[]
//   2. The flattened "prompts" shape used by older copilot-cost tooling
// ...and the compact CLI session *digest* the export skills produce
//   3. `*.digest.json` -- Copilot CLI / Claude CLI summaries (rendered by CliRunView)
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
import { detectCliDigest, parseCliDigest } from "./cliDigestParser";
import type { ParsedSession } from "./sessionTypes";

export type SessionFormat =
  | "cli-digest"
  | "copilot-chat-export"
  | "copilot-prompts"
  | "unknown";

export function detectFormat(text: string): SessionFormat {
  // Digest is the most specific shape (session.digestVersion); check it first so
  // it can never be mistaken for a chat export.
  if (detectCliDigest(text)) return "cli-digest";
  if (detectCopilotChatExport(text)) return "copilot-chat-export";
  if (detectCopilotPrompts(text)) return "copilot-prompts";
  return "unknown";
}

export function parseSession(text: string): ParsedSession | null {
  const format = detectFormat(text);
  switch (format) {
    case "cli-digest":
      return parseCliDigest(text);
    case "copilot-chat-export":
      return parseCopilotChatExport(text);
    case "copilot-prompts":
      return parseCopilotPromptsJSON(text);
    default:
      return null;
  }
}
