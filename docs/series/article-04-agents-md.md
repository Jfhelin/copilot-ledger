# Article 4 — Can a good AGENTS.md improve quality and reduce cost?

> Working file (shared scratchpad). Collects facts, supporting runs, writing ideas, and
> open data needs. Not the published article.
>
> **📊 Collected data for the writing agent:** [`research/article-04/`](./research/article-04/INDEX.md)
> — pre-registration, the three instruction files, discovery friction, and the full H1 (cost)
> / H2 (quality) findings from the 115-run, 3-arm sweep. Start at `INDEX.md`.

- **Role:** Test one of the most practical levers available to repository owners.
- **Status:** ⚪ Needs a **new pre-registered experiment** (~100 evaluation runs). This is
  the next major new experiment per the plan (Immediate Next Steps, Step 4).
- **Proposed destination:** GitHub Blog for the experiment; possible Microsoft Learn
  follow-up ("How to write effective repository instructions for coding agents").
- **Alt title:** "Does repository guidance pay for itself?"
- **Core message:** A repo instruction file adds fixed context to every run. That cost may
  pay for itself if it reduces unnecessary exploration, wrong commands, failed tests,
  repeated reads, architectural mistakes, and round trips. The experiment decides whether
  the up-front tax is worth it.

## Key research question

Does a concise, general-purpose AGENTS.md improve quality or reduce total work on **unseen**
tasks?

## Critical methodology requirement (do not skip)

**Discovery set and evaluation set must be separate.** Do NOT build the instruction file
from the tasks used to evaluate it. This is the single most important design rule for this
article's credibility.

## Experiment design (pre-register before any results)

- **Phase 1 — Discovery:** 5 representative tasks, 3–5 reps each, no AGENTS.md. Collect what
  the agent lacked, files explored unnecessarily, failed commands, misunderstood
  conventions. Group needs into categories (architecture, canonical commands, testing,
  validation, repo boundaries, naming/coding conventions, generated files, areas to avoid,
  authoritative docs).
- **Phase 2 — Build the file:** one concise AGENTS.md, useful across tasks, NOT tailored to
  eval prompts, no answers to specific tasks, factually verified, committed before eval.
  Record length, token count, sections, source + expected benefit of each instruction.
- **Phase 3 — Evaluation:** 5 NEW tasks × 2 conditions (no file / with file) × 10 reps =
  **100 runs.** Task classes: (1) repo explanation/navigation, (2) localized code change,
  (3) debug a failing test, (4) multi-file implementation, (5) review/validation.

**Controls held constant:** harness + version · model + snapshot · repo + commit · prompt ·
MCP config · other instruction files · skills · cache policy · environment · task timeout.

## Metrics (per run — see shared run schema in the series plan)

completion status · quality score · factual correctness · cost · input/output/cache-read/
cache-creation tokens · model requests · tool calls · files read · unique files read ·
failed commands · failed tests · time-to-first-useful-action · wall-clock · instruction
violations · unnecessary exploration · whether the final answer cites/follows AGENTS.md.

## Quality scoring

Task-specific rubrics · blind the scorer to condition where possible · define success
*before* running.

## Existing data / reuse

- The 40-run grid already includes a **TRIM condition** (one short identical instruction
  file) vs **BARE** — a first, narrow signal on instruction-file effect (but TRIM was a
  minimal file, not a designed AGENTS.md, and on one task). Use as motivation, not as the
  result.
- Related pre-reg already in repo: `docs/content-lab/experiments/01-context-quality.md`
  (and `03-prompt-precision.md`). Check before writing a fresh manifest.

## Discovery-phase results (Phase 2 done — candidate pool, not the frozen file)

15 BARE discovery runs (5 task classes × 3 reps, no instruction file). Friction extracted
from raw logs by `runner/friction.mjs`; full writeup in
`docs/content-lab/experiments/agents-md/discovery/analysis/friction-findings.md`, candidate
lines in `discovery/candidate-instructions.md`. Captures: `~/copilot-ledger-data/captures/agents-md/discovery/`.

Friction observed (runs hit / 15), after excluding TDD red-states and the agent's own
passing curl checks:

| Event | Runs / 15 | Tasks | Result → candidate |
|---|---|---|---|
| `missing_deps_run` | **9** | T2, T3, T4 | `npm test` before install → `vitest: command not found` → **C1 install-before-test** (kept) |
| `split_layout_probe` + `phantom_file` | 3 | T1 | read both sub-manifests / guessed root `package.json` → **C2 two-project layout** (kept) |
| `server_start_probe` | 1 | T4 | 4 ways to start API → **dropped** (1 run, below recurring bar) |

- **Marquee finding:** every code-task run (9/9) tried to test before installing deps. The
  harness `git clean -fdx` wipes `node_modules`, so each run is a genuine clean checkout —
  the exact "first contact" moment AGENTS.md targets. State honestly that the clean-slate
  harness amplifies this.
- **T5-review produced zero friction** → no candidate. The small candidate pool *is* the
  story: a concise file earns its keep only where repeated friction was seen.
- Per-task discovery cost (mean credits): T1 28.4 · T2 58.3 · T3 36.4 · **T4 246.4** · T5 30.8.
  T4-multifile dominates (~6× any other task).
- **Credibility caveat to carry:** the C1 `npm ci` clause was *not* re-observed this sweep
  (carried from Phase 0 lock) — trim or flag at freeze if we want every clause observed.

## Main analysis / visuals

cost-vs-quality scatter · requests/tool-calls with vs without · fixed prefix tax vs
discovery savings · per-task effect chart · highest-value instruction categories.

## Writing ideas / hooks

- Frame as an **investment with a tax**: every run pays the AGENTS.md token tax up front;
  does the saved exploration earn it back? Show the break-even.
- The surprising angle to look for: the file may help some task classes and *hurt* others
  (e.g., adds weight with no benefit on a trivial task) — publish both.

## Limitations (must state)

one repository · one harness unless expanded · results depend on instruction quality · a
stale or overly long file may perform worse · improvements may not generalize.

## Open items / TODO

- [ ] Choose discovery tasks (5) and **hold back** evaluation tasks (5).
- [ ] Write rubrics; define success criteria before running.
- [ ] Define baseline/freshness rules.
- [ ] Commit the pre-registration manifest BEFORE evaluation.
- [ ] Build runner + normalized-record output (shared run schema).
