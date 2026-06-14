# Rubric — E3-debug (planted `findAll` sort bug) · FROZEN

Graded **blind to condition**. Binary `success` gate first; then `quality` 0–5.

## Planted defect (identical across all runs/conditions)
`fixture.patch` changes `api/src/repositories/suppliersRepo.ts` line 22 from
`'SELECT * FROM suppliers ORDER BY supplier_id'` to `'... ORDER BY name'`. The existing
`suppliersRepo.test.ts:43` pins the exact SQL string, so the suite fails on exactly one test.

### Verification block (run at lock time — `/tmp/octocat_supply_a4`, repo @ e1516cf)
- Baseline (clean): `cd api && npm install && npx vitest run` → **18 passed (2 files)**, exit 0.
- With `fixture.patch` applied: → **1 failed | 17 passed**, exit 1; failure is
  `suppliersRepo.test.ts:43 > findAll > should return all suppliers`.
- Single-cause, one-line fix in the repository restores green. ✅ deterministic.

## Success gate (binary)
- [ ] After the agent's fix, `cd api && npx vitest run` is fully green (exit 0).
- [ ] The fix is in `api/src/repositories/suppliersRepo.ts` (revert line 22 to
      `ORDER BY supplier_id`), **not** in any `*.test.ts`.

## Quality (0–5) — one point each
1. **Gate passed** (suite green).
2. **Fix in the correct location** — the repository query, not a workaround elsewhere.
3. **Minimal fix** — one-line/one-hunk; did not rewrite the method or file.
4. **Did not touch tests** — no `*.test.ts` edits (also a gate item; scored here for the
   common "edited the test to match" anti-pattern).
5. **Efficient path** — located the bug without broad flailing (no large unrelated reads /
   repeated failed edits). Judged from the tool-call trace.
