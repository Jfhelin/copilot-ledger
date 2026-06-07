# Agent Planning

## LinkedIn Hook

> The agent spawned two sub-agents to plan. They both read the same seven files.

## Executive Summary

In a 106.6-credit "plan, then implement a shopping cart" session, **the planning
phase was 40.2 credits (38% of the run) — and 71% of that was two sub-agents the
planner sent to explore the codebase**, not the plan it wrote. That much we've
shown before. The new finding is what those sub-agents actually did with the
money.

The two explorers were handed overlapping briefs ("explore frontend structure"
and "explore frontend components"), so they **independently read the same files**:
**7 of the 8 source files the second sub-agent read had already been read by the
first** — 94% of its read volume, duplicated. Yet the fan-out still bought
something real: the two agents consumed ~51 KB of source code and handed back only
~9 KB of summary, so the **main thread's permanent context grew by ~2,300 tokens
instead of ~12,700**.

That trade — pay credits now in a throwaway window to keep raw exploration *out*
of the main thread's growing prefix — is the actual story of a sub-agent. It is a
**context loan**, not a discount. And in this session, an optimistic
single-threaded counterfactual comes out **~7–8 credits cheaper**, because the
loan's overhead (overlap + the cost of running two agents) outweighed what it
saved on context growth over a session this short.

> Scope: single session (N=1), claude-sonnet-4.6. The 106.6 headline is a slight
> lower bound (~1.9 credits of extended-thinking output under-counted). The
> single-threaded comparison is a **model**, not a second measured run — see
> Confidence.

## Hypothesis

Sub-agents are widely recommended for "context-heavy exploration," with the
implicit promise that delegating is *cheaper*. The assumption being tested: that
fanning discovery out to sub-agents saves credits versus having the main thread
read the files itself. If the opposite shows up — that the fan-out costs *more* in
a short session and only pays back over a long one — then "use sub-agents to save
money" is the wrong mental model, and "use sub-agents to protect context" is the
right one.

## Why This Matters

Plan-then-implement is a recommended pattern, and so is delegating exploration to
sub-agents. Both are good advice. But "the agent planned" hides a fan-out you
never see: two sub-agents, twelve model calls, the same files read twice. If you
think a sub-agent is a free way to explore, you won't notice that overlapping
briefs make it pay for the same work repeatedly — or that its real value isn't the
credits it saves but the context it keeps out of your main thread.

## Session Summary

- Task: Plan, then implement, a frontend shopping-cart feature (cart page + a
  NavBar cart icon) in a React/TypeScript app.
- Model: claude-sonnet-4.6 (every turn, same model).
- Total credits: 106.6 (lower bound; ~1.9 credits of thinking output
  under-counted).
- Planning phase: 40.2 credits (38%) — plan reasoning `p2` 11.5 + sub-agents `p1`
  11.9 + `p0` 16.8.
- Implementation phase: `p3`, 66.4 credits across 19 calls.
- Tool calls: 60. Cache: 94% session-wide.

## Key Findings

1. **A "plan" is a fan-out, not a step.** The planner didn't just think — it
   spawned two parallel sub-agents (`p0`, `p1`), each running ~6 model calls, then
   synthesized their reports. 71% of the 40.2-credit planning bill (28.7 cr) was
   that exploration, not the 11.5-credit plan text.
2. **The two sub-agents overlapped almost completely.** Of the 8 source files
   sub-agent `p1` read, **7 had already been read by `p0`** — `Navigation.tsx`,
   `Products.tsx`, `AuthContext.tsx`, `ThemeContext.tsx`, `config.ts`,
   `themeContextUtils.tsx`, `useTheme.tsx`. That's **94% of `p1`'s read byte
   volume (23,158 of 24,695 B), duplicated.** `p1` even read `Products.tsx` and
   `config.ts` twice within its own run.
3. **Sub-agents compress hard — that's their real value.** The two explorers
   processed ~309K prompt-tokens across 12 calls and read ~51 KB of unique source,
   then returned just **~9 KB (~2,286 tokens) of summary** to the main thread. The
   main thread's permanent prefix grew ~2,300 tokens instead of ~12,700 — a ~5.6×
   reduction in what it had to carry forward.
4. **The fan-out did not save credits here.** An optimistic single-threaded model
   — main thread reads each unique file once, no duplication — comes out at ~23
   credits versus the fan-out's ~31. The loan's overhead beat its savings in a
   session of this length; break-even is around ~45 later main-thread calls (this
   run had ~20).

## What Happened

The session had two phases on one model.

**Phase 1 — Plan (40.2 credits).** The main agent (in Plan mode) took the cart
request and, instead of answering, spawned two sub-agents to explore the frontend:

- `p1` — "Explore frontend structure" — 11.9 cr, 6 model calls, read 8 source
  files.
- `p0` — "Explore frontend components and context" — 16.8 cr, 6 model calls, read
  16 source files.

Both entered ~98% cache-warm by reusing the parent's prefix, so each *call* was
cheap — but six calls each, over heavily overlapping file sets, adds up. The plan
turn `p2` then synthesized their two summaries into a written plan for 11.5
credits. Running total before any code: **40.2 credits.**

**Phase 2 — Implement (66.4 credits).** A Plan→Agent mode switch (`p3`) expanded
the toolset, forced one cold cache write, then ran 19 calls to write the cart
context, the cart page, and the NavBar icon.

Phase cost breakdown:

| Phase | Component | Credits | Share |
| --- | --- | --- | --- |
| Plan | plan turn reasoning (`p2`) | 11.5 | 11% |
| Plan | sub-agent: structure (`p1`) | 11.9 | 11% |
| Plan | sub-agent: components (`p0`) | 16.8 | 16% |
| **Plan** | **planning phase total** | **40.2** | **38%** |
| Implement | implementation turn (`p3`) | 66.4 | 62% |
| **Total** | | **106.6** | **100%** |

## The Sub-agent Trade — What a Fan-out Buys and Costs

A sub-agent runs in its **own** context window. Its file reads land in *its*
prefix and are summarized back to the parent — the raw bytes never enter the main
thread. That is the entire mechanism, and it cuts two ways.

**What it saves (measured).** Compression. The explorers read ~51 KB of source and
returned ~9 KB of summary. The main thread's prefix — which it re-reads on *every*
later call (see experiment 05) — grew ~2,300 tokens instead of ~12,700. On a long
session, avoiding ~10,000 tokens of permanent prefix is a recurring saving on
every future call.

**What it costs (measured).** Overhead and overlap. Each sub-agent has fixed
start-up (its own reasoning, tool calls, and summary write), and here the two
briefs overlapped so badly that 94% of one agent's reads duplicated the other's.
You paid to read `Navigation.tsx`, `Products.tsx`, and the contexts *twice*.

### Sub-agents vs. doing it in the main thread (modeled)

What if the main thread had explored the files itself — no sub-agents — reading
each unique file once? Using the session's real sonnet-4.6 rates:

| Path | Discovery cost | Context-carry tax | Total |
| --- | ---: | ---: | ---: |
| **Actual — two sub-agents** | 28.7 cr (`p0`+`p1`) | +2.2 cr (carry the 2.3K summary) | **~30.9 cr** |
| **Modeled — single thread** | ~13.2 cr (one pass, no duplication) | +9.9 cr (carry ~10.5K raw reads) | **~23.1 cr** |

In *this* session, single-threaded discovery would have been **~7–8 credits
cheaper**. The fan-out's overhead (two agents, 94% overlap) outweighed the
context-growth it avoided. The crossover — where keeping ~10,000 tokens out of the
prefix finally pays for itself — is around **~45 subsequent main-thread calls.**
This run had ~20, so it never reached break-even.

This is a **model, not a second measurement.** It assumes the main thread would
read each file once and synthesize in one pass; a real run might explore more, or
less. The defensible claim is narrow: **sub-agent fan-out is not automatically
cheaper, and on a short session it can cost more.** It is evidence against
"delegate to save credits," not proof that sub-agents are generally wasteful.

## Interpretation

The useful way to think about a sub-agent is a **context loan**. It lets the main
thread borrow a clean prefix: heavy exploration happens off-book, in a window you
throw away, and only a compact summary comes back. Like any loan, it has interest
— the fixed cost of running the agent, plus whatever the agents duplicate among
themselves. You come out ahead only if the context it spared you re-reading, over
all the calls that follow, is worth more than that interest.

That reframes both levers. **Overlapping sub-agents are pure waste** — two agents
re-reading the same seven files is interest with no principal. And **a sub-agent
on a short task may never break even** — the loan pays off across many later
calls, and a quick session doesn't have them. The fan-out here was a reasonable
*planning* move (it kept the plan thread clean and reviewable) but a *credit-
negative* one, and both things are true at once.

It also loops back to context quality (experiment 01): the cheapest exploration is
the one that never happens. If you already know which files matter, the planner
doesn't dispatch sub-agents to rediscover them, and there's no loan to service.

## Practical Guidance

- **Don't reach for sub-agents to save credits — reach for them to protect
  context.** Their payoff is a clean main thread that compounds over a long
  session, not a discount on a short one. Here the fan-out cost ~7–8 credits
  *more* than doing the work inline.
- **Give sub-agents narrow, non-overlapping briefs.** Two agents told to "explore
  the frontend" re-read the same files — 94% overlap here. "Look at routing" +
  "look at the cart components" explores each file once.
- **Front-load the files you already know matter.** Named context means the
  planner doesn't dispatch explorers to find what you could have pointed at — no
  exploration, no loan, no interest (experiment 01).
- **Budget for planning; don't optimize it away.** The plan made implementation
  orderly and reviewable. The goal is to know it costs real credits (~40 here),
  and that most of that is exploration, not thinking.

## Confidence Level

**Medium-Low — single session (N=1), with a modeled comparison.** The measured
facts are taken directly from one export (`04-plan-implement-cart.json`): the
40.2/66.4 phase split (internally consistent, 40.2 + 66.4 = 106.6), the 94% file
overlap, the ~5.6× summary compression, and the 28.7-credit sub-agent cost.

Caveats:

- **The single-threaded comparison is a model, not a measurement.** It assumes an
  optimistic best case (each file read once, one synthesis pass). The result is
  most sensitive to how much output the main thread would need; a few thousand
  extra output tokens would erase the 7–8 credit gap. Treat it as "fan-out is not
  automatically cheaper," not "single-thread is 7–8 credits better."
- **The break-even (~45 calls) is session-specific**, set by this run's token
  geometry. It is a sensitivity analysis, not a universal threshold.
- The 106.6 headline is a **lower bound**: ~1,250 tokens of extended-thinking
  output (~1.9 credits) are under-counted.
- One run, one task, one codebase. Treat the *direction* — a plan is an
  overlapping fan-out, and the fan-out is a context loan that doesn't always pay
  off — as the finding, not the exact numbers.

## Evidence

- **Primary export:** `04-plan-implement-cart.json` (7.5 MB).
- Overlap: 7 of `p1`'s 8 source files also read by `p0` (23,158 B = 94% of `p1`
  read volume). Compression: ~51 KB unique source in, ~9.1 KB (~2,286 tok) summary
  out. Costs: `p0` 16.8 cr / `p1` 11.9 cr / `p2` 11.5 cr / `p3` 66.4 cr; session
  106.6 cr, 60 tool calls, 94% cache hit, `thinkingUnderCount` ~1.9 cr.
- Rates used in the model (sonnet-4.6, credits per 1K tok): cache-read 0.03,
  cache-write 0.375, output 1.5.
- Regenerate with
  `node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout`
  and read `prompts[].credits` / `filesTouched` / `spawnedSubagents`, per-call
  `timeline[]`, and `rollups.cost.thinkingUnderCount`.

## LinkedIn Post

> The agent spawned two sub-agents to plan a feature. They both read the same
> seven files.
>
> I measured a "plan, then implement a shopping cart" session in GitHub Copilot.
> Total: 106.6 credits. Planning was 40.2 of them (38%) — and 71% of *that* was
> two sub-agents the planner sent to explore the codebase, not the plan it wrote.
>
> Here's the part that surprised me. The two explorers had overlapping briefs, so
> they independently read the same files: 7 of the 8 source files the second one
> read had already been read by the first. 94% duplicated.
>
> So are sub-agents a waste? Not exactly. They compress: those two agents read
> ~51KB of code and handed back ~9KB of summary. The main thread's context grew
> ~2,300 tokens instead of ~12,700 — and that prefix gets re-read on every later
> call.
>
> That's the real mental model: a sub-agent is a context LOAN, not a discount. It
> pays credits now, in a throwaway window, to keep raw exploration out of your
> main thread. You only come out ahead if the context it spared you re-reading,
> over all the calls that follow, beats the cost of running it.
>
> In this short session, it didn't. An optimistic single-threaded version comes
> out ~7–8 credits cheaper — the loan's interest (two agents, 94% overlap) beat
> what it saved. Break-even was ~45 later calls; this run had ~20.
>
> Takeaways for your sessions:
> – Reach for sub-agents to protect context on long work, not to save credits on
>   short tasks.
> – Give them narrow, non-overlapping briefs — "routing" + "cart components," not
>   "the frontend" twice.
> – Front-load the files you already know matter, so there's nothing to explore.
>
> (Single session, N=1, plus a model for the comparison — a direction, not a
> benchmark.)

## Video Outline

60–90 second LinkedIn video:

- Open the cart run in Copilot Ledger; show the total: 106.6 credits, planning
  40.2 (38%).
- Point at the plan turn and its two spawned sub-agents in the timeline.
- Put the overlap on screen: 7 of 8 files read by both — 94% duplicated.
- Flip it: the two agents read ~51KB, returned ~9KB — the main thread grew 2.3K
  not 12.7K.
- Say the model plainly: a sub-agent is a context *loan*. Pay now, keep the main
  thread clean later.
- Show the comparison: fan-out ~31 cr vs single-thread ~23 cr — it didn't pay off
  in a session this short (break-even ~45 calls).
- End with: use sub-agents to protect context, give them non-overlapping briefs,
  and front-load the files you already know.
