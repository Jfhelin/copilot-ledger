# AGENTS.md

This repository is two independent npm projects. There is **no** root `package.json`,
`tsconfig`, or workspace — do not look for one. Work inside the project you need:

- `api/` — Express + TypeScript REST API (vitest, SQLite).
- `frontend/` — Vite + React app.

Before running tests or builds, install dependencies in that project first
(`cd api && npm install`, or `cd frontend && npm install`). A freshly checked-out
tree has no `node_modules`, so `npm test`/`npm run build` will fail until you do.
