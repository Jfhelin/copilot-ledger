# Caching & context management

> Supporting research for [`article-02-more-than-a-model.md`](../../article-02-more-than-a-model.md).
> This is a shared human/agent scratchpad, not published copy.

**Capture.** Structural-prefix runs (single session) + 40-run batch (n=20 each), 2026-06.
**Model.** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`).
**Source captures.** `structural-prefix/{copilot,claude}/digest.json` (`rollups.cacheHitRate`);
`repeatability-40run/captures.jsonl` (token-weighted, recomputed). Context-mgmt wording from
system prompts.

---

## One-line thesis

Prompt caching is what makes a heavy prefix survivable — both harnesses recover **~81–86%**
of their input tokens from cache. But caching is a **harness mechanic** (block shape,
reuse) and **context management** (when to summarize, trim) is another harness lever
entirely. Same model; the cache discipline is the harness's.

## Cache-read rates (Direct evidence)

Two views — single careful session vs the durable token-weighted average:

| Source | CO-CLI / copilot | CL-CLI / claude |
|---|---:|---:|
| Structural session `rollups.cacheHitRate` | 0.8722 | 0.9022 |
| **40-run token-weighted cache-read rate** | **0.8089** | **0.8644** |

40-run token-weighted = cache-read / (cache-read + cache-creation + fresh input), summed
across all 20 runs per harness:

| Harness | cache-read tok | cache-creation tok | fresh input tok | rate |
|---|---:|---:|---:|---:|
| copilot | 1,542,212 | 338,513 | 25,813 | **0.8089** |
| claude | 6,296,982 | 965,582 | 22,178 | **0.8644** |

- Both harnesses are **cache-dominant** — the vast majority of input tokens are reads, not
  fresh or newly-created. This is why a 16–29k cold prefix doesn't bankrupt a long session.
- Claude's rate is a bit higher (0.864 vs 0.809), but note the **absolute scale**: Claude
  pushes **~3.8× the total input tokens** through (7.28M vs 1.91M across 20 runs), consistent
  with its 3.6× request count (dossier 06). A higher *rate* on a much larger base still means
  far more total spend.

## Why caching matters here (the article's framing)

- The first call pays **cache-creation** to write the system+tools block into cache
  (dossier 01). Every subsequent call **reads** it cheaply. The whole economics of a big
  prefix depends on this reuse.
- Cache effectiveness is a **harness design choice**: how the system field is *shaped* (one
  cached block vs many vs a raw string — dossier 02) sets the cache granularity. Copilot CLI
  ships **one** cached system block; Claude ships a single string. Shape drives what can be
  reused.
- So "caching saved me money" is really "my harness arranged its prompt so the model's cache
  could help." The model offers the mechanism (locked); the harness decides how well to use
  it (discretion).

## Exact savings, where we can measure them (Direct evidence — Copilot only)

The structural Copilot run reports a real counterfactual: **16.296 credits actually billed**
vs **51.668 credits without cache** = **35.37 credits (~68%) saved by caching** on that
session (`rollups.cost.native.withoutCacheCounterfactual`). Claude exposes no native
billing, so its savings can only be *modelled*, never confirmed.

## Context management — a separate lever (Direct evidence)

Caching handles cost; **context management** handles the window filling up. The harnesses
legislate this differently in their system prompts:

| Harness | Context-management posture |
|---|---|
| Claude CLI / Code | Explicit `# Context management` section — warns the model that history may be **summarized**, tells it to keep working across compaction |
| Copilot CLI | Relies on app-managed summarization; less in-prompt ceremony about it |

- Claude **names** context management as a first-class concern in the prompt; Copilot leaves
  more of it to the surrounding app. Same model window; different in-prompt discipline.
- This is the bridge to the article's "long sessions" section: the cold prefix is paid once
  and cached, but **history growth** is the variable cost over a long session, and how
  aggressively a harness summarizes/trims is its call.

## UX consequences (Inference)

1. A harness with a single cleanly-cached system block recovers cost faster on long sessions;
   frequent prefix changes (e.g. tool set churn) would force cache re-creation and erode the
   rate.
2. Claude's higher absolute token throughput means its sessions cost more **even at a better
   cache rate** — rate alone isn't the cost story; volume × rate is.
3. Explicit context-management wording likely makes Claude more resilient across
   summarization boundaries; unmeasured here as a quality effect.

## Notable quirks / tells

- Single-session `cacheHitRate` (0.87/0.90) runs higher than the token-weighted 40-run rate
  (0.81/0.86) — a reminder that one warm session flatters the cache vs the batch average.
  Cite the **40-run** figure as the durable one.
- Copilot's per-run native credits across the batch sum to 259.85 / 20 = **12.99 credits =
  $0.1299 per run**, matching the token-normalized cost exactly — a nice cross-check that the
  modelling is calibrated for Copilot.

## Open data gaps

- No native cache-savings figure for Claude (no billing surface) — its ~68%-style savings
  can only be modelled.
- Context-management *behaviour* (how often each harness actually summarizes, and the quality
  cost of compaction) is asserted from prompt wording, not measured over long sessions.
