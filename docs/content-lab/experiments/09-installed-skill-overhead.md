# Installed Skill Overhead

## LinkedIn Hook

> A third of my Copilot system prompt was skills I never used — and I paid to
> re-read them on every call.

## Executive Summary

> **Scope note:** Partial single-session evidence (N=1, the seed measurement
> below). The clean before/after capture that turns this into a measured saving
> is **not yet run** — see the protocol under "What Happened." Treat the numbers
> as a directional anchor, not a benchmark.

Copilot advertises every **installed skill/plugin** to the model by injecting a
short *name + description* entry into the system prompt — so the agent knows the
skill exists and can route to it. The catch: this happens because a plugin is
**installed**, not because you used it. In the cart run, the skills catalog was
**54% of the system prompt (~5,128 of ~9,498 tokens)**, and the three *internal*
plugins I had installed (`github-revenue`, `work-iq`, `copilot-plugins/workiq`)
accounted for **22 skills ≈ 2,934 tokens — 31% of the entire system prompt** —
on a React/TypeScript task that had nothing to do with any of them. Because the
system prompt sits at the front of the cached prefix, you pay that weight as a
one-time write plus a re-read on **every** subsequent call.

## Hypothesis

Installed-but-irrelevant skills are "free until used." The assumption being
tested: that a skill you never invoke costs nothing. If instead every installed
skill pays a fixed **catalog rent** in the system prompt — present on the very
first call and re-read for the rest of the session — then skill *installation*,
not skill *usage*, is the cost lever.

## Why This Matters

Developers curate extensions and plugins for the rare moments they're useful, on
the assumption that an unused plugin is dormant. If unused plugins instead inflate
the system prompt on every call, the advice "install what might help" quietly
trades a recurring per-call cost for occasional convenience. Knowing the size of
that rent makes "trim what you don't need" concrete — and it explains a chunk of
the fixed overhead that experiments 07 (tool defs) and 08 (the ~9,680-token
shared block) measured but didn't fully attribute.

## Session Summary

- **Task:** Plan, then implement a shopping-cart feature (reusing the
  `04-plan-implement-cart.json` run — same session as experiments 05/06/07/08).
- **Model:** claude-sonnet-4.6.
- **Seed measurement:** the system prompt (message role=0) is ~37,990 chars
  (~9,498 tokens). Of that, the `<skill>` catalog is ~5,128 tokens (54%); the
  three internal plugins contribute ~2,934 tokens (31%).
- **Key cost driver (claimed, pending A/B):** installed-but-unused skill catalog
  entries that ride in the system prompt regardless of relevance.
- **What it is NOT:** this is *not* MCP tool-schema overhead. The tool catalog
  actually sent (`metadata.tools`) held 28–56 generic VS Code tools and **zero**
  internal-MCP tool schemas — the internal MCP servers (`workiq`, `revenue`,
  `kusto-mcp`) did not ship their tool definitions. The overhead is the **skills
  catalog in the system prompt**, a separate mechanism from tool defs.

## Key Findings

> All seed figures are from a single export (N=1) and are measured from the
> system-prompt message, not yet from a controlled before/after.

1. **The skills catalog is over half the system prompt.** 37 `<skill>` blocks,
   ~5,128 tokens = 54% of the ~9,498-token system prompt.
2. **Internal, irrelevant plugins were ~31% of the system prompt.** 22 of the 37
   skills came from `github-revenue` (8), `work-iq` (13) and `copilot-plugins/workiq`
   (1) — ~2,934 tokens — none of which a React cart task could use.
3. **Installed ≠ used ≠ free.** The catalog is injected by virtue of installation.
   The request's active tool catalog contained none of these plugins' tools, yet
   their descriptions were in the system prompt on every call.
4. **It's a cached-floor cost, not a per-call full-price cost.** The system prompt
   is at the front of the prefix, so the catalog is written once (cache-creation)
   and re-read at the ~10% cache rate thereafter. It raises the per-call floor
   (see experiment 05) rather than being re-billed fresh — but on a 34-call
   session that floor is paid 34 times.

## What Happened

This experiment is **seeded but not yet measured end-to-end.** The seed number
above comes from reading the system prompt of an existing run. To turn it into a
defensible saving, run a controlled before/after:

**The clean before/after A/B (needs two captures):**

- **Before:** capture the machine as it is now — the three internal plugins
  (`github-revenue`, `work-iq`, `copilot-plugins/workiq`) still installed. Fresh
  session, a trivial identical prompt (e.g. "Reply with just OK."), same model,
  same mode, same repo. Export as `skills-before.json`.
- **After:** **uninstall or disable** those three plugins (this is the lever —
  not merely "don't use them," since the catalog is injected on install). Ask the
  same prompt in a fresh session. Export as `skills-after.json`.
- Drop both in `~/CopilotLogExports/`. Then diff:
  - system-prompt token count (message `role=0`) and `<skill>` block count,
  - first-call `promptTokens`, `cacheCreationTokens`, `cacheHitRate`, `credits`,
  - `toolDefsApproxTokens` (should be ~unchanged — this isolates *skills* from
    *tools*, the half experiment 07 deliberately lumped together).
- Expected direction from the seed: ~2,900 fewer system-prompt tokens, a smaller
  first-call cold write, and a lower per-call floor for the rest of the session.

## Field Note — the move, executed (2026-06-07, author's machine)

This is the *action* the experiment recommends, carried out and measured against
the global plugin cache (not yet a fresh-session export A/B — see caveat). The
author's machine had 8 installed plugins; the system-prompt skills catalog held
**22 skills from internal plugins**. Five **data-pulling** plugins were relocated
from the global cache (`~/.copilot/installed-plugins/`) into a single internal
repo (`octodemo/internalChatModes/.github/skills/`), so their catalog entries now
load *only* when that repo is the workspace. The plugins were then uninstalled
globally.

**Global skills catalog, before → after the move:**

| | Skills | ~tok (name+desc) | ~tok in live system prompt |
| --- | ---: | ---: | ---: |
| Before | 22 | ~1,950 | ~2,900 |
| After  | 4  | ~632   | ~940 |
| **Removed from every unrelated session** | **18** | **~1,318** | **~1,950** |

Moved (18 skills): `kusto-table-query` (4), `customer-prep` (1), `roadmap-explorer`
(3), `copilot-plugins/workiq` (1), `workiq-productivity` (9). Their MCP
dependency (`workiq`) was added to the repo's `.vscode/mcp.json`; the `kusto` and
`revenue` servers were already present there.

**What stayed global, and whether it is safe in a *published* raw export:**

- `microsoft-365-agents-toolkit` — 4 skills (~632 tok). Microsoft's **public**
  M365 agent-building dev tooling. Kept (dev tooling, not data). **Publish-safe:**
  no MCP server, no internal hosts; its "internal" strings are generic template
  examples ("search internal HR docs").
- `filing-research` — an **agent**, not a skill (no `<skill>` catalog cost). SEC
  10-K / annual-report research over **public SEC EDGAR** data. **Publish-safe.**
- `qubot` — an **agent**, not a skill. ⚠️ **Internal.** It is an analyst for
  GitHub's **internal data warehouse** and ships a catalog of internal schemas
  (`data.githubapp.com/warehouse/...`, Salesforce CRM, the Hydro event bus,
  Proxima stamps, C360, ML lead-store pipelines). Its *system-prompt footprint* is
  only a one-line agent description that names the warehouse (Kusto/Trino), but if
  it is ever **invoked** in a captured session it pulls those internal schema docs
  into context. **Not publish-safe as-is** — uninstall it (or scrub that line, and
  never publish an export where qubot was active) before bundling a raw export.

This is also why experiment 05 stayed editorial: the raw cart export embeds this
same installed-skills catalog in every request snapshot, so it could not be
bundled without either leaking internal tool descriptions or doctoring the exact
token numbers the report visualizes.

**Caveat (still N=1, not yet a clean A/B):** these token figures are measured from
the plugin cache and the system-prompt catalog, not from a controlled
before/after export. The remaining step is to capture a fresh trivial session now
(post-move) as `skills-after.json` and diff it against a pre-move export to turn
the ~1,950-token estimate into a measured `promptTokens` / `cacheCreationTokens` /
credits delta.

## Interpretation

The mechanism is discoverability: the model can only invoke a skill it has been
told exists, so a name+description catalog is the cheapest honest way to make
installed skills usable. That is real value — it is not pure waste. The
legitimate critique is that there is **no per-repo or per-session relevance
filter** for skills: an installed plugin pays catalog rent on every call of every
task, relevant or not. VS Code already solves the analogous problem for *tools*
(experiment 07: above ~128 enabled tools it sends a name-only deferred index and
expands full schemas on demand), which shows the platform can advertise cheaply —
the same lazy treatment hasn't reached the skills catalog.

This also sharpens experiment 08's "~9,680-token shared block": part of that block
is **your personal installed-plugin catalog**, so it is shared across *your own*
sessions, not a universal constant — and it shrinks if you uninstall plugins.

## Practical Guidance

- **Uninstall plugins you don't routinely use.** It's the one lever that removes
  the catalog rent at the source. Disabling-but-keeping-installed may not help if
  the catalog is injected on install.
- **Audit the system prompt, not just the tool list.** Tool-def trimming
  (experiment 07) misses the skills catalog, which is a *separate* slice of the
  fixed prefix.
- **Keep task-specific plugins task-specific.** If a plugin is only useful for one
  kind of work, install it in (or scope it to) that context rather than globally.
- **Relocate, don't just delete.** Moving a plugin's skill folders into a specific
  repo's `.github/skills/` (and its MCP servers into that repo's MCP config) keeps
  the capability where it's relevant while removing its rent from every other
  session. The author moved 5 internal data plugins into one repo this way.
- **Before publishing a raw export, audit agents too — not just skills.** A skill
  contributes a `<skill>` catalog line; an installed *agent* contributes a one-line
  description and can pull large internal references into context if invoked. On
  the author's machine the `qubot` agent (GitHub internal data-warehouse schemas)
  was the one item that made a raw export unsafe to publish, even though it added
  almost nothing to the system prompt when idle.
- **Remember it's a floor, not a spike.** The saving is small per call but paid on
  every call; it compounds most on long sessions (ties to experiment 05).

## Confidence Level

**Low — single partial observation (N=1), no controlled A/B yet.** The seed
figures (skills catalog = 54% of the system prompt; internal plugins = ~2,934
tokens / 31%) are measured directly from one export's system-prompt message and
are internally consistent, but the *saving* is inferred, not measured. The
before/after capture above is required before publishing a credits delta.

## Evidence

- **Primary export (seed):** `04-plan-implement-cart.json`. System prompt =
  message `role=0` of any request, ~37,990 chars (~9,498 tok); 37 `<skill>`
  blocks spanning ~20,510 chars (~5,128 tok); 22 internal-plugin skills ~11,735
  chars (~2,934 tok). Tool catalog (`metadata.tools`) = 28–56 generic tools, zero
  internal-MCP schemas.
- **Pending:** `skills-before.json` / `skills-after.json` (the A/B above).
- Regenerate with
  `node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout`
  and inspect the first request's `requestMessages.messages[0]` (system) plus
  per-call `toolDefsApproxTokens` and `promptTokens`.

## LinkedIn Post

> A third of my Copilot system prompt was skills I never used.
>
> Analysing a "plan, then build a shopping cart" run, I found the installed-skill
> catalog — the name+description of every plugin Copilot tells the model about —
> was 54% of the system prompt (~5,128 of ~9,500 tokens).
>
> 22 of those skills came from three internal plugins I had installed but that a
> React task can't use. That's ~2,900 tokens — 31% of the system prompt — on
> EVERY call.
>
> The surprise: it's not about usage. The catalog is injected because a plugin is
> *installed*, not because you invoke it. (And no — these weren't MCP tool schemas;
> the tool catalog sent contained none of them. This is the skills list in the
> system prompt, a separate slice.)
>
> Caching softens it — the system prompt is re-read at ~10% rate after call one —
> but it raises the floor under every call, and a long session pays that floor
> dozens of times.
>
> The fix is boring but real: uninstall plugins you don't routinely use. Discovery
> has value (the model can't call what it can't see), but installed-and-irrelevant
> skills pay rent on every turn.
>
> (Seed measurement, N=1 — the controlled before/after is next.)

## Video Outline

60–90 second LinkedIn video:

**0–10s** — "A third of my Copilot system prompt was skills I never used." Show
the system prompt token count (~9,500) with the skills catalog highlighted.

**10–35s** — Zoom into the `<skill>` catalog. Point at the 22 entries from
`github-revenue` / `work-iq` — internal plugins, on a React task. ~2,934 tokens.

**35–70s** — Clarify the mechanism: this is injected on *install*, not on use, and
it's the skills list in the system prompt — not MCP tool schemas (the tool catalog
sent had none of them). It sits at the front of the cached prefix, re-read every
call.

**70–100s** — The fix: uninstall what you don't use. Tease the before/after —
remove three plugins, watch the system prompt shrink ~2,900 tokens. End on
"installed isn't free."
