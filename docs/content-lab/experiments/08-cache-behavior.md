# Cache Behavior

## LinkedIn Hook

> Your "cold" Copilot session isn't cold. ~9,700 tokens are already cached
> before you type a word.

## Executive Summary

Across four independent, freshly-started GitHub Copilot sessions — different
prompts, different days, 5+ minutes idle — the very first model call reported
the **exact same 9,680 tokens already cached**. A truly cold prefix should
cache zero. This points at a **shared prefix cache** for the standard VS Code
Copilot toolset: the common system prompt and scaffolding sent on every request
appears to stay warm across sessions, and plausibly across users, so you are
billed cache-read rates on it before you've done anything.

This page collects the project's cache observations into one place: the shared
prefix cache, what re-warms a prefix mid-session, and what cache hits actually
buy you per run.

## Hypothesis

The first call of a brand-new session should be fully cold (0 cached tokens).
If it is not — and the cached amount is identical across unrelated sessions —
then part of the prefix is cached *outside* the user's own session.

## Why This Matters

"Cold start" cost intuition is wrong if the system prefix is already warm. It
changes how we read the first call, how we estimate cache savings, and what
"the agent paid full price for X" really means. It also raises a measurement
question for anyone benchmarking Copilot cost.

## Session Summary

- Task: cross-session comparison of the first-call cache on four runs.
- Model: claude-sonnet-4.5 (the worker model in each session).
- Observation: `p2.l0` `cachedTokens = 9680` in **all four** of `t1.json`,
  `t2.json`, `t2_2.json`, `readme-cold-nocontext.json`.
- The 9,680 cached tokens sit *below* the ~16,096 tokens of tool schemas sent
  on the same call — consistent with the system prompt + scaffolding being the
  cached portion, not the tool definitions.
- Each first call still pays a large cache-creation write (~14,000+ tokens) for
  the remainder of the prefix, so the session is only *partially* warm.

## Key Findings

TODO — to expand into a standalone post:

1. The shared 9,680-token first-call hit, reproduced across four sessions.
2. Where the boundary falls: what is pre-warmed (system/scaffolding) vs. what
   you pay to create (tool defs + your conversation).
3. Mid-session re-warming: tool-def changes (mode switches) and 5+ minute idle
   gaps that evict the prefix and force a cold write again.
4. What the cache buys per run — `withoutCache` vs `total` credits.

## What Happened

TODO — walk the four `p2.l0` first calls side by side in Copilot Ledger and show
the identical cached-token figure.

## Interpretation

TODO — distinguish three cache layers: (a) the cross-session shared system
prefix, (b) the per-session prompt cache that grows as the conversation extends,
(c) cache eviction from idle/TTL or tool-def changes.

## Practical Guidance

TODO. Likely themes: don't over-credit "cold start" savings; the system prefix
is not yours to optimize; the levers you *do* control are round trips and
tool-def churn (see Context Quality and Tool & Skill Overhead).

## Confidence Level

**Medium.** The 9,680-token figure reproduced across four independent sessions,
which is stronger than a single observation — but all four ran on the same
machine and account. Whether the cache is truly *cross-user* (not just
cross-session for one user) is **not yet established** and needs testing from a
separate account/machine before any such claim is made.

## Evidence

- Exports: `t1.json`, `t2.json`, `t2_2.json`, `readme-cold-nocontext.json`.
- Ref in each: `p2.l0` → `cachedTokens = 9680`, `cacheHitRate ≈ 0.40`,
  cause "first call for model in session".
- Open any of them in the Copilot Ledger canvas and select the first call to see
  the cache attribution on the context-window bar.

## LinkedIn Post

TODO — hook on "your cold session isn't cold," show the four identical numbers,
explain the shared system prefix, end on what it means for cost intuition.

## Video Outline

TODO — screen-record the four exports in Copilot Ledger, zoom the first-call
cache bar on each, land on the identical 9,680-token figure.
