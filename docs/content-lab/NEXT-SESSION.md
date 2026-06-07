# Next Session — Handoff

A standing "pick up here" note for the Copilot Behavior Lab content program.
Update it at the end of each working session. Last updated: 2026-06-07.

## Program status at a glance

| # | Experiment | Editorial | Deployed page | Status | Blocking dependency |
| --- | --- | --- | --- | --- | --- |
| 01 | Context Quality | ✅ full | ✅ live on Pages | Published | — |
| 08 | Cache Behavior | ✅ full | ✅ live on Pages | Published | — |
| 05 | Context Growth | ✅ full (N=1) | ✅ bespoke page (PR #19) | Published | — (raw export intentionally NOT bundled — see below) |
| 06 | Agent Planning | ✅ seeded (N=1) | — | Draft | optional deploy |
| 07 | Tool & Skill Overhead | ✅ seeded (N=1) | — | Under investigation | needs cleanup A/B capture |
| 09 | Installed Skill Overhead | ✅ seeded (N=1) | — | Draft | needs install/uninstall A/B capture |
| 02 | Model Selection | stub | — | Draft | needs 2-model capture |
| 03 | Prompt Precision | stub | — | Draft | needs precise/vague capture |
| 04 | Caveman Prompting | stub | — | Draft | needs with/without capture |

"Editorial" = the markdown in `experiments/NN-*.md`. "Deployed page" = a bespoke
React page + route in the cost-view SPA that actually ships on GitHub Pages.
GitHub Pages deploys ONLY `packages/cost-view/dist` from `main`; the
`docs/content-lab/*.md` files are editorial sources and are NOT published.

## What shipped this session (on the open PR branch)

- **Deployed #05 Context Growth** as a bespoke Pages page (PR #19):
  `pages/ContextGrowth.jsx` with two inline-SVG charts (the 34-call growth curve
  and the 42.4 / 33.7 / 30.5 cost-bucket bar), routed in `App.jsx`, flipped to
  `Published` + `custom` in `site.js`, with an app routing test. Also tightened
  the editorial to soften the "monotonic / never shrank" framing (p0/p1 are
  separate sub-agent windows; the monotonic curve is the main thread p2→p3).
- **Decided NOT to bundle the 7.5 MB cart export** as an interactive report.
  Reason: the export embeds the full installed-skills catalog in every request
  snapshot's system prompt. Scrubbing the internal-plugin entries (`workiq`,
  `revenue`, `kusto` references, ~2,000 hits) would change `promptTokens` and the
  system-block sizes — corrupting the exact 19.5K→64.2K numbers the report exists
  to visualize. Bundling would be either a privacy leak or doctored data, so #05
  stays editorial + static charts. (Repo is PUBLIC; the demo app itself is
  `octodemo/octocat_supply`, GitHub's public demo — no secrets, no demo scripts
  in the export — but the skills catalog is the user's own internal tooling.)
- **Seeded #09 Installed Skill Overhead** (`experiments/09-installed-skill-overhead.md`
  + `site.js` Draft entry). The disclosure above turned into its own experiment:
  the skills catalog was **54% of the system prompt (~5,128 tok)**, and 22
  internal-plugin skills were **~2,934 tok = 31% of the system prompt** — on a
  React task. Important correction baked in: this is the **skills catalog in the
  system prompt**, NOT MCP tool schemas. The active tool catalog
  (`metadata.tools`) held 28–56 generic tools and ZERO internal-MCP schemas, so
  installed-but-disabled MCP servers did NOT inflate the payload — installed
  plugins/skills did, via their name+description entries.

## Clean-rerun recipe (to capture #09's A/B, and a cleaner #05/#07 baseline)

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
