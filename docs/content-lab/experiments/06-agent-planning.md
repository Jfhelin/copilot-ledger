# Agent Planning

## LinkedIn Hook

> The agent spent 40 credits before it wrote a single line of code.

## Executive Summary

In a 106.6-credit "plan, then implement a shopping cart" session, **38% of the
total — 40.2 credits — was spent on planning and exploration before any code was
written.** The surprise underneath: the planning *reasoning* was the cheap part
(11.5 credits). The other **71% of the planning bill (28.7 credits) was two
sub-agents the planner sent to explore the codebase.** "The plan" was not a
single cheap thinking step — it was an expensive fan-out.

This is not an argument against planning. The plan made the implementation
orderly and reviewable. It's an argument for knowing *where* planning cost
actually lands: in the exploration it triggers, not the thinking it prints.

> Scope: single session (N=1), claude-sonnet-4.6, all models priced. The 106.6
> headline is a slight lower bound (~1.9 credits of extended-thinking output is
> under-counted). See Confidence.

## Hypothesis

Planning feels "free" because the visible output is just a short plan. The
assumption being tested: that a plan-then-implement agent spends most of its
credits on the implementation, and the planning step is a small fraction. If the
opposite shows up — that planning is a large, non-trivial share — developers are
mis-estimating where their credits go.

## Why This Matters

Plan-then-implement is a recommended pattern: it makes agent work reviewable and
keeps implementation on track. But "planning" is invisible spend — you see a tidy
plan, not the four exploration round trips and two sub-agents that produced it.
If you don't know planning was a third of the bill, you can't reason about when
it's worth it, when to scope it tighter, or why a "quick plan" wasn't quick.

## Session Summary

- Task: Plan, then implement, a frontend shopping-cart feature (cart page + a
  NavBar cart icon) in a React/TypeScript app.
- Model: claude-sonnet-4.6 (every turn, same model).
- Total credits: 106.6 (lower bound; ~1.9 credits of thinking output
  under-counted).
- Key cost driver: the implementation turn (66.4 cr, 19 model calls), but the
  *surprising* driver is the 40.2-credit planning phase that preceded it.
- Tool calls: 60.
- Cache behavior: 94% session-wide; the one cold spot was the Plan→Agent
  hand-off (covered in experiments 07 and 08).

## Key Findings

1. **Planning was 38% of the session (N=1).** 40.2 of 106.6 credits were spent
   before the first line of code — on the plan turn plus the exploration it
   triggered.
2. **The plan reasoning was cheap; the exploration was not.** The plan turn's own
   cost was 11.5 credits. The two exploration sub-agents it spawned cost 28.7
   credits — **71% of the planning phase** and more than double the plan itself.
3. **A "plan" is a fan-out, not a step.** The planner did not just think. It
   spawned two parallel sub-agents ("Explore frontend structure" and "Explore
   frontend components and context"), each running ~6 model calls, then
   synthesized their findings into the plan.
4. **Implementation was bigger but more efficient.** The implement turn cost more
   in absolute terms (66.4 cr) but ran at high cache efficiency across 19 calls —
   its cost was *volume of work*, not exploration. Planning's cost was discovery.

## What Happened

The session had two phases on one model:

**Phase 1 — Plan (40.2 credits).**

1. The main agent (in Plan mode) took the cart request and, instead of answering,
   spawned two sub-agents to explore the codebase:
   - `p1` — "Explore frontend structure" — 11.9 cr, ~6 model calls.
   - `p0` — "Explore frontend components and context" — 16.8 cr, ~6 model calls.
2. Both sub-agents entered ~98% cache-warm by reusing the parent's prefix, so
   they were individually cheap *per call* — but six calls each adds up.
3. The plan turn itself (`p2`) then synthesized their reports into a written plan
   for 11.5 credits of its own.
4. Running total before any code: **40.2 credits, ~38% of the session.**

**Phase 2 — Implement (66.4 credits).**

5. A Plan→Agent mode switch (`p3`) expanded the toolset and forced one cold cache
   re-write, then ran 19 model calls to write the cart context, the cart page,
   and the NavBar icon — finishing with a summary of new files.

Phase cost breakdown:

| Phase | Component | Credits | Share of session |
| --- | --- | --- | --- |
| Plan | plan turn reasoning (`p2`) | 11.5 | 11% |
| Plan | sub-agent: structure (`p1`) | 11.9 | 11% |
| Plan | sub-agent: components (`p0`) | 16.8 | 16% |
| **Plan** | **planning phase total** | **40.2** | **38%** |
| Implement | implementation turn (`p3`) | 66.4 | 62% |
| **Total** | | **106.6** | **100%** |

## Interpretation

The mental model "planning is cheap, implementation is expensive" is half right
and misleading. Implementation *was* the larger line item — but planning was not
a rounding error; it was more than a third of the bill, and almost none of that
was the part you can see.

What you see at the end of planning is a short, tidy plan. What you pay for is the
exploration that produced it: two sub-agents, twelve-ish model calls, reading the
frontend to understand it well enough to plan. The plan *text* is the cheap 11.5
credits. The *understanding* behind it is the 28.7-credit fan-out.

That reframes the lever. If a planning phase feels expensive, the place to look is
not "the agent thought too long" — it's "the agent had to explore a lot to plan."
Which loops straight back to context quality (experiment 01): the more the agent
already knows about the relevant files, the less it has to explore to plan, and
the cheaper planning gets.

## Practical Guidance

- **Don't optimize planning away — budget for it.** The plan made implementation
  orderly and reviewable. The goal is to know it costs real credits (here, ~40),
  not to skip it.
- **Cut exploration, not thinking.** Most of the planning cost was discovery. If
  you already know the relevant files/components, name them up front so the
  planner doesn't dispatch sub-agents to find them.
- **Scope sub-agent exploration.** Two broad "explore the frontend" sub-agents
  cost 28.7 credits. A narrower brief ("look at NavBar and the routing setup")
  would explore less and cost less.
- **Expect planning to be a real fraction of any plan-then-implement run.** A
  third of the bill landing before code is normal here, not a defect — plan
  accordingly rather than being surprised by it.

## Confidence Level

**Medium-Low — single session (N=1).** The credit split is measured directly from
one export (`04-plan-implement-cart.json`) and the math is internally consistent
(40.2 + 66.4 = 106.6). Caveats:

- The 106.6 headline is a **lower bound**: ~1,250 tokens of extended-thinking
  output (~1.9 credits) are under-counted, so the true total is ~108.5. This does
  not change the 38% planning share materially.
- "Planning is 38%" is one run on one task in one codebase. A repo the agent
  already understood, or a task needing less exploration, would shift the split.
  Treat the *direction* (planning is a non-trivial, mostly-invisible share) as the
  finding, not the exact percentage.

## Evidence

- **Primary export:** `04-plan-implement-cart.json` (7.5 MB). Phase costs
  reproduced in the table above.
- Key refs: plan turn `p2` (11.5 cr, spawned 2 sub-agents); sub-agents `p1` (11.9
  cr) and `p0` (16.8 cr); implement turn `p3` (66.4 cr, 19 calls). Session
  rollup: 106.6 credits, 60 tool calls, 94% cache hit, `thinkingUnderCount`
  applies (~1.9 cr).
- Regenerate with
  `node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout`
  and read `prompts[].credits` / `spawnedSubagents` and
  `rollups.cost.thinkingUnderCount`.

## LinkedIn Post

> The agent spent 40 credits before it wrote a single line of code.
>
> I measured a "plan, then implement a shopping cart" session in GitHub Copilot.
> Total: 106.6 credits. Here's where they went:
>
> Planning + exploration: 40.2 credits (38%)
> Implementation: 66.4 credits (62%)
>
> A third of the bill landed before any code existed. But that's not even the
> surprising part.
>
> The planning *reasoning* — the actual written plan — was only 11.5 credits. The
> other 28.7 credits of "planning" were two sub-agents the planner sent off to
> explore the codebase. That's 71% of the planning cost.
>
> "The plan" wasn't a cheap thinking step. It was an expensive fan-out.
>
> This isn't an argument against planning — the plan made the implementation clean
> and reviewable. It's an argument for knowing where planning cost actually lives:
> in the exploration it triggers, not the thinking it prints.
>
> The cheapest way to plan is to already know which files matter, so the agent
> doesn't have to go find them.
>
> (Single session, N=1 — a direction, not a benchmark.)

## Video Outline

60–90 second LinkedIn video:

- Open the cart run in Copilot Ledger; show the total: 106.6 credits.
- Point at the plan turn and its two spawned sub-agents in the timeline.
- Put the phase split on screen: 40.2 planning vs 66.4 implementing.
- Zoom in: plan reasoning 11.5 cr, but the two exploration sub-agents 28.7 cr.
- Say it plainly: 38% of the run was planning, and 71% of *that* was exploration,
  not the plan itself.
- End with: plan on purpose, but feed the agent the files it needs so planning
  doesn't pay to rediscover your codebase.
