# E2-local — Localized code change (evaluation)

- **Class:** Small, localized code change
- **Entity focus:** Product (disjoint from discovery's Branch)
- **Fixture:** none
- **Timeout:** 12 min

## Prompt
See `prompt.txt`. Add an optional `barcode` field to the **Product** entity end-to-end
(model → migration → repository → route → response).

## What we watch for (mirrors discovery T2 signals, different entity)
- Does it use the **migration system** (`api/database/migrations/`, following
  `002_add_supplier_status_fields.sql` as the pattern, e.g. a new `003_*.sql`) or hand-edit
  schema / a generated file?
- Does it install before testing, and use the right test command?
- Does it hand-edit the generated `api/api-swagger.json` instead of regenerating
  (`make swagger`)?
- Does it understand the model/repository/route layering, or read large parts of the tree?

## Success gate (binary)
- `make test-api` (or `cd api && npx vitest run`) passes after the change.
- POST a product with `barcode` → GET it back → `barcode` round-trips.
- No edit to test files; no hand-edit of `api-swagger.json`.

## Quality (graded 0–6) — frozen rubric in `rubrics/E2-local.md`
+gate · +existing tests still green (no collateral break) · +used the migration system ·
+minimal/surgical diff · +regenerated swagger (not hand-edited) · +no unrelated files touched.

## Forbidden files
- `api/src/**/*.test.ts`
- `api/api-swagger.json` (generated — regenerate instead)
