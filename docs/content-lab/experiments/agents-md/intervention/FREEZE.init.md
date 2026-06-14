# INIT arm freeze record (Phase 8)

The evaluation condition **INIT** adds exactly the file below to the repo root (as
`AGENTS.md`) and nothing else. The file is the **verbatim output of `copilot init`**
run once on the locked repo. Frozen here before any Phase 8 evaluation run. Any change
after this point invalidates the freeze and must be re-recorded.

| Field | Value |
|---|---|
| Path (in repo under test) | `AGENTS.md` (repo root of `octocat_supply@e1516cf`) |
| Source of truth | `intervention/AGENTS.init-generated.md` |
| Generator | `copilot init` (GitHub Copilot CLI 1.0.62) |
| Generator model | `claude-sonnet-4.5` |
| Generated at | 2026-06-14 |
| SHA-256 | `c4f19e70586e8c7058cb33b0ed895a6e3991107bf5a64e5e85fb3d3a4fdc1049` |
| Size | 2573 bytes - 2563 chars - 345 words |
| Approx. tokens (per-request tax) | ~641 (chars/4 estimate; exact billed effect measured at eval) |

## How it was generated (provenance)

Run once, non-interactively, against the same locked checkout used by every arm:

```
cd /tmp/octocat_supply_a4
git reset --hard e1516cf && git clean -fdx
rm -f .github/copilot-instructions.md CLAUDE.md AGENTS.md ; rm -rf .github/instructions
copilot init --allow-all-tools --model claude-sonnet-4.5
```

`copilot init` writes to `.github/copilot-instructions.md` by default. For the experiment
it is **relocated verbatim to the repo-root `AGENTS.md` path** — the same delivery channel
the AGENTS and ORIG arms use. This keeps the *delivery* constant across all three
file-bearing arms so the INIT vs AGENTS vs ORIG contrast isolates **content**, not location.

Generation cost (one-time, not charged against eval cells; recorded for the article's
"what does it cost to make the file" angle):

| Metric | Value (from `copilot init` run summary) |
|---|---|
| AI credits | 33.1 |
| Wall time | 1m 6s |
| Input tokens | ~129.5k (95.0k cached, 30.3k written) |
| Output tokens | ~2.9k (12 reasoning) |
| Files written | 1 (`.github/copilot-instructions.md`, +55 lines) |

(The Copilot CLI process log was not retained for this one-off generation; the figures
above are from the command's own end-of-run summary. The eval-cell billing below is what
the article's H1/H2 analysis uses, and those are captured per-run via the digest pipeline.)

## Why this arm exists

The hand-built **AGENTS** arm is deliberately minimal (~129 tokens, observation-pure). The
**ORIG** arm is the repo's own hand-written `.github/copilot-instructions.md` (~650 tokens).
INIT answers the natural reader question: **does the tool's own auto-generated file beat
both "no file" and a hand-tuned concise file?** It is run at n=10 (full primary arm), unlike
ORIG (n=3, directional).

## Notable content properties (direct observation of the frozen file)

- **Correctly identifies the two-package layout** ("two independent packages", `api/` +
  `frontend/`). It does **not** repeat ORIG's false "TypeScript monorepo / `--workspace=api`"
  claim. Worth flagging: the auto-generator got the structure right where the repo's own
  committed file did not.
- Includes accurate `make`-based build/test/lint commands and single-file test invocations
  (`npx vitest run src/routes/branch.test.ts`).
- Size and scope sit close to the ORIG arm (~641 vs ~650 tokens), so INIT also tests the
  "richer file" hypothesis that the concise AGENTS arm did not.

## Frozen file contents (for reference - authoritative copy is `intervention/AGENTS.init-generated.md`)

```markdown
# Copilot Instructions

## Architecture

Full-stack TypeScript ecommerce app (OctoCAT Supply) with two independent packages:

- **`api/`** — Express.js REST API with SQLite (better-sqlite3), Swagger/OpenAPI docs
- **`frontend/`** — React 18 SPA with Vite, Tailwind CSS, React Router, React Query

The API follows a layered pattern: **routes → repositories → SQLite database**. Each entity (Branch, Order, Product, Supplier, etc.) has a model, repository, and route file. Routes include Swagger JSDoc annotations for OpenAPI spec generation.

The frontend uses Axios for API calls (configured in `frontend/src/api/config.ts`) and connects to the API at `http://localhost:3000`.

Database: SQLite file at `api/data/app.db` (override with `DB_FILE` env var). Tests use an in-memory database.

## Build & Run

(make install / make dev / make build — see authoritative copy)

## Testing / Linting / Key Conventions

(vitest + Playwright commands, repository pattern, Swagger regeneration, etc. — see
authoritative copy `intervention/AGENTS.init-generated.md`)
```
