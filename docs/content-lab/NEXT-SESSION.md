# Next Session — Handoff

A standing "pick up here" note for the Copilot Behavior Lab content program.
Update it at the end of each working session. Last updated: 2026-06-08
(consolidated to 8 articles; 03→01 merge; ordering finding→08).

## Session 2026-06-08 (consolidation to 8 strong articles — START HERE)

**Decision (user): fewer, stronger articles for LinkedIn reach — target 8, path
to 10.** LinkedIn not started yet, so we reshuffled editorial freely. New lineup
and rationale are in `publishing-plan.md` (authoritative) and mirrored in the
skill's "Currently planned experiments". Three clusters: **A Fixed Floor**
(08, 07, 09) · **B Session Tax** (05, 06) · **C Per task** (01, 02, 04).

What changed this session (editorial only — no React/site.js yet):

- **New finding folded into `08`:** the warm prefix is anchored by **tool defs,
  not the system prompt**. Wire order is `tools → system → messages`, so tool
  schemas are the first cached bytes; the system prompt is ~⅓ stable base + ~⅔
  user-specific (cwd, workspace, `copilot-instructions.md`, template vars) so it
  can't be shared cross-user. Measured from `hi2_18.json` `p2.l0` (sonnet-4.5):
  tools ≈ 8,526 tok, system ≈ 11,026 tok (first ~3,700 invariant). Reconciles 08's
  ~9,680 shared block ≈ tools + invariant system head. Added: Key Finding #6,
  "Anatomy of the warm prefix" table, Interpretation layer-1 fix, Confidence note
  (anatomy = N=1; ordering is structural), Evidence ref, LinkedIn-post paragraph.
  **NOT a separate #10** — it's part of the cache story.
- **`03` Prompt Precision merged into `01`:** `01` retitled **"Round Trips Are the
  Lever"** with a new "The Same Lever: Prompt Precision" section (reasoned from the
  measured context arm, **capture pending** — labeled as such). `03` is now a
  tombstone redirect that preserves the stable ID; do not publish it standalone.

**Open follow-ups from this consolidation:**

- **React/site.js partially caught up.** `01`'s deployed page is now retitled
  "Round Trips Are the Lever" (page, `site.js`, and the fixed-report card all
  match the consolidation). `08`'s page doesn't yet show the prefix-anatomy chart.
  Decide whether to (a) add 08's chart now or (b) leave it and only ship editorial.
  The merge and the ordering finding are editorial-complete regardless.
- A **prefix-anatomy capture** beyond `hi2_18.json` (different toolset/model) would
  lift the ordering finding from N=1 toward a multi-point observation.
- The precise-vs-vague capture (old `03`) now feeds `01`'s precision section, not a
  new page.

## Program status at a glance

| # | Experiment | Editorial | Deployed page | Status | Blocking dependency |
| --- | --- | --- | --- | --- | --- |
| 01 | Round Trips Are the Lever (was Context Quality; **+03 merged**) | ✅ full (precision arm reasoned) | ✅ live on Pages (retitled "Round Trips Are the Lever") | Published | precision capture (optional) |
| 08 | Cache Behavior (**+ prefix-ordering finding**) | ✅ full | ✅ live on Pages (anatomy chart not yet added) | Published | optional anatomy chart/capture |
| 05 | Context Growth | ✅ full (N=1) | ✅ bespoke page (PR #19) | Published | — (raw export intentionally NOT bundled — see below) |
| 06 | Agent Planning | ✅ full (N=1 + model) | ✅ bespoke page | Published | — (reframed: "sub-agents are a context loan") |
| 07 | Tool Overhead | ✅ full (N=1) | ✅ bespoke page + fixed report `tool-overhead-120` | Published | — (narrowed to tools; skill story owned by 09) |
| 09 | Installed Skill Overhead | ✅ full (**measured N=3**) | ✅ live on Pages (bespoke page + fixed report) | Published (page) — LinkedIn post pending | — |
| 02 | Model Choice — Pick It, or Let Auto Pick | ✅ full (N=1 per arm) | ✅ bespoke page + 2 fixed reports (Sonnet/Haiku) | Published | — (measured Sonnet 20.7 cr vs Haiku 10.5 cr JSDoc A/B) |
| 03 | Prompt Precision | **merged → 01 (tombstone)** | — | Retired | — |
| 04 | Caveman Prompting | stub | — | Draft | needs with/without capture |

"Editorial" = the markdown in `experiments/NN-*.md`. "Deployed page" = a bespoke
React page + route in the cost-view SPA that actually ships on GitHub Pages.
GitHub Pages deploys ONLY `packages/cost-view/dist` from `main`; the
`docs/content-lab/*.md` files are editorial sources and are NOT published.

## Session 2026-06-07 (#09 measured AND published — START HERE)

**#09 Installed Skill Overhead is done: measured, written, and its page is live.**
PR #21 (bespoke page + inline charts + fixed report) is **merged to `main`** — the
page ships on GitHub Pages at `/#/experiments/installed-skill-overhead`. The 5
relocated skill folders are now **committed in `octodemo/internalChatModes`** (the
machine cleanup is durable). Only remaining task on #09: **post the LinkedIn draft**
(it's at the bottom of `experiments/09-installed-skill-overhead.md`).

What was done:

- Captured a clean **3-step before/after staircase** on a trivial `hi` prompt
  (claude-sonnet-4.5, same `octocat_supply` workspace), in `~/CopilotLogExports/`:
  `hi_116.json` (dirty, 23 global-plugin skills) → `hi_skillCleaned.json` (5) →
  `hi_skillCleaned3.json` (**0** global-plugin skills). Skill catalog ≈5,146 →
  ≈3,027 → ≈1,917 tok; billed `prompt_tokens` 25,367 → 21,364 → 20,167.
- **The clean causal point is pass 2** (`hi_skillCleaned`→`3`): tool catalog/deferred/
  sent all unchanged, skill catalog ≈−1,110 ≈ billed prompt −1,197 (near 1:1). Pass 1
  also removed the `workiq` MCP server (enabled tools 120→56), so its larger −4,003
  is NOT skill-only — the rewrite states this explicitly (rubber-duck caught the
  over-attribution; fixed).
- **Cross-link to #07 is the spine:** sent full-schema tool block held flat at
  ~9,107 across all three even as the flat tool catalog fell 36,020→16,545. Tools
  virtualized; skills not. #09 stays a **separate page** (not merged into #07) per
  the chosen "twin" framing.
- **The relocation is real, executed, and now committed:** the M365 toolkit (4 skills)
  + `microsoft-foundry` were moved from global (`~/.copilot/installed-plugins/work-iq`,
  `~/.agents/skills/`) into `octodemo/internalChatModes/.github/skills/` and committed
  there. Both global dirs are EMPTY (0 global-plugin skills). The earlier 18 internal
  data skills were moved in a prior session.
- **Bespoke page + fixed report shipped:** `pages/InstalledSkillOverhead.jsx` with 3
  inline charts (staircase BarChart, tools-vs-skills contrast BarChart, before/after
  composition StackedBars); fixed report `skill-overhead-cleaned` (scrubbed
  `hi_skillCleaned3`, `jfhelin`→`appuser` length-preserving, byte-identical). 191
  tests + build green. Routed in `App.jsx`; `site.js` EXPERIMENTS (custom + reportRoute)
  and FIXED_REPORTS updated.

**Remaining floor (the only skills left after the move):** 14 skills = 2 project
(workspace-scoped) + 5 VS Code built-in Copilot (~904 tok, irreducible) + 7 VS Code
extension (GitHub-PR ×6 + evals ×1, ~700 tok, removable by disabling those
extensions). Also flagged: **3 duplicate GitHub MCP servers** worth collapsing to 1.

**Next:**
- **Post #09 to LinkedIn** (draft + video outline already written) — the last open
  item on #09 itself.
- #07's cleanup A/B (the `cleanup-before/after` capture) is the open item to move
  **#07** from "Under investigation" → measured; the skills half (#09) is now done.
- Optional: a 4th capture in a repo with NO project skills to show the pure 12-skill
  / ~1,604-tok global floor (vs the 14 here that include 2 octocat project skills).
- Optional: disable the GitHub-PR + evals VS Code extensions and re-capture to push
  the floor toward the ~904-tok irreducible built-in minimum.


## Session 2026-06-07 (privacy remediation + measured floor data) — earlier

**Shipped (PR #19, branch `jfhelin/project-state-review`):**
- **Scrubbed the 3 already-published exports** (`t2-maprows-lazy`, `02-one-tool`,
  `hi-116-tools-deferred`) of internal identifiers using **exactly
  length-preserving** fakes — proven invisible to the cost math (byte sizes
  unchanged, JSON valid, zero residual markers, 184 tests + build green).
  `subagent-example.json` was already clean.
- **Added a pre-publish privacy gate** to the `copilot-behavior-lab` skill (§6):
  a "scrub the export before it becomes public" checklist (what to scan for, the
  length-preserving rule, verification steps, git-history caveat). This is the
  permanent guard against recurrence — read it before bundling any export.
- Removed the now-resolved open privacy item from this doc; corrected the
  cart-export note (length-preserving scrub means bundling it as a *real
  interactive report* is now viable, not a constraint).

**Measured floor data (NEW — digested real exports from `~/CopilotLogExports/`):**

| Run (in `~/CopilotLogExports/`) | Model | Sent tool-def tok* | Tool-def share | Flat catalog → sent (grouping saved)* |
| --- | --- | ---: | ---: | --- |
| `01-hello-80.json` (trivial) | 4o-mini | 9,686 | **35.6%** | 22,137 → 9,686 (saved 12,451) |
| `readme-cold-nocontext.json` | 4o-mini | 18,663 | **35.8%** | 32,641 → 18,663 (saved 13,978) |
| `03-workiq-316-tools.json` | sonnet-4.6 | 59,475 | **34.6%** | 485,860 → 59,475 (**saved 426,385**) |

*\*Units: the absolute token columns are `rollups.toolDefs.approxTokensTotal` /
`catalogIfFlatApproxTokens` — **session totals summed across all LLM calls**, not
per-call. Per call, the 320-tool run sends ~9,600 schema tokens vs ~81K if flat
(see #07's decoupling table, the `workiq` row). The **share** column is per-call
equivalent (a ratio) and is the robust headline.*

Three findings, each potentially article-grade:
1. **Tool defs are a stable ~⅓ of prompt tokens** (34.6–35.8% share) across wildly
   different runs — even a "hello" run ships ~9,700 tok of tool schemas per call
   (matches #08's "~9,680-token shared block").
2. **The deferred-tool index is real and huge** — and this is **already #07's
   core finding**, not new. The same 320-tool capture is #07's `workiq` row
   (~9,600 sent vs ~81K flat per call, ~8x compression). What this session adds is
   only confirmation + the now-exposed `rollups.toolDefs` session-total fields.
3. Together with #09 (skills catalog = a separate ⅓ of the *system prompt*), the
   fixed floor = **cache (#08) + tool defs (#07) + skills catalog (#09)** —
   "what a turn costs before you type anything."

**Publishing-plan implications (now written into `publishing-plan.md`):**
- **"Fixed Floor" framing added** — #08 → #07 → #09 grouped and moved to the front
  of the launch order (they tell one story: the cost before you type).
- **No new #10.** The deferred-tool-index story is fully owned by #07 (capture,
  pinned report, LinkedIn post, video already done) — a separate page would
  duplicate it. Earlier draft note proposing #10 was withdrawn after re-reading #07.
- **#09 is now Published** (was the one gap in the trilogy): a measured
  before/after from existing `hi*` captures on disk (`hi18` 37 skills →
  `hi_skillCleaned3` 14 skills) cut the system prompt ~11,026→~7,629 approx tok
  (~31%). Shipped as a charts-only bespoke page (`pages/InstalledSkillOverhead.jsx`);
  raw export withheld (internal skill catalog), credit delta withheld (cold/warm
  cache confound).
- Length-preserving scrub unblocks shipping #05 + the floor runs as **real fixed
  reports**, not just static charts.

**⚠️ Caveat for any future capture:**
- The global plugin surface is now **clean** (`ls ~/.copilot/installed-plugins/`
  is empty), matching the #09 "after" state. Earlier sessions saw `work-iq` still
  installed — re-verify before trusting any "before" capture is representative.
- `01-hello-80` / `readme-cold-nocontext` used **gpt-4o-mini**; capture the floor
  on the model you actually use (sonnet-4.6) so credits are representative. (The
  #09 A/B used sonnet-4.5 main calls for exactly this reason.)

## What shipped this session (on the open PR branch)

- Added **inline SVG charts to the two published pages** (#01 Context Quality,
  #08 Cache Behavior) so each headline lands visually before the reader opens the
  full report. New dependency-free, theme-tokened component
  `packages/cost-view/src/components/charts.jsx` (`BarChart`, `StackedBar`,
  `LineChart`) with vitest coverage in `__tests__/charts.test.jsx`. #08 gained a
  cache-hit curve (40→99%), a per-call credits-collapse bar, and a sub-agent vs
  cold-start bar; #01 gained the 12.8-vs-8.0-cr headline bar and a stacked
  round-trip comparison (6 calls vs 1). No new deps; numbers reuse existing
  measured values. Charts are additive — prose, tables, and the report button are
  unchanged.

- Wrote **#05 Context Growth** end-to-end (editorial, N=1) from the cart run — the
  last experiment fully writeable from data already on disk. Headline: the prefix
  tripled (19.5K → 64.2K tokens) and never shrank; re-reading the grown context
  was the single largest cost line (42.4 / 106.6 cr = 40%), and the per-call
  re-read floor rose ~1.5 → ~1.9 cr as history grew. Editorial-only by choice
  (7.5 MB export); deploying as a pinned report is an optional follow-up.
- **Deployed #05 Context Growth** as a bespoke Pages page (PR #19):
  `pages/ContextGrowth.jsx` with two inline-SVG charts (the 34-call growth curve
  and the 42.4 / 33.7 / 30.5 cost-bucket bar), routed in `App.jsx`, flipped to
  `Published` + `custom` in `site.js`, with an app routing test. Also tightened
  the editorial to soften the "monotonic / never shrank" framing (p0/p1 are
  separate sub-agent windows; the monotonic curve is the main thread p2→p3).
- **Decided NOT to bundle the 7.5 MB cart export** as an interactive report.
  Reason: the export embeds the full installed-skills catalog in every request
  snapshot's system prompt. At the time we thought scrubbing the internal-plugin
  entries (`workiq`, `revenue`, `kusto` references, ~2,000 hits) would change
  `promptTokens` and the system-block sizes — corrupting the exact 19.5K→64.2K
  numbers the report exists to visualize — so #05 stayed editorial + static
  charts. (Repo is PUBLIC; the demo app itself is `octodemo/octocat_supply`,
  GitHub's public demo — no secrets, no demo scripts in the export — but the
  skills catalog is the user's own internal tooling.)
  **Update (2026-06-07):** that dilemma is resolved — a **length-preserving**
  scrub (each internal token replaced with a fake of identical character length)
  leaves every char-derived number untouched, as proven on the three already-
  published exports (byte sizes unchanged, all reports' numbers identical). So
  bundling the cart export as a real interactive report is now viable if we want
  it; #05 staying static is a choice, no longer a constraint. See the publishing
  skill's "scrub the export" checklist for the procedure.
- **Seeded #09 Installed Skill Overhead** (`experiments/09-installed-skill-overhead.md`
  + `site.js` Draft entry). The disclosure above turned into its own experiment:
  the skills catalog was **54% of the system prompt (~5,128 tok)**, and 22
  internal-plugin skills were **~2,934 tok = 31% of the system prompt** — on a
  React task. Important correction baked in: this is the **skills catalog in the
  system prompt**, NOT MCP tool schemas. The active tool catalog
  (`metadata.tools`) held 28–56 generic tools and ZERO internal-MCP schemas, so
  installed-but-disabled MCP servers did NOT inflate the payload — installed
  plugins/skills did, via their name+description entries.

## Clean-rerun recipe (already done for #09; kept for a cleaner #05/#07 baseline)

> **#09's A/B is captured and published** — the `hi18`/`hi_skillCleaned*`/`hi4_0`
> runs already on disk served as the before/after (37→14 skills, system prompt
> ~11,026→~7,629 approx tok). The recipe below remains useful if you want a
> matched-cache (cold/cold) pair to also pin down a clean *credit* delta, which
> the current captures can't (before was cold, after warm).

To get a capture without the internal-skill disclosure (and to measure the #09
saving), do a before/after on the same trivial prompt ("Reply with just OK."),
same model/mode/repo, fresh sessions:
- **Uninstall plugins:** `github-revenue`, `work-iq`, `copilot-plugins/workiq`
  (disabling-but-installed may not help — the catalog is injected on install).
- **Disable MCP servers (defensive):** `workiq`, `revenue`, `kusto-mcp`.
- **Keep (public, safe to ship):** Azure MCP, `github`, `github-agentic-workflows`,
  `github-remote`, `playwright`, Bicep, pylance.
- Export both as `skills-before.json` / `skills-after.json` into
  `~/CopilotLogExports/`, then diff system-prompt tokens (`messages[0]`, role=0),
  `<skill>` block count, first-call `promptTokens` / `cacheCreationTokens` /
  `cacheHitRate` / `credits`, and `toolDefsApproxTokens` (should stay ~flat — that
  isolates skills from tools).

## Highest-value next steps (in order)

1. **#07 skill half — the cleanup A/B (needs a capture).**
   Designed and agreed: a **2-step before/after** that measures the *total*
   savings of dropping unused tools AND skills together (we deliberately do NOT
   split tool vs skill — a skill can register its own tools, so the honest unit
   is "what disabling the unused set saved"). Protocol:
   - **Before:** capture the machine **as-is, right now** — same fresh session,
     same trivial identical prompt (e.g. "Reply with just OK."), same model,
     same mode, same repo. Export as `cleanup-before.json`.
   - **After:** disable every unused tool / MCP server / skill, ask the same
     prompt in a fresh session. Export as `cleanup-after.json`.
   - Drop both in `~/CopilotLogExports/`. Then diff the digests on
     `toolDefsCount`, `toolDefsApproxTokens`, first-call `promptTokens`
     (catches skill instruction text), `cacheHitRate`, `credits`.
   - Write the result into `07` with the lumping caveat stated up front. A
     per-category split would need a 3-step staircase (a later follow-up).
   - **#09 is the skills-only sibling:** the same capture, diffed on system-prompt
     tokens / `<skill>` count, isolates the *skill catalog* half (uninstall the 3
     internal plugins). Doing #07's cleanup A/B and #09's install/uninstall A/B in
     one sitting is efficient — they share the before/after method.

2. **Compaction run — turns #08's reasoned guidance into measured evidence.**
   We have NO captured compaction event yet; #08's compaction guidance is
   explicitly flagged as "reasoned from the cache mechanism, not separately
   measured." This is also the missing measurement behind **#05's** advice to
   "compact deliberately." Capture a long session, trigger `/compact`, then keep
   working for several more calls. Measure: the summarization call's own cost, the
   first post-compaction call's cache hit / cache-creation tokens, prefix size
   before vs after, and steady-state credits before vs after → compute the
   break-even N.

3. **Capture-dependent stubs:** #02 Model Selection (same prompt, two models),
   #03 Prompt Precision (precise vs vague), #04 Caveman Prompting (with/without).

4. **Optional deploys (no new capture):** #05, #06, #07 are editorial-only because
   the cart export is 7.5 MB. To deploy any as a pinned report, decide whether to
   bundle the export or keep numbers as static tables. #05's context-window bar
   would visualize the growth call-by-call if deployed.

## Key measured findings to reuse (so we don't re-derive)

All from `04-plan-implement-cart.json`, claude-sonnet-4.6, 106.6 credits total
(lower bound; ~1.9 cr thinking under-counted), 60 tool calls, 94% cache hit.

- **Agent planning (#06):** plan phase 40.2 cr = 38% of the session, BEFORE any
  code. Of that, plan reasoning `p2` = 11.5 cr; exploration sub-agents `p1`
  (11.9) + `p0` (16.8) = 28.7 cr = 71% of the planning phase. Implement `p3` =
  66.4 cr / 19 calls (bigger, but cache-efficient — cost was volume).
- **Tool/skill overhead (#07):** tool defs are ~25–32% of every call. Footprint
  by phase: sub-agents 28 defs / 6,301 tok; plan 29 defs / 6,819 tok; implement
  56 defs / 15,929 tok. Plan→Agent mode switch (+9,110 def tokens) invalidated
  ~40K tokens of warm cache → one 15.7-cr cold write at `p3.l0` (19% hit).
- **Cache (#08, already published):** shared 9,680-token first-call hit
  reproduced N=4 (t1/t2/t2_2/readme-cold-nocontext). Per-call curve on t2:
  40.3% → ~99% over 6 calls. Sub-agent first calls enter ~98% warm by reusing
  the parent prefix. Cache is per-model; changing the front of the prefix
  (model / system / tool-defs / history / compaction) resets it.

## Cache-killers list (the unifying mechanism, for #07/#08 reuse)

The cache is a longest-common-prefix match, per model. Front→back:
`model → system → tool defs → environment → history → current turn`. Anything
that changes a token near the front invalidates everything after it. Worst →
mildest: model switch (100%); system/environment change; tool-defs change (mode
switch / toggling tools/skills/MCP — the cart's 15.7-cr event); history mutation
/ compaction; ~5-min TTL idle; context-window truncation; serialization
non-determinism.

## How to regenerate any number

```sh
node .github/skills/copilot-chat-export/scripts/digest.mjs <abs-export-path> --stdout
```

Useful fields: `rollups.primaryModel`, `rollups.cost.credits.total`,
`rollups.cost.thinkingUnderCount`, `rollups.cacheAnomalies`; per-call
`timeline[]` (`promptTokens`, `cachedTokens`, `cacheCreationTokens`,
`cacheHitRate`, `credits`, `toolDefsApproxTokens`, `toolDefsCount`); per-prompt
`prompts[]` (`credits`, `isSubagent`, `spawnedBy`, `spawnedSubagents`).

## Publishing mechanics reminder (to fully deploy an editorial page)

A markdown file alone does NOT appear on Pages. To deploy an experiment like #01
and #08, three pieces are needed:
1. the editorial markdown in `experiments/NN-*.md`,
2. a bespoke page component in `packages/cost-view/src/pages/` + a route in
   `App.jsx`,
3. an `EXPERIMENTS` entry (and usually a `FIXED_REPORTS` entry reusing a bundled
   `public/sessions/*.json`) in `packages/cost-view/src/content/site.js`.
Then `npm test` + `npm run build`, commit, PR, merge → live after Pages deploy.

Note: #06 and #07 are currently editorial-only by choice. The cart export is
7.5 MB, so if we deploy either as a fixed report we should decide whether to
bundle it or present numbers as static tables (as the articles already do).
