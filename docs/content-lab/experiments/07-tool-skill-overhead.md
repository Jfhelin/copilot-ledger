# Tool and Skill Overhead

## LinkedIn Hook

> A quarter of every call was tool definitions the agent might never use — and
> changing them mid-task cost 15 credits in one shot.

## Executive Summary

In a 107-credit plan-then-implement session, the tool definitions sat in front
of **every** model call and made up a steady **~25–32%** of the billed prefix —
in Agent mode, **15,929 tokens across 56 tool schemas** on every call. They are
cheap once cached, but they are permanent real estate.

The bigger surprise is what happens when the toolset *changes*. Switching from
Plan to Agent mode took the tool list from **29 → 56 definitions (+9,110
tokens)**. Because tool definitions live near the **front** of the context, that
change invalidated ~40K tokens of already-warm cache and forced a single
**15.7-credit cold re-write**. Tool/skill definitions are not just a per-call
tax — *churning* them is one of the most expensive things an agent can do.

> Scope: this is a single session (N=1) and is **under investigation**. The
> tool-definition numbers are measured cleanly; the *skill*-specific share is not
> yet isolated (see Confidence).

## Hypothesis

Tool and skill definitions are a fixed cost paid on every model call. If that is
true, two things should follow: (1) they should occupy a measurable, roughly
constant share of every call's input, and (2) because they sit early in the
cached prefix, *changing* them should be disproportionately expensive — far more
than their token size suggests — because everything after the change has to be
re-written.

## Why This Matters

Developers think about context as "the files and history I send." Tool
definitions are invisible context: you never type them, but you pay for them on
every call, and the set is decided by your mode, your enabled tools, your MCP
servers, and your active skills. Knowing how big that block is — and that
changing it resets the cache — turns "why did this turn suddenly cost 15
credits?" into a predictable, avoidable event.

## Session Summary

- Task: Plan, then implement, a shopping-cart feature (frontend exploration +
  two sub-agents + an implementation turn).
- Model: claude-sonnet-4.6 (all turns, same model).
- Total credits: 106.6.
- Key cost driver: a single cold implementation call (`p3.l0`) at **15.7
  credits**, caused by a tool-definitions change between Plan and Agent mode.
- Tool calls: 60.
- Cache behavior: 94% session-wide, but the Plan→Agent boundary re-froze the
  prefix to **19%** for one call.

## Key Findings

1. **Tool defs are ~25–32% of every call (N=1).** In Agent mode the
   implementation turn carried **15,929 tokens / 56 schemas** in front of each
   call — a consistent quarter-to-a-third of the billed prefix, whether or not
   those tools were used.
2. **The toolset is not constant across a session.** Sub-agents ran lean (28
   defs, 6,301 tokens); the plan turn had 29 defs (6,819 tokens); the implement
   turn nearly **doubled** to 56 defs (15,929 tokens).
3. **Changing tool defs detonates the cache (N=1).** The Plan→Agent switch added
   +9,110 tokens of definitions at the front of the prefix and invalidated ~40K
   tokens of warm cache, forcing a **15.7-credit** cold re-write on `p3.l0` (19%
   hit). The plan agent and the implement agent do not share a toolset, so they
   cannot share a cache.
4. **Position is the whole story.** Tool defs hurt out of proportion to their
   size because they sit *early* in the prefix — the cache is a longest-common-
   prefix match, so a change there throws away everything downstream.

## What Happened

The run had three phases on one model:

1. **Plan turn (`p2`)** — 29 tool definitions (~6,819 tokens). It spawned two
   sub-agents to explore the frontend.
2. **Sub-agents (`p0`, `p1`)** — leaner still, 28 definitions (~6,301 tokens),
   and they entered ~98% warm by reusing the parent's prefix.
3. **Implement turn (`p3`)** — a Plan→Agent mode switch expanded the toolset to
   **56 definitions (~15,929 tokens)**. The very first call, `p3.l0`, dropped to
   a 19% cache hit and wrote 39,952 fresh tokens — **15.7 credits** — before the
   new, larger prefix re-warmed and following calls fell back to ~2 credits.

Tool-definition footprint per phase:

| Phase | Tool defs | Approx tokens | Share of prefix |
| --- | --- | --- | --- |
| Sub-agents (`p0`, `p1`) | 28 | 6,301 | ~17–32% |
| Plan turn (`p2`) | 29 | 6,819 | ~20–22% |
| Implement turn (`p3`) | 56 | 15,929 | ~25–32% |

The cache cliff at the boundary:

| Call | Prefix tokens | Cached | Written | Hit | Credits |
| --- | --- | --- | --- | --- | --- |
| `p2.l7` (last plan call) | 34,905 | 32,897 | 2,007 | 94% | 3.3 |
| `p3.l0` (first implement call) | 49,401 | 9,447 | 39,952 | **19%** | **15.7** |
| `p3.l2` (next implement call) | 49,739 | 49,399 | 339 | 99% | 2.0 |

## Interpretation

Two distinct costs share one root cause — tool definitions are early, always-sent
context:

- **The static tax.** A quarter to a third of every billed call is tool schemas.
  After the first call they are cached, so the marginal cost is the cheap
  cache-read rate — but they permanently consume context-window space and they
  are the floor under every turn.
- **The churn tax.** Because the cache matches the longest common *prefix*, any
  change to the tool block invalidates everything after it. The Plan→Agent switch
  changed 9,110 tokens near the front and cost a 15.7-credit re-write — far more
  than 9,110 tokens are "worth," because ~40K downstream tokens had to be
  re-written too.

This is the bridge to the [Cache Behavior experiment](08-cache-behavior.md): the
mode-switch reset listed there as one of several cache-killers is, underneath, a
tool-definitions change — and this is its deep dive.

## Practical Guidance

- **Treat a mode switch as a cache reset.** Plan→Agent changes the toolset and
  re-pays the cold write. If you can do the planning and the implementation in
  the same mode, you keep the warm prefix.
- **Keep the toolset lean.** Fewer enabled tools / MCP servers / skills means a
  smaller always-sent block on every call. Review the active set periodically and
  turn off what this task does not need.
- **Let sub-agents carry narrow toolsets.** The sub-agents here ran on 28 defs
  and entered warm; a focused subtask does not need the full implementation
  toolset.
- **Expect the first call after any tool/skill change to be expensive.** It is
  the re-warm, not the work, that costs — budget for it and avoid triggering it
  repeatedly.

## Confidence Level

**Low — under investigation, single observation (N=1).** The tool-definition
token counts and the cache cliff are measured directly from one export
(`04-plan-implement-cart.json`) and are internally consistent. Two caveats:

- The **skill**-specific overhead is **not yet isolated**. Skills inject both
  tools and instructions that fold into the same front-of-prefix region; this run
  does not toggle a skill on and off, so the page makes a clean *tool-definition*
  claim but not a separate *skill* claim. A run that enables/disables one skill
  is the missing measurement.
- The digest's tool-def token figure is an **approximation** (tool schemas are
  sent out of band, not in the message array), so treat the shares as ±a few
  percent, not exact.

## Evidence

- **Primary export:** `04-plan-implement-cart.json` (7.5 MB). Tool-def footprint
  and the cache cliff reproduced in the tables above.
- Key refs: per-call tool-def sizes at `p2.l*` (29 defs) vs `p3.l*` (56 defs);
  the cold re-write at `p3.l0` (19% hit, 15.7 cr); the digest anomaly cause
  `tool-defs-changed (Δ +9,110 tokens)`.
- Regenerate any figure with
  `node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout`
  and read `timeline[].toolDefsApproxTokens` / `toolDefsCount` and
  `rollups.cacheAnomalies`.

## LinkedIn Post

> A quarter of every Copilot call was tool definitions the agent might never use.
>
> I measured a plan-then-implement session. On every single model call, the tool
> schemas sat in front of the prompt:
>
> Plan mode: 29 tools, ~6,800 tokens
> Agent mode: 56 tools, ~15,900 tokens — a steady ~25–32% of the whole call
>
> They're cheap once cached. But here's the part that cost real money:
>
> Switching from Plan to Agent mode changed the tool list (+9,110 tokens). Tool
> definitions live at the FRONT of the context, and the cache only reuses a
> matching prefix — so that one change invalidated ~40,000 tokens of warm cache
> and forced a single 15.7-credit cold re-write.
>
> The plan agent and the implement agent don't share a toolset, so they can't
> share a cache.
>
> Tool and skill definitions aren't just a per-call tax. Churning them is one of
> the most expensive things an agent can do.
>
> (Single session, N=1 — still investigating. Measuring skill-only overhead next.)

## Video Outline

60–90 second LinkedIn video:

- Open the cart run in Copilot Ledger; select a plan-turn call and read the
  tool-defs share (~29 defs).
- Select an implement-turn call — show it jump to 56 defs / ~15,900 tokens, ~a
  third of the call.
- Jump to `p3.l0` and show the 19% cache hit and 15.7 credits.
- Explain: the toolset changed at the Plan→Agent switch; tool defs are at the
  front of the prefix, so the cache after them was thrown away.
- End with: keep the toolset lean and avoid needless mode switches — the first
  call after a tool change pays for the re-warm.
