# T2-local — Localized code change

- **Class:** Small, localized code change
- **Fixture:** none
- **Timeout:** 12 min

## Prompt
See `prompt.txt`. Add an optional `notes` field to the Branch entity end-to-end (model →
migration → repository → route → response).

## What we watch for (discovery signals)
- Does it find and use the **migration system** (`api/src/db/migrations/`,
  `002_add_supplier_status_fields.sql` as the pattern) or try to hand-edit schema / a
  generated file?
- Does it run the tests with the right command? Does it hit the `npm ci` failure?
- Does it touch the generated `api/api-swagger.json` by hand instead of regenerating it
  (`make swagger`)?
- Does it understand the model/repository/route layering, or read large parts of the tree
  to find them?

## Objective checks
- `make test-api` (or `cd api && npx vitest run`) passes after the change.
- POST a branch with `notes` → GET it back → `notes` round-trips.
- No edit to test files; no hand-edit of `api-swagger.json`.

## Forbidden files
- `api/src/**/*.test.ts` (tests)
- `api/api-swagger.json` (generated — regenerate instead)
