# Discovery-phase friction findings (Phase 2)

> **Scope.** This analyses the 15 BARE discovery runs (5 task classes × 3 reps, no
> instruction file) to find where a no-context agent stumbled. These observations — and
> *only* these observations — are what later justify each `AGENTS.md` line. Discovery tasks
> are disjoint from the (unseen) evaluation tasks, so nothing here memorises an eval answer.
>
> Source data: `~/copilot-ledger-data/captures/agents-md/discovery/` (15 rows in
> `captures.jsonl`; per-run raw logs under `runs/<run_id>/logs/process-*.log`). Friction
> events extracted by `runner/friction.mjs` and loaded into the `friction_events` table.

## How friction was extracted

Each run's raw Copilot CLI log records every LLM turn as a request snapshot. We parsed the
Anthropic-shape message blocks to recover every tool call (`tool_use`: name + arguments +
id) paired with its result (`tool_result` by `tool_use_id`), then classified an event as
friction only when the **tool result itself** showed a correctable, generalisable stumble
(e.g. a real "path does not exist", a `command not found`). We deliberately **excluded**:

- `npm test` assertion failures — those are legitimate TDD red-states (the agent seeing the
  planted bug before fixing it), not friction.
- The agent's own passing `curl`/health checks that happen to print `Not found`/`404`.
- `NotFound`/`error:` substrings inside healthy numbered source lines.

This keeps the candidate list honest: every retained event is a thing the agent did that a
one-line repo fact would have prevented.

## What we observed (by class)

| Event class | Runs hit / 15 | Task classes | What happened |
|---|---|---|---|
| `missing_deps_run` | **9** | T2-local, T3-debug, T4-multifile | Ran `npm test` **before** installing deps → `sh: vitest: command not found`, then installed, then re-tested. |
| `split_layout_probe` | 3 | T1-nav | Read **both** `api/package.json` and `frontend/package.json` to discover there is no single project. |
| `phantom_file` | 2 | T1-nav | Tried to read a **root `package.json`** that does not exist. |
| `server_start_probe` | 1 | T4-multifile | Tried 4 different ways to start the API (`npm start`, `npm run build`, `node dist/`, `npm run dev`). |

### 1. Install-before-test — the marquee finding (9 / 9 code-task runs)

Every run of the three task classes that touch tests (T2, T3, T4) hit the same wall: the
agent's first instinct was to run the test suite, but `node_modules` was not present, so
`npm test` returned `sh: vitest: command not found`. The agent then ran `npm install` and
re-ran the test, which passed. Confirmed recovery sequence (T3-debug-BARE-01):

```
1  cd api && npm test     → ❌ vitest: command not found
2  cd api && npm install   → (installs)
3  cd api && npm test     → ✅ Test Files … passed
```

**Why it happened.** The harness neutralises each run with `git clean -fdx`, which removes
gitignored files including `node_modules`. So every run is a genuine *clean checkout* — the
same situation a new contributor, a fresh CI job, or a fresh agent worktree faces on first
contact. A no-context agent has no signal that deps aren't installed and that the canonical
entry point is `make install` / `npm install` **inside `api/`** (there is no root project).

**Honest caveat.** This friction is *amplified* by the clean-slate harness — an agent in a
warm working tree might already have `node_modules`. We are not hiding that. It still
generalises, because "first interaction with a freshly-checked-out repo" is exactly the
moment `AGENTS.md` is meant to help, and 9/9 code runs reproduced it.

### 2. No root manifest / two-project layout (3 nav runs)

All three T1-nav runs spent reads discovering the repo's shape: there is **no** root
`package.json`/`tsconfig`; instead two independent npm projects live in `api/`
(Express + TypeScript + vitest + SQLite) and `frontend/` (Vite + React). Two runs went
further and tried to read a root `package.json` that isn't there (`phantom_file`). This is a
single structural fact the agent had to reverse-engineer every time.

### 3. How to run the API (1 run — insufficient on its own)

One T4 run probed four different start methods for the API server. Real, but it appears in
only a single run, so on the credibility rule (recurring + correctable + general) it is **not**
strong enough to earn an `AGENTS.md` line from discovery alone. Recorded as `dropped`; if
evaluation surfaces it again we can revisit.

## Cost context (not a prediction)

Per-task discovery means (from `captures.jsonl`): T1-nav 28.4 cr, T2-local 58.3 cr,
T3-debug 36.4 cr, T4-multifile **246.4 cr**, T5-review 30.8 cr. The friction above is a
wasted exploration round-trip (an extra failed `npm test`, plus the layout reads) on top of
the real work. Whether removing it actually lowers billed credits or improves quality is
**not** asserted here — that is precisely what the pre-registered 100-run evaluation
(Phase 5) measures. Phase 2 only nominates candidates.

## Candidates carried forward

See `../candidate-instructions.md` for the exact proposed lines, each traced to the events
above. Two candidates are `kept` (install-before-test; two-project layout) and one is
`dropped` (API start command — 1 run). T5-review produced **zero** friction events, so it
contributes no candidate — also reported as-is.
