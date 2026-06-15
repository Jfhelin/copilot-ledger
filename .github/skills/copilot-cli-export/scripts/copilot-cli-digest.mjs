#!/usr/bin/env node
// Generate a compact .digest.json sidecar for a GitHub Copilot CLI session,
// parsed from the debug log the CLI writes with `--log-level all --log-dir <d>`.
// Mirrors the VS Code / Claude digest schema so Copilot CLI runs sit side-by-side
// with Copilot Chat exports and Claude Code transcripts for comparison.
//
// Usage:
//   node copilot-cli-digest.mjs <process-*.log> [--force] [--stdout]
//
// What the log gives us that the others can't, all in ONE file:
//   * exact token usage per request   (response `usage`)
//   * the full system prompt + tool schemas + messages  (`Wire request` blocks)
//   * the EXACT GitHub AI Credits billed (`copilot_usage.total_nano_aiu`) — native,
//     not modelled. A token-normalized USD estimate is ALSO emitted (same
//     PRICING_TABLE as the Claude/VS Code digests) purely for cross-agent
//     efficiency comparison.
//
// Output: <dir>/.agentviz/<base>.digest.json  (or --stdout).

import fs from "node:fs";
import path from "node:path";

const DIGEST_VERSION = 2;
const DIGEST_KIND = "copilot-cli";

// ---------------------------------------------------------------------------
// Token-normalized pricing — mirrored from claude-digest.mjs / digest.mjs. Used
// ONLY for the comparative `tokenNormalized` cost block. The authoritative cost
// for a Copilot CLI run is the native `total_nano_aiu` billed amount.
// ---------------------------------------------------------------------------
const CREDITS_PER_USD = 100; // GitHub AI Credits: 1 credit = $0.01 USD
const credits = (usd) => Math.round(usd * CREDITS_PER_USD * 10) / 10;

const PRICING_VERSION = "2026-05";
const DEFAULT_CACHE_READ_RATIO = 0.1;
const DEFAULT_CACHE_WRITE_RATIO = 1.25;
const PRICING_TABLE = [
  { match: "claude-opus-4", input: 15.0, output: 75.0 },
  { match: "claude-sonnet-4", input: 3.0, output: 15.0 },
  { match: "claude-haiku-4", input: 1.0, output: 5.0 },
  { match: "claude-3-5-sonnet", input: 3.0, output: 15.0 },
  { match: "claude-3-5-haiku", input: 0.8, output: 4.0 },
  { match: "gpt-5", input: 1.25, output: 10.0 },
  { match: "gpt-4.1", input: 2.0, output: 8.0 },
  { match: "gpt-4o", input: 2.5, output: 10.0 },
  { match: "o4-mini", input: 1.1, output: 4.4 },
  { match: "gemini-2.5-pro", input: 1.25, output: 10.0 },
  { match: "gemini-2.5-flash", input: 0.3, output: 2.5 },
];
const FALLBACK = { input: 3.0, output: 15.0 };

function lookupPricing(modelName) {
  const name = (modelName ?? "").toLowerCase();
  const hit = PRICING_TABLE.find((p) => name.includes(p.match));
  const base = hit ?? FALLBACK;
  const cacheReadRatio = base.cacheReadRatio ?? DEFAULT_CACHE_READ_RATIO;
  const cacheWriteRatio = base.cacheWriteRatio ?? DEFAULT_CACHE_WRITE_RATIO;
  return {
    inputPerM: base.input,
    outputPerM: base.output,
    cacheReadPerM: base.input * cacheReadRatio,
    cacheWritePerM: base.input * cacheWriteRatio,
    matched: hit ? hit.match : "default-fallback",
    isFallback: !hit,
  };
}

function computeNormalizedCost({ model, promptTokens, cachedRead, cacheWrite, completion }) {
  const price = lookupPricing(model);
  const fresh = Math.max(0, (promptTokens ?? 0) - (cachedRead ?? 0) - (cacheWrite ?? 0));
  const freshInputUsd = (fresh * price.inputPerM) / 1_000_000;
  const cachedReadUsd = ((cachedRead ?? 0) * price.cacheReadPerM) / 1_000_000;
  const cacheWriteUsd = ((cacheWrite ?? 0) * price.cacheWritePerM) / 1_000_000;
  const outputUsd = ((completion ?? 0) * price.outputPerM) / 1_000_000;
  const totalUsd = freshInputUsd + cachedReadUsd + cacheWriteUsd + outputUsd;
  const withoutCacheUsd =
    ((promptTokens ?? 0) * price.inputPerM + (completion ?? 0) * price.outputPerM) / 1_000_000;
  return { totalUsd, withoutCacheUsd, isFallback: price.isFallback };
}

const round6 = (n) => Math.round(n * 1_000_000) / 1_000_000;
const approxTokens = (str) => (str ? Math.ceil(str.length / 4) : 0);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const force = args.includes("--force");
const toStdout = args.includes("--stdout");
const input = args.find((a) => !a.startsWith("--"));

if (!input) {
  console.error("usage: copilot-cli-digest.mjs <process-*.log> [--force] [--stdout]");
  process.exit(2);
}

const srcPath = path.resolve(input);
if (!fs.existsSync(srcPath)) {
  console.error(`not found: ${srcPath}`);
  process.exit(2);
}

const srcStat = fs.statSync(srcPath);
const srcDir = path.dirname(srcPath);
const base = path.basename(srcPath, path.extname(srcPath));
const outDir = path.join(srcDir, ".agentviz");
const outPath = path.join(outDir, `${base}.digest.json`);

if (!force && !toStdout && fs.existsSync(outPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    if (
      existing?.session?.digestVersion === DIGEST_VERSION &&
      existing?.session?.kind === DIGEST_KIND &&
      existing?.session?.sourceMtimeMs === srcStat.mtimeMs
    ) {
      console.error(`up to date: ${outPath}`);
      process.exit(0);
    }
  } catch {
    // regenerate
  }
}

// ---------------------------------------------------------------------------
// Block extraction
//
// The log is `<ISO ts> [LEVEL] <msg>` lines. Big JSON payloads are pretty-printed
// and their continuation lines are UN-prefixed (no timestamp) up to the next real
// log line. We therefore start a block at a prefixed line whose content ends with
// `{`, then consume following un-prefixed lines until the next prefixed line, and
// JSON.parse the buffer. Brace-counting would be unsafe because the system prompt
// text contains literal `{`/`}`.
// ---------------------------------------------------------------------------
const PREFIX_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}) \[(?:DEBUG|INFO|WARN|WARNING|ERROR|TRACE|ALL)\] /;

const warnings = [];
const rawText = fs.readFileSync(srcPath, "utf8");
const lines = rawText.split("\n");

// session metadata gathered from plain log lines
let copilotVersion = null;
let workspaceId = null;
let cwd = null;
for (const line of lines) {
  if (!copilotVersion) {
    const m = line.match(/copilot\/(\d+\.\d+\.\d+)/);
    if (m) copilotVersion = m[1];
  }
  if (!workspaceId) {
    const m = line.match(/Workspace initialized:\s*([0-9a-f-]{36})/i);
    if (m) workspaceId = m[1];
  }
  if (!cwd) {
    const m = line.match(/(?:cwd|current working directory)["']?\s*[:=]\s*["']?([^\s"',]+)/i);
    if (m) cwd = m[1];
  }
}

let parseFailures = 0;
const blocks = []; // { index, kind, obj }

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!PREFIX_RE.test(line)) continue;
  const content = line.replace(PREFIX_RE, "");
  if (!content.trimEnd().endsWith("{")) continue;

  // Buffer starts at the opening brace of this line.
  const braceIdx = content.lastIndexOf("{");
  const buf = [content.slice(braceIdx)];
  let j = i + 1;
  while (j < lines.length && !PREFIX_RE.test(lines[j])) {
    buf.push(lines[j]);
    j++;
  }
  const text = buf.join("\n").trim();
  // Only bother if it looks like a multi-line JSON object (cheap guard).
  if (text.length > 1) {
    let obj = null;
    try {
      obj = JSON.parse(text);
    } catch {
      // A prefixed line can end with `{` without being a JSON opener; only count
      // a failure when it was one of our known openers.
      if (/Wire request:\s*\{$/.test(content) || content.trim() === "{") parseFailures++;
    }
    if (obj && typeof obj === "object") {
      let kind = null;
      if (obj.system != null && Array.isArray(obj.messages)) kind = "request";
      else if (Array.isArray(obj.choices) && obj.usage) kind = "response";
      if (kind) blocks.push({ index: i, kind, obj });
    }
  }
  i = j - 1; // skip consumed body lines
}

if (parseFailures > 0) {
  warnings.push(`${parseFailures} JSON block(s) failed to parse and were skipped.`);
}

// ---------------------------------------------------------------------------
// Dedupe responses by id, keeping the richest copy (the log writes some response
// objects more than once; a session-cumulative total also appears under a
// different shape and is naturally excluded because it has no `choices`).
// ---------------------------------------------------------------------------
const richness = (o) => {
  let r = 0;
  if (o?.usage) r += 1;
  if (o?.copilot_usage?.total_nano_aiu != null) r += 2;
  return r;
};

const responseById = new Map(); // id -> { obj, index }
const anonResponses = [];
for (const b of blocks) {
  if (b.kind !== "response") continue;
  const id = b.obj.id;
  if (!id) {
    anonResponses.push(b);
    continue;
  }
  const prev = responseById.get(id);
  if (!prev) {
    responseById.set(id, b);
  } else {
    // Keep the richer copy; warn if billing/usage conflicts.
    const a = prev.obj;
    const c = b.obj;
    const aAiu = a.copilot_usage?.total_nano_aiu;
    const cAiu = c.copilot_usage?.total_nano_aiu;
    if (aAiu != null && cAiu != null && String(aAiu) !== String(cAiu)) {
      warnings.push(`response ${id} has conflicting total_nano_aiu across duplicates.`);
    }
    // Keep the richer copy for DATA, but preserve the FIRST index for ordering
    // so chronology isn't shifted by a later duplicate.
    if (richness(c) > richness(a)) {
      responseById.set(id, { ...b, index: Math.min(prev.index, b.index) });
    } else if (b.index < prev.index) {
      responseById.set(id, { ...prev, index: b.index });
    }
  }
}

// Ordered timeline: unique responses (by first index) + all requests.
const uniqueResponses = [...responseById.values(), ...anonResponses];
const timeline = [...blocks.filter((b) => b.kind === "request"), ...uniqueResponses].sort(
  (a, b) => a.index - b.index,
);

// ---------------------------------------------------------------------------
// Helpers over the Anthropic-format request `messages[]`
// ---------------------------------------------------------------------------
function isToolResultMsg(msg) {
  const c = msg?.content;
  if (Array.isArray(c)) return c.some((b) => b && b.type === "tool_result");
  return false;
}
function userTypedMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.filter((m) => m && m.role === "user" && !isToolResultMsg(m));
}
function msgText(msg) {
  const c = msg?.content;
  let text = "";
  if (typeof c === "string") text = c;
  else if (Array.isArray(c)) {
    text = c
      .filter((b) => b && b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n");
  }
  return cleanPromptText(text);
}

// The genuine user prompt is wrapped with CLI plumbing the harness injects:
// a leading <current_datetime> stamp and trailing <system_reminder>/<canvas-*>
// blocks. Strip those so the preview shows what the user actually typed.
function cleanPromptText(text) {
  return (text || "")
    .replace(/<current_datetime>[\s\S]*?<\/current_datetime>/g, "")
    .replace(/<system_reminder>[\s\S]*?<\/system_reminder>/g, "")
    .replace(/<canvas-context>[\s\S]*?<\/canvas-context>/g, "")
    .replace(/<environment_context>[\s\S]*?<\/environment_context>/g, "")
    .trim();
}

// ---------------------------------------------------------------------------
// Tool-result sizes: map each tool_use id to the char length of its result, so
// the per-call timeline can show how much NEW content each tool injected into
// the context window. Results are echoed in every later request's prefix, so we
// dedupe by id (first occurrence wins; copies are identical).
// ---------------------------------------------------------------------------
function toolResultChars(content) {
  if (typeof content === "string") return content.length;
  if (Array.isArray(content)) {
    let n = 0;
    for (const b of content) {
      if (typeof b === "string") n += b.length;
      else if (b && typeof b.text === "string") n += b.text.length;
      else if (b != null) n += JSON.stringify(b).length;
    }
    return n;
  }
  return content != null ? JSON.stringify(content).length : 0;
}
const toolResultCharsById = new Map();
for (const b of blocks) {
  if (b.kind !== "request") continue;
  for (const msg of b.obj.messages || []) {
    if (!Array.isArray(msg.content)) continue;
    for (const blk of msg.content) {
      if (blk && blk.type === "tool_result" && blk.tool_use_id != null && !toolResultCharsById.has(blk.tool_use_id)) {
        toolResultCharsById.set(blk.tool_use_id, toolResultChars(blk.content));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Walk the timeline: requests set the turn, responses carry tokens + native cost
// ---------------------------------------------------------------------------
const promptsOut = [];
const modelStats = new Map();
const usedToolStats = new Map();
let lastUserCount = 0;
let groupingConfidence = "high";

let totalRequests = 0;
let totalToolCalls = 0;
let freshInputTokens = 0;
let totalPromptTokens = 0;
let totalCompletionTokens = 0;
let totalCachedTokens = 0;
let totalCacheCreationTokens = 0;
let totalReasoningTokens = 0;
let responsesWithUsage = 0;
let responsesWithNativeBilling = 0;

let totalNanoAiu = 0n; // authoritative native billing
const nativeByType = { input: 0n, cache_read: 0n, cache_write: 0n, output: 0n, other: 0n };
let normalizedUsd = 0;
let normalizedWithoutCacheUsd = 0;
let anyFallbackPriced = false;
let reconcileMismatch = 0;

// Prefix-shape candidate (representative wire request = largest tool catalog)
let repRequest = null;
let wireToolCountMin = null;
let wireToolCountMax = null;

let current = null;
function newPrompt(text, isOrphan = false) {
  const p = {
    ord: promptsOut.length,
    ref: `p${promptsOut.length}`,
    promptText: text || "",
    promptPreview: (text || "").slice(0, 200),
    requestCount: 0,
    toolCallCount: 0,
    models: [],
    tools: [],
    freshInputTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    cachedTokens: 0,
    cacheCreationTokens: 0,
    reasoningTokens: 0,
    nativeCredits: 0,
    tokenNormalizedUsd: 0,
    finalAssistantPreview: null,
    isOrphan,
    // Ordered per-call timeline: each LLM call (a model response) followed by the
    // tool calls it issued. Cost is the EXACT native AI-credit split for this call.
    timeline: [],
  };
  promptsOut.push(p);
  return p;
}
function pushUnique(arr, v) {
  if (v && !arr.includes(v)) arr.push(v);
}

for (const b of timeline) {
  if (b.kind === "request") {
    const obj = b.obj;
    const tools = Array.isArray(obj.tools) ? obj.tools : [];
    wireToolCountMin = wireToolCountMin == null ? tools.length : Math.min(wireToolCountMin, tools.length);
    wireToolCountMax = wireToolCountMax == null ? tools.length : Math.max(wireToolCountMax, tools.length);
    if (!repRequest || tools.length > (repRequest.tools?.length ?? 0)) repRequest = obj;

    const uc = userTypedMessages(obj.messages).length;
    if (!current || uc > lastUserCount) {
      const utm = userTypedMessages(obj.messages);
      const text = utm.length ? msgText(utm[utm.length - 1]) : "";
      current = newPrompt(text);
      lastUserCount = uc;
    } else if (uc < lastUserCount) {
      groupingConfidence = "ambiguous-compaction";
      warnings.push(
        "user-message count decreased mid-log (compaction/resume); turn grouping is best-effort.",
      );
      lastUserCount = uc;
    }
    continue;
  }

  // response
  const obj = b.obj;
  if (!current) current = newPrompt("", true);
  const usage = obj.usage || {};
  const model = obj.model || null;
  const promptTokens = usage.prompt_tokens || 0;
  const completion = usage.completion_tokens || 0;
  const cacheRead = usage.prompt_tokens_details?.cached_tokens || 0;
  const cacheWrite = usage.prompt_tokens_details?.cache_creation_tokens || 0;
  const reasoning = usage.completion_tokens_details?.reasoning_tokens || 0;
  const fresh = Math.max(0, promptTokens - cacheRead - cacheWrite);

  totalRequests += 1;
  if (usage && Object.keys(usage).length) responsesWithUsage += 1;
  freshInputTokens += fresh;
  totalPromptTokens += promptTokens;
  totalCompletionTokens += completion;
  totalCachedTokens += cacheRead;
  totalCacheCreationTokens += cacheWrite;
  totalReasoningTokens += reasoning;

  current.requestCount += 1;
  current.freshInputTokens += fresh;
  current.promptTokens += promptTokens;
  current.completionTokens += completion;
  current.cachedTokens += cacheRead;
  current.cacheCreationTokens += cacheWrite;
  current.reasoningTokens += reasoning;
  pushUnique(current.models, model);

  // Native billing (authoritative)
  const cu = obj.copilot_usage || {};
  let callNano = 0n;
  const callNanoByType = { input: 0n, cache_read: 0n, cache_write: 0n, output: 0n, other: 0n };
  if (cu.total_nano_aiu != null) {
    responsesWithNativeBilling += 1;
    let nano;
    try {
      nano = BigInt(cu.total_nano_aiu);
    } catch {
      nano = 0n;
    }
    callNano = nano;
    totalNanoAiu += nano;
    current.nativeCredits = round6(current.nativeCredits + Number(nano) / 1e9);

    // Decompose + reconcile token_details against total_nano_aiu.
    let recomputed = 0n;
    for (const td of cu.token_details || []) {
      const tc = BigInt(td.token_count ?? 0);
      const cpb = BigInt(td.cost_per_batch ?? 0);
      const bs = BigInt(td.batch_size ?? 1) || 1n;
      const part = (tc * cpb) / bs;
      recomputed += part;
      const key = ["input", "cache_read", "cache_write", "output"].includes(td.token_type)
        ? td.token_type
        : "other";
      nativeByType[key] += part;
      callNanoByType[key] += part;
    }
    if (recomputed !== 0n && nano !== 0n) {
      const diff = recomputed > nano ? recomputed - nano : nano - recomputed;
      // tolerate tiny integer-division drift
      if (diff > nano / 1000n + 10n) reconcileMismatch += 1;
    }
  }

  // Token-normalized (comparative only)
  const norm = computeNormalizedCost({
    model,
    promptTokens,
    cachedRead: cacheRead,
    cacheWrite,
    completion,
  });
  if (norm.isFallback) anyFallbackPriced = true;
  normalizedUsd += norm.totalUsd;
  normalizedWithoutCacheUsd += norm.withoutCacheUsd;
  current.tokenNormalizedUsd = round6(current.tokenNormalizedUsd + norm.totalUsd);

  // Per-call timeline entry. Cost is the EXACT native credit split for this call
  // (token_details parts as fractions of total_nano_aiu); falls back to token
  // proportions only when a response carries no native billing detail.
  const callCredits = Number(callNano) / 1e9;
  const partOut = Number(callNanoByType.output);
  const partFresh = Number(callNanoByType.input);
  const partCached = Number(callNanoByType.cache_read);
  const partCwrite = Number(callNanoByType.cache_write);
  const partSum = partFresh + partCached + partCwrite + partOut + Number(callNanoByType.other);
  let costComponents;
  if (partSum > 0) {
    const f = callCredits / partSum;
    costComponents = {
      fresh: (partFresh + Number(callNanoByType.other)) * f,
      cached: partCached * f,
      cacheWrite: partCwrite * f,
      output: partOut * f,
    };
  } else {
    const tokSum = fresh + cacheRead + cacheWrite + completion || 1;
    costComponents = {
      fresh: (callCredits * fresh) / tokSum,
      cached: (callCredits * cacheRead) / tokSum,
      cacheWrite: (callCredits * cacheWrite) / tokSum,
      output: (callCredits * completion) / tokSum,
    };
  }
  current.timeline.push({
    kind: "llm",
    model,
    tokens: { fresh, cached: cacheRead, cacheWrite, output: completion, reasoning },
    cost: { unit: "credits", total: callCredits, ...costComponents },
  });

  if (model) {
    const m = modelStats.get(model) ?? {
      name: model, requests: 0, promptTokens: 0, completionTokens: 0,
      cachedTokens: 0, cacheCreationTokens: 0, nativeCredits: 0,
    };
    m.requests += 1;
    m.promptTokens += promptTokens;
    m.completionTokens += completion;
    m.cachedTokens += cacheRead;
    m.cacheCreationTokens += cacheWrite;
    m.nativeCredits = round6(m.nativeCredits + Number(BigInt(cu.total_nano_aiu ?? 0)) / 1e9);
    modelStats.set(model, m);
  }

  // Tool calls + final text from the OpenAI-shaped response.
  const message = obj.choices?.[0]?.message || {};
  for (const tc of message.tool_calls || []) {
    const name = tc.function?.name;
    if (!name) continue;
    current.toolCallCount += 1;
    totalToolCalls += 1;
    pushUnique(current.tools, name);
    usedToolStats.set(name, (usedToolStats.get(name) ?? 0) + 1);
    const resultChars = toolResultCharsById.get(tc.id) ?? 0;
    current.timeline.push({ kind: "tool", name, contextTokens: Math.ceil(resultChars / 4) });
  }
  if (typeof message.content === "string" && message.content.trim()) {
    current.finalAssistantPreview = message.content.slice(0, 200);
  }
}

if (reconcileMismatch > 0) {
  warnings.push(
    `${reconcileMismatch} response(s): token_details did not reconcile with total_nano_aiu; trusting total_nano_aiu.`,
  );
}

const realPrompts = promptsOut.filter((p) => !p.isOrphan);
const orphanPrompts = promptsOut.filter((p) => p.isOrphan);

const modelsArr = [...modelStats.values()]
  .map((m) => ({ ...m, calls: m.requests }))
  .sort((a, b) => b.nativeCredits - a.nativeCredits);
const usedToolsArr = [...usedToolStats.entries()]
  .map(([name, calls]) => ({ name, calls }))
  .sort((a, b) => b.calls - a.calls);

const cacheHitRate = totalPromptTokens > 0 ? totalCachedTokens / totalPromptTokens : 0;

// ---------------------------------------------------------------------------
// Native cost block
// ---------------------------------------------------------------------------
const nativeCreditsTotal = Math.round((Number(totalNanoAiu) / 1e9) * 1_000_000) / 1_000_000;
const byTypeCredits = Object.fromEntries(
  Object.entries(nativeByType).map(([k, v]) => [k, round6(Number(v) / 1e9)]),
);
// Counterfactual: reprice cached read + cache-write tokens at the native input
// rate (per-token cost derived from token_details). Best-effort, NOT authoritative.
let inputRatePerToken = null; // nano-AIU per token
for (const b of timeline) {
  if (b.kind !== "response") continue;
  for (const td of b.obj.copilot_usage?.token_details || []) {
    if (td.token_type === "input" && (td.token_count ?? 0) > 0) {
      inputRatePerToken = Number(td.cost_per_batch) / Number(td.batch_size || 1);
      break;
    }
  }
  if (inputRatePerToken != null) break;
}
let withoutCacheCredits = null;
let savingsCredits = null;
if (inputRatePerToken != null) {
  const cacheNanoAtInput =
    (totalCachedTokens + totalCacheCreationTokens) * inputRatePerToken;
  const actualCacheNano = Number(nativeByType.cache_read + nativeByType.cache_write);
  const wc = Number(totalNanoAiu) - actualCacheNano + cacheNanoAtInput;
  withoutCacheCredits = round6(wc / 1e9);
  savingsCredits = round6(Math.max(0, withoutCacheCredits - nativeCreditsTotal));
}

const nativeBillingComplete =
  responsesWithNativeBilling === totalRequests && totalRequests > 0;

const cost = {
  primary: "native-github-credits",
  currency: "USD",
  native: {
    credits: nativeCreditsTotal,
    totalNanoAiu: totalNanoAiu.toString(),
    impliedUsd: round6(nativeCreditsTotal / CREDITS_PER_USD),
    creditsPerUsd: CREDITS_PER_USD,
    billingModel: "github-ai-credits-native",
    authoritative: true,
    complete: nativeBillingComplete,
    byTypeCredits,
    withoutCacheCounterfactual:
      withoutCacheCredits == null
        ? null
        : {
            credits: withoutCacheCredits,
            savingsCredits,
            method: "reprice cache_read+cache_write tokens at the observed native input rate",
            authoritative: false,
          },
    note:
      "EXACT GitHub AI Credits the CLI was billed (sum of copilot_usage.total_nano_aiu / 1e9). 1 credit = $0.01 USD. This is real spend, already including any premium-request multiplier.",
  },
  tokenNormalized: {
    totalUsd: round6(normalizedUsd),
    withoutCacheUsd: round6(normalizedWithoutCacheUsd),
    savingsUsd: round6(Math.max(0, normalizedWithoutCacheUsd - normalizedUsd)),
    credits: credits(normalizedUsd),
    pricingVersion: PRICING_VERSION,
    allModelsPriced: !anyFallbackPriced,
    billingModel: "token-normalized-model-estimate",
    authoritative: false,
    note:
      "MODELLED from PRICING_TABLE for cross-agent EFFICIENCY comparison only (e.g. vs the Claude digest). NOT actual spend and NOT GitHub AI Credits. Compare like-for-like: tokenNormalized here vs tokenNormalized/modelled cost there.",
  },
};

// ---------------------------------------------------------------------------
// Prefix composition from the representative wire request
// ---------------------------------------------------------------------------
function buildPrefix() {
  if (!repRequest) {
    return { available: false, note: "No Wire request block found in the log." };
  }
  const systemText = Array.isArray(repRequest.system)
    ? repRequest.system.map((s) => s?.text || "").join("\n")
    : typeof repRequest.system === "string"
      ? repRequest.system
      : "";
  const tools = Array.isArray(repRequest.tools) ? repRequest.tools : [];
  const toolRows = tools
    .map((t) => ({ name: t.name, approxTokens: approxTokens(JSON.stringify(t)) }))
    .sort((a, b) => b.approxTokens - a.approxTokens);
  const systemApproxTokens = approxTokens(systemText);
  const toolDefsApproxTokens = approxTokens(JSON.stringify(tools));
  const messagesApproxTokens = approxTokens(JSON.stringify(repRequest.messages || []));
  const prefixApproxTokens = systemApproxTokens + toolDefsApproxTokens + messagesApproxTokens;
  // skill blocks are injected into the system prompt for Copilot CLI.
  const skillMatches = systemText.match(/<skill>/g);
  return {
    available: true,
    source: "wire-request",
    estimateMethod: "chars/4 (approx); tokens here are SHAPE, not billed counts",
    representative: {
      model: repRequest.model ?? null,
      systemApproxTokens,
      toolDefsApproxTokens,
      messagesApproxTokens,
      toolCount: tools.length,
      prefixApproxTokens,
      toolDefsShareOfPrefix:
        prefixApproxTokens > 0 ? round6(toolDefsApproxTokens / prefixApproxTokens) : 0,
      skillBlockCount: skillMatches ? skillMatches.length : 0,
      topTools: toolRows.slice(0, 15),
    },
    note:
      "Context-window SHAPE reconstructed from the raw `Wire request` body in the log (chars/4 estimates). Use the response `usage` for billed token totals; use this only for system-vs-tools-vs-messages composition.",
  };
}

const toolCatalogNames = repRequest && Array.isArray(repRequest.tools)
  ? repRequest.tools.map((t) => t.name).filter(Boolean).sort()
  : [];
const wireToolCountRange = wireToolCountMin == null || wireToolCountMax == null
  ? null
  : { min: wireToolCountMin, max: wireToolCountMax };
const wireToolCountNote =
  "Count of full tool schemas actually transmitted in the Wire request body. The Copilot CLI log includes full schemas, so this equals the advertised catalog (no virtual-tools deferral observed). Other harnesses may advertise more tools than they send.";

// ---------------------------------------------------------------------------
// Assemble digest
// ---------------------------------------------------------------------------
const digest = {
  session: {
    digestVersion: DIGEST_VERSION,
    kind: DIGEST_KIND,
    generatedAt: new Date().toISOString(),
    sourceFile: srcPath,
    sourceSizeBytes: srcStat.size,
    sourceMtimeMs: srcStat.mtimeMs,
    copilotVersion,
    workspaceId,
    cwd,
    lineCount: lines.length,
    groupingConfidence,
    warnings,
  },
  rollups: {
    prompts: realPrompts.length,
    orphanPrompts: orphanPrompts.length,
    requests: totalRequests,
    responsesWithUsage,
    responsesWithNativeBilling,
    nativeBillingComplete,
    toolCalls: totalToolCalls,
    totalTokens: totalPromptTokens + totalCompletionTokens,
    freshInputTokens,
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    cachedTokens: totalCachedTokens,
    cacheCreationTokens: totalCacheCreationTokens,
    reasoningTokens: totalReasoningTokens,
    cacheHitRate: Number(cacheHitRate.toFixed(4)),
    primaryModel: modelsArr[0]?.name ?? null,
    modelCount: modelsArr.length,
    toolCount: usedToolsArr.length,
    toolCatalogCount: toolCatalogNames.length,
    wireToolCount: wireToolCountMax,
    wireToolCountRange,
    wireToolCountNote,
    toolsUsedCount: usedToolsArr.length,
    cost,
    tokenSemantics:
      "promptTokens is TOTAL input (freshInputTokens + cachedTokens + cacheCreationTokens). completionTokens already INCLUDES reasoningTokens — do not add them again. Matches Claude/VS Code digest semantics.",
  },
  pricing: {
    version: PRICING_VERSION,
    currency: "USD",
    creditsPerUsd: CREDITS_PER_USD,
    appliesTo: "tokenNormalized cost only (native credits come from copilot_usage)",
    resolved: modelsArr.map((m) => {
      const p = lookupPricing(m.name);
      return {
        model: m.name,
        matched: !p.isFallback,
        inputPerM: p.inputPerM,
        outputPerM: p.outputPerM,
        cacheReadPerM: p.cacheReadPerM,
        cacheWritePerM: p.cacheWritePerM,
      };
    }),
  },
  models: modelsArr,
  tools: usedToolsArr,
  toolsUsed: usedToolsArr,
  files: [],
  toolCatalog: {
    count: toolCatalogNames.length,
    names: toolCatalogNames,
    note:
      "Tool NAMES advertised to the model in the representative Wire request. For Copilot CLI, the advertised catalog equals rollups.wireToolCount because the log includes full schemas in the Wire request body; see prefix.representative for their token weight.",
  },
  prefix: buildPrefix(),
  prompts: promptsOut,
};

if (toStdout) {
  process.stdout.write(JSON.stringify(digest, null, 2));
} else {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(digest, null, 2));
  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.error(`wrote ${outPath} (${kb} KB)`);
}
