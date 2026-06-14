# The three files — exactly what each arm added

> Supporting research for [`article-04-agents-md.md`](../../article-04-agents-md.md).
> This is a shared human/agent scratchpad, not published copy.

The whole experiment varies **one thing**: what instruction file (if any) sits at the repo
root. Everything below is **direct evidence** — verbatim file contents and measured sizes.

---

## One-line thesis

Three files, one axis: **nothing → a concise file built from what the agent actually
stumbled on → the repo's own long, hand-written file.** The concise file says "there is **no**
root workspace"; the repo's own file says the opposite ("TypeScript monorepo … `npm run
build --workspace=api`"). That contradiction is the experiment in miniature.

## Sizes (the per-request "tax")

| Arm | File | Bytes | Chars | Words | ~Tokens (per request, every turn) |
|---|---|---|---|---|---|
| **BARE** | *(none)* | 0 | 0 | 0 | **0** |
| **AGENTS** | concise, observation-built | 521 | 515 | 85 | **~129** (chars/4) |
| **ORIG** | repo's own `.github/copilot-instructions.md`, relocated | 2,598 | 2,598 | ~330 | **~650** (~5× AGENTS) |

The file is re-sent on **every** request, so its token cost is paid per turn, not once.
That recurring tax is what any "savings" must earn back. (Exact billed effect is measured,
not estimated — see [`cost-findings.md`](./cost-findings.md).)

## AGENTS — the concise, observation-built file (n=10/task)

Frozen at SHA-256 `4929e5b3…f933545` before any eval run. **Every line traces to friction
observed in the 15 discovery runs** (see [`discovery-friction.md`](./discovery-friction.md));
no invented lines.

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

Two facts only: (1) two-project layout / no root manifest, (2) install before test/build.
Both are things a no-context agent reverse-engineered every single run.

## ORIG — the repo's own original instructions (n=3/task, directional)

The repo's actual `.github/copilot-instructions.md` at `e1516cf`, copied **verbatim** (incl.
its own defects, e.g. a malformed list item 4 "longs in a shared utility…") to the
`AGENTS.md` path. Same delivery mechanism as AGENTS; only the content differs. ~650 tokens,
heavily **review-flavored** (a "General Review Guidance" list, an "Escalation Order" that puts
*Security / data integrity* first, tone rules).

Structure (full text in `intervention/AGENTS.orig-copilot-instructions.md`):

- **High-Level Architecture** — calls the repo a *"TypeScript monorepo"* and instructs
  `npm run build --workspace=api` / `--workspace=frontend` ("root build runs both").
- **General Review Guidance** (8 items) — security/correctness first, type safety, error
  types, tests, N+1 patterns, env-driven config.
- **Monorepo Workflow**, **Do Not Repeat**, **Escalation Order for Suggestions** (6 levels,
  security #1), **Tone & Feedback Style**.

### Two tells the writing agent may want

1. **It is factually wrong about the very thing AGENTS got right.** ORIG asserts a root
   workspace (`--workspace=api`, "root build runs both"); there is no root `package.json` in
   this repo. The observation-built file says the opposite — and the observation-built file is
   the correct one. *Verbose + authored-from-memory* lost to *short + authored-from-evidence*
   on a checkable fact.
2. **It is a review prompt wearing an instruction file.** Most of ORIG is "how to write review
   feedback," with security escalated to the top. **Inference:** this is the most plausible
   mechanism for the E5 review regression — the file primes security-flavored findings, and
   all three ORIG review runs produced a hallucinated "SQL injection" false positive (see
   [`quality-findings.md`](./quality-findings.md)).
