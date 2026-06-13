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

Quality is **not** binary. Every task yields a graded score on a fixed ordinal scale, so
two runs that both "succeed" can still score differently — that is what lets us detect a
quality regression rather than only a success-rate change. Each run produces **two numbers**:
a binary `success` (objective gate) and a graded `quality` (0–N).

| Task | `success` gate (binary) | `quality` graded scale |
|---|---|---|
| **T1-nav** | answer produced | **identical `score.mjs`** (unchanged from Articles 1–3, ground truth verified at e1516cf): raw checklist **0–27** (25 facts + entities + port-discrepancy bonus). Headlined as raw 0–27 for continuity; the scorer also emits a normalized 0–20 (`raw/27×20`, with −2 / cap-16 penalties) as a secondary view. |
| **T2-local** | targeted API tests pass + field round-trips | **0–6**: +gate, +existing tests still green (no collateral break), +used the migration system, +minimal/surgical diff, +regenerated swagger (not hand-edited), +no unrelated files touched |
| **T3-debug** | full API suite green, fix in handler not test | **0–5**: +gate, +fix is minimal & correct location, +no collateral edits, +didn't touch tests, +efficient path to the bug (no flailing) |
| **T4-multifile** | endpoint returns correct count + frontend builds + API tests pass | **0–6**: +gate, +correct count logic, +followed existing API-client pattern, +wired UI sensibly, +no collateral break, +no hand-edited generated files |
| **T5-review** | a review is produced | **0–N**: + each real defect found (true positives, against a checklist fixed before scoring) − hallucinated defects (false positives) |

- Scales and rubrics are written into `evaluation/rubrics/` and **frozen before any eval run**.
- All quality scoring is **blind to condition**: artifacts are fed to the scorer with run
  ids / `AGENTS.md` presence stripped, so the scorer cannot tell BARE from AGENTS.
- Each cell has 10 reps → we compare **distributions** (mean + spread), not single points.

### The "quality must not go down" test (H2, non-inferiority)
Registered before eval: AGENTS passes the quality bar only if, per task, its mean `quality`
is **not meaningfully below** BARE's — concretely, AGENTS mean ≥ BARE mean − a pre-set
margin (the bootstrap CI of the difference must not sit clearly below zero). A cost win that
comes with a quality drop beyond that margin is reported as a **regression, not a win**.
Success **rate** is tracked alongside quality so a condition cannot look good by being
cheap-but-failing.

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
