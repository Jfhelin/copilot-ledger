# Harness research — data catalog & index

**Purpose.** This is the durable catalog for the *coding-agent harness* research line
(Article 2: "A coding agent is more than a model"). It lets a **future session pick up
the work without re-running any captures**. The distilled analysis lives in this folder
(committed to the repo); the bulky/raw capture files live in a stable external directory
referenced below.

_Last updated: 2026-06-12._

> **Keeping this current.** This file does not update itself. The
> `copilot-behavior-lab` skill owns it: whenever a page/finding is produced that
> involves data, the skill adds new datasets, closes resolved gaps, fixes changed
> numbers, and bumps the date above. If you add or retire a capture by hand, do the
> same here.

---

## Where everything lives

| Layer | Location | Committed? | What |
|---|---|---|---|
| **Index** (this file) | `docs/content-lab/data/INDEX.md` | ✅ repo | The catalog you are reading |
| **Distilled analysis** | `docs/content-lab/data/*.md` + `system-prompts/` | ✅ repo | The 6-deliverable dossier, taxonomy, narratives, 4 system prompts |
| **DB snapshots** | `docs/content-lab/data/db/*.sql` | ✅ repo | Reloadable dumps of the analysis tables (`levers`, `captures`) — see DB note below |
| **Raw / bulky captures** | `~/copilot-ledger-data/captures/` | ❌ external | Wire logs, transcripts, exports, 40-run metrics + scripts |
| **Published article** | `docs/articles/more-than-a-model.md` (+ `figures/harnesses/*.svg`) | ✅ repo | The live Pages article this data backs |
| **Pre-registrations** | `docs/content-lab/experiments/11-*.md`, `12-*.md`, `10-ask-vs-agent-mode.md` | ✅ repo | Experiment designs |

> **Why split?** Distilled markdown is small, non-sensitive, and the thing you actually
> reason over — so it is committed. Raw captures are large and contain absolute local
> paths, so by project convention they stay out of git, consolidated into
> `~/copilot-ledger-data/` so they survive session cleanup.

---

## ⚠️ Database storage note (read before trusting any `sql` table)

The Copilot CLI `sql` tool is backed by a **per-session SQLite file** at
`~/.copilot/session-state/<session-id>/session.db`. **It is not shared between sessions
and is not in the repo.** Every analysis table you build (e.g. `levers`, `captures`)
lives only in the session that created it and is lost when that session is cleaned.

To keep structured table data durable, dumps are committed here:

| Table | Origin session | Durable dump | Rows |
|---|---|---|---:|
| `levers` | Article-2 lever taxonomy session | `db/levers.sql` | 15 (A–O) |
| `captures` | 40-run repeatability experiment (`52203f3d…`) | `db/captures.sql` | 40 |

Reload into any session DB with: `sqlite3 session.db < docs/content-lab/data/db/levers.sql`.
The `levers` findings are also narrated in `harness-levers-taxonomy.md`; the `captures`
metrics are also in `~/copilot-ledger-data/captures/repeatability-40run/captures.jsonl`.
**When you build a new long-lived `sql` table, dump it here too.**

---

## The four harnesses (all on Claude Sonnet 4.5)

| Code | Harness | Cold prefix (MCP-off) | Canonical capture |
|---|---|---:|---|
| **CO-CLI** | Copilot CLI (headless) | ~14.9k tok | `structural-prefix/copilot/digest.json` |
| **CL-CLI** | Claude CLI (headless) | ~27.2k tok | `structural-prefix/claude/digest.json` |
| **CO-IDE** | Copilot coding agent (VS Code) | **GAP — MCP-off run pending** | `co-ide-exports/t6_B_agent_sonnet_warm_r1.json` (MCP-**on**, 56 tools, cold 46,428) |
| **CL-IDE** | Claude Code in VS Code (extension) | ~46.4k tok | `cl-ide-transcripts/CL-IDE_extension_OFF.jsonl` |

---

## Dataset catalog (`~/copilot-ledger-data/captures/`)

### `repeatability-40run/` — the 40-run variance experiment
The controlled headless capture: same task × 2 conditions (BARE/TRIM) × 2 harnesses
(Copilot CLI, Claude CLI) × 10 reps = **40 runs**. Repo `octodemo/octocat_supply` @
`e1516cf`, model `claude-sonnet-4-5-20250929`, MCP off.
- `captures.jsonl` — 40 rows of per-run metrics (run_id, condition, harness, rep, requests, tool_calls, tokens, cost…).
- `scores.json` — blind quality scores (27-item checklist).
- `analyze.mjs`, `score.mjs`, `chart.mjs`, `chart-interactive.mjs`, `run-capture.sh` — analysis + regeneration scripts.
- `insert.sql`, `qscore.sql` — the `captures` run-inventory SQL.
- **Headline:** Copilot ~$0.13/run vs Claude ~$0.36 (~2.8×); quality a statistical tie (21.0 vs 20.4 / 27); the "port tell" (all 40 said 5173, real is 5137).

### `structural-prefix/` — per-request prefix decomposition (CO-CLI, CL-CLI)
`copilot/` and `claude/` each have a `digest.json` with `toolCatalog`, `prefix`,
`skills`, `mcpInstructions`, `prompts` breakdowns, plus `answer.txt` / `stderr.txt` /
raw `logs/`.
- **Headline:** tool definitions dominate the re-sent prefix — Copilot ~54%, Claude ~73%. CO-CLI tools 8,064 tok / CL-CLI tools 18,877 tok.

### `co-ide-exports/` — Copilot-in-VS-Code Chat exports (`copilot_usage` schema)
- `t6_B_agent_sonnet_warm_r1.json` — **canonical CO-IDE**, agent mode, Sonnet 4.5, MCP-on (56 flat tools), cache warms to ~98%.
- `CO-IDE_CopilotChat_sonnet4.5_MCPon.json` — second MCP-on Sonnet sample; turn-0 cold `prompt_tokens` = **46,428** (`cached_tokens=0`).
- `t6_A_ask_sonnet_warm_r1.json` + `t6_A_agent_sonnet_warm_r1.json` — **ask-vs-agent** matched pair (for experiment 10).
- **Read the cold prefix** from `prompts[i].logs[j].metadata.usage.prompt_tokens` where `prompt_tokens_details.cached_tokens == 0` on the first `claude-sonnet` request.

### `cl-ide-transcripts/` — Claude Code extension `sdk-ts` JSONL
- `CL-IDE_extension_OFF.jsonl` (src `3864bdcd…`) and `CL-IDE_extension_ON.jsonl` (src `ad52a532…`).
- **Headline:** cold prefix 46,364 (OFF) vs 46,418 ("ON") = +54 noise → the extension does **not** inject a project `.mcp.json` server into the model prefix. Both arms are effectively MCP-off. Native Read/Glob/Bash only; no Todo/Task tool.

---

## Distilled analysis docs (this folder)

| File | What it is |
|---|---|
| `harness-data-FINAL.md` | **The deliverable.** All 6 research deliverables, internally consistent. Start here. |
| `harness-research-dossier.md` | Working copy of the dossier (same content as FINAL). |
| `harness-levers-taxonomy.md` | The full list of harness "levers" (system prompt, tools, MCP, memory, caching, thinking, orchestration, …). |
| `lever-investigation-results.md` | Per-lever findings from the sub-agent investigations. |
| `lever-narrative.md` | The paragraphs-per-lever prose. |
| `system-prompt-comparison.md` | Section-by-section comparison of the 4 system prompts. |
| `harness-differences-notes.md` | Early source notes. |
| `system-prompts/{copilot-cli,vscode-copilot,claude-cli,claude-vscode}.txt` | The 4 extracted system prompts underpinning the analysis. |

---

## Known gaps / open captures

- **CO-IDE MCP-off cold prefix** — *pending a manual capture.* All existing CO-IDE
  exports are MCP-on. Capture plan: open `octocat_supply-psychic-disco` (its workspace
  `.vscode/mcp.json` is currently parked as `.vscode/mcp.json.parked` — restore it after),
  Agent mode + Sonnet 4.5, **toggle off all MCP servers but keep native tools on**, run the
  verbatim prompt, export to `~/CopilotLogExports/CO-IDE_agent_sonnet_MCPoff.json`, then read
  turn-0 `usage.prompt_tokens` (where `cached_tokens=0`). This fills the 4th bar in
  `figures/harnesses/prefix-size-comparison.svg`.
- **Ask-vs-agent article** — pre-reg exists (`experiments/10-ask-vs-agent-mode.md`) and
  matched `t6_A_ask/agent` data is in `co-ide-exports/`, but no article written.

---

## The verbatim task prompt (held fixed across all harnesses)

> Explain this repository to a new developer: purpose, components, data flow, install/run/test.

Repo: `octodemo/octocat_supply` (checkout `…-psychic-disco`), model `claude-sonnet-4-5-20250929`, MCP off unless noted.
