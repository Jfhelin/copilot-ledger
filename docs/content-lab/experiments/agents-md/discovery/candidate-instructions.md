# Candidate AGENTS.md instructions (from discovery friction)

> Each candidate line is justified **only** by friction actually observed in the 15 BARE
> discovery runs (see `analysis/friction-findings.md` and the `friction_events` /
> `candidate_instructions` tables). Nothing here is invented from general knowledge of the
> repo. Inclusion rule: the friction must be **recurring**, **correctable by one line**, and
> **generalisable** (a repo-level fact, not a task-specific answer).
>
> This is the candidate pool, **not** the frozen file. Phase 3 selects/edits from these and
> freezes `intervention/AGENTS.md` by hash + token count.

## Kept

### C1 — Install before testing; canonical install path

> Install dependencies before running tests or builds. This repo has **no root
> `package.json`**; `cd` into `api/` (Express + TypeScript + vitest + SQLite) or `frontend/`
> (Vite + React) and run `npm install` there first. `npm ci` fails (lockfile out of sync) —
> use `npm install` or `make install`.

- **Justified by:** `missing_deps_run` — **9 / 15 runs**, across **3 task classes**
  (T2-local, T3-debug, T4-multifile).
- **Evidence:** every code-task run ran `npm test` before installing and got
  `sh: vitest: command not found`, then installed and re-tested successfully.
- **Note:** the `npm ci` clause is carried from the Phase 0 environment lock, **not**
  re-observed in this sweep (no discovery run attempted `npm ci`). If we want every clause
  observation-justified, the `npm ci` half should be trimmed at Phase 3 or flagged as
  prior-knowledge.

### C2 — Two-project layout / no root manifest

> Repo root has no `package.json`/`tsconfig`. Two separate npm projects live in `api/` and
> `frontend/` — there is no top-level workspace. `cd` into the relevant one before reading
> config or running scripts.

- **Justified by:** `split_layout_probe` (3 runs) + `phantom_file` (2 runs) — **3 distinct
  T1-nav runs**, 1 task class.
- **Evidence:** nav runs read both sub-project manifests to infer the layout; two also tried
  to open a non-existent root `package.json`.
- **Note:** observed in only one task class (navigation). It is a true structural fact and
  cheap, but its discovery evidence is single-class — keep, but acknowledge the narrow base.

## Dropped

### D1 — Canonical API start command / port

> (e.g. how to start the API server and on what port.)

- **Justified by:** `server_start_probe` — **1 / 15 runs** (T4-multifile only).
- **Why dropped:** single run is below the recurring bar. Revisit only if evaluation
  independently surfaces it.

## Coverage note

T1-nav and T5-review are read-only tasks; T5-review produced **zero** friction events, so it
contributes no candidate. The candidate file is intentionally small — that smallness is the
point: a concise file earns its keep only where repeated friction was actually seen.
