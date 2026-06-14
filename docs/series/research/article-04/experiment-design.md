# Experiment design — does a general-purpose AGENTS.md pay for itself?

> Supporting research for [`article-04-agents-md.md`](../../article-04-agents-md.md).
> This is a shared human/agent scratchpad, not published copy.

**Pre-registered.** The full design — hypotheses, conditions, tasks classes, scoring scales,
success gates, exclusion rules — was registered *before* any evaluation run, in
`docs/content-lab/experiments/agents-md/manifest.md`. The concise `AGENTS.md` content was
**not** written until after discovery, and was frozen by SHA-256 before evaluation.

All facts below are **direct evidence** (from the manifest, freeze record, and run schedule).
Anything forward-looking is labelled **Inference**.

---

## One-line thesis

The credibility of this article rests entirely on one design rule: **the file's author never
saw the evaluation tasks.** Discovery and evaluation task sets are disjoint, so anything the
file helps with is *general repo knowledge*, not memorized answers.

## The question

On tasks the file's author did **not** see, does adding one concise, general-purpose
`AGENTS.md` to the repo improve task **quality** and/or reduce **cost** (exact billed GitHub
credits) per task, versus no instruction file?

## Hypotheses (directional, registered before eval)

| ID | Claim |
|---|---|
| **H1 — cost** | AGENTS lowers mean cost per successful task vs BARE. |
| **H2 — quality** | AGENTS quality ≥ BARE quality (non-inferior, ideally higher). |
| **H3 — efficiency** | AGENTS lowers mean tool calls and failed-command count vs BARE. |
| **Null worth reporting** | If AGENTS does not beat BARE on unseen tasks, *that is the finding* — the file did not pay for itself. No outcome is "bad". |

## Conditions (3 arms)

| Arm | Repo state | n |
|---|---|---|
| **BARE** | No `AGENTS.md`, no `.github/copilot-instructions.md`, no `CLAUDE.md`, no `.github/instructions/`. | 50 (5×10) |
| **AGENTS** | Identical, plus the single frozen concise `intervention/AGENTS.md` at repo root (~129 tok). | 50 (5×10) |
| **ORIG** *(add-on)* | Identical, plus the repo's **own** original `.github/copilot-instructions.md` (~650 tok) relocated verbatim to the `AGENTS.md` path. | 15 (5×3) |

ORIG isolates **content** (verbose, repo-authored, multi-topic) from **delivery** (identical
mechanism to AGENTS). See [`the-three-files.md`](./the-three-files.md) for the exact bytes.

## The five unseen evaluation tasks (one per class)

Different entities / areas of the repo than the discovery tasks, all on `octocat_supply@e1516cf`.

| Task | Class | `success` gate (binary) | `quality` graded scale |
|---|---|---|---|
| **E1-nav** | repo navigation/understanding | answer produced | **0–27** raw checklist — the *identical* `score.mjs` used in Articles 1–3 (25 facts + entities + port-discrepancy bonus); also emits a normalized 0–20 |
| **E2-local** | small localized change | targeted API tests pass + field round-trips | **0–6**: gate + existing tests still green + used migration system + minimal diff + regenerated swagger + no unrelated files |
| **E3-debug** | debug a failing test (planted, deterministic fixture applied in **all** conditions) | full API suite green, fix in handler not test | **0–5**: gate + minimal/correct location + no collateral edits + didn't touch tests + efficient path |
| **E4-multifile** | multi-file feature | endpoint returns correct count + frontend builds + API tests pass | **0–6**: gate + correct count logic + followed API-client pattern + sensible UI wiring + no collateral break + no hand-edited generated files |
| **E5-review** | review/validation | a review is produced | **net = true positives − false positives** against a defect checklist fixed before scoring |

## Controls held constant (Phase 0 lock, `environment.md`)

harness + version · model + snapshot · repo + commit · prompt · MCP **off** · no other
instruction files · no skills/memory · clean reset per run (`git reset --hard e1516cf &&
git clean -fdx`) · task timeout. Conditions were **interleaved** (randomized schedule in
`evaluation/schedule.json`) so cache state and time-of-day cannot confound the condition.
rep 1 = cold cache, reps 2+ = warm.

## Scoring method (how quality stays honest)

- Quality is **graded, not binary** — two runs that both "succeed" can score differently, so a
  *quality regression* is detectable, not just a success-rate change.
- All quality scoring is **blind to condition**: for the two human-judged tasks (E4, E5)
  artifacts were fed to the scorer with run-ids and `AGENTS.md` presence stripped, behind a
  stable-salt code map the scorer was forbidden to read. E1–E3 use deterministic scorers.
- Each cell compares **distributions** (mean + spread), not single points.

### The "quality must not go down" test (H2, non-inferiority)
Registered before eval: AGENTS passes the quality bar only if, per task, its mean `quality`
is **not meaningfully below** BARE's (bootstrap CI of the difference must not sit clearly
below zero). A cost win that comes with a quality drop is reported as a **regression, not a
win**. Success *rate* is tracked alongside so a cheap-but-failing arm cannot look good.

## What would change our mind (pre-committed)

AGENTS "pays for itself" only with a **directionally consistent** improvement (lower cost per
successful task **or** higher quality at equal cost) that holds across a **majority of the 5
unseen tasks** — not one. A single-task win, or a within-noise difference, is reported as
**no clear effect**.

## Cost & scale of the experiment itself

- 100-run BARE+AGENTS sweep: **6,860.5 cr ≈ $68.60**.
- +15 ORIG add-on runs: **1,236.5 cr ≈ $12.37**.
- **Grand total: ~8,097 cr ≈ $80.97**, 115 runs, all gates green (100/100 + 15/15).
