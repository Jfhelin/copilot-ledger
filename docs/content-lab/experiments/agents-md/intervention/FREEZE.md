# AGENTS.md freeze record (Phase 3)

The evaluation condition **AGENTS** adds exactly the file below to the repo root and nothing
else. It is frozen here before any evaluation run, per the pre-registration manifest. Any
change after this point invalidates the freeze and must be re-recorded.

| Field | Value |
|---|---|
| Path (in repo under test) | `AGENTS.md` (repo root of `octocat_supply@e1516cf`) |
| Source of truth | `intervention/AGENTS.md` |
| Frozen at | 2026-06-13 |
| SHA-256 | `4929e5b35121a317d246a8b9256fc57d051fcc190636a84a42e656072f933545` |
| Size | 521 bytes · 515 chars · 85 words |
| Approx. tokens (per-request tax) | ~129 (chars/4 estimate; exact billed effect measured at eval) |

## Provenance — every line traces to observed discovery friction

Built **only** from the 15 BARE discovery runs (see `discovery/analysis/friction-findings.md`
and `discovery/candidate-instructions.md`). No invented lines.

| File line | Candidate | Justifying friction | Runs / 15 |
|---|---|---|---|
| "two independent npm projects … no root package.json/tsconfig/workspace" | C2 | `split_layout_probe` + `phantom_file` | 3 (T1-nav) |
| "install dependencies … before tests/builds; fresh tree has no node_modules" | C1 | `missing_deps_run` (`vitest: command not found`) | 9 (T2,T3,T4) |

## Deliberately excluded (kept observation-pure)

- **`npm ci` fails / `make install` canonical clause** — *not* observed in this sweep
  (no discovery run attempted `npm ci`); it is Phase 0 prior knowledge. Excluded to keep
  every frozen line traceable to observed friction. Decision confirmed 2026-06-13.
- **API start command / port** — `server_start_probe` hit only 1 run; below the recurring
  bar. Dropped.

## Expected direct effect (from discovery logs — not a prediction of the eval result)

Directly removable tool calls if the agent had this file: **~11–14 of 436** total discovery
tool calls (≈3%) — 9 premature `npm test` failures + 2 phantom root reads + ~3 redundant
sub-manifest reads. The file's larger hoped-for effect (reduced downstream thrash/variance
on expensive multi-file tasks) is **unproven** and is what the 100-run evaluation tests.
The ~129-token per-request tax is counted against any savings in the "pay for itself" verdict.

---

## Frozen file contents (for reference — authoritative copy is `intervention/AGENTS.md`)

```markdown
# AGENTS.md

This repository is two independent npm projects. There is **no** root `package.json`,
`tsconfig`, or workspace — do not look for one. Work inside the project you need:

- `api/` — Express + TypeScript REST API (vitest, SQLite).
- `frontend/` — Vite + React app.

Before running tests or builds, install dependencies in that project first
(`cd api && npm install`, or `cd frontend && npm install`). A freshly checked-out
tree has no `node_modules`, so `npm test`/`npm run build` will fail until you do.
```
