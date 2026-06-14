# Phase 6 — scoring results (H1 cost, H2 quality)

Frozen, blind-scored results for the eval sweep (5 disjoint unseen tasks ×
{BARE, AGENTS} × 10 reps = 100 runs). Cost is read from `captures.jsonl`; quality from the
per-task scorers in this directory. **Success gate: 100/100 base runs pass on both arms.**

Two comparison arms were added afterward (Phase 7 add-ons), both relocated to the *same*
`AGENTS.md` path as the primary intervention so only **content** differs, not delivery:

- **ORIG** — the repo's *own* original `.github/copilot-instructions.md` (2,598 chars ≈
  ~650 tokens, ~5× our AGENTS.md), copied verbatim. **3 reps × 5 tasks = 15 runs** (gate
  15/15). n=3/cell ⇒ ORIG numbers are **directional only**.
- **INIT** — the file Copilot CLI's own `copilot init` auto-generates for this repo
  (~641 tokens, comparable size to ORIG but machine-written and repo-structure-accurate),
  frozen verbatim. **10 reps × 5 tasks = 50 runs.** Full n=10 arm.

So the four arms share an identical mechanism and isolate one variable — *what the
instruction file says*: nothing (BARE) · a concise observation-derived file (AGENTS, ~129
tok) · the repo's verbose hand-written prose (ORIG, ~650 tok) · a machine-generated file
(INIT, ~641 tok).

All numbers here are reproducible:
- `node reconstruct.mjs <task>` → `results/reconstruct/*.json` (mechanical apply + repo gates)
- `node score_e1.mjs` → `results/e1_scores.json` (0–27 nav rubric, verbatim from the frozen `score.mjs`)
- `node score_e2_e3.mjs` → `results/e2_scores.json`, `results/e3_scores.json`
- `node make_packets.mjs <task>` → condition-blind packets; blind judgment → `results/E4-multifile.scores.json`, `results/E5-review.scores.json`
- `node consolidate.mjs` → `results/quality_by_run.json` + the tables below

## H2 — quality. Concise AGENTS ≥ BARE on every task; the two large files do not.

| Task | Scale | BARE | AGENTS | ORIG | INIT | Read |
|---|---|---|---|---|---|---|
| E1-nav | 0–27 | 20.9 | 21.3 | 21.7 | 20.8 | ≈ tie; ORIG nominally highest, INIT nominally lowest |
| E2-local | 0–6 | 5.4 | 6.0 | 6.0 | **4.8** | BARE left scratch files; AGENTS/ORIG clean; **INIT lowest** |
| E3-debug | 0–5 | 5.0 | 5.0 | 5.0 | 4.9 | ≈ tie at ceiling |
| E4-multifile | 0–6 | 5.0 | 5.1 | 5.0 | **4.5** | INIT only **7/10 gate-pass** (diff-apply, FE TS build, api vitest) |
| E5-review | net TP−FP | 4.9 | 5.0 | **3.0** | 4.6 | ORIG **collapses** (3/3 hallucinate SQL injection); INIT recovers to 4.6 |

The concise file holds non-inferiority decisively: a ~129-token, observation-justified
`AGENTS.md` **never lowered quality** on an unseen task and mildly improved two (E1 accuracy,
E2 cleanliness). **Neither large file reproduces that.**

- **ORIG** (verbose human prose) matched on the four build/nav/debug tasks but **lowered
  review quality** (E5 net 5.0 → 3.0): all three runs hallucinated a "SQL injection" in a
  parameterized query — the exact false-positive E5 penalizes.
- **INIT** (auto-generated) is the **only arm that never beats BARE on any task** and
  **regresses on the two code-writing tasks** — E2 (5.4/6.0 → 4.8) and E4 (4.5, with 3/10
  runs failing the mechanical gate). The richer guidance pushed the model toward more
  ambitious implementations that broke diff-apply, the frontend TS build, or the api vitest.
  On E5 it landed at 4.6, **well above ORIG's 3.0**: because the auto-gen file described the
  repo structure *accurately* (no false "monorepo" framing), 7/10 INIT runs correctly placed
  the real injection in `productsRepo` (out of scope) instead of inventing one in the
  reviewed supplier repo; only 3/10 carried the parameterized-query false positive.

## H1 — cost (billed credits), per task. mean | median.

| Task | BARE mean\|med | AGENTS mean\|med | ORIG mean\|med | INIT mean\|med | Direction |
|---|---|---|---|---|---|---|
| E1-nav | 24.6 \| 21.1 | 22.4 \| 19.8 | 35.6 \| 42.4 | 20.6 \| 17.9 | INIT cheapest, ORIG priciest |
| E2-local | 101.1 \| 95.5 | 119.8 \| 115.7 | 133.6 \| 123.6 | 96.9 \| 91.7 | INIT cheapest, ORIG priciest |
| E3-debug | 37.4 \| 34.6 | 29.9 \| 25.4 | 42.1 \| 35.4 | 31.3 \| 25.6 | AGENTS/INIT cheapest |
| E4-multifile | 135.2 \| 129.9 | 166.2 \| 162.7 | 179.5 \| 180.7 | 149.1 \| 151.4 | BARE cheapest, ORIG priciest |
| E5-review | 25.6 \| 23.1 | 23.8 \| 23.3 | 21.3 \| 21.5 | 26.3 \| 23.3 | ≈ tie |
| **Overall** | **64.8 \| 35.0** | **72.4 \| 26.6** | **82.4 \| 44.7** | **64.8 \| 26.3** | INIT/AGENTS cheapest median; ORIG highest both |

Two cost stories sit side by side:

- **The concise `AGENTS.md` makes the *typical* run cheaper but heavier builds pricier.**
  Overall median 35.0 → 26.6 (cheaper on nav, debug, review), yet it raised cost on the two
  code-writing tasks (E2, E4) enough to lift the *mean* even as the median fell. "Does a
  general AGENTS.md pay for itself?" is **task-dependent**.
- **File size alone does not predict cost — content does.** ORIG and INIT are nearly the same
  token size (~650 vs ~641), but ORIG is the **most expensive arm** (mean 82.4, median 44.7)
  while INIT is among the **cheapest** (mean 64.8 = BARE; median 26.3 ≈ AGENTS). ORIG's
  verbose, multi-topic prose inflated every turn; INIT's structured, repo-specific file did
  not. So "more tokens = more cost" is too simple — *prose-y, low-signal* instructions cost,
  well-structured ones largely do not.

**The synthesized lesson across all four arms.** Delivery is identical, so this is a pure
content comparison, and only the **hand-curated concise file improved quality while staying
cheap**. The verbose human file (ORIG) added cost and *hurt* review quality; the
auto-generated file (INIT) stayed cheap but *mildly degraded* code-writing quality and never
helped. "Auto-generate an `AGENTS.md` and forget it" does **not** reproduce the curated
file's benefit — the win came from *what was written* (a few observed, high-signal rules),
not from merely *having* a file.

Grand total: 100-run base sweep **6,860.5 cr ≈ $68.60**; +15 ORIG runs **1,236.5 cr ≈
$12.37**; +50 INIT runs **3,241.4 cr ≈ $32.41**. Experiment total **≈ $113.38**.

## Caveats
- BARE / AGENTS / INIT cells are n=10; **ORIG cells are n=3 ⇒ directional only**. The robust
  claims are (a) concise-AGENTS non-inferiority, (b) the concise cost median↓ / mean↑ split,
  (c) ORIG uniformly priciest with an E5 quality regression, and (d) INIT being cheap yet the
  only arm that never improves on BARE and regresses on the code-writing tasks.
- The E4 "raw fetch instead of API client" weakness is near-uniform across arms — a model
  habit the (frontend-silent) instruction files were not expected to fix. INIT was the lone
  arm that *did* wire the frontend through the API client on one run, but that run's stricter
  typing broke the build (gate fail) — a cautionary, not a win.
- ORIG's E5 regression and INIT's E2/E4 gate failures are the two cleanest "more guidance can
  backfire" signals: verbose prose can induce hallucinated review findings, and a richer
  auto-generated file can induce over-ambitious code that fails mechanical gates.
