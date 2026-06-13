# Pre-registration manifest — Does a general-purpose AGENTS.md pay for itself?

> **Status:** discovery phase. The evaluation design below is registered *before* any
> evaluation run is executed. The AGENTS.md content is **not** written yet — it will be
> built only from discovery-phase observations (Phase 2–4) and then frozen by hash before
> any evaluation run. Discovery tasks and evaluation tasks are deliberately **disjoint**.

Source of truth for the full design: `article-4-agents-md-experiment-brief.md` (the brief).
This manifest is the short, binding version.

## Research questions

- **Primary.** On tasks the file's author did **not** see, does adding one concise,
  general-purpose `AGENTS.md` to the repo improve task **quality** and/or reduce **cost**
  (exact billed GitHub credits) per *successful* task, versus no instruction file?
- **Secondary.** Does it reduce wasted exploration (model requests, tool calls,
  redundant file reads, failed/abandoned commands) and variance across repeated runs?

## Hypotheses (directional, registered before eval)

- **H1 (cost).** AGENTS lowers mean cost per successful task vs BARE.
- **H2 (quality).** AGENTS quality ≥ BARE quality (non-inferior, ideally higher).
- **H3 (efficiency).** AGENTS lowers mean tool calls and failed-command count vs BARE.
- **Null worth reporting.** If AGENTS does **not** beat BARE on unseen tasks, that is the
  finding — the file did not pay for itself. No outcome is "bad"; we report what we see.

## Conditions

| Condition | Repo state |
|---|---|
| **BARE** | No `AGENTS.md`, no `.github/copilot-instructions.md`, no `CLAUDE.md`, no `.github/instructions/`. |
| **AGENTS** | Identical, plus the single frozen `intervention/AGENTS.md` at the repo root. |

Everything else is held at the Phase 0 lock (`environment.md`): same harness, model
snapshot, repo commit, MCP off, no skills/memory, clean reset per run.

## Tasks

Two disjoint task sets, both on `octodemo/octocat_supply@e1516cf`:

- **Discovery tasks** (`discovery/tasks/`, 5 classes) — used **only** to observe where a
  no-context agent stumbles. Their observations build the AGENTS.md. They are never scored
  as evaluation.
- **Evaluation tasks** (`evaluation/tasks/`, 5 classes, selected in Phase 6) — **unseen**
  by the file author. Different entities / areas of the repo than discovery, so what
  transfers is general repo knowledge, not task-specific memorization. Chosen and frozen
  before any eval run.

Task **classes** (both sets draw one from each): repository navigation/understanding;
small localized change; debug a failing test (planted, deterministic fixture applied in
all conditions); multi-file feature; review/validation.

## Repetitions & schedule

- **Discovery:** 5 tasks × **BARE only** × **3 reps** = **15 runs**.
- **Evaluation:** 5 tasks × **2 conditions** (BARE, AGENTS) × **10 reps** = **100 runs**.
  Run order randomized; seed and full schedule recorded in `evaluation/schedule.json`
  before execution. Conditions interleaved so cache/time-of-day cannot confound condition.

## Metrics (per run — normalized row)

Captured by `runner/extract.mjs` from the digester output, one JSON row per run in
`captures.jsonl`. Fields: `run_id, task, condition, harness, rep, cold_warm,
started_at_ms, exit_code, wall_ms_measured, model, requests, tool_calls, total_tokens,
prompt_tokens, fresh_input_tokens, cached_tokens, cache_creation_tokens,
completion_tokens, cache_hit_rate, cost_token_norm_usd, native_credits, tools_json`.

- **Cost (primary):** `native_credits` = exact billed GitHub AI credits
  (`total_nano_aiu`). `cost_token_norm_usd` kept as a cross-check only.
- **Effort:** `requests` (model turns), `tool_calls`, plus per-tool counts (`tools_json`).
- **Exploration waste (parsed from raw logs in analysis):** unique files read,
  failed/abandoned shell commands, redundant re-reads.
- **Outcome:** task success (objective check per task spec) + quality score (below).
- **Variance:** spread of cost/quality across the 10 reps within each cell.

## Quality scoring

- **T1-nav:** deterministic factual-coverage scorer (`score.mjs`, ground truth verified at
  e1516cf), 0–20.
- **Code tasks (local / debug / multi-file):** objective gates first — does the change
  compile, do the right tests pass, does the feature round-trip — then a blind rubric in
  `evaluation/rubrics/` for partial credit.
- **Review task:** blind rubric against a reviewer checklist fixed before scoring.
- All quality scoring is **blind to condition** (run ids carry condition, so the scorer is
  fed condition-stripped artifacts).

## Success / exclusion / timeout rules

- **Success** is defined per task in its `spec.md` (objective check). Cost-per-successful-
  task is computed over successful runs only; success **rate** is reported separately so a
  cheap-but-failing condition cannot look good.
- **Timeout** per task (in each `spec.md`). A timed-out run is recorded `exit_code != 0`
  and counts as a failure for success rate; it is excluded from cost-per-successful-task.
- **Exclusions** (recorded, not silently dropped): harness crash / digest failure / empty
  process log / fixture failed to apply. Any excluded run is re-run to keep n per cell.
- **Drift:** if the upstream repo or harness changes mid-experiment, stop and re-lock
  (see `environment.md` drift policy); do not mix locks.

## Planned analysis & charts (registered)

- Cost per successful task: BARE vs AGENTS, per task and pooled (mean + bootstrap CI).
- Quality: BARE vs AGENTS, per task and pooled.
- Efficiency: tool calls + failed commands, BARE vs AGENTS.
- Variance: per-cell spread of cost and quality.
- "Pay for itself" verdict: does AGENTS's cost/quality delta exceed its own token
  overhead (the file is re-sent every request — that recurring cost is counted).

## What would change our mind

Pre-committed: AGENTS "pays for itself" only if it shows a **directionally consistent**
improvement (lower cost per successful task **or** higher quality at equal cost) that holds
across a majority of the 5 unseen tasks — not just one. A win on a single task, or a
within-noise difference, is reported as **no clear effect**.
