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
| **DB snapshots** | `docs/content-lab/data/db/` | ✅ repo | `runs.jsonl`/`runs.sql` run ledger + reloadable dumps (`levers`, `captures`) — see DB notes below |
| **Raw / bulky captures** | `~/copilot-ledger-data/captures/` | ❌ external | Wire logs, transcripts, exports, 40-run metrics + scripts |
| **Published article** | `docs/articles/more-than-a-model.md` (+ `figures/harnesses/*.svg`) | ✅ repo | The live Pages article this data backs |
| **Pre-registrations** | `docs/content-lab/experiments/11-*.md`, `12-*.md`, `10-ask-vs-agent-mode.md` | ✅ repo | Experiment designs |

> **Why split?** Distilled markdown is small, non-sensitive, and the thing you actually
> reason over — so it is committed. Raw captures are large and contain absolute local
> paths, so by project convention they stay out of git, consolidated into
> `~/copilot-ledger-data/` so they survive session cleanup.

---

## 📒 The run ledger — `db/runs.jsonl` (the canonical "every run that happened" log)

`docs/content-lab/data/db/runs.jsonl` is the **single shared log of every captured run**,
one JSON object per line. It is the queryable spine of this catalog; this INDEX is its
human companion. JSONL was chosen over a live database on purpose: it is append-only
(no merge pain), diffs cleanly in PRs, needs zero infrastructure, and loads into any
session's `sql` tool on demand.

**Row schema:** `run_id, date, harness, task, model, mcp_on, condition, rep,
source_path, prefix_tokens, requests, tool_calls, cost_usd, quality_score, notes`.

**Query it** (loads the generated dump into the session DB just like the others):
```sh
sqlite3 session.db < docs/content-lab/data/db/runs.sql
# e.g. SELECT harness, count(*), round(avg(cost_usd),3) FROM runs GROUP BY harness;
```

**Add a new run:** append a line to `runs.jsonl` (or add it to `build-runs.mjs`), then
regenerate the dump:
```sh
node docs/content-lab/data/db/build-runs.mjs       > docs/content-lab/data/db/runs.jsonl
node docs/content-lab/data/db/build-runs.mjs --sql > docs/content-lab/data/db/runs.sql
```
The 40 repeatability rows are derived from the committed `captures.sql` (so they rebuild
in CI); structural / IDE session rows live in `STATIC_ROWS` inside `build-runs.mjs`
because their raw sources are external. Current ledger: **59 rows**
(40 repeatability + 2 structural + 6 ask/agent t6 + 2 CO-IDE (MCP-on + MCP-off) + 2 CL-IDE +
6 e3 model-comparison + 1 matched-pair).

---

## ⚠️ Database storage note (read before trusting any `sql` table)

The Copilot CLI `sql` tool is backed by a **per-session SQLite file** at
`~/.copilot/session-state/<session-id>/session.db`. **It is not shared between sessions
and is not in the repo.** Every analysis table you build (e.g. `levers`, `captures`)
lives only in the session that created it and is lost when that session is cleaned.

To keep structured table data durable, dumps are committed here:

| Table | Origin session | Durable dump | Rows |
|---|---|---|---:|
| `runs` | run ledger (built from below) | `db/runs.jsonl` + `db/runs.sql` | 59 |
| `levers` | Article-2 lever taxonomy session | `db/levers.sql` | 15 (A–O) |
| `captures` | 40-run repeatability experiment (`52203f3d…`) | `db/captures.sql` | 40 |

Reload into any session DB with: `sqlite3 session.db < docs/content-lab/data/db/levers.sql`.
The `levers` findings are also narrated in `harness-levers-taxonomy.md`; the `captures`
metrics are also in `~/copilot-ledger-data/captures/repeatability-40run/captures.jsonl`.
**When you build a new long-lived `sql` table, dump it here too.**

---

## The four harnesses (all on Claude Sonnet 4.5)

| Code | Harness | Cold prefix (MCP-off) | Out-of-box floor (derived) | Canonical capture |
|---|---|---:|---:|---|
| **CO-CLI** | Copilot CLI (headless) | ~14.9k tok | **~15k** (exact; 0 skills) | `structural-prefix/copilot/digest.json` |
| **CL-CLI** | Claude CLI (headless) | ~27.2k tok | **~27k** (exact; incl. 13 built-in skills) | `structural-prefix/claude/digest.json` |
| **CO-IDE** | Copilot coding agent (VS Code) | ~20.6k tok | **~17k** (estimate; −18 extension tools) | `co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json` (Agent mode, 56 native tools, turn-0 prefix 20,598) |
| **CL-IDE** | Claude Code in VS Code (extension) | ~46.4k tok | **~46k** (exact total; −2 repo skills ≈ unchanged) | `cl-ide-transcripts/CL-IDE_extension_OFF.jsonl` |

The **floor** column is what `docs/articles/figures/harnesses/prefix-size-comparison.svg` plots: MCP off, no
user-added skills, extension-contributed tools removed. CO-IDE is the only estimate — its measured 20.6k includes
18 notebook/browser extension tools (~3.9k by chars/4); strip them for the ~17k floor. The other three floors are
derived directly from the captures (built-in skills count as out-of-box; only user/repo/extension additions are removed).

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

### `co-ide-exports/` — Copilot-in-VS-Code Chat exports (`copilot_usage` schema)
- `CO-IDE_agent_sonnet_MCPoff.json` — **canonical CO-IDE MCP-off** (the 4th bar of `prefix-size-comparison.svg`). Agent mode, Sonnet 4.5, workspace `.vscode/mcp.json` parked. Turn-0 prefix `prompt_tokens` = **20,598** with **56 native tools** and **zero `mcp__*` tools**. (Captured warm, so turn-0 `cached_tokens`>0, but `prompt_tokens` is the full prefix the model sees; corroborated by `t6_B`'s byte-identical 56-tool set at 20,571.)
- `CO-IDE_CopilotChat_sonnet4.5_MCPon.json` — MCP-**on** contrast; turn-0 cold `prompt_tokens` = **46,428** (`cached_tokens=0`) with **95 flat tools** (56 native + 39 `mcp__bicep/github/pylance`). Shows MCP flooding the prefix when tools are sent flat rather than grouped behind `tool_search`.
- **Read the cold prefix** from `prompts[i].logs[j].metadata.usage.prompt_tokens` (tool count is in `metadata.tools`) on the first `claude-sonnet` request — ideally where `prompt_tokens_details.cached_tokens == 0`.

### `ask-vs-agent-t6/` — ask-vs-agent matched set (CO-IDE, experiment 10)
Six VS Code Copilot Chat exports, Sonnet 4.5, 8 MCP servers: `t6_{A,B}_{ask,agent}_sonnet_{cold,warm}_r1.json`.
- Ask-mode cold prefixes ~17.7k–19.7k; agent turns fire `gpt-4o-mini` aux calls.
- Backs `experiments/10-ask-vs-agent-mode.md` (article not yet written).

### `e3-model-comparison/` — Sonnet 4.5 vs 4.6, task T1, MCP off (Claude CLI headless)
Six run dirs `e3-T1-{45,46}-off-{1,2,3}` (45 = Sonnet 4.5, 46 = Sonnet 4.6), each with
`transcript.jsonl`, `digest.json`, `answer.txt`, `meta.txt`. Prefix ~26.7k, 26 tools.
- **Headline:** wide within-model cost spread (4.5: $0.19–$0.84; 4.6: $0.05–$0.42) — another repeatability illustration, this time across a model bump.

### `matched-pair-baseline/` — Claude CLI pinned to VS Code's version (2.1.112)
`README.md` + `capture-006.json` (relay: full system + tool schemas) + `transcript.jsonl` +
`digest.json`. CLI-side counterpart to VS Code `Claudeok.json` with version+model held
constant (`claude-code@2.1.112`, `sdk-cli` entrypoint, MCP off). Prefix 26,556, 26 tools.

### `structural-prefix/` — per-request prefix decomposition (CO-CLI, CL-CLI)
`copilot/` and `claude/` each have a `digest.json` with `toolCatalog`, `prefix`,
`skills`, `mcpInstructions`, `prompts` breakdowns, plus `answer.txt` / `stderr.txt` /
raw `logs/`.
- **Headline:** tool definitions dominate the re-sent prefix — Copilot ~54%, Claude ~73%. CO-CLI tools 8,064 tok / CL-CLI tools 18,877 tok.

### `cl-ide-transcripts/` — Claude Code extension `sdk-ts` JSONL
- `CL-IDE_extension_OFF.jsonl` (src `3864bdcd…`) and `CL-IDE_extension_ON.jsonl` (src `ad52a532…`).
- **Headline:** cold prefix 46,364 (OFF) vs 46,418 ("ON") = +54 noise → the extension does **not** inject a project `.mcp.json` server into the model prefix. Both arms are effectively MCP-off. Native Read/Glob/Bash only; no Todo/Task tool.

---

## Full capture-location inventory (every root we have logged)

This accounts for **all** capture locations on this machine, so nothing logged is
"missing." To re-verify completeness at any time, run the auditor (owned by the
`data-catalog-backfill` skill), which reconciles every capture file against the ledger
and this inventory and must report `UNACCOUNTED: 0`:

```sh
node .github/skills/data-catalog-backfill/scan-captures.mjs
```

Status legend: ✅ consolidated into `~/copilot-ledger-data/captures/` ·
📍 referenced in place (canonical location is where it sits) · ⏳ ephemeral session-state
(present now, lost on session cleanup) · 🧪 exploratory/probe · 🗑 scratch/throwaway.

### A. `~/copilot-ledger-data/captures/` — the durable consolidated store ✅
The 8 datasets documented above: `repeatability-40run`, `structural-prefix`,
`co-ide-exports`, `ask-vs-agent-t6`, `cl-ide-transcripts`, `e3-model-comparison`,
`matched-pair-baseline`. Plus `~/copilot-ledger-data/db-snapshots/` (mirror of `db/`).

### B. `~/CopilotLogExports/` — VS Code / relay / CLI capture workbench
| Group | Files | Status | What it is |
|---|---|---|---|
| `e3-T1-runs/`, `matched-pair-2.1.112/`, `t6_*.json`, `CO-IDE_agent_sonnet_MCPoff.json` | 6 dirs + 1 dir + 6 + 1 | ✅ copied to B→A | Originals of the consolidated e3 / matched-pair / ask-agent / CO-IDE-MCP-off sets |
| `claude-captures/` | 90 JSON + `index.log` (8 MB) | 📍 in place | Claude relay prefix-capture pool (system+tool schemas per request); `structural-prefix` and `matched-pair` digests sample from it |
| Tool/skill scaling probes: `hi18, hi2_18, hi3_21, hi4_0, hi_116, hi_140, hi_VSCInsider_claude, hi_skillCleaned{,2,3}, 03-workiq-{142,316}-tools, 03-workiq-not-started` | 13 | 🧪 in place | VS Code captures at varying tool/MCP/skill counts — the evidence behind levers C/D/E (e.g. Insider 401 tools/93% prefix, workiq 142 vs 316 tools) |
| Claude-in-VS-Code: `Claudeok.json, claudeok-scrubbed.json, VSCode_ClaudeArm{A,B,B2}.json`, `VSCodeCopilote.json` | 6 | 🧪 in place | VS Code Copilot-proxy Claude runs (lever N transport; `Claudeok` = matched-pair's IDE counterpart) |
| `ExpenseReportMunich3{,_agentupdate,_agentupdate2,_agentupdate_script}.json` | 4 | 🧪 in place | A different task explored for tool-call/agent-update behavior |
| Early/scratch: `01-hello{,-80,-271}, 02-one-tool, 04-plan-implement-cart, HelloWorld, test.json.json, t1, t2, t2_2, readme-cold-nocontext` | 11 | 🗑 in place | Throwaway smoke/exploration exports — kept for provenance, not cited |
| `.agentviz/*.digest.json` | 12 | derived | Regenerable digest sidecars (not source data) |

### C. `~/.claude/projects/` — raw Claude transcripts (`sdk-*` JSONL) 📍
75 `*.jsonl` across 6 project dirs (+ `subagents/`). Relevant to this series:
`-private-tmp-octocat-supply-ak/` (52 — the **Claude-CLI side of the 40-run + e3 + structural**),
`-Users…-octocat-supply-psychic-disco/` (15 — the **CL-IDE / CO-IDE manual sessions**).
The rest (`jubilant-octo-palm-tree` 2, `octocat-mcp` 2, `-Users-jfhelin` 2, `-private-tmp` 1)
are adjacent/unrelated agent sessions. These are the upstream raws; the distilled numbers
already live in the digests/ledger.

### D. `~/.copilot/session-state/<id>/files/` — Copilot CLI session artifacts ⏳
- `52203f3d-…/files/` — the **original experiment session**: `capture/runs/{BARE,TRIM}-copilot-NN/logs/process-*.log` (the 20 Copilot-CLI raw logs behind the 40-run), `smoke/`, `structural/`, and condition tests `agentsmd-test/`, `claudemd-only-test/`, `bothfiles-test/`. Its `session.db` still holds the live `captures` table (dumped to `db/captures.sql`).
- `6dbe2d2c-…/files/` — **this** Article-2 session: 16 files (`raw-captures/`, `system-prompts/`) — the working copies behind the committed analysis.
- ⏳ Both are session-state and disappear on cleanup; everything load-bearing has been copied into A or committed.

### E. `~/.copilot/logs/process-*.log` — operational CLI logs 📍🗑
~70 rolling process logs from every Copilot CLI session on this machine (including this
one). These are **operational**, not curated captures — only the handful copied into
`structural-prefix/` / `repeatability-40run/` are research data. Not individually
cataloged; treat as noise unless a specific run is needed.

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

- **CO-IDE MCP-off cold prefix** — ✅ *closed 2026-06-12.* Captured via Agent mode + Sonnet 4.5
  in `octocat_supply-psychic-disco` with the workspace `.vscode/mcp.json` parked (restored
  after). Result: **~20.6k tokens, 56 native tools** — now the 4th bar in
  `figures/harnesses/prefix-size-comparison.svg`. Canonical file:
  `co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json`. Finding: with MCP off, CO-IDE's prefix
  (~20.6k) sits just above Copilot CLI and well below the MCP-flooded ~46k; the earlier
  46,428 figure was an MCP-on (95-tool) capture, not the MCP-off baseline.
- **Ask-vs-agent article** — pre-reg exists (`experiments/10-ask-vs-agent-mode.md`) and
  matched `t6_*` ask/agent data is in `ask-vs-agent-t6/`, but no article written.

---

## The verbatim task prompt (held fixed across all harnesses)

> Explain this repository to a new developer: purpose, components, data flow, install/run/test.

Repo: `octodemo/octocat_supply` (checkout `…-psychic-disco`), model `claude-sonnet-4-5-20250929`, MCP off unless noted.
