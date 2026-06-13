# Rubric — E2-local (Product `barcode` field) · FROZEN

Graded **blind to condition** (run-ids / AGENTS presence stripped before scoring).
Binary `success` gate first; then `quality` 0–6. A run that fails the gate still gets its
quality components scored where observable (gate failure does not zero the other points), but
`success=false` is recorded.

## Success gate (binary)
- [ ] API test suite passes after the change (`cd api && npx vitest run`, exit 0).
- [ ] A product created with a `barcode` returns that `barcode` on fetch (round-trip).
- [ ] No edit to any `api/src/**/*.test.ts`.
- [ ] No hand-edit of `api/api-swagger.json`.

## Quality (0–6) — one point each
1. **Gate passed** (tests green + round-trip works).
2. **Existing tests still green** — no collateral breakage in unrelated suites.
3. **Used the migration system** — added `api/database/migrations/003_*.sql` (or next index)
   following the `002_add_supplier_status_fields.sql` pattern, rather than editing schema
   inline or only mutating the seed.
4. **Surgical diff** — touched only the model, migration, repo, route, and (regenerated)
   swagger; no scattershot edits.
5. **Swagger regenerated, not hand-edited** — `api/api-swagger.json` change (if any) is
   consistent with `make swagger` output, not a manual patch.
6. **No unrelated files touched** — no drive-by reformatting, no frontend churn, no config.

## Scorer notes
- `barcode` should be **optional** (nullable column / `barcode?: string` in the model).
- Snake_case in DB (`barcode`), camelCase in TS — the repo maps via `objectToCamelCase` /
  `mapDatabaseRows`; a correct solution does not need a manual map entry.
