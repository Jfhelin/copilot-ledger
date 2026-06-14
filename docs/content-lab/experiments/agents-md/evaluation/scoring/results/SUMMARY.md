# Phase 6 — scoring results (H1 cost, H2 quality)

Frozen, blind-scored results for the 100-run eval sweep (5 disjoint unseen tasks ×
{BARE, AGENTS} × 10 reps). Cost is read from `captures.jsonl`; quality from the per-task
scorers in this directory. **Success gate: 100/100 runs pass on both arms.**

All numbers here are reproducible:
- `node reconstruct.mjs <task>` → `results/reconstruct/*.json` (mechanical apply + repo gates)
- `node score_e1.mjs` → `results/e1_scores.json` (0–27 nav rubric, verbatim from the frozen `score.mjs`)
- `node score_e2_e3.mjs` → `results/e2_scores.json`, `results/e3_scores.json`
- `node make_packets.mjs <task>` → condition-blind packets; blind judgment → `results/E4-multifile.scores.json`, `results/E5-review.scores.json`
- `node consolidate.mjs` → `results/quality_by_run.json` + the tables below

## H2 — quality (non-inferiority). AGENTS ≥ BARE on every task.

| Task | Scale | BARE | AGENTS | Δ (A−B) | Read |
|---|---|---|---|---|---|
| E1-nav | 0–27 | 20.9 | 21.3 | **+0.4** | AGENTS slightly more accurate |
| E2-local | 0–6 | 5.4 | 6.0 | **+0.6** | BARE left scratch files (`test_barcode*.js`); all AGENTS clean |
| E3-debug | 0–5 | 5.0 | 5.0 | 0 | tie at ceiling |
| E4-multifile | 0–6 | 5.0 | 5.1 | +0.1 | tie; only 1/20 wired FE via the API client (uniform, both arms) |
| E5-review | net TP−FP | 4.9 | 5.0 | +0.1 | tie; D1 (marquee bug) caught 20/20 |

H2 holds decisively: a ~129-token, observation-justified `AGENTS.md` **never lowered
quality** on an unseen task, and mildly improved it on two (E1 accuracy, E2 cleanliness).

## H1 — cost (billed credits), per task. mean | median.

| Task | BARE mean\|med | AGENTS mean\|med | Direction |
|---|---|---|---|
| E1-nav | 24.6 \| 21.1 | 22.4 \| 19.8 | AGENTS cheaper |
| E2-local | 101.1 \| 95.5 | 119.8 \| 115.7 | AGENTS **pricier** |
| E3-debug | 37.4 \| 34.6 | 29.9 \| 25.4 | AGENTS cheaper (tool calls 14.9→8.5) |
| E4-multifile | 135.2 \| 129.9 | 166.2 \| 162.7 | AGENTS **pricier** |
| E5-review | 25.6 \| 23.1 | 23.8 \| 23.3 | AGENTS ~flat/cheaper |
| **Overall** | **64.8 \| 35.0** | **72.4 \| 26.6** | mean↑, **median↓** |

**The headline is the mean/median divergence.** `AGENTS.md` made the *typical* run cheaper
(overall median 35.0 → 26.6, and cheaper on 3 of 5 tasks — navigation, debugging, review),
but it raised cost on the two code-writing tasks (E2, E4), enough to lift the overall *mean*
even as the median fell. So "does a general AGENTS.md pay for itself?" is **task-dependent**:
yes on navigation / debugging / review; no on the heavier build tasks, where it correlated
with more tool calls and longer runs at no quality gain.

Grand total for the sweep: **6,860.5 credits ≈ $68.60** over 100 runs.

## Caveats
- Differences are small and n=10 per cell; treat per-task Δ as directional, not significant
  without the bootstrap CIs (per manifest H2). The robust claims are (a) non-inferiority and
  (b) the cost median↓ / mean↑ split.
- The E4 "raw fetch instead of API client" weakness is uniform across arms — a model habit
  the (frontend-silent) `AGENTS.md` was never expected to fix; not evidence about the file.
