# Evaluation phase (Phase 4–5) — pre-registered

Tests the **frozen** `intervention/AGENTS.md` (sha256 `4929e5b3…f933545`, ~129 tok) against a
bare repo on **5 unseen tasks × 2 conditions × 10 reps = 100 runs**. Everything here is fixed
**before** Phase 5 execution. Repo under test: `octodemo/octocat_supply@e1516cf`.

## Disjointness matrix (no memorization leak)

| Eval task | Class | Entity (eval) | Discovery counterpart entity | Disjoint? |
|---|---|---|---|---|
| E1-nav | repo understanding | whole repo | whole repo (T1) | **Reused on purpose** — AGENTS.md has no nav answers; identical `score.mjs` for cross-article continuity |
| E2-local | localized change | **Product** | Branch (T2) | ✅ |
| E3-debug | planted bug | **Supplier repo** | Branch route (T3) | ✅ |
| E4-multifile | API+frontend feature | **Supplier+Product** | Headquarters+Branch (T4) | ✅ |
| E5-review | review (read-only) | **Supplier route+repo** | Branch (T5) | ✅ |

The frozen AGENTS.md states only *general* facts (two-project layout; install-before-test in
each project). It contains **no** task-specific answers for any E-task, so reusing the E1 nav
prompt/scorer does not leak. E2–E5 additionally use entities never touched in discovery.

## Per-task artifacts
- `tasks/E*/prompt.txt` — the verbatim agent prompt.
- `tasks/E*/spec.md` — class, entity, gate, quality scale, forbidden files.
- `tasks/E3-debug/fixture.patch` — planted bug, **empirically verified** (baseline 18/18 green;
  with patch 1 failed/17 passed; one-line repo fix restores green).
- `rubrics/E*.md` — **frozen** scoring rubrics. E5 is a frozen TP/FP defect checklist grounded
  in the actual source. E1 reuses `score.mjs` (0–27).

## Scoring (blind to condition)
Each run yields a binary `success` gate + a graded `quality`:
E1 0–27 · E2 0–6 · E3 0–5 · E4 0–6 · E5 net = TP − FP. Run-ids / AGENTS presence are stripped
before scoring. Hypotheses: **H1** AGENTS lowers cost (billed credits / tool calls) at equal
quality; **H2** non-inferior quality (AGENTS ≥ BARE − margin, bootstrap CI). See
`../manifest.md` (quality scales L83–89, H2 at L96–102).

## Schedule
`schedule.json` — seed `10756132` (mulberry32), Fisher-Yates shuffle with a max-2-in-a-row
condition interleave. 100 runs, all 10 cells balanced (10 each), conditions interleaved so
neither arm clusters in time. **Generated before execution; do not regenerate.**

## Execution (Phase 5 — not yet run)
Harness: `runner/run.sh` with `PHASE=evaluation CONDS="BARE AGENTS" REPS=10`, driven by
`schedule.json` order. Each run: fresh checkout → `git clean -fdx` neutralize → (AGENTS arm
only) drop in frozen `AGENTS.md` → (E3 only) apply `fixture.patch` → run prompt headless →
capture logs + `worktree.diff` + digest (exact billed credits). Captures land outside git at
`~/copilot-ledger-data/captures/agents-md/evaluation/`.
