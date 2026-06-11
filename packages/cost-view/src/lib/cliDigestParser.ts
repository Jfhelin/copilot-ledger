// Parser for the compact CLI session *digest* the export skills produce
// (`copilot-cli-digest.mjs` / `claude-digest.mjs`). Unlike the VS Code chat
// export, a digest is already summarized -- it has no per-event log -- so we do
// NOT synthesize a fake event timeline here. Instead we wrap the digest into a
// minimal ParsedSession whose `metadata.cliDigest` carries the whole digest, and
// the dedicated <CliRunView> renders directly from it (stat cards, the
// representative-prefix composition box, and a per-prompt table).
//
// This is the honest "Path A / R2" rendering: only what the digest actually
// measured, nothing reconstructed.

import type { ParsedSession, SessionMetadata, TokenUsage } from "./sessionTypes";

export interface CliDigest {
  session: {
    digestVersion: number;
    kind: string;
    redacted?: boolean;
    redactionProfile?: string;
    [key: string]: unknown;
  };
  rollups: Record<string, unknown> & {
    prompts?: number;
    requests?: number;
    toolCalls?: number;
    promptTokens?: number;
    completionTokens?: number;
    cachedTokens?: number;
    cacheCreationTokens?: number;
    freshInputTokens?: number;
    cacheHitRate?: number;
    primaryModel?: string | null;
    wallSpanMs?: number;
    cost?: Record<string, unknown>;
  };
  prefix?: { representative?: Record<string, unknown> };
  prompts?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export function detectCliDigest(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return false;
  const head = trimmed.slice(0, 4096);
  // Cheap reject before the full parse.
  if (!head.includes('"digestVersion"') || !head.includes('"kind"')) return false;
  try {
    const root = JSON.parse(trimmed);
    return (
      root &&
      typeof root === "object" &&
      root.session &&
      typeof root.session === "object" &&
      typeof root.session.digestVersion === "number" &&
      typeof root.session.kind === "string" &&
      root.rollups &&
      typeof root.rollups === "object"
    );
  } catch {
    return false;
  }
}

// The digest's `cost` block differs by harness: Copilot CLI carries native
// GitHub AI credits (authoritative spend); Claude carries a token-normalized USD
// estimate. Surface a single comparable USD figure for generic metadata, but the
// CliRunView reads the full block to label native vs modelled correctly.
function extractCostUsd(cost: Record<string, unknown> | undefined): number | null {
  if (!cost || typeof cost !== "object") return null;
  const native = cost.native as Record<string, unknown> | undefined;
  if (native && typeof native.impliedUsd === "number") return native.impliedUsd;
  if (typeof cost.totalUsd === "number") return cost.totalUsd as number;
  const tokenNormalized = cost.tokenNormalized as Record<string, unknown> | undefined;
  if (tokenNormalized && typeof tokenNormalized.totalUsd === "number") {
    return tokenNormalized.totalUsd as number;
  }
  return null;
}

export function parseCliDigest(text: string): ParsedSession | null {
  let digest: CliDigest;
  try {
    digest = JSON.parse(text) as CliDigest;
  } catch {
    return null;
  }
  if (!digest || !digest.session || !digest.rollups) return null;

  const r = digest.rollups;
  const kind = digest.session.kind;
  // sessionTypes reserves "copilot-cli" / "claude-code"; fall back to the raw
  // kind string for any future digest variant.
  const format = kind as SessionMetadata["format"];

  const tokenUsage: TokenUsage = {
    inputTokens: typeof r.promptTokens === "number" ? r.promptTokens : undefined,
    outputTokens: typeof r.completionTokens === "number" ? r.completionTokens : undefined,
    cacheRead: typeof r.cachedTokens === "number" ? r.cachedTokens : undefined,
    cacheWrite: typeof r.cacheCreationTokens === "number" ? r.cacheCreationTokens : undefined,
    cacheHitRate: typeof r.cacheHitRate === "number" ? r.cacheHitRate : undefined,
  };

  const primaryModel = (r.primaryModel as string) ?? null;
  const costUsd = extractCostUsd(r.cost);

  const metadata: SessionMetadata = {
    totalEvents: 0,
    totalTurns: typeof r.prompts === "number" ? r.prompts : 0,
    totalToolCalls: typeof r.toolCalls === "number" ? r.toolCalls : 0,
    errorCount: 0,
    duration: typeof r.wallSpanMs === "number" ? r.wallSpanMs : 0,
    models: primaryModel ? { [primaryModel]: (r.requests as number) ?? 0 } : {},
    primaryModel,
    tokenUsage,
    format,
    totalCost: costUsd,
    totalCostUnit: costUsd != null ? "usd" : null,
    // The whole digest, for the dedicated CLI run view.
    cliDigest: digest,
  };

  return { events: [], turns: [], metadata };
}
