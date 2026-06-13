# T1-nav — Repository explanation / navigation

- **Class:** Repository understanding / navigation
- **Fixture:** none (read-only explanation task)
- **Timeout:** 8 min

## Prompt
See `prompt.txt` (the canonical series "explain this repository" prompt).

## What we watch for (discovery signals)
- Which files/dirs it reads to orient, and how many.
- Whether it discovers the `Makefile` as the canonical entry point or guesses raw npm.
- Whether it gets install/run/test commands right (note: `npm ci` fails here — does it hit that?).
- Stack facts: Express + TS API, React/Vite/Tailwind frontend, SQLite/better-sqlite3,
  the migration system, ports, no root `package.json`.
- Any hallucinated stack (Mongo/Postgres, npm workspaces, Next.js, Azure infra).

## Objective check
Factual-coverage scorer exists for this exact task (40-run grid `score.mjs`, ground truth
verified at e1516cf). Reused as the quality signal.

## Notes
This task is read-only — no code edits expected. If the agent edits files, record it as an
unnecessary-action signal.
