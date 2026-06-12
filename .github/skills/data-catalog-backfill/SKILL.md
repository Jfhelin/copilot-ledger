---
name: data-catalog-backfill
description: Expert at keeping the Copilot Ledger harness-research data catalog complete — so nothing we have ever logged is missing from the index. Scans every capture root on the machine (the consolidated external store, ~/CopilotLogExports, ~/.claude/projects, and Copilot CLI session-state files dirs), reconciles what it finds against the run ledger (docs/content-lab/data/db/runs.jsonl) and INDEX.md, and reports any capture file that is not yet accounted for. Use when the user asks to "backfill the index", "make sure nothing logged is missing", "audit the data catalog", "find uncatalogued captures/logs", or after collecting a new batch of runs. Owns scan-captures.mjs and catalog-roots.json.
user-invocable: true
---

# Data Catalog Backfill Skill

You are the expert on **completeness** of the harness-research data catalog. Your job:
guarantee that every capture/log file we have ever produced is either (a) represented in
the run ledger, (b) cataloged at the dataset level in `INDEX.md`, or (c) explicitly
classified as scratch/derived/operational noise. Nothing should silently fall through.

## The catalog this skill protects

| Artifact | Path | Role |
|---|---|---|
| Run ledger | `docs/content-lab/data/db/runs.jsonl` (+ `runs.sql`) | One row per measured run; the queryable spine |
| Human index | `docs/content-lab/data/INDEX.md` | Prose catalog + "Full capture-location inventory" |
| This skill's manifest | `.github/skills/data-catalog-backfill/catalog-roots.json` | Machine-readable mirror of the inventory: dataset-level dirs, known research sessions, session markers |
| Scanner | `.github/skills/data-catalog-backfill/scan-captures.mjs` | Discovers + reconciles capture files |

The deeper context (per-session SQLite caveat, the repo↔external split, why JSONL over a
live DB) lives in `INDEX.md` — read it before changing anything.

## Capture roots (where logs live)

- `~/copilot-ledger-data/captures/` — durable consolidated store (the canonical home).
- `~/CopilotLogExports/` — VS Code Chat exports, the Claude relay-capture pool, tool/skill
  probes, and originals later copied into the consolidated store.
- `~/.claude/projects/` — raw Claude CLI/extension transcripts (`sdk-*` JSONL), incl. `subagents/`.
- `~/.copilot/session-state/<id>/files/` — Copilot CLI session artifacts; only sessions
  containing a research marker (e.g. `capture/runs`, `structural`, `raw-captures`) are scanned.
- `~/.copilot/logs/process-*.log` — operational CLI logs (noise; ignored by rule).

## How to run a backfill audit

```sh
node .github/skills/data-catalog-backfill/scan-captures.mjs        # text report
node .github/skills/data-catalog-backfill/scan-captures.mjs --all  # also list ignored, with reasons
node .github/skills/data-catalog-backfill/scan-captures.mjs --json  # machine-readable
```

The report buckets every discovered capture into **covered / ignored / UNACCOUNTED** and
flags any **new research session** whose id is not yet in the manifest. The goal state is
**`UNACCOUNTED: 0`** with no new-session warnings.

A file is **covered** when its path (or a parent dir) appears in a ledger `source_path`,
OR it sits under a `datasetGlobs` entry, OR it is inside a `knownResearchSessions` dir.
It is **ignored** when it matches an `IGNORE` rule in the scanner (derived `.digest.json`,
`.agentviz/`, operational `~/.copilot/logs/`, scratch exports, sidecar `.txt/.err/.idx`).

## Triaging each UNACCOUNTED file (decision tree)

For every file the scanner surfaces, pick exactly one:

1. **It's a real measured run** → add a row to `runs.jsonl` (or `STATIC_ROWS` in
   `build-runs.mjs`, then regenerate both `runs.jsonl` and `runs.sql`). Extract metrics
   from its `digest.json` when present: `models[0]` (requests, costUsd) and
   `prefix.representative` (prefixApproxTokens, toolCount). For VS Code `copilot_usage`
   exports, cold prefix = first `claude-sonnet` request's `metadata.usage.prompt_tokens`
   where `prompt_tokens_details.cached_tokens == 0`.
2. **It's part of a dataset cataloged in bulk** (a pool/probe series) → add its directory
   or filename prefix to `datasetGlobs` in `catalog-roots.json` AND make sure INDEX's
   "Full capture-location inventory" mentions that dataset.
3. **It's a brand-new research session** → add the session id to
   `knownResearchSessions` and add a bullet to INDEX section D.
4. **It's scratch / derived / operational noise** → add an `IGNORE` rule (with a `why`)
   to `scan-captures.mjs`.

Re-run the scanner until it prints `UNACCOUNTED: 0`.

## Consolidation (optional but preferred for formal experiments)

If an UNACCOUNTED file is a formal experiment still living only in `~/CopilotLogExports/`
or a session-state dir, copy it into a named folder under
`~/copilot-ledger-data/captures/` (the durable store that survives session cleanup), then
point the ledger `source_path` at the consolidated copy. Keep scratch/probe sets in place.

## Definition of done

- `scan-captures.mjs` reports `UNACCOUNTED: 0` and no new-session warnings.
- New formal runs have ledger rows; `runs.jsonl` + `runs.sql` regenerated and in sync.
- `INDEX.md` inventory, its row counts, and `catalog-roots.json` all reflect reality;
  bump INDEX's "Last updated" date.
- `~/copilot-ledger-data/README.md` lists any new consolidated dataset dirs.

> This skill and `copilot-behavior-lab` share ownership of `INDEX.md`:
> `copilot-behavior-lab` updates it when *producing* content; this skill is the
> *completeness auditor* you run to prove nothing logged was left out.
