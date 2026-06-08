# Installed Skill Overhead

## LinkedIn Hook

> I uninstalled one Copilot plugin. Removing its tool schemas barely moved the
> wire. Removing its skills cut tokens on **every** call.

## Executive Summary

The popular advice — "disable tools to save money" — aims at the wrong half of
Copilot's fixed cost floor. **Tool schemas are virtualized**: most enabled tools
ride name-only in a deferred index and are cached, so trimming them barely moves
the wire (this is [experiment 07](07-tool-skill-overhead.md)). The **installed-skill
catalog is not virtualized**: every installed skill injects a `name + description`
block into the system prompt, sent in full on every single call. So skill
*installation*, not usage, is the lever that actually shrinks the floor.

I measured a clean three-step before/after on a trivial `hi` prompt
(claude-sonnet-4.5, same workspace each time). The whole billed prompt fell
**~5,200 tokens per call (25,367 → 20,167 — exact `prompt_tokens`)**, not by
disabling anything in settings but by **relocating** installed skills into the one
repo that needs them. The cleanest causal evidence is the **final step, which
changed only skills** — every tool count held constant (catalog 56, deferred 33,
sent 23): the skill catalog fell **≈1,110 tokens** and the billed prompt fell
**1,197** — a near 1:1 match that isolates the skill effect. The earlier step also
removed an MCP server (tool catalog 120 → 56), so part of its larger drop is the
deferred-tool index, not skills — it's a combined cleanup, not a skill-only one.
Throughout, the **full tool-schema payload stayed flat at ~9,107 tokens** even as
the *flat* tool catalog shrank ~19,500 (`catalogIfFlatApproxTokens` 36,020 →
16,545). **Tools are virtualized; skills are not** — and that is why pruning skills
moves the wire and disabling tools mostly doesn't.

The reason this is worth doing once: it's **a one-time edit with a persistent,
machine-wide effect.** The skill catalog is global, so every chat you start on this
machine/profile — in any repo, on any task — paid the inflated floor, and now pays
the reduced floor, until you change the installed skill/plugin set again. You spend
the effort once; the saving keeps applying across future calls without any
per-session discipline (unlike per-prompt techniques you must re-apply every time).

## Hypothesis

Installed-but-irrelevant skills are "free until used." The assumption being tested:
that a skill you never invoke costs nothing. If instead every installed skill pays
a fixed **catalog rent** in the system prompt — present on the first call and
re-read for the rest of the session — then skill *installation*, not skill *usage*,
is the cost lever, and the lever you reach for tools (disable them) does **not**
transfer to skills.

## Why This Matters

Developers curate extensions and plugins for the rare moments they're useful, on
the assumption that an unused plugin is dormant — and they reach for "disable
tools" as the cost lever. The measurement inverts both intuitions:

- The tool lever mostly trims a name-only index the model never receives in full
  (experiment 07).
- The skill catalog *is* sent in full, every call, regardless of relevance — and
  there is no per-repo or per-session relevance filter for it.

So the thing people skip (pruning installed skills) is the one that shrinks the
always-sent floor, and the thing people do (disabling tools) mostly doesn't. This
also attributes a chunk of the fixed overhead that experiments 07 (tool defs) and
08 (the ~9,680-token shared block) measured but didn't fully explain.

And because the skill catalog is **global**, this is leverage of an unusual kind: a
single cleanup changes the floor for future chats on the machine/profile, in any
repo, until you change the installed skill set again. Most cost advice is per-prompt
discipline you have to keep paying attention to; this is a one-time structural fix
that keeps paying out on its own.

## Session Summary

- **Task:** a trivial `hi` prompt, captured three times on the **same machine and
  same workspace** (`octodemo/octocat_supply`). A trivial prompt isolates the
  *fixed floor* — there is no real work to confound the system-prompt measurement.
  (Caveat: an empty prompt also *maximizes* the floor's share of the total, so the
  percentage figures here are an upper bound — see Confidence.)
- **Model:** claude-sonnet-4.5 (the agent turn in each capture).
- **Key cost driver:** the installed-skill `<skill>` catalog injected into the
  system prompt — sent in full on every call, not virtualized like tool schemas.
- **What it is NOT:** this is *not* MCP tool-schema overhead. The sent tool catalog
  (`toolDefsCount`) held a constant **23 generic schemas (~9,107 tokens)** in all
  three captures and **zero** internal-MCP schemas. The overhead that moved is the
  **skills catalog in the system prompt**, a separate mechanism from tool defs.

## Key Findings

1. **The skill catalog is a large, non-virtualized slice of the system prompt.** In
   the dirty baseline it was 37 `<skill>` blocks ≈ **5,146 tokens (≈44% of the
   ≈11,700-token system prompt)** — every one sent in full on every call.
   (Catalog-token figures are char/4 approximations; treat shares as indicative.)
2. **Relocation cut it ~63%, monotonically, in two passes.** Moving installed skills
   into the repo that needs them (so they load only when that repo is the
   workspace) took the catalog **≈5,146 → ≈3,027 → ≈1,917 tokens** and the
   global-plugin skills **23 → 5 → 0**. See the staircase below.
3. **The clean skill-only step reconciles ~1:1.** The final pass changed *only*
   skills — tool catalog (56), deferred (33) and sent defs (23) all held constant —
   and the skill catalog fell **≈1,110 tokens** while billed `prompt_tokens` fell
   **1,197**. That near-match is the controlled evidence that the skill catalog is
   sent and billed in full. The whole staircase moved `prompt_tokens`
   **25,367 → 21,364 → 20,167** (−5,200 total), but the *first* pass also removed an
   MCP server, so part of its drop is the deferred-tool index, not skills (see
   finding 4). Lead with the absolute, isolated number, not the conflated total.
4. **Tools behaved oppositely — they're virtualized.** The first pass removed the
   internal data plugins' MCP server, shrinking the *flat* tool catalog
   `catalogIfFlatApproxTokens` from **36,020 → 16,545** — yet the **sent full-schema**
   payload stayed **flat at ~9,107 tokens (23 schemas)**. ~19,500 tokens of tool
   *schemas* were never on the wire to begin with. (A smaller deferred name-index
   *is* sent and did shrink — that's part of pass 1's prompt drop — but the
   full-schema block, the thing people picture when they "disable a tool," did not
   move.) Cross-link: [experiment 07](07-tool-skill-overhead.md).
5. **The floor doesn't reach zero — it converges on the built-ins.** After
   relocation, 14 skills remain: 2 workspace-scoped project skills, 5 irreducible
   VS Code built-in Copilot skills (~904 tokens), and 7 from two VS Code extensions
   (~700 tokens, removable only by disabling those extensions). In a repo with no
   project skills the floor is ~1,604 tokens; the irreducible built-in floor is
   ~904.
6. **It's a one-time edit with a persistent, machine-wide payoff.** The skill catalog
   is global, so the saving isn't per-session — it applies to future chats on the
   machine/profile, in any repo, until the installed skill/plugin set changes
   (a new install can reintroduce it). Unlike per-prompt techniques (precise
   prompting, compaction) that you must re-apply every session, this is set once and
   keeps paying out with no ongoing discipline.

## What Happened

The same trivial `hi` prompt, same model, same `octocat_supply` workspace, captured
at three points while the **globally installed** skill set (and, in pass 1, an
associated MCP server) changed. Catalog token columns are 4-char-per-token
approximations of the system-prompt `<skill>` blocks; `prompt_tokens` and `toolDefs`
counts are exact digest values.

| Stage (capture) | Global-plugin skills | Total skills | Skill catalog ≈tok | Billed `prompt_tokens` | Tool catalog (sent / enabled) |
| --- | ---: | ---: | ---: | ---: | --- |
| **Dirty baseline** (`hi_116`) | 23 | 37 | ≈5,146 | 25,367 | 23 sent / 120 enabled |
| **After relocating 18 internal data skills + MCP server** (`hi_skillCleaned`) | 5 | 19 | ≈3,027 | 21,364 | 23 sent / 56 enabled |
| **After relocating M365 toolkit + foundry (skills only)** (`hi_skillCleaned3`) | 0 | 14 | ≈1,917 | 20,167 | 23 sent / 56 enabled |

The two passes are *not* equivalent, and the difference is the point:

- **Pass 1 is a combined cleanup.** It moved 18 data skills *and* their `workiq` MCP
  server, so the enabled tool catalog fell 120 → 56 (deferred 97 → 33). Its −4,003
  `prompt_tokens` mixes skill-catalog removal (≈2,119) with deferred-tool-index
  removal — do not attribute it all to skills.
- **Pass 2 is the controlled skill-only step.** Tool catalog, deferred count and
  sent schemas are all unchanged; only skills moved. Skill catalog ≈−1,110, billed
  `prompt_tokens` −1,197 — a near-1:1 isolation of the skill cost.

Two passes, one lever — **relocation into the repo that needs the skill**, not
deletion and not "disable":

1. **Pass 1** moved 18 internal **data-pulling** skills (`kusto-table-query`,
   `customer-prep`, `roadmap-explorer`, `copilot-plugins/workiq`,
   `workiq-productivity`) out of the global plugin cache into
   `octodemo/internalChatModes/.github/skills/`, with their `workiq` MCP server
   moved to that repo's `.vscode/mcp.json`. Skill catalog ≈5,146 → ≈3,027; the data
   plugins' MCP server leaving also dropped the *flat* tool catalog 36,020 → 16,545
   with **no** change to the sent full-schema block (still ~9,107) — so this pass's
   prompt-token drop is part skills, part deferred-tool-index.
2. **Pass 2** moved the last 5 global skills — the 4-skill `microsoft-365-agents-toolkit`
   and `microsoft-foundry` — into the same repo, touching **no tools at all**. Skill
   catalog ≈3,027 → ≈1,917; **zero global-plugin skills remain** (verified: no
   `installed-plugins/` or `.agents/skills/` paths in the system prompt). This is the
   clean skill-only measurement.

What's left after both passes (the 14-skill floor), by removability:

| Bucket | Skills | ≈tok | Reducible? |
| --- | ---: | ---: | --- |
| Project (workspace `.github/skills`) | 2 | ~260 | Workspace-scoped — only loads in that repo |
| VS Code built-in Copilot | 5 | ~904 | No — bundled with Copilot |
| VS Code extensions (GitHub-PR ×6, evals ×1) | 7 | ~700 | Yes — disable the extensions |

## Field Note — the relocation, executed (2026-06-07, author's machine)

This is the *action* the experiment recommends, carried out and then captured as
the staircase above. The machine started with 8 installed plugins; the
system-prompt skills catalog held internal-plugin skills with no relevance to a
React/TypeScript task. Skills were **relocated** (not deleted) into a single
internal repo so their catalog entries load *only* when that repo is the workspace,
then uninstalled globally.

**The internal *agents* were also relocated** (agents have a tiny system-prompt
footprint — one description line each — but can pull large internal references into
context when invoked, so they matter for export hygiene):

- `filing-research` — SEC 10-K / annual-report research over **public SEC EDGAR**
  data. Moved into the repo's `.github/agents/` (its `markitdown` MCP dep added to
  `.vscode/mcp.json`), then uninstalled globally. **Publish-safe** regardless.
- `qubot` — ⚠️ an analyst for GitHub's **internal data warehouse**, shipping a
  552K / 70+ file catalog of internal schemas and bundling MCP servers wired to
  **internal production endpoints**. Because it is a *maintained upstream repo*
  (`github/qubot`), it was **not** copied into the internal repo (that would fork
  internal data by copy); instead it was cloned standalone (`~/Code/GitHub/github/qubot`,
  staying git-updatable) and uninstalled as a global plugin. **It was the one item
  that made a raw export unsafe to publish** — removing it from the global surface
  is what clears the path to a clean export.

**What now stays global:** nothing internal. The final pass also relocated the two
items that were earlier kept by choice — `microsoft-365-agents-toolkit` (Microsoft's
**public** M365 agent-building dev tooling) and `microsoft-foundry` — into the
internal repo, so the global plugin surface is now empty and every unrelated
session pays zero plugin-skill rent.

This is also why experiment 05 stayed editorial: the raw cart export embeds this
same installed-skills catalog in every request snapshot, so it could not be bundled
without either leaking internal tool descriptions or doctoring the exact token
numbers the report visualizes.

## Interpretation

The mechanism is discoverability: the model can only invoke a skill it has been
told exists, so a name+description catalog is the cheapest honest way to make
installed skills usable. That is real value — it is not pure waste. The legitimate
critique is that there is **no per-repo or per-session relevance filter** for
skills: a globally installed skill pays catalog rent on every call of every task,
relevant or not.

The sharp contrast is with tools. VS Code already solved the analogous problem for
*tools* — above its grouping threshold it sends a name-only deferred index and
expands full schemas on demand (experiment 07). That is why, in this very cleanup,
removing ~19,500 tokens from the *flat* tool catalog left the **sent full-schema
block unchanged** (~9,107 tokens): those schemas were never on the wire to expand.
(The smaller deferred name-index *is* sent, and it did shrink in pass 1 — so tools
are not literally free to remove, just far cheaper than their catalog size
suggests.) **The same lazy treatment has not reached the skills catalog**, so skills
are where the manual lever (uninstall / relocate) still pays off and the tool lever
(disable) mostly does not.

This also sharpens experiment 08's "~9,680-token shared block": part of that block
is **your personal installed-plugin catalog**, so it is shared across *your own*
sessions, not a universal constant — and it shrinks when you relocate plugins, as
the staircase shows.

## Practical Guidance

- **Prune or relocate installed skills — this is the lever that works.** Unlike
  disabling tools (which mostly trims a cached name-only index), removing an
  installed skill removes tokens that were sent in full on every call.
- **Relocate, don't just delete.** Move a plugin's skill folders into the
  `.github/skills/` of the one repo that needs them (and its MCP servers into that
  repo's `.vscode/mcp.json`). The capability stays where it's relevant and its rent
  leaves every other session. Here that removed 23 global-plugin skills to zero.
- **Don't reach for "disable tools" to cut cost.** Tool schemas are virtualized and
  cached; see experiment 07. Curate tools for *quality* (selection accuracy), not
  price.
- **De-duplicate MCP servers.** Each MCP server contributes to the tool catalog;
  duplicate servers (e.g. three GitHub MCP servers) are pure redundancy worth
  collapsing to one.
- **Audit the system prompt, not just the tool list.** Tool-def trimming misses the
  skills catalog, a *separate* slice of the fixed prefix.
- **Before publishing a raw export, audit agents too.** A skill contributes a
  `<skill>` catalog line; an installed *agent* adds a one-line description but can
  pull large internal references into context if invoked. The `qubot` agent was the
  one item that made a raw export unsafe to publish, despite adding almost nothing
  to the idle system prompt.
- **Remember it's a floor, not a spike.** The saving is small per call but paid on
  every call; it compounds most on long sessions (ties to experiment 05).
- **Do it once and forget it.** Because the skill catalog is global, this cleanup is
  not per-session housekeeping — it's a one-time edit that lowers the floor for
  chats you start afterward, on any repo, until you next change the installed
  skill/plugin set. It's the highest-leverage item on this list precisely because it
  needs no ongoing discipline (a new plugin install can reintroduce the rent, so
  re-check after big tooling changes).

## Confidence Level

**Medium — a clean, reproduced before/after staircase (N=3 captures), single
machine.** The three captures share model, prompt, and workspace, and the direction
is monotonic and internally consistent. The strongest single point is **pass 2**: it
changed *only* skills (all tool counts held constant) and the skill-catalog drop
(≈1,110) matched the billed `prompt_tokens` drop (1,197) almost 1:1. Caveats:

- **Don't over-attribute the −5,200 total.** Only pass 2 is a controlled skill-only
  step. Pass 1 also removed an MCP server (enabled tools 120 → 56), so part of its
  −4,003 is the deferred-tool index, not the skill catalog. The honest headline is
  "skills account for a large, isolated chunk (pass 2 ≈1:1); the full-schema tool
  payload never moved," not "skill cleanup cut 5,200 tokens."
- Token figures for the catalog are 4-char-per-token approximations (±~20%); the
  `prompt_tokens` and `toolDefs` counts are exact digest values. Treat catalog
  *shares* (e.g. ≈44%) as indicative, not exact.
- **The trivial `hi` prompt inflates the percentages.** An empty prompt maximizes the
  fixed floor's share of the total, so "≈44% of the system prompt" and "~20% of the
  prompt" are upper bounds. In a real session with long history and code context the
  *absolute* per-call saving persists but the *percentage* shrinks — the absolute
  token figure is the robust result.
- It is one machine's plugin set on one workspace; the absolute sizes depend on
  what you have installed. The *mechanism* (skills sent in full, tools deferred)
  is the transferable claim, not the exact token counts.
- VS Code's grouping policy for tools may change between versions; the skills
  catalog had no virtualization at capture time.

## Evidence

- **Interactive report:** [the cleaned floor — 0 global-plugin skills](/reports/skill-overhead-cleaned)
  — the `hi_skillCleaned3` capture pinned as a read-only Copilot Ledger view. Open
  the **system** box to see the shrunken 14-skill catalog (~1,917 tokens), then
  compare the **tool_defs** box to the [120-tools report](/reports/tool-overhead-120):
  the same 23 schemas / ~9,107 tokens are sent in both — tools didn't move, skills
  did.
- **Captures (all `~/CopilotLogExports/`):** `hi_116.json` (dirty baseline, 23
  global-plugin skills), `hi_skillCleaned.json` (after relocating the 18 data
  skills), `hi_skillCleaned3.json` (after relocating the M365 toolkit + foundry; 0
  global-plugin skills). Same model (claude-sonnet-4.5), prompt (`hi`), and
  workspace (`octodemo/octocat_supply`).
- **How to read each:** the agent turn's system message (`requestMessages.messages`
  with `role: 0`) holds the `<skill>` catalog; count `<skill>` blocks and measure
  the span from the first `<skill>` to the last `</skill>`. Per-call `prompt_tokens`,
  `toolDefsCount`, `toolDefsApproxTokens`, and `rollups.toolDefs.catalogIfFlatApproxTokens`
  come from the digest:
  `node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout`.
- **Cross-reference:** [experiment 07](07-tool-skill-overhead.md) for the tool half
  (decoupling curve + the churn tax) and [experiment 08](08-cache-behavior.md) for
  the cached-prefix mechanism the skill catalog sits inside.

## LinkedIn Post

> I uninstalled one Copilot plugin. Removing its tool schemas barely moved the wire.
> Removing its skills cut tokens on every call.
>
> Everyone says "disable tools to save money." I measured it. That advice aims at
> the wrong half of Copilot's fixed cost floor.
>
> Tool schemas are virtualized: most enabled tools ride name-only in a deferred
> index, and it's cached. When I removed an internal MCP server, the *flat* tool
> catalog shrank ~19,500 tokens — and the full schemas actually SENT to the model
> didn't move (~9,107, flat). They were never on the wire to begin with.
>
> The installed-SKILL catalog is different. Every installed skill injects a
> name+description into the system prompt, sent in full on every single call. Not
> virtualized. No per-repo relevance filter.
>
> Same trivial "hi" prompt, same model, same repo — I just changed what was
> installed. The cleanest step touched only skills (every tool count held constant):
>
> Skill catalog: ≈3,027 → ≈1,917 tokens
> Billed prompt:  21,364 → 20,167 tokens  (−1,197)
>
> A ~1,100-token skill cut showed up as a ~1,200-token prompt cut — near 1:1. Skills
> are billed in full. Over the whole cleanup the skill catalog went ≈5,146 → ≈1,917
> and global-plugin skills 23 → 0.
>
> And I didn't disable a single thing. I RELOCATED the skills into the one repo that
> actually uses them, so they load only when that repo is open.
>
> The best part: the skill catalog is global, so this wasn't a per-session trick. I
> did it once, and every chat I start on this machine from now on — until I next
> change what's installed — pays the lower floor. One edit, lasting effect.
>
> Tool count is nearly free. Installed skills are not. Prune the skills; don't
> bother disabling the tools.
>
> (Three captures, one machine. Catalog tokens are ~char/4; prompt_tokens are exact.)

## Video Outline

60–90 second LinkedIn video, screen-recording the Copilot Ledger canvas:

**0–10s** — "I uninstalled one Copilot plugin. Removing its tool schemas barely
moved the wire. Its skills cost me on every call." Open the dirty `hi_116` report.

**10–35s** — Highlight the **system** box: the `<skill>` catalog, ~5,146 tokens,
44% of the system prompt. Then highlight the **tool_defs** box: 23 sent, ~9,107
tokens — note most of the 120 enabled tools are deferred name-only.

**35–65s** — Load `hi_skillCleaned3` side by side. Skill catalog has collapsed to
~1,917 tokens; the tool_defs box is unchanged at ~9,107. Say it: "Same cleanup —
the skills fell, the tools didn't budge. Skills are sent in full; tools are
virtualized."

**65–100s** — The fix: not "disable," but **relocate** — move the skills into the
repo that needs them. Show the staircase 5,146 → 3,027 → 1,917 and "23 → 0 global
skills." Close on the compounding angle: "And the catalog is global — so I did this
once, and every chat I start from now on pays the lower floor. Prune the skills.
The tools are already cheap."
