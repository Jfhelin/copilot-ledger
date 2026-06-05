/**
 * Cost of UNUSED tool definitions, priced from the tool_defs bucket's own
 * cache behavior (NOT a blended whole-context-window rate).
 *
 * Why this exists: an unused tool def is dead weight shipped on every LLM call.
 * But its cost is not uniform across calls. Anthropic prompt caching is
 * positional, so a tool def's FIRST appearance is billed as a cache WRITE
 * (~1.25x input), and subsequent calls read it from cache (~0.1x input). When
 * tools are ADDED mid-session, the cached prefix breaks and the tool-defs
 * suffix is re-written -- an expensive event. Pricing every unused token at a
 * flat cache-read rate over-promises the savings of dropping the dead weight
 * (it ignores the write side and the re-warm cost on tool-set changes).
 *
 * This helper walks each LLM call and prices the tool_defs bucket using the
 * SAME fresh/cache-write/cache-read decomposition the "Cost by component" panel
 * uses (computePromptCostByBucket): split that call's `newPerBucket.tool_defs`
 * into fresh vs cache-write by the call's overall new composition, price each
 * slice per the call's model, and scale so the per-call bucket costs reconcile
 * to the call's real billed input cost. The dead-weight portion is attributed
 * PER CALL via the unused share of that call's offered tool defs -- so a tool
 * added late only carries cost on the calls where it was actually present
 * (including the re-warm write it triggered), and a stable-but-unused tool
 * amortizes to cheap reads after its single first-call write.
 *
 * Per-tool cache attribution is impossible (the cache matches a contiguous
 * prefix, not individual tools), so within a call we apportion the tool_defs
 * bucket cost by the unused tools' character share of all offered tool defs.
 */

import { estimateCost, getModelPrice } from "./pricing.js";

// Input buckets in wire order, matching CTX_INPUT_KEYS in the cost view. Used
// only to reproduce the per-call cost reconciliation scale factor.
const INPUT_KEYS = ["tool_defs", "system", "history", "tool_results", "current", "images"];

function toolWeightChars(t) {
  if (t && typeof t.chars === "number" && t.chars > 0) return t.chars;
  if (t && typeof t.tokens === "number" && t.tokens > 0) return t.tokens * 4;
  return 0;
}

/**
 * @param {Array} prompts  analysis.prompts (each with .events[])
 * @param {Iterable<string>} unusedNames  tool names never invoked in the session
 * @returns {{ writeCost:number, readCost:number, totalCost:number,
 *             unusedTokensPerCall:number, callsWithDefs:number }}
 *   writeCost = one-time + re-warm cache-write (and any fresh) cost of the
 *               unused tool defs; readCost = recurring cache-read cost;
 *               totalCost = writeCost + readCost (real billed dollars).
 */
export function computeUnusedToolDefsCost(prompts, unusedNames) {
  const unused = unusedNames instanceof Set ? unusedNames : new Set(unusedNames || []);
  let writeCost = 0;
  let readCost = 0;
  let unusedTokSum = 0;
  let callsWithDefs = 0;

  (prompts || []).forEach(function (p) {
    (p && p.events ? p.events : []).forEach(function (ev) {
      if (!ev || ev.kind !== "llm") return;
      const groups = ev.toolGroups || [];
      let offeredChars = 0;
      let unusedChars = 0;
      let hasDefs = false;
      groups.forEach(function (g) {
        (g && g.tools ? g.tools : []).forEach(function (tool) {
          hasDefs = true;
          const c = toolWeightChars(tool);
          offeredChars += c;
          if (unused.has(tool.name)) unusedChars += c;
        });
      });
      if (!hasDefs || offeredChars <= 0) return;
      if (!ev.model) return;
      const price = getModelPrice(ev.model);
      if (!price) return;

      callsWithDefs += 1;
      unusedTokSum += Math.round(unusedChars / 4);
      const share = unusedChars / offeredChars;
      if (share <= 0) return;

      // Reproduce the per-call bucket cost decomposition + reconciliation scale
      // used by the Cost-by-component panel, so this number agrees with it.
      const comp = ev.components || {};
      const npb = ev.newPerBucket || {};
      const newTotal = (ev.fresh || 0) + (ev.cacheWrite || 0);
      const freshShare = newTotal > 0 ? (ev.fresh || 0) / newTotal : 1;
      let inputCostSum = 0;
      let tdFresh = 0;
      let tdCw = 0;
      let tdCached = 0;
      INPUT_KEYS.forEach(function (k) {
        const totalIn = k === "images" ? (ev.visionTokensTotal || 0) : (comp[k] || 0);
        const newB = k === "images" ? (ev.imageTokensEst || 0) : (npb[k] || 0);
        const cachedB = Math.max(0, totalIn - newB);
        const freshB = newB * freshShare;
        const cwB = newB * (1 - freshShare);
        const fc = estimateCost({ inputTokens: freshB }, ev.model);
        const wc = estimateCost({ cacheWrite: cwB }, ev.model);
        const cc = estimateCost({ cacheRead: cachedB }, ev.model);
        inputCostSum += fc + wc + cc;
        if (k === "tool_defs") { tdFresh = fc; tdCw = wc; tdCached = cc; }
      });
      const outCost = estimateCost({ outputTokens: ev.output || 0 }, ev.model);
      const realInputCost = Math.max(0, (ev.cost || 0) - outCost);
      const scale = inputCostSum > 0 ? realInputCost / inputCostSum : 0;

      writeCost += (tdFresh + tdCw) * scale * share;
      readCost += tdCached * scale * share;
    });
  });

  return {
    writeCost: writeCost,
    readCost: readCost,
    totalCost: writeCost + readCost,
    unusedTokensPerCall: callsWithDefs > 0 ? Math.round(unusedTokSum / callsWithDefs) : 0,
    callsWithDefs: callsWithDefs,
  };
}
