# Phase 0 — Environment lock

Recorded before any runs. Everything here is held **constant** across discovery and
evaluation. The only intended variable is `AGENTS.md` **absent vs present**.

_Locked: 2026-06-13._

## Harness

| Field | Value |
|---|---|
| Harness | GitHub Copilot CLI (headless `copilot -p`) |
| Harness version | `1.0.61` |
| Invocation | `copilot -p "<prompt>" --allow-all-tools --disable-builtin-mcps --disable-mcp-server workiq --disable-mcp-server fabric-rti --disable-mcp-server revenue --disable-mcp-server markitdown --model claude-sonnet-4.5 --log-dir <run>/logs --log-level all` |

## Model

| Field | Value |
|---|---|
| Model (CLI alias) | `claude-sonnet-4.5` |
| Snapshot (billed) | `claude-sonnet-4-5-20250929` |

Same snapshot across **all** runs. Recorded per-run from the digest `primaryModel`.

## Repository

| Field | Value |
|---|---|
| Repo | `octodemo/octocat_supply` |
| Commit SHA | `e1516cf9095b83f25adabf5fe66036f133bddfa6` |
| Branch | `main` (reset to the pinned SHA) |
| Local scratch clone | `/tmp/octocat_supply_a4` |
| Stack | Express + TypeScript API (`api/`), React + Vite + Tailwind frontend (`frontend/`), top-level `Makefile`, SQLite (`better-sqlite3`) |

The canonical repo and commit still exist on GitHub and are fetchable (verified
2026-06-13 via `gh api repos/octodemo/octocat_supply/commits/e1516cf`). Same repo +
commit as Articles 1–3 and the 40-run grid, so Article 4 stays continuous with the series.

### Known repo facts (verified at e1516cf, for runner/baseline only — NOT for AGENTS.md unless re-derived from discovery)

- `npm ci` **fails**: `package-lock.json` is out of sync (missing `yaml@2.9.0`). Use
  `npm install` / `make install`. (Discovered 2026-06-13 while taking the test baseline.)

## Configuration held constant

| Knob | Value |
|---|---|
| MCP | **off** — all servers disabled (`--disable-builtin-mcps` + 4 named) |
| Skills | none |
| Persistent memory | none |
| Other instruction files | none (runner deletes `.github/copilot-instructions.md`, `CLAUDE.md`, `.github/instructions/` before every run) |
| Tools | Copilot CLI default tool set (catalog recorded per run from the digest) |
| OS | macOS (Darwin, Apple Silicon) |
| Node | `v22.22.3` · npm `10.9.8` |
| Network policy | default (model API reachable; no other network task) |
| Cache policy | provider-side prompt caching left ON (measure normal product behavior); repo + conversation reset per run |
| Task timeout | TBD per task (see manifest) |
| Max retries | 0 (a run is a single `copilot -p` invocation) |

## Cost measurement

- **Primary cost = exact billed GitHub AI credits**, read from `copilot_usage.total_nano_aiu`
  in the CLI debug log via `packages/skill-copilot-cli/scripts/copilot-cli-digest.mjs`.
- A token-normalized USD estimate is also recorded (`cost.tokenNormalized`) but labeled
  as an estimate. Cost types are never mixed without a label.

## Reset procedure (before every run)

1. `git reset --hard e1516cf… && git clean -fdx`
2. Remove instruction files: `.github/copilot-instructions.md`, `CLAUDE.md`, `AGENTS.md`,
   `.github/instructions/`
3. Apply condition: BARE = no file; AGENTS = write the frozen `AGENTS.md`
4. Verify the active condition (presence/absence of `AGENTS.md`)
5. Fresh `copilot -p` invocation (no carried conversation state)
6. Record timestamp

## Drift policy

Stop and document if any locked value changes mid-experiment (CLI version, model
snapshot, repo reachability). Do not silently continue across an environment change.
