# Phase 6 — scoring results (H1 cost, H2 quality)

Frozen, blind-scored results for the 100-run eval sweep (5 disjoint unseen tasks ×
{BARE, AGENTS} × 10 reps). Cost is read from `captures.jsonl`; quality from the per-task
scorers in this directory. **Success gate: 100/100 runs pass on both arms.**

A third comparison arm, **ORIG**, was added afterward (Phase 7 add-on): the repo's *own*
original `.github/copilot-instructions.md` (2,598 chars ≈ ~650 tokens — ~5× our AGENTS.md)
relocated verbatim to the `AGENTS.md` path, **3 reps × 5 tasks = 15 runs** (gate 15/15).
ORIG isolates *content* (verbose, repo-authored, multi-topic) from *delivery* (identical
mechanism to AGENTS). n=3/cell ⇒ ORIG numbers are **directional only**.

All numbers here are reproducible:
- `node reconstruct.mjs <task>` → `results/reconstruct/*.json` (mechanical apply + repo gates)
- `node score_e1.mjs` → `results/e1_scores.json` (0–27 nav rubric, verbatim from the frozen `score.mjs`)
- `node score_e2_e3.mjs` → `results/e2_scores.json`, `results/e3_scores.json`
- `node make_packets.mjs <task>` → condition-blind packets; blind judgment → `results/E4-multifile.scores.json`, `results/E5-review.scores.json`
- `node consolidate.mjs` → `results/quality_by_run.json` + the tables below

## H2 — quality (non-inferiority). AGENTS ≥ BARE on every task.

| Task | Scale | BARE | AGENTS | ORIG | Read |
|---|---|---|---|---|---|
| E1-nav | 0–27 | 20.9 | 21.3 | 21.7 | all three ≈ tie; ORIG nominally highest |
| E2-local | 0–6 | 5.4 | 6.0 | 6.0 | BARE left scratch files (`test_barcode*.js`); AGENTS & ORIG clean |
| E3-debug | 0–5 | 5.0 | 5.0 | 5.0 | tie at ceiling |
| E4-multifile | 0–6 | 5.0 | 5.1 | 5.0 | tie; only 1/23 wired FE via the API client (uniform across arms) |
| E5-review | net TP−FP | 4.9 | 5.0 | **3.0** | ORIG **worse**: all 3 ORIG runs hallucinated a "SQL injection" (−1 FP); D1 still caught 15/15 |

H2 holds decisively for the concise file: a ~129-token, observation-justified `AGENTS.md`
**never lowered quality** on an unseen task, and mildly improved it on two (E1 accuracy,
E2 cleanliness). The verbose **ORIG** file matched on the four build/nav/debug tasks but
**lowered review quality** (E5 net 5.0 → 3.0) — its broader, security-flavored guidance
correlated with more *false-positive* defect claims, the exact failure mode E5 penalizes.

## H1 — cost (billed credits), per task. mean | median.

| Task | BARE mean\|med | AGENTS mean\|med | ORIG mean\|med | Direction |
|---|---|---|---|---|---|
| E1-nav | 24.6 \| 21.1 | 22.4 \| 19.8 | 35.6 \| 42.4 | ORIG **priciest** |
| E2-local | 101.1 \| 95.5 | 119.8 \| 115.7 | 133.6 \| 123.6 | ORIG **priciest** |
| E3-debug | 37.4 \| 34.6 | 29.9 \| 25.4 | 42.1 \| 35.4 | ORIG **priciest** |
| E4-multifile | 135.2 \| 129.9 | 166.2 \| 162.7 | 179.5 \| 180.7 | ORIG **priciest** |
| E5-review | 25.6 \| 23.1 | 23.8 \| 23.3 | 21.3 \| 21.5 | ORIG cheapest here |
| **Overall** | **64.8 \| 35.0** | **72.4 \| 26.6** | **82.4 \| 44.7** | ORIG highest mean **and** median |

**The headline is the mean/median divergence for the concise file.** `AGENTS.md` made the
*typical* run cheaper (overall median 35.0 → 26.6, and cheaper on 3 of 5 tasks — navigation,
debugging, review), but it raised cost on the two code-writing tasks (E2, E4), enough to lift
the overall *mean* even as the median fell. So "does a general AGENTS.md pay for itself?" is
**task-dependent**: yes on navigation / debugging / review; no on the heavier build tasks,
where it correlated with more tool calls and longer runs at no quality gain.

**The ORIG arm sharpens the lesson: more instructions are not free.** Relocating the repo's
own ~650-token instructions to `AGENTS.md` made it the **most expensive arm on both mean
(82.4) and median (44.7)** — pricier than *both* BARE and the concise AGENTS.md on 4 of 5
tasks — while buying no quality over the concise file and actively *hurting* the review task.
Every prompt pays for those extra input tokens on every turn; the concise, observation-only
file captured the useful signal at ~1/5 the token cost.

Grand total: 100-run sweep **6,860.5 cr ≈ $68.60**; +15 ORIG runs **1,236.5 cr ≈ $12.37**.

## Caveats
- BARE/AGENTS cells are n=10; **ORIG cells are n=3 ⇒ directional only**. Treat per-task Δ as
  directional, not significant, without the bootstrap CIs (per manifest H2). The robust claims
  are (a) concise-AGENTS non-inferiority, (b) the concise cost median↓ / mean↑ split, and
  (c) ORIG being uniformly the priciest arm with an E5 quality regression.
- The E4 "raw fetch instead of API client" weakness is uniform across all three arms — a model
  habit the (frontend-silent) instruction files were never expected to fix; not evidence about
  any file.
- ORIG's E5 regression is the cleanest quality signal from the add-on: verbose, multi-topic
  guidance can *induce* hallucinated findings on a review task, not just cost more.
