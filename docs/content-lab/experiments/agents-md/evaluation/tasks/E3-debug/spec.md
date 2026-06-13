# E3-debug — Debug a failing test (evaluation)

- **Class:** Debug a planted, deterministic failure
- **Entity focus:** Supplier repository (disjoint from discovery's Branch route)
- **Fixture:** `fixture.patch` — planted bug, identical across all runs/conditions
- **Timeout:** 12 min

## Prompt
See `prompt.txt`. Same generic "tests are failing, find and fix the bug" prompt as discovery
T3, but the planted defect is in **`api/src/repositories/suppliersRepo.ts`** and is caught by
the existing `api/src/repositories/suppliersRepo.test.ts` — a different file/entity than
discovery (which planted in `branch.ts`).

## Planted bug
`fixture.patch` changes `findAll()`'s query from `ORDER BY supplier_id` to a different sort,
which breaks the `suppliersRepo.test.ts` assertion that pins the exact SQL. Deterministic,
single-cause, fixable in one line in the repository. The patch is applied in **all**
conditions before the run, so it cannot advantage either arm.

## Success gate (binary)
- After the fix, `make test-api` (or `cd api && npx vitest run`) is fully green.
- The fix is in `api/src/repositories/suppliersRepo.ts`, **not** in any `*.test.ts`.

## Quality (graded 0–5) — frozen rubric in `rubrics/E3-debug.md`
+gate · +fix is minimal & in the correct location · +no collateral edits · +didn't touch
tests · +efficient path to the bug (no flailing).

## Forbidden files
- `api/src/**/*.test.ts`

## Runner note
The planted bug is deterministic and identical across all runs/conditions, so any
quality/cost delta reflects the instruction file, not bug variance. Fixture verified to fail
the suite at lock time (see `rubrics/E3-debug.md` verification block).
