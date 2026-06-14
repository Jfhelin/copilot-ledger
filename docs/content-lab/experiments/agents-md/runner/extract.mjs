#!/usr/bin/env node
// Normalize a Copilot-CLI digest (read from stdin) into one flat metrics row.
// Adapted from the 40-run grid normalizer for the AGENTS.md experiment:
//   - adds `task` (which discovery/eval task this run is)
//   - adds `tools_json` (per-tool call counts from the digest)
// Usage:
//   <digest-json> | node extract.mjs <harness> <run_id> <task> <condition> <rep> \
//       <coldwarm> <wallMsMeasured> <exitCode> <startedAtMs>
const [harness, run_id, task, condition, rep, coldwarm, wallMsMeasured, exitCode, startedAtMs] =
  process.argv.slice(2);
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  let j;
  try { j = JSON.parse(s); } catch (e) { console.error("BAD_DIGEST_JSON"); process.exit(2); }
  const r = j.rollups || {};
  const isCop = harness === "copilot";
  const promptTokens = r.promptTokens ?? null;
  const cached = r.cachedTokens ?? null;
  const cacheCreation = r.cacheCreationTokens ?? null;
  const freshInput = isCop
    ? (r.freshInputTokens ?? null)
    : (promptTokens != null && cached != null && cacheCreation != null
        ? promptTokens - cached - cacheCreation
        : null);
  const costTokenNorm = isCop
    ? (r.cost?.tokenNormalized?.totalUsd ?? null)
    : (r.cost?.totalUsd ?? null);
  const nativeCredits = isCop ? (r.cost?.native?.credits ?? null) : null;
  const tools = Array.isArray(j.tools) ? j.tools : (Array.isArray(r.tools) ? r.tools : []);
  const toolsMap = {};
  for (const t of tools) {
    if (t && t.name != null) toolsMap[t.name] = t.calls ?? null;
  }
  const row = {
    run_id,
    task,
    condition,
    harness,
    rep: Number(rep),
    cold_warm: coldwarm,
    started_at_ms: startedAtMs ? Number(startedAtMs) : null,
    exit_code: Number(exitCode),
    wall_ms_measured: Number(wallMsMeasured),
    wall_span_ms: isCop ? null : (r.wallSpanMs ?? null),
    model: r.primaryModel ?? null,
    requests: r.requests ?? null,
    tool_calls: r.toolCalls ?? null,
    total_tokens: r.totalTokens ?? null,
    prompt_tokens: promptTokens,
    fresh_input_tokens: freshInput,
    cached_tokens: cached,
    cache_creation_tokens: cacheCreation,
    completion_tokens: r.completionTokens ?? null,
    cache_hit_rate: r.cacheHitRate ?? null,
    cost_token_norm_usd: costTokenNorm,
    native_credits: nativeCredits,
    tools_json: JSON.stringify(toolsMap),
  };
  process.stdout.write(JSON.stringify(row) + "\n");
});
