# E4-multifile — Multi-file feature (evaluation)

- **Class:** Multi-file feature, API + frontend
- **Entity focus:** Supplier + Product (disjoint from discovery's Headquarters + Branch)
- **Fixture:** none
- **Timeout:** 18 min

## Prompt
See `prompt.txt`. Add `GET /api/suppliers/:id/product-count` (count of products whose
`supplierId` matches) and surface the count in the frontend through the existing API client.
Structurally parallel to discovery T4 (`headquarters/:id/branch-count`) but on a different
entity pair, so what transfers is general repo knowledge, not the discovered solution.

## What we watch for
- Does it follow the existing route/repository/API-client patterns, or invent new ones?
- Does it install before building/testing? Does it probe many ways to run things?
- Does it hand-edit the generated `api/api-swagger.json`?

## Success gate (binary)
- Endpoint returns the correct count for a known supplier (seed data in
  `api/database/seed/004_products.sql`).
- Frontend builds (`cd frontend && npm install && npm run build`).
- `make test-api` still passes.

## Quality (graded 0–6) — frozen rubric in `rubrics/E4-multifile.md`
+gate · +correct count logic · +followed existing API-client pattern · +wired UI sensibly ·
+no collateral break · +no hand-edited generated files.

## Forbidden files
- `api/api-swagger.json` (generated — regenerate via `make swagger` if needed)
