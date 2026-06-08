# Model Choice — Pick It, or Let Auto Pick

> **Status: Published — Measured (single-session, N=1 per arm).** The head-to-head
> below is a real Sonnet-vs-Haiku comparison on the same task, digested with our
> own tool. The "every session already runs two models" anchor is measured
> separately (`hi2_18.json`). The Auto-mode billing multiplier is a documented
> mechanical rule, not a captured A/B — labeled as such. See `publishing-plan.md`.

## LinkedIn Hook

> Same task. Half the credits. *More* of it done. I just changed the model.

## Executive Summary

GitHub's top two cost levers are *choose the right model* and *use Auto Mode* —
two answers to the same question: **which model runs your turn?** I ran one real
task — *add JSDoc to every exported symbol in a repository* — twice, changing
nothing but the worker model, and digested both exports with our own tooling:

- **claude-sonnet-4.5** → **20.7 credits**, 9 tool calls, 5,760 output tokens.
- **claude-haiku-4.5** → **10.5 credits**, 16 tool calls, 7,544 output tokens.

Haiku cost **~49% less** (about half the credits) while doing *more* visible work
and, on the prior published quality grade (not a digest field), documenting
**24/24 symbols vs Sonnet's 16/24**. On a mechanical, well-specified task the
lighter model was both cheaper and more complete. That is the model lever in one
measurement. Auto Mode is the same lever delegated to a router — and it carries a
documented **0.9× credit multiplier** (a flat 10% discount) on top of whatever it
picks. (This page does not test Auto's routing quality; only manual Sonnet vs
manual Haiku is measured here.)

## Hypothesis

Two linked assumptions:

1. **Model choice is the biggest single cost lever** — a heavier worker model can
   cost several times more per token than a lighter one for the *same* task, so
   picking the lightest model that can still do the job saves more than most
   prompt-level tricks.
2. **Auto Mode captures most of that saving with no effort** — if the router
   picks a cheaper model when the task is easy and a stronger one when it's hard,
   then Auto should land near the cost of hand-picking, without the developer
   having to judge difficulty up front.

The counter-risk to test: a *too*-light model can be more expensive end-to-end if
it explores more, fails, or needs re-prompting — so "cheapest model" is not the
same as "cheapest outcome." On this task that risk did **not** materialize; the
light model was also the more complete one.

## Why This Matters

Per-token price differences between models are large, and they multiply across
every call in a session (each of which re-bills the whole cached prefix — see
[Cache Behavior](08-cache-behavior.md)). That makes model choice a *structural*
lever, not a per-prompt tweak: it scales the price of everything else you do.
Auto Mode matters because most developers can't reliably predict task difficulty,
a static "always use the strongest model" default overpays on the many easy
turns, and Auto adds its own 10% billing discount. Both are GitHub's headline
recommendations; this page puts measured numbers behind them.

## Session Summary

- **Task (both arms):** *Add JSDoc to every exported symbol in the repository's
  API source* (~24 symbols) — a mechanical, well-specified job with a checkable
  right answer.
- **Only variable changed:** the worker model (same repo, same prompt, with normal
  agent nondeterminism).
- **Sonnet arm** (`t3_a_normalInstructions52_2.json`): `claude-sonnet-4.5`,
  20.7 cr, 9 tool calls, 5,760 output tok, 67% cache hit.
- **Haiku arm** (`t12_b_haiku_2.json`): `claude-haiku-4.5`, 10.5 cr, 16 tool
  calls, 7,544 output tok, 68% cache hit.
- **Routing anchor** (`hi2_18.json`): even a one-word turn already runs two
  models — see Key Finding 1.
- **Key cost driver:** the worker model's per-token price applied to the
  re-billed prefix on every call.

## Key Findings

1. **Every session already runs two models (measured, `hi2_18.json`).** A
   one-word `hi` prompt produced `title` and `promptCategorization` calls on
   `gpt-4o-mini` (254 + 3,169 prompt tokens) plus one `panel/editAgent` answer on
   `claude-sonnet-4.5` (22,244 prompt tokens). The product already offloads cheap
   side-tasks to a cheap model — routing is not hypothetical, it's already
   happening under your chosen worker.
2. **Switching the worker halved the bill (measured).** Same JSDoc task:
   **20.7 cr on Sonnet → 10.5 cr on Haiku, a 49% reduction.** The worker model is
   the dial; nothing else about the task changed.
3. **Cheaper was also more complete here (measured credits; externally graded
   completeness).** Haiku ran *more* tool calls (16 vs 9) and produced more output
   (7,544 vs 5,760 tok), and on the prior published quality review (not a digest
   field) the result documented **24/24 symbols vs Sonnet's 16/24**. The light
   model finished the mechanical job; the heavy one left a third of it undone —
   roughly **~3× the documented-symbols-per-credit** for Haiku.
4. **Auto Mode adds a flat 10% discount on top (documented rule).** Auto bills at
   a **0.9× credit multiplier** regardless of which model it routes to — a
   mechanical saving *before* any routing benefit. This is a billing rule, not a
   captured A/B.

## What Happened

**Sonnet arm — `t3_a_normalInstructions52_2.json`:** the agent read the source,
made 9 tool calls, and emitted 5,760 output tokens for **20.7 credits**. The
graded pass covered 16 of ~24 exported symbols.

**Haiku arm — `t12_b_haiku_2.json`:** the same prompt drove 16 tool calls and
7,544 output tokens for **10.5 credits** — and documented all 24 symbols. More
round trips, more output, *less* money, more complete.

| Arm | Model | Credits | Tool calls | Output tok | Cache hit | Symbols documented* |
|---|---|---|---|---|---|---|
| Heavy | `claude-sonnet-4.5` | 20.7 | 9 | 5,760 | 67% | 16 / 24 |
| Light | `claude-haiku-4.5` | 10.5 | 16 | 7,544 | 68% | 24 / 24 |

\* Credits/tool-calls/output/cache are from our digest; the symbols-documented
grade is from the prior published quality review of these same runs, not the
digest.

**Routing anchor — `hi2_18.json`:** one word in, three model calls out, on two
models — the cheap model did metadata, the worker paid for the full prefix.

| Call | Model | Role | Prompt tok | Completion |
|---|---|---|---|---|
| `p0.l0` | `gpt-4o-mini` | `title` (name the chat) | 254 | 9 |
| `p1.l0` | `gpt-4o-mini` | `promptCategorization` | 3,169 | 66 |
| `p2.l0` | `claude-sonnet-4.5` | `panel/editAgent` (the answer) | 22,244 | 199 |

## Interpretation

On a mechanical, well-specified task the lighter model was the better buy on both
axes — cost *and* completeness — which is exactly the shape GitHub's "right model
for the job" guidance predicts: don't pay top-tier reasoning rates for work that
doesn't need reasoning. The heavy model's per-token price bought no extra coverage
here; it left symbols undone for twice the credits.

This is one task, and it's the kind of task that favors a light model: rote,
local, low-ambiguity. The honest boundary is that a harder, more exploratory task
could invert this — a too-light model that flails would burn its saving in extra
round trips. That's why Auto Mode is the pragmatic default: it routes per turn so
you don't have to pre-judge difficulty, and it bills at 0.9× on top. Model choice
is really a routing decision; the product already makes a version of it for you on
side-tasks, and Auto extends it to the main call.

## Practical Guidance

- **Treat the worker model as a major cost dial.** Here it was a 2× swing on
  identical work — a bigger move than the prompt-compression trick we measured
  separately, which saved under 3% (see [Caveman Prompting](04-caveman-prompting.md)).
- **Right-size, don't max out.** For mechanical, well-specified work a light model
  (Haiku-tier) can be both cheaper *and* more complete. Save the heavy model for
  genuinely hard reasoning.
- **Use Auto Mode when you can't predict difficulty.** Let the router pick per
  turn rather than paying top-tier rates on easy ones — and bank the documented
  10% (0.9×) discount.
- **Watch the outcome, not just the per-token price.** A cheaper model that
  explores more or needs re-prompting can cost more end-to-end — judge by total
  credits *and* whether the job was actually finished. On this task the light
  model won both.

These reinforce GitHub's official guidance to *choose the right model for the job*
and *use Auto Mode where appropriate*.

## Confidence Level

**Medium — single-session per arm (N=1).** Both JSDoc arms are measured with our
own digest on real exports, and the credit/tool/output numbers are exact. The
**symbol-completeness grade (16/24 vs 24/24)** comes from the prior published
quality review of the same runs, not from the digest — treat it as a graded
observation, not a digest field. The result is one task of a type that favors a
light model; it is **not** a universal "Haiku beats Sonnet" benchmark. The Auto
0.9× figure is a documented billing rule. Our digest credits for the Haiku arm
(10.5 cr) differ slightly from the earlier agentviz writeup (8.4 cr) due to
pricing/version differences; we quote our own digest throughout for internal
consistency.

## Evidence

- **Heavy arm:** `t3_a_normalInstructions52_2.json` — `claude-sonnet-4.5`,
  20.7 cr / 9 tool calls / 5,760 output / 67% cache. Regenerate with
  `node .github/skills/copilot-chat-export/scripts/digest.mjs ~/t3_a_normalInstructions52_2.json --stdout`.
  Published as a fixed report at `/reports/model-choice-sonnet`
  (`sessions/model-choice-sonnet-jsdoc.json`, scrubbed).
- **Light arm:** `t12_b_haiku_2.json` — `claude-haiku-4.5`, 10.5 cr / 16 tool
  calls / 7,544 output / 68% cache. Regenerate with
  `node .github/skills/copilot-chat-export/scripts/digest.mjs ~/t12_b_haiku_2.json --stdout`.
  Published as a fixed report at `/reports/model-choice-haiku`
  (`sessions/model-choice-haiku-jsdoc.json`, scrubbed).
- **Routing anchor:** `hi2_18.json` — `p0.l0` / `p1.l0` (`gpt-4o-mini`) and
  `p2.l0` (`claude-sonnet-4.5`).
- **Quality grade source:** prior JSDoc cost-comparison review (24/24 vs 16/24).

## LinkedIn Post

Same task. Half the credits. *More* of it done. I changed one thing: the model.

I gave a Copilot agent one job — add JSDoc to every exported symbol in a repo —
and ran it twice, changing nothing but the worker model. Then I digested both
exports:

- claude-sonnet-4.5 → 20.7 credits, documented 16 of ~24 symbols.
- claude-haiku-4.5 → 10.5 credits, documented all 24.

The lighter model cost ~49% less *and* finished the job. More tool calls, more
output, less money. On a mechanical, well-specified task the heavy model's
per-token premium bought nothing but a bigger bill and a third of the work left
undone.

This is GitHub's #1 cost lever in one measurement: the worker model is the biggest
dial you have, because it multiplies the price of every cached re-read on every
turn — far more than any prompt tweak. "Choose the right model" isn't fussy
advice; here it was a 2× swing on identical work.

The catch: this is the kind of task that favors a light model — rote and
low-ambiguity. A harder, exploratory task could flip it. Which is why Auto Mode is
the easy default: it routes per turn so you don't have to guess, and it bills at
0.9× — a flat 10% off — on top.

Single-session observation, not a universal benchmark. But the direction is hard
to argue with.

Full breakdown: [GitHub Pages link]

## Video Outline

**0–10s** — "Same task. Half the credits. More of it done. I changed one thing —
the model." Show both digests side by side in Copilot Ledger.

**10–40s** — The task: JSDoc every exported symbol. Sonnet → 20.7 cr, 16/24
symbols. Haiku → 10.5 cr, 24/24. Point at the credit totals and the coverage.

**40–75s** — Counter-intuitive bit: the *cheaper* model made more tool calls and
more output. Light model, more work, less money — on this kind of task.

**75–105s** — The routing anchor: even a one-word "hi" already runs two models.
Model choice is routing the product already does; Auto extends it to the main
call — and bills 10% less doing it.

**105–120s** — Takeaway: "The worker model is your biggest cost dial. Right-size
it for the task, or let Auto pick — just don't pay top-tier rates for rote work."
