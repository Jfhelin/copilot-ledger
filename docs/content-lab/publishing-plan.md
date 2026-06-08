# Publishing Plan

## Publishing Principle

LinkedIn is the primary publishing surface. GitHub Pages is the evidence layer.

Each published topic should have:

1. A short LinkedIn post
2. A 60–120 second native LinkedIn video or screen recording
3. A GitHub Pages experiment page
4. A Copilot Ledger export or evidence section

## Suggested Launch Order

The file numbers under `experiments/` (`01`–`09`) are stable IDs, **not** the
publishing order or the article count. We deliberately consolidated to **8
strong articles** (fewer, stronger — better for LinkedIn reach) grouped in three
clusters. Two former stubs were folded in: **03 Prompt Precision merged into 01**,
and the **prompt-ordering / global-cache finding was folded into 08** (it is not a
separate article). Publish in cluster order.

### Cluster A — The Fixed Floor ("what a turn costs before you type")

These three measure the same thing from three angles and run as a themed
mini-series so each post reinforces the next.

1. **[Fixed Floor 1/3] Cache Behavior** (`08`) — Your "cold" session isn't cold
   (~9,700 tokens pre-cached) — **and the block that anchors it is your *tool
   defs*, not your system prompt** (the system prompt is too user-specific to
   share across users). Tools-first on the wire is *why*.
2. **[Fixed Floor 2/3] Tool Overhead** (`07`) — Tool count is nearly
   free; most tools ride name-only and cached. *Churning* the sent set is the
   real tax. (The deferred-tool-index decoupling lives here — captures 23→320
   tools; do not split it into a separate page.) **Published — bespoke page live;
   pinned report `tool-overhead-120`. Narrowed to tools; the skill story is `09`.**
3. **[Fixed Floor 3/3] Installed Skill Overhead** (`09`) — A third of the system
   prompt was skills I never used; skills aren't virtualized, so uninstalling
   cuts every call.

### Cluster B — The Session Tax ("what grows as you work")

4. **Context Growth** (`05`) — Long sessions behave differently; re-reading the
   grown context was 40% of the run.
5. **Agent Planning / Sub-agents** (`06`) — Sub-agents are a *context loan*, not
   a discount; 40 credits before a line of code.

### Cluster C — What you control per task

6. **Round Trips Are the Lever** (`01`, merges former `03`) — The README was
   cheap; finding it wasn't. Context quality *and* prompt precision are one
   mechanism: both cut discovery round trips.
7. **Model Choice — Pick It, or Let Auto Pick** (`02`) — GitHub's **top two**
   cost levers (*choose the right model* + *use Auto Mode*) combined into one
   piece, since both answer "which model runs your turn?". Measured: same JSDoc
   task on Sonnet 4.5 (20.7 cr, 16/24 symbols) vs Haiku 4.5 (10.5 cr, 24/24) —
   ~49% cheaper *and* more complete; plus the two-model-per-session routing anchor
   and Auto's documented 0.9× billing multiplier. *(Published — measured, N=1 per arm.)*
8. **Caveman Prompting** (`04`) — The prompt-compression trick saved <3% in a
   107-credit session. Contrarian closer. *(Stub — needs with/without capture.)*

### Optional 9–10 (publish only once measured)

- **Compaction break-even** — turns 08's reasoned compaction guidance into
  measured evidence (summarization cost + post-compaction cold write vs. savings).
- **Image input** — cost shape of vision prompts.

Why this shape: the Fixed Floor trilogy is *universal* (every user pays it,
regardless of task or prompt skill) and counterintuitive, which makes it the
strongest opening. The Session Tax shows what changes as a run extends. The
per-task levers (Round Trips, Model Selection, Caveman) land better once readers
understand the floor and the tax those levers sit on top of.

Note: no separate "deferred tool index" or "prompt ordering" experiment — those
findings are the cores of `07` and `08` respectively, which already carry the
captures, pinned reports, and drafted posts/videos. Separate pages would
duplicate them.

## Cadence

Publish one LinkedIn post every 7–10 days.

Prepare at least 3–4 experiment pages before publishing the first post.
