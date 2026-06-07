# Tool and Skill Overhead

## LinkedIn Hook

> I added a 100-tool MCP server to Copilot. The bytes on the wire barely moved.

## Executive Summary

Tool definitions are real, always-sent context — but **how many tools you enable
is almost decoupled from how many are actually sent to the model.** Across six
captures, VS Code sent a roughly constant **~23–25 full tool schemas** whether
the enabled catalog held 26, 120, 142, or 320 tools. The rest are advertised
*name-only* and fetched on demand. So the popular advice "disable tools to save
money" mostly trims a list the model never receives in full. The cost that
*does* bite is **churn**: in one plan-then-implement session, a Plan→Agent mode
switch changed the sent tool set and forced a single **15.7-credit** cold cache
re-write.

> Scope: the decoupling curve is six captures across catalog sizes (a small but
> consistent multi-point observation). The 15.7-credit churn event is a single
> session (N=1). The data suggests a mechanism; further testing may be needed.

## Hypothesis

We started with two assumptions and the data broke the first one:

1. *"Tool definitions scale with the number of tools you enable, and there is a
   clean threshold (VS Code's default of 128) below which everything is sent as a
   flat list."* — **Not what we observed.**
2. *"Because tool definitions sit early in the cached prefix, changing them is
   disproportionately expensive."* — **Consistent with what we observed (N=1).**

## Why This Matters

Developers think about context as "the files and history I send," and reach for
"disable some tools" as a cost lever. The measurement suggests that lever is mostly
disconnected from the wire: VS Code groups tools and sends most of them as a
name-only index (loaded on demand via an internal `tool_search`). Knowing that
reframes the advice — the thing that actually moves tool cost is **which tool
*groups* the task activates** and **how often that set churns**, not the raw count
in your settings.

## Session Summary

Two evidence sets back this page.

**A. The decoupling curve (six captures).** A trivial `hi` prompt, same workspace,
varying the enabled-tool catalog:

- Catalog sizes measured: 23, 26, 56, 120, 142, 320.
- Measured: how many tool schemas were sent in full vs. deferred name-only.

**B. The churn session (one capture).** `04-plan-implement-cart.json`:

- Task: plan, then implement, a shopping-cart feature.
- Model: claude-sonnet-4.6 (all turns).
- Total credits: 106.6. Tool calls: 60. Cache: 94% session-wide.
- Key cost driver: one cold implementation call (`p3.l0`) at **15.7 credits**,
  triggered by a tool-definitions change at the Plan→Agent boundary.

## Key Findings

1. **The wire payload is roughly constant across catalog size.** For the same
   trivial task, VS Code sent ~23–25 full schemas at 120, 142, **and** 320 enabled
   tools. Enabling ~100 extra tools (an entire Azure MCP server) left the sent
   schema count essentially unchanged.
2. **There is no flat-list cliff at 128.** At **120** enabled tools — *under* the
   default threshold — **97 of 120** were already deferred name-only. Crossing to
   **142** (over the threshold) sent **24** schemas vs **23** at 120: no
   step-change. Selective grouping is active well below 128; the threshold only
   governs when on-demand `tool_search` is *guaranteed*.
3. **Task relevance moves the sent set more than catalog size does.** The 56-tool
   cart session, *doing real file work*, sent **45** schemas — about double the
   120- and 142-tool `hi` runs — because more tool *groups* were contextually
   pre-activated.
4. **Deferred tools are cheap and cached, so trimming them saves little.** A
   deferred tool rides as a single name (~8 tokens) in an index that is itself
   part of the cached prefix. Removing unused tools mostly removes name lines, not
   schemas.
5. **Churning the sent set is the expensive event (N=1).** The Plan→Agent switch
   took the sent set from **14 → 45** schemas (**+10,044 tokens**) at the front of
   the prefix, invalidated ~40K tokens of warm cache, and forced a **15.7-credit**
   cold re-write on `p3.l0` (19% hit). The digest flags the cause directly:
   `tool-defs-changed (Δ +10,044 tokens)`.

## What Happened

**The decoupling curve.** Holding the task trivial and varying only the enabled
catalog, the sent (full-schema) count stayed flat while the deferred index grew:

| Capture | Catalog | Sent (full schema) | Deferred (name-only) | Sent ≈tokens | If sent flat ≈tokens |
| --- | ---: | ---: | ---: | ---: | ---: |
| hi18 | 23 | 20 | 3 | 8,361 | 8,654 |
| hi3_21 | 26 | 23 | 3 | 9,107 | 9,401 |
| cart (real work) | 56 | 45 | 11 | 14,606 | 15,929 |
| hi_116 | 120 | 23 | 97 | 9,107 | 35,571 |
| hi_140 | 142 | 24 | 118 | 9,283 | 39,146 |
| workiq | 320 | 25 | 295 | 9,606 | 81,026 |

At 120 tools the deferred 97 were dominated by an entire Azure MCP server (~80
tools), plus notebook, Playwright/browser, and task tools — none relevant to
saying `hi`. The ~23 sent were the core editing, search, and terminal tools. If
the 320-tool catalog had been sent flat it would have been ~81K tokens of schemas;
the model actually received ~9,600 — roughly an **8x** compression.

**The churn session.** Three phases on one model, with the *sent* tool set (not
the catalog) shown:

| Phase | Sent schemas | ≈tokens | Catalog | Share of prefix |
| --- | ---: | ---: | ---: | --- |
| Sub-agents (`p0`, `p1`) | 13 | 4,044 | 28 | ~11–20% |
| Plan turn (`p2`) | 14 | 4,562 | 29 | ~13–15% |
| Implement turn (`p3`) | 45 | 14,606 | 56 | ~23–30% |

The cache cliff at the Plan→Agent boundary:

| Call | Prefix tokens | Cached | Written | Hit | Credits |
| --- | ---: | ---: | ---: | ---: | ---: |
| `p2.l7` (last plan call) | 34,905 | 32,897 | 2,007 | 94% | 3.3 |
| `p3.l0` (first implement call) | 49,401 | 9,447 | 39,952 | **19%** | **15.7** |
| `p3.l2` (next implement call) | 49,739 | 49,399 | 339 | 99% | 2.0 |

## Interpretation

The two evidence sets point at one reframing: **the cost is in the *sent* set and
its stability, not the enabled count.**

- **The static block is smaller and flatter than it looks.** What you pay for on
  each call is the ~20–45 schemas the task activates, plus a cheap name-only index
  for everything else. Adding tools to your settings mostly grows the index, which
  is small and cached. This is why "disable tools to save money" underdelivers.
- **The churn tax is the real lever.** Because the cache matches the longest common
  *prefix*, changing the sent tool block invalidates everything after it. The
  Plan→Agent switch changed ~10,044 tokens near the front and cost a 15.7-credit
  re-write — far more than 10,044 tokens are "worth," because ~40K downstream
  tokens had to be re-written too.
- **Tool schemas ≠ skill instructions.** Tool *schemas* are grouped and deferred
  as shown here. Skill *instruction text* is injected into the system prompt and
  is **not** virtualized — it is sent in full on every call. If you want to trim
  always-sent overhead, the instruction text of an unused skill is a more promising
  target than the tool count. This run does not isolate that; it is the next
  measurement.

This is the bridge to the [Cache Behavior experiment](08-cache-behavior.md): the
mode-switch reset listed there is, underneath, a tool-definitions change — and
this page is its deep dive.

## Does Curation Help *Quality*?

If trimming tools barely moves cost, is there any reason to do it? **We expect
yes — for quality, not price — though this session did not measure it.**

The strongest signal is first-party: VS Code's own virtual-tools setting warns
that *"you experience degraded tool calling once the threshold is hit."* That is
the platform team stating that **selection accuracy**, not cost, is what suffers
as the enabled set grows. Grouping and on-demand `tool_search` are a *mitigation*
for that degradation, not a guarantee against it.

Two mechanisms we *did* observe make that plausible:

- **Deferral adds indirection.** A directly-sent tool (full schema) is available
  to the model immediately; a deferred one must first be *discovered* via
  `tool_search`, then chosen — two failure points instead of one. Deferral starts
  well below the 128 threshold (120 enabled → 97 deferred), so a tool you actually
  want can end up behind a search rather than in front of the model.
- **Near-duplicates invite mis-picks.** When two tools overlap (e.g. a GitHub MCP
  server and a shell that can run `gh`), the model often reaches for the more
  familiar/simpler one. Removing the redundant tool removes the wrong turn.

So the quality case for curation is real but **claimed-and-inferred, not measured
here**: lean, non-overlapping toolsets raise the odds that (a) the right tool
ships as a full schema instead of hiding in the deferred index, and (b) the model
isn't choosing between confusable options. A clean test — same task, run once with
a lean toolset and once with the 320-tool catalog, scoring whether the correct
tool was selected — is the next measurement and is **not** in this session.

## Practical Guidance

- **Don't expect "disable tools" to cut cost much.** Most enabled tools are sent
  name-only and cached. The data suggests this lever is mostly disconnected from
  the wire. (This reinforces the official advice to *review tools and skills
  periodically* — just for the right reason: relevance and noise, not token count.)
- **Treat a mode switch as a cache reset.** Plan→Agent changes the sent tool set
  and re-pays the cold write. Planning and implementing in the same mode keeps the
  warm prefix.
- **Let sub-agents carry narrow toolsets.** The sub-agents here ran on 13 sent
  schemas and entered warm; a focused subtask does not need the full
  implementation set.
- **If you want to trim always-sent overhead, look at skill *instructions*, not
  tool counts.** Instruction text is not virtualized; tool schemas largely are.
- **Curate for quality, not cost.** The cost case for trimming tools is weak, but
  VS Code's own team warns of *degraded tool calling* past the threshold, so a
  lean, non-overlapping toolset likely helps the model pick the *right* tool. We
  expect this but did not measure it here.
- **Expect the first call after any tool/skill change to be expensive.** It is the
  re-warm, not the work, that costs — budget for it and avoid triggering it
  repeatedly.

## Confidence Level

**Mixed.**

- **The decoupling curve: medium.** Six captures across catalog sizes 23–320, all
  consistent and internally reconciled (sent + deferred = catalog; sent tokens
  reconcile against billed `prompt_tokens`). Still a controlled micro-benchmark on
  one workspace and mostly a trivial prompt; the exact grouping policy is VS Code's
  and may change between versions. Further testing across tasks and versions may be
  needed.
- **The 15.7-credit churn event: low (N=1).** Measured cleanly from one export,
  but a single observation. The **skill**-specific overhead is still **not
  isolated** — a run that toggles one skill on/off is the missing measurement.
- **The quality claim: inferred, not measured.** That curation improves tool
  *selection* rests on VS Code's own "degraded tool calling" warning plus the
  deferral/near-duplicate mechanisms we observed — not on a selection-accuracy
  benchmark in this data.
- Token figures are 4-char-per-token approximations (±~20%); treat shares as
  indicative, not exact.

## Evidence

- **Interactive report:** [120 tools enabled, 23 sent](/reports/tool-overhead-120) —
  the `hi_116` capture pinned as a read-only Copilot Ledger view. Open the
  **tool_defs** box to see the 23 sent schemas (~9,107 tokens, 33% of the prompt)
  while 97 of the 120 enabled tools ride along name-only.
- **Decoupling curve:** `hi18`, `hi3_21`, `hi_116` (120 tools), `hi_140` (142
  tools), `03-workiq-316-tools` (320), plus the cart run (56). Per capture, read
  `timeline[].toolDefsCatalogCount` (enabled), `toolDefsCount` (sent), and
  `toolDefsDeferredCount` (name-only). The full deferred name list at 120 tools is
  recoverable from the `<availableDeferredTools>` block in the request messages.
- **Churn session:** `04-plan-implement-cart.json`. Sent-schema sizes at `p2.l*`
  (14 sent) vs `p3.l*` (45 sent); the cold re-write at `p3.l0` (19% hit, 15.7 cr);
  digest anomaly cause `tool-defs-changed (Δ +10,044 tokens)`.
- Regenerate any figure with
  `node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout`
  and read `timeline[].toolDefs*` and `rollups.toolDefs` (which now reports
  `approxTokensTotal` for the **sent** schemas plus `catalogIfFlatApproxTokens`
  and `groupingSavedApproxTokens`).

## LinkedIn Post

> I added a 100-tool MCP server to GitHub Copilot. The bytes on the wire barely
> moved.
>
> I measured what Copilot actually sends to the model as you enable more tools. I
> expected the tool-definition block to grow with the count — and that everything
> under VS Code's 128-tool threshold would be sent as one flat list.
>
> Neither held up.
>
> Same trivial prompt, different enabled-tool catalogs. Full tool schemas actually
> sent over the wire:
>
> 26 tools → 23 sent
> 120 tools → 23 sent (97 deferred)
> 142 tools → 24 sent (118 deferred)
> 320 tools → 25 sent (295 deferred)
>
> Most tools aren't sent as full schemas. They're advertised name-only and fetched
> on demand. Enabling ~100 extra tools (a whole Azure MCP server) left the sent
> count essentially unchanged. There's no flat-list cliff at 128 either — at 120
> tools, 97 were already deferred.
>
> So "disable tools to save money" mostly trims a list the model never fully
> receives. What actually costs: CHURNING the sent set. In a separate session,
> switching Plan→Agent changed the sent tools (+10,044 tokens at the front of the
> prefix), invalidated ~40,000 tokens of warm cache, and forced one 15.7-credit
> cold re-write.
>
> Tool count is almost free. Changing the tool set is not.
>
> (Six captures for the curve; the 15.7-credit event is a single session. Still
> investigating — measuring skill-instruction overhead next.)

## Video Outline

60–90 second LinkedIn video:

- Open `hi_116` (120 tools) in Copilot Ledger; highlight the **tool_defs** box —
  ~9,100 tokens, 23 schemas sent.
- Open `hi_140` (142 tools) side by side — basically the same sent count. Say it:
  "crossed the 128 threshold, nothing jumped."
- Open `workiq` (320 tools) — still ~25 sent, 295 deferred. "Eight-x compression;
  the model never sees most of them in full."
- Cut to the cart run; select the plan turn (14 sent) then the implement turn (45
  sent), then `p3.l0`: 19% cache hit, 15.7 credits.
- End: "Enabling tools is nearly free — they're deferred and cached. *Changing*
  the active set mid-task is what resets the cache and costs real credits."
