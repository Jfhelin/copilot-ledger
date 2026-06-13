# T4-multifile — Multi-file feature / refactor

- **Class:** Multi-file implementation (API + frontend)
- **Fixture:** none
- **Timeout:** 20 min

## Prompt
See `prompt.txt`. New endpoint `GET /api/headquarters/:id/branch-count` + frontend display,
wired through the existing API client.

## What we watch for (discovery signals)
- Does it correctly cross the API↔frontend boundary, or get lost (no root `package.json`,
  two independent npm projects)?
- Does it find the existing frontend API-client pattern and follow it, or invent a new one?
- Does it run both API tests and a frontend build, and with the right commands?
- How much of the tree does it read to find the right integration points?

## Objective checks
- Endpoint returns the correct count for a known headquarters.
- Frontend builds (`cd frontend && npm install && npm run build`).
- `make test-api` still passes.

## Forbidden files
- `api/api-swagger.json` (generated — regenerate via `make swagger` if needed)
