# Publishing Plan

## Publishing Principle

LinkedIn is the primary publishing surface. GitHub Pages is the evidence layer.

Each published topic should have:

1. A short LinkedIn post
2. A 60–120 second native LinkedIn video or screen recording
3. A GitHub Pages experiment page
4. A Copilot Ledger export or evidence section

## Suggested Launch Order

The file numbers under `experiments/` (`01`–`09`) are just stable IDs, **not**
the publishing order. Publish in this order instead.

**Lead with the "Fixed Floor" series (08 → 07 → 09).** These three measure the
same thing from three angles — *what a Copilot turn costs before you type
anything*: the warm cache you inherit (08), the tool-definition block on every
call (07), and the installed-skill catalog in the system prompt (09). Run as a
themed mini-series so each post reinforces the next.

1. **[Fixed Floor 1/3] Cache Behavior** — Your "cold" session isn't cold
   (~9,700 tokens pre-cached).
2. **[Fixed Floor 2/3] Tool Overhead** — Tool count is nearly free; most
   tools ride name-only and cached. *Churning* the sent set is the real tax. (The
   deferred-tool-index decoupling lives here — captures 23→320 tools; do not split
   it into a separate page.) **Published — bespoke page live (PR #19).**
3. **[Fixed Floor 3/3] Installed Skill Overhead** — A third of the system prompt
   was skills I never used. **Published — bespoke charts-only page live (PR #19).**
   Measured before/after: removing 23 installed plugins cut the system prompt
   ~11,026→~7,629 approx tok (~31%). Credit delta withheld (cold/warm cache
   confound); raw export not bundled (internal skill catalog).
4. Context Quality — The README was cheap. Finding it wasn't.
5. Agent Planning — 40 credits spent before a single line of code (38% of the run).
6. Context Growth — Long sessions behave differently than short ones.
7. Caveman Prompting — Less than 3% realistic savings in a 107-credit session.
8. Model Selection — The biggest cost lever often is not prompt length.
9. Prompt Precision — Vague prompts make agents explore more.

Why the reorder: the Fixed Floor trilogy is *universal* (every user pays it,
regardless of task or prompt skill) and counterintuitive, which makes it the
strongest opening. The prompt/model levers (Caveman, Model Selection, Precision)
land better once readers understand the floor those levers sit on top of.

Note: no separate "deferred tool index" experiment — that finding is the core of
#07 (Tool Overhead), which already has the capture curve, a pinned
report, and a drafted post/video. A second page would duplicate it.

## Cadence

Publish one LinkedIn post every 7–10 days.

Prepare at least 3–4 experiment pages before publishing the first post.
