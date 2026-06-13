# Rubric — E4-multifile (supplier product-count, API + frontend) · FROZEN

Graded **blind to condition**. Binary `success` gate first; then `quality` 0–6.

## Reference facts (repo @ e1516cf)
- `Product` has `supplierId: number` (`api/src/models/product.ts`), so the count is
  "products where `supplierId = :id`".
- Seed data exists: `api/database/seed/001_suppliers.sql` and `004_products.sql` — use a
  supplier id present in seed to assert a known count.
- Patterns to follow: `api/src/routes/supplier.ts` (route), `suppliersRepo.ts` /
  `productsRepo.ts` (repository), and the frontend's existing API client.

## Success gate (binary)
- [ ] `GET /api/suppliers/:id/product-count` returns the correct count for a seeded supplier.
- [ ] Frontend builds: `cd frontend && npm install && npm run build` (exit 0).
- [ ] `cd api && npx vitest run` still green.
- [ ] No hand-edit of `api/api-swagger.json` (regenerate if needed).

## Quality (0–6) — one point each
1. **Gate passed** (endpoint + frontend build + api tests).
2. **Correct count logic** — counts products by `supplierId` (e.g. `SELECT COUNT(*) ...
   WHERE supplier_id = ?`), not a client-side over-fetch hack.
3. **Followed the existing route/repository pattern** — new endpoint registered like its
   siblings; count lives in a repository method, not inline in the route.
4. **Wired the frontend through the existing API client** — did not bypass it with a raw
   `fetch` in a component.
5. **No collateral breakage** — unrelated tests/build still pass; no unrelated file churn.
6. **No hand-edited generated files** — swagger regenerated, not patched by hand.

## Scorer notes
- A correct count for a supplier with zero products is `0`, not 404.
- Frontend placement is judged for being "sensible" (shown on a supplier view), not pixel
  perfection.
