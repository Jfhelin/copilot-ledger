# Context Quality

## LinkedIn Hook

> The answer lived in one file. Letting the agent find it cost 37% more.

## Executive Summary

> **Scope note:** This is data from a **single run per arm** (N=1). The numbers
> below are a directional, single-session observation, not a benchmark. The one
> finding reproduced across multiple runs — the shared prefix cache — is flagged
> as such where it appears.

I asked GitHub Copilot the same question two ways: once with the relevant file
attached, once without. The only variable was the attachment. Letting the agent
find the file itself turned a single model call into **six** — one search, four
reads, and an answer — and raised the cost from **8.0 credits ($0.080) to 12.8
credits ($0.128)**, a **37% increase**. The surprise underneath it: every run
started with the *exact same* 9,680 tokens already cached on the very first
call, in a fresh session, pointing at a shared prefix cache none of us warmed.

## Hypothesis

If the developer already knows which file holds the answer, attaching it up
front should be cheaper than letting the agent discover it — because discovery
adds extra round trips, and each round trip re-bills the whole conversation
prefix.

## Why This Matters

Developers are told to "give the agent good context." This experiment puts a
credit number on *how* you supply it. The cost difference is not in the answer —
it is in the **search-and-read round trips** the agent makes when context is
missing. Round trips, not tokens, are the lever.

## Session Summary

Two runs against the same repo (`octocat_supply` demo), same model, same prompt:

> *"Our repository classes all call a helper called `mapDatabaseRows` when
> returning query results. How does it actually work — what does it do to the
> rows it gets back from SQLite?"*

| | **Arm A — lazy** (`t2.json`) | **Arm B — file attached** (`t2_2.json`) |
|---|---|---|
| Task | Same prompt, no attachment | Same prompt + `api/src/utils/sql.ts` |
| Model | claude-sonnet-4.5 | claude-sonnet-4.5 |
| Total credits | **12.8** ($0.128) | **8.0** ($0.080) |
| Key cost driver | 5 extra round trips (the "tail") | One cold first call |
| LLM calls | 6 | 1 |
| Tool calls | 5 (1 `grep_search` + 4 `read_file`) | 0 |
| Session cache hit | 88.8% | 42.3% |

Note: Arm A used extended thinking, so its 12.8-credit headline is a **lower
bound** by ~0.2 credits of hidden reasoning output. Pricing version `2026-05`;
all models priced.

## Key Findings

1. **Attaching the file was 37% cheaper** (8.0 vs 12.8 credits) and removed 5
   round trips.
2. **Inlining is not free on the first call.** Arm B's single call (8.0 cr) was
   *more* expensive than Arm A's first call (5.9 cr) — it pays for the attached
   file as fresh cache-creation and emits the full answer immediately. The win
   comes entirely from deleting the tail.
3. **Hop count, not hop size, dominates.** Arm A's agent fanned out into a grep
   plus four small, overlapping reads of the same file, each re-billing the
   ~25K-token prefix at the cache-read rate (~1.1–1.6 cr apiece). That fan-out
   is nondeterministic — another run might take three hops, not six.
4. **A shared prefix cache is real.** Every cold first call — across four
   independent fresh sessions — started with *exactly* 9,680 tokens already
   cached, despite no prior activity and a 5+ minute idle gap.

## What Happened

**Arm A (lazy)** — `t2.json`:

1. `p2.l0` — "Let me search for its definition" → emits a `grep_search` for
   `mapDatabaseRows`. (5.9 cr)
2. `p2.l1` — grep returns the hits.
3. `p2.l3`, `p2.l5`, `p2.l7`, `p2.l9` — four `read_file` calls on
   `api/src/utils/sql.ts`, in small overlapping windows (one used a corrupted
   path and was retried).
4. `p2.l10` — final answer: snake_case → camelCase column mapping. (1.8 cr)

Total: 6 model calls, 5 tool calls, **12.8 credits**.

**Arm B (attached)** — `t2_2.json`:

1. `p2.l0` — the file is already in context; the agent answers directly. One
   call, no tools, **8.0 credits**.

## Interpretation

The answer was never the expensive part. In Arm A, the **discovery** was: a
search hop plus four read hops, each one paying ~10% of the full prefix again
just to be re-read, plus orchestration output that is never cached. Arm B trades
that away for a single larger first call — it pays ~2 credits more up front for
the inlined file and the complete answer, but avoids the ~7-credit tail.

The shared-cache observation reframes "cold start." A truly cold prefix should
cache 0 tokens. Instead, the **same 9,680 tokens** were pre-warmed on the first
call of every session. That number sits *below* the ~16,096 tokens of tool
schemas, which means it is the **standard system prompt and scaffolding** that
the VS Code Copilot toolset sends on every request — content that is identical
for every user on that toolset, and therefore cacheable across sessions and
plausibly across users. The data suggests the provider keeps that common prefix
warm; you are billed cache-read rates on it, not fresh rates, even on call one.

> This shared-cache observation deserves its own writeup — see the planned
> **Cache Behavior** experiment (`08-cache-behavior.md`), where it is the
> headline rather than a side note.

## Practical Guidance

- **If you know the file, attach it.** In this session it was 37% cheaper and
  far more predictable — one call instead of a six-call fan-out.
- **Provide useful context up front** so the agent doesn't spend round trips
  rediscovering what you already know. This reinforces official GitHub guidance.
- **But avoid excessive context.** Inlining is not free on the first call;
  attach the file you need, not the whole folder. The win is deleting round
  trips, not maximizing context.
- **Watch hop count, not prompt length.** The cost spread here came from the
  number of search/read hops, which is nondeterministic — the strongest reason
  to remove the need for discovery entirely.

## Confidence Level

**Medium, with one stronger sub-finding.**

- The A-vs-B cost comparison is a **single run per arm** — directional, not a
  benchmark. Arm A's six-hop fan-out is one sample of a variable behavior;
  repeat with N ≥ 5 per arm before quoting "37%" as typical.
- The **shared-cache observation is stronger**: the identical 9,680-token cold
  hit reproduced across **four** independent sessions. Still labelled an
  observation, not a proven provider guarantee — further testing across machines
  and accounts would confirm whether it is truly cross-user.

## Evidence

- Primary export: **`t2.json`** (Arm A — the lazy run; shows the
  `grep → read → answer` fan-out and the cold-call shared-cache hit). Published
  as a fixed report: **[open the Arm A run in Copilot Ledger](/reports/context-quality-maprows)**.
- Comparison export: **`t2_2.json`** (Arm B — same prompt, file attached).
- Key refs: A `p2.l0` (grep), `p2.l3/l5/l7/l9` (reads), `p2.l10` (answer);
  B `p2.l0` (single answer). Shared-cache hit: `p2.l0` `cachedTokens = 9680` in
  `t1.json`, `t2.json`, `t2_2.json`, and `readme-cold-nocontext.json`.
- Open either export in the Copilot Ledger canvas to inspect per-call cost,
  cache attribution, and the context-window breakdown.

## LinkedIn Post

I attached one file to a Copilot prompt. It made the session 37% cheaper.

Same question, same model, same repo. The only difference: in one run I
attached the file that held the answer; in the other I let the agent find it.

What the data showed:

- With the file attached: 1 model call, 0 tool calls, 8.0 credits.
- Without it: the agent ran a search, read the file four times, then answered —
  6 model calls, 12.8 credits.
- The answer was never the expensive part. The *discovery* was: every extra
  round trip re-bills the whole 25K-token conversation prefix.

And the part that surprised me most: every "cold" session started with exactly
9,680 tokens already cached on the first call — the standard VS Code Copilot
system prompt, apparently kept warm in a shared prefix cache. You pay cache-read
rates on it before you've typed anything.

The takeaway: if you already know which file holds the answer, attach it. You're
not just saving tokens — you're deleting the round trips the agent would
otherwise spend rediscovering what you already know.

Full breakdown with measurements: [GitHub Pages link]

## Video Outline

**0–10s** — "I attached one file to a Copilot prompt and it made the session 37%
cheaper. Here's why." Show the two exports side by side in Copilot Ledger.

**10–30s** — Show the prompt and the two runs. Same question, same model — the
only difference is the attached file. Point at the call counts: 1 vs 6.

**30–75s** — Zoom into Arm A's timeline: grep → four reads → answer. Highlight
that each hop re-bills the full prefix. Then flip to Arm B: one call. Call out
that B's first call is actually *bigger* — the win is the deleted tail, not the
first call.

**75–105s** — Zoom into the first call's cache bar: 9,680 tokens already cached
in a fresh session, identical across four runs. Explain the shared system-prompt
cache.

**105–120s** — Takeaway: "If you know the file, attach it. You're deleting round
trips, not just tokens." End on the official guidance: provide useful context up
front, but don't over-stuff it.
