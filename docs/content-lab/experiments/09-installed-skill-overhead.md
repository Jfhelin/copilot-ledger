# Installed Skill Overhead

## LinkedIn Hook

> A third of my Copilot system prompt was skills I never used — and I paid to
> re-read them on every call.

## Executive Summary

> **Scope note:** Now backed by a measured before/after (N=1 each), not just the
> seed. The clean isolation is the **system-prompt token reduction**; the credit
> delta between the captures is **confounded by cache warmth** (the before run was
> cold, the after warm) and is not claimed as a skill-removal saving. See "What
> Happened." Treat the numbers as a direction, not a benchmark.

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

This experiment is now backed by a **measured before/after** (replacing the
earlier seed-only state). Four runs of the **same trivial `hi` prompt in the same
repo** (`octocat_supply`), captured at different cleanup stages; the main agent
call (`p2`) is `claude-sonnet-4.5` in the first three. System-prompt and catalog
sizes are chars/4 approx tokens measured from `message[0]`; the rest is from the
digest.

| Run | `<skill>` blocks | Skill catalog (approx tok) | System prompt (approx tok) | Main-call `promptTokens` | Cache state | Credits |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| `hi18.json` (before) | 37 | ~5,165 | ~11,026 | 22,070 | **cold** (0% hit, write 22,061) | 8.6 |
| `hi_skillCleaned.json` | 19 | ~3,037 | ~8,739 | 21,364 | warm (45% hit) | 5.0 |
| `hi_skillCleaned3.json` (after) | 14 | ~1,924 | ~7,629 | 20,167 | warm (48% hit) | 4.3 |
| `hi4_0.json` (reference) | 0 | 0 | ~6,940 | 6,672 | n/a — `gpt-5.4-mini` | 0 |

**The measured result:** removing 23 installed-but-unused skills cut the system
prompt from **~11,026 → ~7,629 approx tokens (~3,400 tok, ~31%)**, with the
installed-skill catalog itself falling ~5,165 → ~1,924 approx tokens. The removed
skills averaged **~141 approx tokens each** (an average — descriptions vary, not a
fixed per-skill constant). The 0-skill run is a reference only (different model and
prompt template), not part of the sonnet before/after.

**Two measurements, kept separate:** the catalog effect is inside the *system
prompt* (`message[0]`): ~11,026 → ~7,629. The *total* `promptTokens` fell less
(22,070 → 20,167) because other prefix parts moved at the same time — tool
definitions actually **rose** (8,361 → 9,107 approx tok) between the two runs. This
experiment isolates catalog rent in the system prompt; it does not claim the whole
prompt prefix shrank by the same amount.

**Why no credit claim:** the before run was a *cold* call (full cache write) and
the after run was *warm* (48% hit), so the 8.6 → 4.3 credit drop is **confounded by
cache warmth**, not a clean skill-removal saving — and no cold "after" capture
exists on the same model to isolate it. As a *pricing estimate only*: ~3,200 fewer
catalog tokens trims a cold first-call cache write by **roughly ~1 credit** at
Sonnet cache-write pricing. The defensible result is the token reduction; the
credit figure is an estimate.

**Raw exports are withheld:** their system prompts embed internal plugin catalog
descriptions (`revenue-kusto-context`, `workiq`, `customer-intelligence`, …), so
the published page ships derived aggregate measurements only — no bundled export.

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

**The two internal *agents* were also relocated** (a second pass — agents have a
tiny system-prompt footprint, one description line each, but can pull large
internal references into context when invoked, so they matter for export hygiene):

- `filing-research` — SEC 10-K / annual-report research over **public SEC EDGAR**
  data. Its agent file was moved into the repo's `.github/agents/` (its
  `markitdown` MCP dep added to `.vscode/mcp.json`; Playwright was already there),
  then uninstalled globally. **Publish-safe** regardless.
- `qubot` — ⚠️ an analyst for GitHub's **internal data warehouse**, shipping a
  552K / 70+ file catalog of internal schemas (`data.githubapp.com/warehouse/...`,
  Salesforce CRM, the Hydro event bus, Proxima stamps, C360, ML lead-store) and
  bundling MCP servers wired to **internal production endpoints**
  (`gh-analytics…kusto.windows.net`, `trino-adhoc.warehouse.service.github.net`).
  Because it is a *maintained upstream repo* (`github/qubot`), it was **not** copied
  into the internal repo (that would fork it by copy and scatter internal data);
  instead it was cloned to its own folder (`~/Code/GitHub/github/qubot`, staying
  git-updatable) and uninstalled as a global plugin. **It was the one item that
  made a raw export unsafe to publish** — removing it from the global surface is
  what clears the path to a clean export.

**What now stays global:** only `microsoft-365-agents-toolkit` — 4 skills
(~632 tok), Microsoft's **public** M365 agent-building dev tooling, no MCP server,
no internal hosts (its "internal" strings are generic template examples like
"search internal HR docs"). **Publish-safe**, and kept by choice as dev tooling.

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

**Medium-Low — before/after is N=1 each.** The system-prompt and catalog sizes
are measured directly from `message[0]` (chars/4 approx tokens) across four runs of
the same prompt and are internally consistent. The **token reduction is measured**;
the **credit impact is only estimated**, because no cold "after" capture exists to
isolate it from cache warmth. Treat the direction — installed skills are a real,
removable slice of the fixed system-prompt floor — as the finding, not the exact
per-skill split.

## Evidence

- **Before/after captures:** `hi18.json` (before, 37 skills), `hi_skillCleaned.json`
  (19) / `hi_skillCleaned3.json` (after, 14), `hi4_0.json` (0-skill reference) —
  each the same `hi` prompt in `octocat_supply`. Sizes measured from the main agent
  call's `requestMessages.messages[0]` (system); cache/credits from the digest.
- **Seed export (earlier reading):** `04-plan-implement-cart.json` — system prompt
  ~37,990 chars (~9,498 tok), 37 `<skill>` blocks, 22 internal-plugin skills.
- **Withheld:** raw exports are not bundled (system prompts contain internal plugin
  catalog descriptions); the published page uses derived aggregates only.
- Regenerate with
  `node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout`
  and inspect the main call's `requestMessages.messages[0]` (system) plus
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
