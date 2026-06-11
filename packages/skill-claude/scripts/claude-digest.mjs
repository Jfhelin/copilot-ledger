#!/usr/bin/env node
// Generate a compact .digest.json sidecar for a Claude Code session transcript
// (~/.claude/projects/<slug>/<uuid>.jsonl), mirroring the VS Code digest schema
// in digest.mjs so Claude Code sessions sit side-by-side with Copilot sessions.
//
// Usage:
//   node claude-digest.mjs <transcript.jsonl> [--force] [--stdout]
//                          [--capture <file-or-dir>] [--no-capture]
//
// The transcript is an append-only event log: one JSON object per line. Each
// `assistant` line carries an exact Anthropic `usage` block. Relay captures
// (from claude-relay.mjs) optionally add the system/tools prefix composition
// the transcript never serializes.
//
// Output: <dir>/.agentviz/<base>.digest.json  (or --stdout).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DIGEST_VERSION = 2;
const DIGEST_KIND = "claude-code";

// ---------------------------------------------------------------------------
// Pricing — mirrored from digest.mjs (which mirrors src/lib/pricing.js). Kept
// inline so this script stays standalone and zero-dependency. Keep in sync when
// upstream rates change.
// ---------------------------------------------------------------------------
const CREDITS_PER_USD = 100; // GitHub AI Credits: 1 credit = $0.01 USD (UBB 2026-06-01)
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
  { match: "claude-3-opus", input: 15.0, output: 75.0 },
  { match: "claude-3-sonnet", input: 3.0, output: 15.0 },
  { match: "claude-3-haiku", input: 0.25, output: 1.25 },
];
const FALLBACK_CLAUDE = { input: 3.0, output: 15.0 };

function lookupPricing(modelName) {
  const name = (modelName ?? "").toLowerCase();
  const hit = PRICING_TABLE.find((p) => name.includes(p.match));
  const base = hit ?? (name.includes("claude") ? FALLBACK_CLAUDE : null);
  if (!base) return null;
  const cacheReadRatio = base.cacheReadRatio ?? DEFAULT_CACHE_READ_RATIO;
  const cacheWriteRatio = base.cacheWriteRatio ?? DEFAULT_CACHE_WRITE_RATIO;
  return {
    inputPerM: base.input,
    outputPerM: base.output,
    cacheReadPerM: base.input * cacheReadRatio,
    cacheWritePerM: base.input * cacheWriteRatio,
    matched: hit ? hit.match : "claude-default",
  };
}

// Anthropic usage already splits fresh input from cache, so promptTokens here is
// the reconstructed TOTAL input (fresh + cacheRead + cacheWrite), matching the
// VS Code digest's semantics where fresh = promptTokens - cacheRead - cacheWrite.
function computeRequestCost({ model, promptTokens, cachedRead, cacheWrite, completion }) {
  const price = lookupPricing(model);
  if (!price) {
    return {
      totalUsd: 0, freshInputUsd: 0, cachedReadUsd: 0, cacheWriteUsd: 0,
      outputUsd: 0, withoutCacheUsd: 0, priced: false, matched: null,
    };
  }
  const fresh = Math.max(0, (promptTokens ?? 0) - (cachedRead ?? 0) - (cacheWrite ?? 0));
  const freshInputUsd = (fresh * price.inputPerM) / 1_000_000;
  const cachedReadUsd = ((cachedRead ?? 0) * price.cacheReadPerM) / 1_000_000;
  const cacheWriteUsd = ((cacheWrite ?? 0) * price.cacheWritePerM) / 1_000_000;
  const outputUsd = ((completion ?? 0) * price.outputPerM) / 1_000_000;
  const totalUsd = freshInputUsd + cachedReadUsd + cacheWriteUsd + outputUsd;
  const withoutCacheUsd =
    ((promptTokens ?? 0) * price.inputPerM + (completion ?? 0) * price.outputPerM) / 1_000_000;
  return { totalUsd, freshInputUsd, cachedReadUsd, cacheWriteUsd, outputUsd, withoutCacheUsd, priced: true, matched: price.matched };
}

const round6 = (n) => Math.round(n * 1_000_000) / 1_000_000;
const approxTokens = (str) => (str ? Math.ceil(str.length / 4) : 0);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const force = args.includes("--force");
const toStdout = args.includes("--stdout");
const noCapture = args.includes("--no-capture");
const captureFlagIdx = args.indexOf("--capture");
const captureArg = captureFlagIdx >= 0 ? args[captureFlagIdx + 1] : null;
const input = args.find((a) => !a.startsWith("--") && a !== captureArg);

if (!input) {
  console.error(
    "usage: claude-digest.mjs <transcript.jsonl> [--force] [--stdout] [--capture <file-or-dir>] [--no-capture]",
  );
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

// Resolve the capture selection WITHOUT parsing: mode + candidate files/mtimes.
// Computed early so it can feed both the freshness cache key and buildPrefix().
// mode: "none" | "file" (explicit single file) | "dir".
function safeMtime(p) {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}
function resolveCaptureSelection() {
  if (noCapture) return { mode: "none", explicit: false, files: [] };
  let dirOrFile = captureArg;
  const explicit = Boolean(captureArg);
  if (!dirOrFile) {
    const def = path.join(os.homedir(), "CopilotLogExports", "claude-captures");
    if (fs.existsSync(def)) dirOrFile = def;
  }
  if (!dirOrFile || !fs.existsSync(dirOrFile)) {
    return { mode: "none", explicit, files: [] };
  }
  const stat = fs.statSync(dirOrFile);
  if (stat.isDirectory()) {
    const files = fs
      .readdirSync(dirOrFile)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(dirOrFile, f));
    return { mode: "dir", explicit, files: files.map((p) => ({ path: p, mtimeMs: safeMtime(p) })) };
  }
  return { mode: "file", explicit: true, files: [{ path: dirOrFile, mtimeMs: safeMtime(dirOrFile) }] };
}

const captureSelection = resolveCaptureSelection();

// A stable signature of the capture inputs so the freshness cache invalidates
// when captures are added/changed/removed.
const captureSignature = JSON.stringify({
  mode: captureSelection.mode,
  files: captureSelection.files
    .map((f) => [path.basename(f.path), f.mtimeMs])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1)),
});

// Cache: skip if digest is newer than source, same version, and same captures.
if (!force && !toStdout && fs.existsSync(outPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    if (
      existing?.session?.digestVersion === DIGEST_VERSION &&
      existing?.session?.kind === DIGEST_KIND &&
      existing?.session?.sourceMtimeMs === srcStat.mtimeMs &&
      existing?.session?.captureSignature === captureSignature
    ) {
      console.error(`up to date: ${outPath}`);
      process.exit(0);
    }
  } catch {
    // regenerate
  }
}

// ---------------------------------------------------------------------------
// Parse the JSONL transcript
// ---------------------------------------------------------------------------
const lines = fs
  .readFileSync(srcPath, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const entries = [];
for (const line of lines) {
  try {
    entries.push(JSON.parse(line));
  } catch {
    // skip malformed line
  }
}

function contentBlocks(msg) {
  if (!msg) return [];
  const c = msg.content;
  if (Array.isArray(c)) return c.filter((b) => b && typeof b === "object");
  if (typeof c === "string") return [{ type: "text", text: c }];
  return [];
}

function isToolResultUser(msg) {
  return contentBlocks(msg).some((b) => b.type === "tool_result");
}

// Slash-command echoes (/model, /effort, …), command stdout, and injected
// <system-reminder> blocks arrive as `user` lines but are CLI plumbing, not
// genuine user turns. They carry no assistant usage, so excluding them only
// affects turn grouping/counts, not token totals.
const SYNTHETIC_USER_RE =
  /^<(local-command-|command-name|command-message|command-args|command-stdout|command-output|system-reminder|user-prompt-submit-hook)/;
function isSyntheticUser(msg) {
  const c = msg?.content;
  const text = typeof c === "string" ? c : userTextRaw(msg);
  return SYNTHETIC_USER_RE.test((text || "").trimStart());
}
function userTextRaw(msg) {
  return contentBlocks(msg)
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("\n");
}

function userText(msg) {
  const c = msg?.content;
  if (typeof c === "string") return c;
  return contentBlocks(msg)
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("\n");
}

// Session-level metadata: take the first non-null value for each field across
// all entries (different line types carry different subsets).
const metaSrc = {};
for (const e of entries) {
  for (const k of ["sessionId", "version", "cwd", "gitBranch", "entrypoint"]) {
    if (metaSrc[k] == null && e[k] != null) metaSrc[k] = e[k];
  }
}

// Tool catalog + skills tracked from `attachment` deltas (names only).
const toolNameSet = new Set();
let skillListing = { skillCount: 0, names: [], approxCatalogTokens: 0 };
const mcpInstructionNames = new Set();
let mcpInstructionsApproxTokens = 0;

for (const e of entries) {
  if (e.type !== "attachment") continue;
  const a = e.attachment || {};
  if (a.type === "deferred_tools_delta") {
    (a.addedNames || []).forEach((n) => toolNameSet.add(n));
    (a.removedNames || []).forEach((n) => toolNameSet.delete(n));
  } else if (a.type === "skill_listing") {
    const content = a.content || "";
    skillListing = {
      skillCount: a.skillCount ?? (a.names ? a.names.length : 0),
      names: a.names || skillListing.names,
      approxCatalogTokens: approxTokens(content),
    };
  } else if (a.type === "mcp_instructions_delta") {
    (a.addedNames || []).forEach((n) => mcpInstructionNames.add(n));
    mcpInstructionsApproxTokens += (a.addedBlocks || []).reduce(
      (sum, b) => sum + approxTokens(typeof b === "string" ? b : ""),
      0,
    );
  }
}

// ---------------------------------------------------------------------------
// Group entries into prompts (turns)
// ---------------------------------------------------------------------------
const promptsOut = [];
const modelStats = new Map(); // name -> { name, requests, promptTokens, completionTokens, cachedTokens, cacheCreationTokens, costUsd }
const usedToolStats = new Map(); // name -> calls (tool_use actually invoked)

let totalRequests = 0;
let totalToolCalls = 0;
let totalPromptTokens = 0;
let totalCompletionTokens = 0;
let totalCachedTokens = 0;
let totalCacheCreationTokens = 0;
let totalCostUsd = 0;
let totalWithoutCacheUsd = 0;
let totalThinkingBlocks = 0;
let totalThinkingChars = 0;
let firstTime = null;
let lastTime = null;

let current = null;

function newPrompt(text, isSidechain, startedByUser) {
  return {
    ord: promptsOut.length,
    ref: `p${promptsOut.length}`,
    promptText: text || "",
    promptPreview: (text || "").slice(0, 200),
    requestCount: 0,
    toolCallCount: 0,
    models: [],
    tools: [],
    promptTokens: 0,
    completionTokens: 0,
    cachedTokens: 0,
    cacheCreationTokens: 0,
    costUsd: 0,
    withoutCacheUsd: 0,
    thinkingBlockCount: 0,
    thinkingApproxTokens: 0,
    finalAssistantPreview: null,
    firstTime: null,
    lastTime: null,
    isSubagent: Boolean(isSidechain),
    // An "orphan" prompt is one synthesized from assistant events that appear
    // before any genuine user line (resumed/compacted transcripts). Excluded
    // from the real-prompt count so it doesn't inflate rollups.prompts.
    isOrphan: !startedByUser,
    // Ordered per-call timeline: each LLM call (an assistant turn, exact usage from
    // the transcript) followed by the tool calls it issued. Cost is MODELLED.
    timeline: [],
  };
}

function pushUnique(arr, v) {
  if (v && !arr.includes(v)) arr.push(v);
}

function noteTime(p, ts) {
  if (!ts) return;
  if (!p.firstTime) p.firstTime = ts;
  p.lastTime = ts;
  if (!firstTime || ts < firstTime) firstTime = ts;
  if (!lastTime || ts > lastTime) lastTime = ts;
}

// Map each tool_use id to the char length of its result, so the per-call
// timeline can show how much NEW content each tool injected into the context
// window. Tool results arrive as `tool_result` blocks on later user turns.
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
for (const e of entries) {
  if (e.type !== "user") continue;
  for (const b of contentBlocks(e.message || {})) {
    if (b.type === "tool_result" && b.tool_use_id != null && !toolResultCharsById.has(b.tool_use_id)) {
      toolResultCharsById.set(b.tool_use_id, toolResultChars(b.content));
    }
  }
}

for (const e of entries) {
  const ts = e.timestamp || null;

  if (e.type === "user") {
    const msg = e.message || {};
    if ((isToolResultUser(msg) || isSyntheticUser(msg)) && current) {
      // tool result / CLI-plumbing continuation — stays in the current prompt
      noteTime(current, ts);
      continue;
    }
    if (isToolResultUser(msg) || isSyntheticUser(msg)) {
      // plumbing before any genuine prompt — ignore for grouping
      continue;
    }
    // genuine user prompt -> start a new prompt
    if (current) promptsOut.push(current);
    current = newPrompt(userText(msg), e.isSidechain, true);
    noteTime(current, ts);
    continue;
  }

  if (e.type === "assistant") {
    if (!current) current = newPrompt("", e.isSidechain, false);
    if (e.isSidechain) current.isSubagent = true;
    const msg = e.message || {};
    const model = msg.model || null;
    const usage = msg.usage || {};

    const fresh = usage.input_tokens || 0;
    const cacheRead = usage.cache_read_input_tokens || 0;
    const cacheWrite = usage.cache_creation_input_tokens || 0;
    const completion = usage.output_tokens || 0;
    const promptTokens = fresh + cacheRead + cacheWrite;

    const cost = computeRequestCost({
      model,
      promptTokens,
      cachedRead: cacheRead,
      cacheWrite,
      completion,
    });

    current.requestCount += 1;
    current.promptTokens += promptTokens;
    current.completionTokens += completion;
    current.cachedTokens += cacheRead;
    current.cacheCreationTokens += cacheWrite;
    current.costUsd = round6(current.costUsd + cost.totalUsd);
    current.withoutCacheUsd = round6(current.withoutCacheUsd + cost.withoutCacheUsd);
    pushUnique(current.models, model);
    noteTime(current, ts);

    current.timeline.push({
      kind: "llm",
      model,
      tokens: { fresh, cached: cacheRead, cacheWrite, output: completion },
      cost: {
        unit: "usd",
        total: cost.totalUsd,
        fresh: cost.freshInputUsd,
        cached: cost.cachedReadUsd,
        cacheWrite: cost.cacheWriteUsd,
        output: cost.outputUsd,
      },
    });

    totalRequests += 1;
    totalPromptTokens += promptTokens;
    totalCompletionTokens += completion;
    totalCachedTokens += cacheRead;
    totalCacheCreationTokens += cacheWrite;
    totalCostUsd += cost.totalUsd;
    totalWithoutCacheUsd += cost.withoutCacheUsd;

    if (model) {
      const m = modelStats.get(model) ?? {
        name: model, requests: 0, promptTokens: 0, completionTokens: 0,
        cachedTokens: 0, cacheCreationTokens: 0, costUsd: 0,
      };
      m.requests += 1;
      m.promptTokens += promptTokens;
      m.completionTokens += completion;
      m.cachedTokens += cacheRead;
      m.cacheCreationTokens += cacheWrite;
      m.costUsd = round6(m.costUsd + cost.totalUsd);
      modelStats.set(model, m);
    }

    let lastText = null;
    for (const b of contentBlocks(msg)) {
      if (b.type === "tool_use") {
        current.toolCallCount += 1;
        totalToolCalls += 1;
        pushUnique(current.tools, b.name);
        usedToolStats.set(b.name, (usedToolStats.get(b.name) ?? 0) + 1);
        const resultChars = toolResultCharsById.get(b.id) ?? 0;
        current.timeline.push({ kind: "tool", name: b.name, contextTokens: Math.ceil(resultChars / 4) });
      } else if (b.type === "thinking") {
        current.thinkingBlockCount += 1;
        totalThinkingBlocks += 1;
        const chars = (b.thinking || "").length;
        current.thinkingApproxTokens += Math.ceil(chars / 4);
        totalThinkingChars += chars;
      } else if (b.type === "text") {
        lastText = b.text || lastText;
      }
    }
    if (lastText) current.finalAssistantPreview = lastText.slice(0, 200);
  }
}
if (current) promptsOut.push(current);

const realPrompts = promptsOut.filter((p) => !p.isSubagent && !p.isOrphan);
const subagentPrompts = promptsOut.filter((p) => p.isSubagent);
const orphanPrompts = promptsOut.filter((p) => p.isOrphan && !p.isSubagent);

const modelsArr = [...modelStats.values()]
  .map((m) => ({ ...m, calls: m.requests }))
  .sort((a, b) => b.costUsd - a.costUsd);
const usedToolsArr = [...usedToolStats.entries()]
  .map(([name, calls]) => ({ name, calls }))
  .sort((a, b) => b.calls - a.calls);

const cacheHitRate = totalPromptTokens > 0 ? totalCachedTokens / totalPromptTokens : 0;
const totalSavingsUsd = Math.max(0, totalWithoutCacheUsd - totalCostUsd);
const wallSpanMs =
  firstTime && lastTime ? new Date(lastTime).getTime() - new Date(firstTime).getTime() : 0;

// ---------------------------------------------------------------------------
// Optional relay-capture prefix composition (the scope-2 addition)
// ---------------------------------------------------------------------------
function loadCaptureData() {
  const out = [];
  for (const f of captureSelection.files) {
    try {
      const o = JSON.parse(fs.readFileSync(f.path, "utf8"));
      if (o && o.sizing) out.push({ file: path.basename(f.path), data: o });
    } catch {
      // skip unreadable/non-capture file
    }
  }
  return out;
}

function buildPrefix() {
  const caps = loadCaptureData();
  if (caps.length === 0) {
    return {
      available: false,
      note:
        "No relay captures found. Run claude-relay.mjs (ANTHROPIC_BASE_URL) to capture the full system/tools prefix the transcript omits. Pass --capture <file-or-dir> to point at them.",
    };
  }

  // Pair captures to this session by time window + model overlap.
  const sessionModels = new Set(modelsArr.map((m) => m.name));
  const within = (ts) => {
    if (!ts || !firstTime || !lastTime) return true;
    const t = new Date(ts).getTime();
    const pad = 5 * 60 * 1000; // 5 min either side
    return t >= new Date(firstTime).getTime() - pad && t <= new Date(lastTime).getTime() + pad;
  };
  const matchModel = (m) => {
    if (!m || sessionModels.size === 0) return true;
    for (const sm of sessionModels) {
      // transcript model: claude-sonnet-4-5-20250929; capture model: claude-sonnet-4-6
      const a = sm.replace(/-\d{8}$/, "");
      if (a === m || sm === m || sm.startsWith(m) || m.startsWith(a)) return true;
    }
    return false;
  };

  const paired = caps.filter((c) => within(c.data.capturedAt) && matchModel(c.data.model));

  // Only fall back to "all captures" when the user explicitly pointed at a
  // single file. For an auto-discovered or explicit DIRECTORY with no
  // time+model match, refuse to guess — an unrelated session's larger catalog
  // must not be reported as this transcript's prefix (rubber-duck finding #3).
  let pool = paired;
  if (paired.length === 0) {
    if (captureSelection.mode === "file") {
      pool = caps; // explicit single file: trust the user
    } else {
      return {
        available: false,
        reason: "no-paired-capture",
        candidateCount: caps.length,
        note:
          "Relay captures were found but none fall within this session's time window AND model. Refusing to attribute an unrelated capture's prefix. Pass --capture <specific-file.json> to force one.",
      };
    }
  }

  const capRows = pool.map((c) => {
    const s = c.data.sizing || {};
    return {
      file: c.file,
      capturedAt: c.data.capturedAt ?? null,
      model: c.data.model ?? null,
      systemApproxTokens: s.systemTokens ?? 0,
      toolDefsApproxTokens: s.toolsTokens ?? 0,
      toolCount: s.toolCount ?? 0,
      messagesApproxTokens: s.messagesTokens ?? 0,
    };
  });

  // Representative = the capture advertising the largest tool catalog (the full
  // warm prefix). chars/4 estimates — distinct from the transcript's exact usage.
  const rep = pool.reduce((best, c) =>
    (c.data.sizing?.toolCount ?? 0) > (best.data.sizing?.toolCount ?? 0) ? c : best,
  );
  const repTools = (rep.data.tools || [])
    .map((t) => ({ name: t.name, approxTokens: t.approxTokens ?? 0 }))
    .sort((a, b) => b.approxTokens - a.approxTokens);
  const repSizing = rep.data.sizing || {};
  const repTotal =
    (repSizing.systemTokens ?? 0) + (repSizing.toolsTokens ?? 0) + (repSizing.messagesTokens ?? 0);

  return {
    available: true,
    source: "relay-capture",
    estimateMethod: "chars/4 (approx)",
    matchedByTimeAndModel: paired.length > 0,
    captureCount: capRows.length,
    captures: capRows,
    representative: {
      file: rep.file,
      model: rep.data.model ?? null,
      systemApproxTokens: repSizing.systemTokens ?? 0,
      toolDefsApproxTokens: repSizing.toolsTokens ?? 0,
      toolCount: repSizing.toolCount ?? 0,
      messagesApproxTokens: repSizing.messagesTokens ?? 0,
      prefixApproxTokens: repTotal,
      toolDefsShareOfPrefix: repTotal > 0 ? round6((repSizing.toolsTokens ?? 0) / repTotal) : 0,
      topTools: repTools.slice(0, 15),
    },
    note:
      "Prefix composition is reconstructed from raw API request bodies captured by claude-relay.mjs (chars/4 estimates). Use the transcript's exact usage for billed totals; use this only for the system-vs-tools-vs-messages SHAPE the transcript cannot show.",
  };
}

// ---------------------------------------------------------------------------
// Assemble digest (mirror VS Code top-level keys + Claude-specific additions)
// ---------------------------------------------------------------------------
const digest = {
  session: {
    digestVersion: DIGEST_VERSION,
    kind: DIGEST_KIND,
    generatedAt: new Date().toISOString(),
    sourceFile: srcPath,
    sourceSizeBytes: srcStat.size,
    sourceMtimeMs: srcStat.mtimeMs,
    sessionId: metaSrc.sessionId ?? null,
    cwd: metaSrc.cwd ?? null,
    gitBranch: metaSrc.gitBranch ?? null,
    claudeVersion: metaSrc.version ?? null,
    entrypoint: metaSrc.entrypoint ?? null,
    lineCount: lines.length,
    captureSignature,
  },
  rollups: {
    prompts: realPrompts.length,
    subagentPrompts: subagentPrompts.length,
    orphanPrompts: orphanPrompts.length,
    requests: totalRequests,
    toolCalls: totalToolCalls,
    totalTokens: totalPromptTokens + totalCompletionTokens,
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    cachedTokens: totalCachedTokens,
    cacheCreationTokens: totalCacheCreationTokens,
    cacheHitRate: Number(cacheHitRate.toFixed(4)),
    primaryModel: modelsArr[0]?.name ?? null,
    modelCount: modelsArr.length,
    // toolCount mirrors digest.mjs (distinct tools invoked); toolCatalogCount is
    // the advertised catalog size (Claude-specific).
    toolCount: usedToolsArr.length,
    toolCatalogCount: toolNameSet.size,
    toolsUsedCount: usedToolsArr.length,
    wallSpanMs,
    firstTime,
    lastTime,
    cost: {
      totalUsd: round6(totalCostUsd),
      withoutCacheUsd: round6(totalWithoutCacheUsd),
      savingsUsd: round6(totalSavingsUsd),
      savingsRatio: totalWithoutCacheUsd > 0 ? round6(totalSavingsUsd / totalWithoutCacheUsd) : 0,
      pricingVersion: PRICING_VERSION,
      currency: "USD",
      allModelsPriced: modelsArr.every((m) => lookupPricing(m.name) !== null),
      credits: {
        total: credits(totalCostUsd),
        withoutCache: credits(totalWithoutCacheUsd),
        savings: credits(totalSavingsUsd),
        perUsd: CREDITS_PER_USD,
        billingModel: "anthropic-api-token-pricing",
      },
      note:
        "Cost is a MODELLED estimate: Claude Code transcripts report exact token usage but no billed amount (the CLI bills via Anthropic API token rates or a flat subscription, not GitHub credits). USD/credits here apply the same PRICING_TABLE as the VS Code digest so the two are comparable in token-cost terms — they are NOT GitHub AI Credits.",
    },
    thinking: {
      present: totalThinkingBlocks > 0,
      totalBlocks: totalThinkingBlocks,
      plaintextChars: totalThinkingChars,
      plaintextTokensApprox: Math.ceil(totalThinkingChars / 4),
      note:
        "Claude Code serializes thinking block text in the transcript (unlike Copilot exports). output_tokens already includes thinking, so completionTokens is NOT under-counted here.",
    },
  },
  pricing: {
    version: PRICING_VERSION,
    currency: "USD",
    creditsPerUsd: CREDITS_PER_USD,
    billingModel: "anthropic-api-token-pricing",
    resolved: modelsArr.map((m) => {
      const p = lookupPricing(m.name);
      return p
        ? { model: m.name, matched: true, inputPerM: p.inputPerM, outputPerM: p.outputPerM, cacheReadPerM: p.cacheReadPerM, cacheWritePerM: p.cacheWritePerM }
        : { model: m.name, matched: false };
    }),
    table: PRICING_TABLE.map((row) => ({
      match: row.match,
      inputPerM: row.input,
      outputPerM: row.output,
      cacheReadRatio: row.cacheReadRatio ?? DEFAULT_CACHE_READ_RATIO,
      cacheWriteRatio: row.cacheWriteRatio ?? DEFAULT_CACHE_WRITE_RATIO,
    })),
  },
  models: modelsArr,
  // `tools` mirrors digest.mjs (distinct tools invoked, with call counts);
  // `toolsUsed` is kept as the Claude-native name. Same array.
  tools: usedToolsArr,
  toolsUsed: usedToolsArr,
  files: [],
  toolCatalog: {
    count: toolNameSet.size,
    names: [...toolNameSet].sort(),
    note:
      "Tool NAMES advertised to the model (from deferred_tools_delta). The transcript does NOT include tool schemas; see prefix.representative (relay capture) for the schema token weight.",
  },
  skills: skillListing,
  mcpInstructions: {
    names: [...mcpInstructionNames].sort(),
    approxTokens: mcpInstructionsApproxTokens,
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
