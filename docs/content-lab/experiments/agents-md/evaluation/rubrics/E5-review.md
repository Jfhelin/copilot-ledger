# Rubric — E5-review (Supplier route + repo) · FROZEN DEFECT CHECKLIST

Graded **blind to condition**. Frozen from a manual reading of `api/src/routes/supplier.ts`
and `api/src/repositories/suppliersRepo.ts` at repo `e1516cf` **before** any eval run.

Score = (**+1** per real defect found, matched to the checklist below)
        **−1** per hallucinated defect (a claimed issue not actually present / not a real
        problem). Net score may be floor-capped at 0 for reporting but raw TP and FP are both
        recorded. Matching is by substance, not wording; one finding maps to at most one
        checklist item (no double-counting the same line under two phrasings).

## Real defects (TRUE POSITIVES) — `supplier.ts`
- **D1 — `processSupplierStatus` missing braces / dead code (marquee logic bug).**
  Lines ~221–232: `if (supplier.active)` guards only the `console.log`; the
  `return 'APPROVED';` is **unconditional** (wrong indentation, no block). The function
  therefore always returns `'APPROVED'`, and the `verified`→`'PENDING'` path is dead code.
  This is the central correctness defect.
- **D2 — `parseInt(req.params.id)` without radix and without NaN validation.**
  Lines 160, 176, 191, 206. Missing radix 10; a non-numeric `:id` yields `NaN` passed to the
  repository. No 400 for malformed ids. (Count once even though it recurs 4×; noting the
  recurrence is fine but not extra points.)
- **D3 — Inconsistent error response shape.** Success paths return JSON
  (`res.json(...)`), but not-found paths return **plain text** `res.status(404).send('Supplier
  not found')` (lines 164, 180, 195, 208). Inconsistent content-type / error contract for
  clients; the codebase also has an error-middleware (`next(error)`) + `NotFoundError` it
  bypasses here.
- **D4 — POST/PUT body accepted without validation.** `req.body as Omit<Supplier,
  'supplierId'>` (line 138) and `repo.update(..., req.body)` (line 176) trust client input
  with an unchecked cast — no schema/field validation.

## Real defects (TRUE POSITIVES) — `suppliersRepo.ts`
- **D5 — `findByName` does not normalize booleans.** Line 133 returns
  `mapDatabaseRows<Supplier>(rows)` **without** `.map(this.convertBooleanFields)`, unlike
  `findAll` (line 23). Suppliers fetched by name therefore carry integer `active`/`verified`
  (0/1) instead of booleans — a real inconsistency/bug.

## Acceptable / minor (count as TP if raised reasonably, but not required)
- **D6 — `processSupplierStatus` is defined in the route file** rather than a service/util,
  and uses `console.log` for control-flow-ish side effects. Structure/observability nit.
- **D7 — `findAll`/`findById` rely on `handleDatabaseError` being `never`-typed** to satisfy
  the non-void return in the catch path. Defensible to flag as fragile; defensible to omit.

## Common HALLUCINATIONS (FALSE POSITIVES — subtract a point)
- ✗ "SQL injection in `findByName`/`findAll`" — queries are **parameterized** (`?`
  placeholders); the `LIKE` wraps the bound param. Not a defect.
- ✗ "Missing `await` on repository calls" — all calls are correctly `await`ed.
- ✗ "No error handling" — every handler has try/catch and forwards via `next(error)`.
- ✗ "Singleton `suppliersRepo` is a concurrency bug" — it's a lazy cache; test env bypasses
  it. Not a real defect.
- ✗ "Delete should return the deleted object, not 204" — 204 is conventional; preference,
  not a defect.

## Scorer procedure
1. Strip run-id / condition from the transcript.
2. For each claimed issue, map to D1–D7 (TP) or mark FP. Unmappable-but-true issues that are
   clearly real may be credited as TP at the scorer's discretion **with a written note**
   (checklist is a floor, not a ceiling), but anything matching the hallucination list is FP.
3. Record `tp`, `fp`, `net = tp − fp`. Report per condition after all runs are scored.
