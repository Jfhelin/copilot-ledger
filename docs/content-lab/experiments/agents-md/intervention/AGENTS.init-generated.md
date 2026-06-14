# Copilot Instructions

## Architecture

Full-stack TypeScript ecommerce app (OctoCAT Supply) with two independent packages:

- **`api/`** — Express.js REST API with SQLite (better-sqlite3), Swagger/OpenAPI docs
- **`frontend/`** — React 18 SPA with Vite, Tailwind CSS, React Router, React Query

The API follows a layered pattern: **routes → repositories → SQLite database**. Each entity (Branch, Order, Product, Supplier, etc.) has a model, repository, and route file. Routes include Swagger JSDoc annotations for OpenAPI spec generation.

The frontend uses Axios for API calls (configured in `frontend/src/api/config.ts`) and connects to the API at `http://localhost:3000`.

Database: SQLite file at `api/data/app.db` (override with `DB_FILE` env var). Tests use an in-memory database.

## Build & Run

```bash
make install        # Install all dependencies
make dev            # Start API (port 3000) + frontend (port 5137)
make build          # Build both for production
```

## Testing

```bash
# API tests (vitest + supertest, in-memory SQLite)
cd api && npx vitest                      # Watch mode
cd api && npx vitest run                  # Single run
cd api && npx vitest run src/routes/branch.test.ts  # Single file

# E2E tests (Playwright, Chromium + Edge)
cd frontend && npx playwright test        # Run all e2e
cd frontend && npx playwright test tests/e2e/someFile.spec.ts  # Single file
```

## Linting

```bash
make lint           # Lint both packages
make lint-fix       # Auto-fix
cd api && npx eslint .
cd frontend && npx eslint .
```

## Key Conventions

- **API route files** include Swagger JSDoc comments (`@swagger`) — keep these in sync when modifying endpoints.
- **Repository pattern**: All database access goes through repository classes in `api/src/repositories/`. Repositories accept a `DatabaseConnection` via constructor injection.
- **SQL utilities**: Use `buildInsertSQL`, `buildUpdateSQL`, `objectToCamelCase`, `mapDatabaseRows` from `api/src/utils/sql.ts` for consistent DB operations.
- **Error handling**: Use `handleDatabaseError` and `NotFoundError` from `api/src/utils/errors.ts`. The global `errorHandler` middleware translates these to HTTP responses.
- **Database migrations** live in `api/database/migrations/`; seed data in `api/database/seed/`.
- **Test setup**: API tests use `beforeEach` to create a fresh in-memory DB via `getDatabase(true)` + `runMigrations(true)`, and `afterEach` to close it.
- **Swagger regeneration**: After changing route annotations, run `make swagger` to update `api/api-swagger.json`.
