# Article 5 — When is a more expensive model worth it?

> Working file (shared scratchpad). Collects facts, supporting runs, writing ideas, and
> open data needs. Not the published article.

- **Role:** Replace vague "best model" claims with evidence about task fit, quality, and cost.
- **Status:** ⚪ Needs a new experiment (~250 runs); some `e3-model-comparison` data already
  exists. Run *after* the AGENTS.md methodology is proven (plan Step 5).
- **Proposed destination:** Personal blog first; GitHub Blog candidate if methodology +
  positioning approved. **Alt title:** "Finding the coding-agent cost-quality frontier."
- **Core message:** The most expensive model is not automatically the best economic choice.
  A cheaper model may match quality on simple tasks and cost less; a stronger model may be
  cheaper overall if it avoids retries, wrong edits, and human correction. Map task type →
  whether paying up buys a meaningful improvement.

## Key research question

For which task types does paying for a more expensive model produce a meaningful improvement?

## Experiment design (pre-register)

- One **locked harness** (preferably Copilot CLI).
- 5 models (including **Auto** where available) × 5 task types × 10 reps = **250 runs.**
- Task classes: (1) repo explanation, (2) small localized change, (3) debug a known failing
  test, (4) multi-file implementation, (5) code review / defect or security ID. Vary
  difficulty — at least one easy (cheap model expected to do well), one deep multi-step.
- **Auto = a routing strategy, not one model.** Capture selected model, model changes across
  identical runs, whether routing was stable, and the billing multiplier.

**Controls:** harness + version · repo + commit · prompt · MCP config · instructions ·
memory · tools · timeout · scoring rubric · environment.

## Metrics

completion status · quality · task-specific correctness · tests passed · retries · requests
· tool calls · wall-clock · cost · input/output/cache tokens · first-pass success · human
correction required · model selected by Auto.

## Primary analyses

- **Quality vs cost** scatter (one point per model/task; X = mean cost, Y = mean quality).
- **Pareto frontier** — flag any model another option dominates (cheaper AND ≥ quality).
- **Task-specific** results — show the best model per task class, not just one overall average.
- **Cost per successful task** = total cost of all attempts / successful completions (a cheap
  failed run is not efficient).
- **Quality per dollar** as a *supporting* metric only.

## Existing data / reuse

- **`e3-model-comparison/`** — Sonnet 4.5 vs 4.6, task T1, MCP off, Claude CLI headless, 6
  runs (`e3-T1-{45,46}-off-{1,2,3}`). Prefix ~26.7k, 26 tools. Headline: wide within-model
  cost spread (4.5: $0.19–$0.84; 4.6: $0.05–$0.42). Doubles as repeatability evidence across
  a model bump — useful as a teaser, not the full frontier.
- Related pre-reg: `docs/content-lab/experiments/02-model-selection.md` — review before
  writing a fresh manifest.

## Visuals

cost-quality scatter · Pareto frontier · completion rate by model+task · cost per successful
task · Auto routing distribution · task-by-model heatmap.

## Writing ideas / hooks

- Lead on the counterintuitive: the cheap model that *ties* on an easy task, or the
  expensive model that's *cheaper overall* because it avoids retries — concrete cases beat
  the abstract frontier.
- Reinforce official guidance: choose the right model for the job; use Auto where appropriate.
- Treat Auto carefully — it can change over time, so any routing finding is time-stamped.

## Limitations (must state)

one harness · selected task set · model versions change · Auto routing may drift · quality
rubrics can favor some task types.

## Open items / TODO

- [ ] Confirm the 5 models (incl. Auto) and that the harness exposes them.
- [ ] Lock task set + rubrics; define success before running.
- [ ] Decide cost label per model (Copilot CLI = exact billed; others = estimate/list-price).
- [ ] Pre-register manifest; build runner + normalized records.
