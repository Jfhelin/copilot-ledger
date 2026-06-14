# Where the concise file came from — discovery friction

> Supporting research for [`article-04-agents-md.md`](../../article-04-agents-md.md).
> This is a shared human/agent scratchpad, not published copy.

The concise `AGENTS.md` was **not** designed; it was *grown from observed failure*. This
dossier is the audit trail from "no-context agent stumbles" → "candidate line" → "frozen
file." It is what lets the article claim the file is evidence-based, not opinion.

All counts are **direct evidence** from the 15 BARE discovery runs (5 task classes × 3 reps,
no instruction file). Friction was extracted by `runner/friction.mjs` into the
`friction_events` table; full writeup in
`docs/content-lab/experiments/agents-md/discovery/analysis/friction-findings.md`.

---

## One-line thesis

A no-context agent re-discovers the **same two repo facts on almost every run**, wasting an
exploration round-trip each time. The concise file is just those two facts, written down — and
nothing else, because nothing else recurred.

## What "friction" means here (so the count is honest)

An event counts as friction only when the **tool result itself** showed a correctable,
generalizable stumble (a real "path does not exist", a `command not found`). Deliberately
**excluded**: `npm test` assertion failures (legitimate TDD red-states — the planted bug), the
agent's own passing `curl`/health checks that print `404`, and `NotFound` substrings inside
healthy source lines. This keeps every retained event "a thing a one-line repo fact would have
prevented."

## Observed friction (runs hit / 15)

| Event class | Runs / 15 | Task classes | What happened | Verdict |
|---|---|---|---|---|
| `missing_deps_run` | **9** | T2, T3, T4 (code tasks) | Ran `npm test` **before** install → `sh: vitest: command not found`, then installed, then re-tested | → **C1 kept** |
| `split_layout_probe` | 3 | T1-nav | Read **both** `api/` and `frontend/` `package.json` to learn there's no single project | → **C2 kept** |
| `phantom_file` | 2 | T1-nav | Tried to read a **root `package.json`** that does not exist | → **C2 kept** |
| `server_start_probe` | 1 | T4 | Tried 4 ways to start the API (`npm start` / `run build` / `node dist/` / `run dev`) | → **dropped** (1 run, below recurring bar) |

### The marquee finding (9/9 code-task runs)

Every run of the three task classes that touch tests hit the **same wall**: test-first
instinct, but `node_modules` absent. Confirmed recovery sequence (T3-debug-BARE-01):

```
1  cd api && npm test     → ❌ vitest: command not found
2  cd api && npm install  → (installs)
3  cd api && npm test     → ✅ Test Files … passed
```

**Why:** the harness neutralizes each run with `git clean -fdx`, which removes
`node_modules`, so every run is a genuine *clean checkout* — the same "first contact" a new
contributor, a fresh CI job, or a fresh agent worktree faces.

**Honest caveat (carry into writing):** this friction is *amplified* by the clean-slate
harness — a warm working tree might already have `node_modules`. It still generalizes,
because "first interaction with a freshly-checked-out repo" is exactly what `AGENTS.md` is
for, and 9/9 code runs reproduced it.

## Inclusion rule (why the file is so small)

A candidate becomes a line only if its friction is **recurring + correctable-by-one-line +
generalizable** (a repo fact, not a task answer). That bar kept exactly two lines:

| Line | Candidate | Justifying friction | Runs / 15 |
|---|---|---|---|
| "two independent npm projects … no root package.json/tsconfig/workspace" | C2 | `split_layout_probe` + `phantom_file` | 3 (T1-nav) |
| "install deps before tests/builds; fresh tree has no node_modules" | C1 | `missing_deps_run` (`vitest: command not found`) | 9 (T2,T3,T4) |

**Deliberately excluded to stay observation-pure:** an `npm ci` clause (carried from Phase 0
prior knowledge, *not* re-observed this sweep) and the API start command/port (1 run only).
**T5-review produced zero friction** → contributes no line. The small pool *is* the story.

## Expected direct effect (from the logs — NOT a prediction of the eval result)

Directly removable tool calls if the agent had this file: **~11–14 of 436** total discovery
tool calls (≈3%) — 9 premature `npm test` failures + 2 phantom root reads + ~3 redundant
sub-manifest reads. The file's larger hoped-for effect (less downstream thrash/variance on
expensive multi-file tasks) was **unproven at this point** — that is exactly what the 100-run
evaluation tested. The ~129-token per-request tax is counted against any savings.

## Per-task discovery cost (context, not a prediction)

Mean credits across the 15 discovery runs: T1-nav 28.4 · T2-local 58.3 · T3-debug 36.4 ·
**T4-multifile 246.4** · T5-review 30.8. T4 dominates (~6× any other task) — flagged early as
the highest-variance, highest-cost class, which the evaluation confirmed.
