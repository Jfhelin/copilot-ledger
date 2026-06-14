#!/usr/bin/env node
// Enrich behavioral results.jsonl with token / cost / cache / llm-call columns
// pulled from the raw captures (Copilot digest.json rollups; Claude stream.jsonl).
// Adds, never overwrites scored behavioral fields. Idempotent.
import fs from "node:fs";
import path from "node:path";

const CAP = process.env.CAP || `${process.env.HOME}/copilot-ledger-data/captures/behavioral`;
const SRC = path.join(CAP, "results.jsonl");

const round = (n, d = 6) => (n == null ? null : Number(n.toFixed(d)));

function enrichCopilot(runDir) {
  const p = path.join(runDir, "digest.json");
  if (!fs.existsSync(p)) return null;
  const r = JSON.parse(fs.readFileSync(p, "utf8")).rollups || {};
  const cost = (JSON.parse(fs.readFileSync(p, "utf8")).rollups || {}).cost || {};
  const nat = cost.native || {};
  const norm = cost.tokenNormalized || {};
  return {
    llm_calls: r.requests ?? null,
    tool_calls_billed: r.toolCalls ?? null,
    total_tokens: r.totalTokens ?? null,
    input_fresh_tokens: r.freshInputTokens ?? null,
    output_tokens: r.completionTokens ?? null,
    reasoning_tokens: r.reasoningTokens ?? null,
    cache_read_tokens: r.cachedTokens ?? null,
    cache_creation_tokens: r.cacheCreationTokens ?? null,
    cache_hit_rate: r.cacheHitRate ?? null,
    real_spend_value: nat.credits ?? null,
    real_spend_unit: nat.credits != null ? "github-ai-credits" : null,
    real_spend_usd: round(nat.impliedUsd),
    normalized_usd: round(norm.totalUsd),
    normalized_usd_no_cache: round(norm.withoutCacheUsd),
    duration_api_ms: null,
  };
}

function enrichClaude(runDir, snapshot) {
  const p = path.join(runDir, "stream.jsonl");
  if (!fs.existsSync(p)) return null;
  const lines = fs.readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
  const asst = lines.filter((l) => l.type === "assistant" && l.message && l.message.usage);
  // dedupe billed completions by message id
  const seen = new Set();
  let calls = 0, callsPrimary = 0;
  let inp = 0, out = 0, cr = 0, cc = 0;
  for (const a of asst) {
    const id = a.message.id || JSON.stringify(a.message.usage) + Math.random();
    if (seen.has(id)) continue;
    seen.add(id);
    calls++;
    const onModel = a.message.model === snapshot;
    if (onModel) callsPrimary++;
    const u = a.message.usage;
    inp += u.input_tokens || 0;
    out += u.output_tokens || 0;
    cr += u.cache_read_input_tokens || 0;
    cc += u.cache_creation_input_tokens || 0;
  }
  const res = lines.find((l) => l.type === "result");
  const denom = cr + cc + inp;
  return {
    llm_calls: calls,
    llm_calls_primary_model: callsPrimary,
    tool_calls_billed: lines.filter((l) => l.type === "assistant" && l.message &&
      Array.isArray(l.message.content) && l.message.content.some((b) => b.type === "tool_use")).length,
    total_tokens: inp + out + cr + cc,
    input_fresh_tokens: inp,
    output_tokens: out,
    reasoning_tokens: null,
    cache_read_tokens: cr,
    cache_creation_tokens: cc,
    cache_hit_rate: denom ? round(cr / denom, 4) : null,
    real_spend_value: res ? round(res.total_cost_usd) : null,
    real_spend_unit: res ? "usd-anthropic-list" : null,
    real_spend_usd: res ? round(res.total_cost_usd) : null,
    normalized_usd: res ? round(res.total_cost_usd) : null,
    normalized_usd_no_cache: null,
    duration_api_ms: res ? res.duration_api_ms ?? null : null,
  };
}

const rows = fs.readFileSync(SRC, "utf8").trim().split("\n").map((l) => JSON.parse(l));
let enriched = 0, missing = 0;
const out = rows.map((row) => {
  const dir = row.raw_capture_path;
  if (!dir || !fs.existsSync(dir)) { missing++; return { ...row, cost_enriched: false }; }
  const add = row.harness === "copilot" ? enrichCopilot(dir) : enrichClaude(dir, row.model_snapshot);
  if (!add) { missing++; return { ...row, cost_enriched: false }; }
  enriched++;
  return { ...row, ...add, cost_enriched: true };
});

fs.writeFileSync(SRC, out.map((r) => JSON.stringify(r)).join("\n") + "\n");
console.log(`enriched=${enriched} missing=${missing} total=${rows.length}`);
