# Context Growth

## LinkedIn Hook

> Context only grows. Re-reading it was 40% of my Copilot session.

## Executive Summary

> **Scope note:** Single session (N=1), `claude-sonnet-4.6`, all models priced.
> The 106.6-credit headline is a slight **lower bound** (~1.9 credits of
> extended-thinking output is under-counted). The numbers are a directional,
> single-session observation, not a benchmark.

In one "plan, then implement a shopping cart" session, the conversation the agent
carried grew from **~19,500 tokens on its first model call to ~64,200 on its last**
— it more than **tripled**, and it never shrank. Inside the implementation turn
alone, the prefix climbed **49,401 → 64,202 tokens** across 20 model calls. In
this run — with no compaction — every file read and every edit stayed in that
prefix and was re-sent on every later call. The surprise: even at a **94% cache
hit**, *re-reading* that
ever-growing context was the single largest cost line in the whole session —
**42.4 of 106.6 credits (40%)**, more than the model's actual output (30.5
credits, 29%). Context growth isn't a token-count curiosity; it's a per-call tax
that rises as the session goes on.

## Hypothesis

A conversation's cost should track the *work* in each turn — a big edit costs
more than a small one. The assumption being tested: that once context is cached,
its size stops mattering, so a long session is just "a short session, more
times." If instead the cost of simply *carrying* the accumulated context rises
call after call — independent of how much work each call does — then context size
is a cost lever in its own right, not just a cache footnote.

## Why This Matters

Developers are told caching makes long sessions cheap, and it largely does — cache
reads run at roughly a tenth of fresh-input price. But "a tenth" of a prefix that
keeps growing is still a bill that grows with it. Every call re-reads the entire
conversation so far, so the floor cost of *doing anything* climbs as history
accumulates. Knowing this is what makes "avoid excessive context" and "compact a
long session" concrete instead of abstract.

## Session Summary

- **Task:** Plan, then implement, a frontend shopping-cart feature (cart page + a
  NavBar cart icon) in a React/TypeScript app.
- **Model:** claude-sonnet-4.6 (every turn, same model).
- **Total credits:** 106.6 ($1.066) — lower bound; ~1.9 credits of thinking
  output under-counted.
- **Key cost driver:** re-reading the accumulated prefix — 42.4 credits (40% of
  the session), more than total output. The implementation turn carried this
  weight on every one of its 20 calls.
- **Tool calls:** 60.
- **Cache behavior:** 94% session-wide. One cold spot — the Plan→Agent hand-off
  (see experiments 07 and 08) — wrote ~40K tokens in a single 15.7-credit call.

## Key Findings

1. **Context only grows (N=1).** Across the whole session the prefix went from
   **19,551 tokens** (the first model call) to **64,202** (the last) — a **3.3×**
   increase. It never decreased: there was no compaction, so every tool result
   stayed in the window for the rest of the run.
2. **The implementation turn's prefix grew 30% mid-turn.** Within `p3`, the prompt
   climbed **49,401 → 64,202 tokens** over 20 calls (**+14,801**), purely from the
   files it read and the edits it made accreting into history.
3. **Re-reading that context was the #1 cost line — 40% of the session.** Of 106.6
   credits, **cache-read = 42.4 (40%)**, cache-write = 33.7 (32%), output = 30.5
   (29%). The agent spent *more* re-reading what it already knew than it spent
   producing new output.
4. **The per-call floor rises as context grows.** A near-trivial call that wrote
   only ~250 new tokens still cost **~1.5 credits to re-read a 50K prefix early in
   the turn, climbing to ~1.9 credits to re-read the 64K prefix by the end** — a
   ~29% increase in the unavoidable cost of *doing anything*, driven only by how
   much history was being carried.
5. **Growth is paid once per chunk, then re-read forever.** Each new piece of
   context is written to cache once (cache-creation) and then re-read on every
   subsequent call. In `p3`, ~14,800 tokens of new content were written across the
   turn — cheap individually, but re-read 1–19 more times each.

## What Happened

The session ran on one model, in two phases. Context accumulated the whole way.

**Where the prefix started.** The first model call of the run was an exploration
sub-agent at **19,551 tokens** — almost all of it the shared system prompt
(~9,680, see experiment 08) plus ~4,000 tokens of tool definitions, with only
~5,800 tokens of actual conversation. That is the floor a fresh agent starts from.

**The implementation turn (`p3`) — the growth curve.** After planning, a
Plan→Agent mode switch expanded the toolset (tool defs ~4,600 → ~14,600 tokens)
and forced one cold cache write of the whole ~40K prefix — a single 15.7-credit
call (`p3.l0`). From there the agent ran 19 more calls to build the cart, and the
prefix grew with every one:

| Call | Doing | Prompt tok | New written | Re-read cost | Total |
|---|---|---|---|---|---|
| `p3.l0` | mode switch, cold write | 49,401 | 39,952 | 0.3 cr | **15.7 cr** |
| `p3.l4` | read a file (+256 tok) | 49,995 | 256 | **1.5 cr** | 1.8 cr |
| `p3.l21` | edit (+3,096 tok) | 60,068 | 3,096 | 1.8 cr | 3.2 cr |
| `p3.l35` | read a file (+244 tok) | 63,439 | 244 | **1.9 cr** | 2.4 cr |
| `p3.l39` | final file read (+251 tok) | 64,202 | 251 | **1.9 cr** | 2.5 cr |

Notice `p3.l4` and `p3.l35`: both did the same trivial thing — read a file,
adding ~250 tokens — yet the later one cost more. The only thing that changed was
that the agent was now carrying 13K more tokens of history, and re-reading it cost
~0.4 credits more, every call.

**What the prefix was made of, start vs. end of the implement turn:**

| Component | `p3.l0` (start) | `p3.l39` (end) |
|---|---|---|
| Shared system / scaffolding (from #08) | ~9,680 | ~9,680 |
| Tool definitions | 14,606 | 14,606 |
| Accumulated conversation (history) | **~25,115** | **~39,916** |
| **Total prompt** | **49,401** | **64,202** |

The fixed parts (system + tool defs) don't move. *What grows is the conversation*
— and it does nothing but grow.

**Session cost, by where the credits went:**

| Component | Credits | Share |
|---|---|---|
| Cache-read (re-sending the grown prefix) | 42.4 | 39.8% |
| Cache-write (first write of each new chunk) | 33.7 | 31.6% |
| Model output | 30.5 | 28.6% |
| **Total** | **106.6** | **100%** |

## Interpretation

The intuition "caching makes context size free" is the half-truth here. Caching
makes context *re-reads* cheap — about a tenth of fresh price — but it does not
make them free, and it does not stop the prefix from growing. So the cost of
simply *carrying* the conversation compounds: a tenth of 50K is small; a tenth of
64K is bigger; and you pay it on **every single call**, whether that call does
real work or just reads one more file.

That's why re-reads (42.4 cr) out-weighed output (30.5 cr) in this run. The agent
wasn't expensive because it wrote a lot — its actual output was the *smallest* of
the three buckets. It was expensive because it had to re-read an ever-larger
context to write anything at all. Context growth is a tax on future calls, levied
in proportion to how much history you're dragging forward.

This also reframes "long sessions are cheap." They're cheap *per new token* —
cache keeps the marginal write cheap — but the **floor** under every call rises as
history grows. A short session pays that floor a few times; a long one pays a
*higher* floor many times. The two are not the same shape.

It connects directly to the cache mechanism (experiment 08): within this
un-compacted session the prefix is a longest-common-prefix cache that only ever
got longer, and to context quality (experiment 01): the cheapest context is the context the agent
never had to fetch, because fetched context doesn't just cost its round trip — it
joins the prefix and gets re-read for the rest of the session.

## Practical Guidance

- **Avoid excessive context — it's re-read, not just stored.** Every file the
  agent pulls in joins the prefix and is re-billed (at cache-read rate) on every
  later call. Trimming what the agent loads cuts a recurring cost, not a one-time
  one. This reinforces official GitHub guidance to avoid sending excessive
  context.
- **Front-load the *right* context so the agent fetches less.** Discovery doesn't
  just cost its round trips; what it discovers swells the prefix for the rest of
  the run. Naming the relevant files keeps the growth curve flatter (see
  experiment 01).
- **Compact deliberately on genuinely long sessions.** Compaction is the one lever
  that makes the prefix *shrink*. It isn't free — it's a model call and it
  invalidates the cache (experiment 08) — but once history is large and mostly
  stale, resetting to a smaller prefix lowers the floor under every future call.
  On a short session it costs more than it saves.
- **Don't assume "cached" means "size-independent."** The per-call floor here rose
  ~29% (≈1.5 → 1.9 cr) just from carrying more history. If a long session feels
  like it's getting slower and pricier per step, that's the growing prefix, not
  your imagination.
- **Let sub-agents absorb heavy exploration.** Their fan-out reads land in *their*
  window, not the parent's, so they keep large transient context out of the main
  conversation's permanent prefix (see experiments 06 and 08).

## Confidence Level

**Medium-Low — single session (N=1).** Every figure is measured directly from one
export (`04-plan-implement-cart.json`) and the components are internally
consistent (cache-read 42.4 + cache-write 33.7 + output 30.5 = 106.6; planning
40.2 + implement 66.4 = 106.6). Caveats:

- The 106.6 headline is a **lower bound**: ~1,250 tokens of extended-thinking
  output (~1.9 credits) are under-counted. This does not change the 40% re-read
  share materially.
- The prefix composition table assumes the ~9,680-token shared system block from
  experiment 08 (reproduced N=4); tool-def and prompt-token figures are measured
  directly per call.
- "Re-reads are 40% of the session" is one run on one task in one codebase, with
  one Plan→Agent mode switch inflating the cold-write bucket. Treat the
  *direction* — context grows monotonically and re-reading it is a first-class,
  rising cost — as the finding, not the exact split.

## Evidence

- **Primary export:** `04-plan-implement-cart.json` (7.5 MB). Growth curve and
  cost split reproduced in the tables above. (Editorial-only for now: at 7.5 MB
  this export is presented as static tables rather than bundled as a fixed report,
  matching experiments 06 and 07. Deploying it as a pinned report — where the
  context-window bar would visualize the growth call-by-call — is a candidate
  follow-up.)
- Key refs: session prefix start `p1.l0` (19,551 tok) → end `p3.l39` (64,202 tok);
  implement turn `p3` prefix 49,401 → 64,202; trivial-call floor `p3.l4` (1.5 cr
  re-read) vs `p3.l35` (1.9 cr re-read); cold mode-switch write `p3.l0` (15.7 cr).
  Session rollup: 106.6 credits, 60 tool calls, 94% cache hit,
  `thinkingUnderCount` applies (~1.9 cr).
- Regenerate any number with
  `node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout`
  and read per-request `timeline[]` (`promptTokens`, `cachedTokens`,
  `cacheCreationTokens`, `cachedReadUsd`, `credits`, `toolDefsApproxTokens`) plus
  `rollups.cost`.

## LinkedIn Post

> Context only grows. Re-reading it was 40% of my Copilot session.
>
> I measured a "plan, then implement a shopping cart" run in GitHub Copilot.
> 106.6 credits total. Here's where they actually went:
>
> - Re-reading the accumulated context: 42.4 credits (40%)
> - Writing new context to cache: 33.7 credits (32%)
> - The model's actual output: 30.5 credits (29%)
>
> The agent spent *more* re-reading what it already knew than producing new
> output.
>
> Why? The conversation the agent carries only grows. It started its first call at
> ~19,500 tokens and finished at ~64,200 — more than triple, and it never shrank.
> Every file it read and every edit it made stayed in the prefix and got re-sent
> on every later call.
>
> Caching helps — re-reads run at ~10% of fresh price. But 10% of a prefix that
> keeps growing is a bill that keeps growing too. Two calls did the exact same
> trivial thing (read one file, +250 tokens). The later one cost ~0.4 credits
> more — purely because it was now hauling 13K more tokens of history.
>
> "Cached" doesn't mean "size doesn't matter." The floor under every call rises as
> context grows.
>
> The takeaway: avoid excessive context (it's re-read, not just stored), front-load
> the *right* files so the agent fetches less, and compact deliberately on long
> sessions — it's the one lever that makes the prefix shrink.
>
> (Single session, N=1 — a direction, not a benchmark.)
>
> Full breakdown with measurements: [GitHub Pages link]

## Video Outline

60–90 second LinkedIn video:

**0–10s** — "Context only grows — and re-reading it was 40% of my Copilot
session." Show the session total: 106.6 credits.

**10–30s** — Open the cart run in Copilot Ledger. Point at the first model call
(~19,500 tokens) and the last (~64,200). The conversation more than tripled and
never shrank.

**30–75s** — Step through the implementation turn and watch the context-window bar
grow, 49K → 64K. Then put the cost split on screen: re-read 42.4 cr vs output 30.5
cr. Land the kicker: two calls did the same trivial file read, but the later one
cost more — it was carrying 13K more history.

**75–105s** — Explain it: caching makes re-reads cheap (~10%), not free, and the
prefix only grows, so the floor under every call rises as the session goes on.

**105–120s** — Takeaway: avoid excessive context, front-load the right files, and
compact long sessions — the one move that makes the prefix shrink. End on "cached
doesn't mean free."
