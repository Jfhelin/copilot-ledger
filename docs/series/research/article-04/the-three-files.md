# The four files — exactly what each arm added

> Supporting research for [`article-04-agents-md.md`](../../article-04-agents-md.md).
> This is a shared human/agent scratchpad, not published copy.
> (Filename is historical — this dossier now covers all four arms.)

The whole experiment varies **one thing**: what instruction file (if any) sits at the repo
root. Everything below is **direct evidence** — verbatim file contents and measured sizes.

---

## One-line thesis

Four files, one axis: **nothing → a concise file built from what the agent actually
stumbled on → the repo's own long, hand-written file → a file the tool auto-generates for
you (`copilot init`).** Two of them are large (~650 tok): the human one (ORIG) is
*factually wrong* about repo structure ("TypeScript monorepo … `npm run build
--workspace=api`"), while the machine one (INIT) is *factually right* ("two independent
packages"). The concise file (AGENTS) agrees with the machine on structure but says it in
~129 tokens. The experiment in miniature: **accuracy and detail are not the same thing as
a better outcome** — see the quality and cost dossiers.

## Sizes (the per-request "tax")

| Arm | File | Bytes | Chars | Words | ~Tokens (per request, every turn) |
|---|---|---|---|---|---|
| **BARE** | *(none)* | 0 | 0 | 0 | **0** |
| **AGENTS** | concise, observation-built | 521 | 515 | 85 | **~129** (chars/4) |
| **ORIG** | repo's own `.github/copilot-instructions.md`, relocated | 2,598 | 2,598 | ~330 | **~650** (~5× AGENTS) |
| **INIT** | `copilot init` auto-generated, relocated | 2,573 | 2,563 | 345 | **~641** (≈ ORIG size, machine-written) |

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

## INIT — the auto-generated file (n=10/task, full arm)

The **verbatim output of `copilot init`** run once on the locked repo (Copilot CLI 1.0.62,
`claude-sonnet-4.5`), frozen at SHA-256 `c4f19e70…fdc1049` and relocated to the `AGENTS.md`
path — same delivery channel as AGENTS and ORIG, so the contrast is pure **content**.
Generating it cost **33.1 credits one-time** (the "what does the file cost to make" angle).

Full text in `intervention/AGENTS.init-generated.md`. Structure: **Architecture · Build &
Run · Testing · Linting · Key Conventions** (8 detailed convention bullets — repository
pattern, the `api/src/utils/sql.ts` helpers, `handleDatabaseError`/`NotFoundError`, swagger
regen, the in-memory test setup).

### Three tells the writing agent may want

1. **It is the one large file that is *factually correct* about structure.** Where ORIG
   hallucinates a "TypeScript monorepo" with root workspaces, INIT opens with *"two
   independent packages"* — exactly what the concise AGENTS file says, and exactly right. So
   INIT is **strictly better information than ORIG** at nearly the same token size. This kills
   the lazy reading "ORIG failed because it was wrong": INIT was right and still didn't help.
2. **It is detailed and accurate, not padded.** The conventions it lists are real and
   repo-specific (the SQL utils, the error helpers, the swagger step). It reads like a file a
   careful maintainer would approve. Its ~641-token tax buys *accurate* context, not prose.
3. **Accurate + detailed still did not lift quality — and hurt the build tasks.** INIT is the
   **only arm that never beats BARE on any task** (E1 20.8, E2 4.8, E3 4.9, E4 4.5, E5 4.6)
   and the only one with mechanical **gate failures** (E4 7/10, vs 10/10 elsewhere).
   **Inference:** the richer the (correct) context, the more ambitious the implementation —
   and the more surface area to break diff-apply, the frontend TS build, or the api vitest.
   Unlike ORIG, it stayed **cheap** (mean = BARE, median ≈ AGENTS), because accurate structure
   isn't prose bloat. The contrast ORIG-vs-INIT is the cleanest evidence that *what the file
   says* — not its size, and not even its accuracy — is what determines the outcome.
