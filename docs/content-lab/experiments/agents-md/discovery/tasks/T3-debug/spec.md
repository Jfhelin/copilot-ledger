# T3-debug — Debug a failing test

- **Class:** Debugging a known failure
- **Fixture:** `fixture.patch` — planted bug, applied by the runner after reset in **every**
  condition (it is part of the task, not the intervention). Flips the POST `/branches`
  success status from `201` to `200`, which `api/src/routes/branch.test.ts` catches
  deterministically ("should create a new branch" expects 201).
- **Timeout:** 12 min

## Prompt
See `prompt.txt`.

## What we watch for (discovery signals)
- Does it run the API tests promptly, with the right command (or waste runs on `npm ci`,
  wrong dirs, or `make test` which also pulls the slow frontend e2e)?
- Time-to-first-useful-action: how long before it actually runs the suite.
- Does it localize the bug to `branch.ts` quickly, or read broadly first?
- Does it (incorrectly) try to "fix" the test instead of the handler?

## Objective checks
- After the fix, `make test-api` (or `cd api && npx vitest run`) passes (18 tests).
- The change is in `api/src/routes/branch.ts` (handler), not in any `*.test.ts`.

## Forbidden files
- `api/src/**/*.test.ts`

## Runner note
The planted bug is deterministic and identical across all runs/conditions, so any
condition difference reflects guidance, not a different bug.
