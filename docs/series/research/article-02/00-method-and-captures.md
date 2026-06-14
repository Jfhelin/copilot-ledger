# Method & capture inventory — Article 2

> Supporting research for [`article-02-more-than-a-model.md`](../../article-02-more-than-a-model.md).
> This is a shared human/agent scratchpad, not published copy.

This folder is the evidence base for Article 2 (*"A coding agent is more than a model"*).
Each dossier backs one section of the published draft with **labelled** evidence. Start
here for the experimental setup, what counts as a measurement vs. a projection, and where
every raw file lives.

---

## The argument Article 2 has to support

Same model weights (Claude Sonnet 4.5) driven by three different harnesses produce very
different requests, costs, and behaviours. The harness — not the model — is the variable.
Every dossier exists to make one harness-level lever measurable.

## Harnesses under test

| Tag | Product | Mode | In scope for Article 2 |
|---|---|---|---|
| **CO-CLI** | GitHub Copilot CLI (headless) | autopilot | ✅ primary |
| **CL-CLI** | Claude CLI / Claude Agent SDK | agent | ✅ primary |
| **CO-IDE** | VS Code Copilot Chat | agent | ✅ primary |
| CL-IDE | Claude Code in VS Code | agent | ⚠️ supplementary only |

All four drive the **same** model id `claude-sonnet-4-5-20250929`. CL-IDE is a fourth
harness used only to sanity-check a single claim (extension on/off prefix); it is **not**
part of Article 2's three-harness story and should stay in footnotes.

## Pinned environment

- **Model.** `claude-sonnet-4-5-20250929`, temperature 1 (both vendors).
- **Repo / task.** `octodemo/octocat_supply`; fixed prompt *"Explain this repository to a
  new developer: purpose, components, data flow, install/run/test."*
- **MCP.** Off for the headline footprint and 40-run numbers unless a dossier says
  otherwise (the MCP dossier toggles it deliberately).

## Two capture families (don't mix them)

1. **Structural-prefix run** — one careful capture per harness, full wire body preserved.
   Used for prefix composition (system / toolDefs / messages), tool catalogs, and the one
   run where Copilot CLI reports **exact billed credits**.
   - `~/copilot-ledger-data/captures/structural-prefix/copilot/` (`digest.json`,
     `logs/process-*.log`, `answer.txt`)
   - `~/copilot-ledger-data/captures/structural-prefix/claude/` (same shape)
2. **40-run repeatability batch** — n=20 per harness, BARE+TRIM, MCP off. Used for the
   *behavioural* aggregates (requests/turn, tool calls, cost, cache-read rate). One run is
   noisy; these are the numbers that survive averaging.
   - `~/copilot-ledger-data/captures/repeatability-40run/captures.jsonl`
   - In-git mirror of the aggregates: `docs/content-lab/data/db/runs.jsonl`

VS Code captures (agent-mode, MCP on and off):
- `~/copilot-ledger-data/captures/co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json`
- `~/copilot-ledger-data/captures/co-ide-exports/CO-IDE_agent_sonnet_MCPon.json`
- `~/copilot-ledger-data/captures/co-ide-exports/t6_B_agent_sonnet_warm_r1.json`

CL-IDE (supplementary):
- `~/copilot-ledger-data/captures/cl-ide-transcripts/CL-IDE_extension_OFF.jsonl`
- `~/copilot-ledger-data/captures/cl-ide-transcripts/CL-IDE_extension_ON.jsonl`

Raw captures live **outside git** at `~/copilot-ledger-data/captures/`. The in-git
`docs/content-lab/data/` files (`harness-data-FINAL.md`, `system-prompt-comparison.md`,
`harness-levers-taxonomy.md`) are derived summaries; this folder re-verifies the headline
numbers directly from the raw captures.

## Metric definitions (so the article cites them consistently)

- **First-call footprint.** API-reported `prompt_tokens` on the *first* model call of a
  session = `input_tokens` (uncached) + `cache_creation_input_tokens` + `cache_read_input_tokens`.
  This is the real billed input surface, not an estimate.
- **SHAPE tokens (chars/4).** A cheap size proxy used when only text is available (e.g.
  system-prompt char counts). Anthropic packs ≈3.7 chars/token, so chars/4 **underestimates
  the exact count by ~8–9%.** Always report SHAPE sizes with "≈" as a floor. Where the
  published Article 3 needed precision it rescaled to chars/3.7.
- **toolDefsShare.** toolDef tokens / prefix tokens — how much of the cold payload is the
  tool catalog.
- **cacheHitRate / cache-read rate.** cache-read tokens / (cache-read + cache-creation +
  fresh input). Single-session value comes from the structural run; the *token-weighted*
  40-run value is the durable one.
- **Cost.** Two distinct things, never blended:
  - **Native credits** — exact GitHub AI Credits the Copilot CLI was billed
    (`copilot_usage.total_nano_aiu` / 1e9). **Authoritative spend.** Only Copilot exposes this.
  - **Token-normalized USD** — modelled from a pricing table for cross-agent *efficiency*
    comparison only. Not real spend. Used when comparing Copilot vs Claude like-for-like.

## Evidence labels (used in every dossier)

- **Direct evidence** — read straight off a capture (wire body, export, digest, ledger).
- **Inference** — a behavioural prediction from prompt text or one capture; needs
  N≈10/condition before any ranking claim.
- **Speculation** — plausible, unverified; flagged so the writer never states it as fact.

## What this evidence does NOT claim

- It does **not** rank harnesses on quality. Footprint and cost are efficiency facts, not
  "better/worse" judgements (Article 2 §"different isn't better").
- Single-session prefix numbers are exact for *that* run but not a distribution; behavioural
  claims lean on the 40-run batch.
- VS Code prefix numbers fold system + skills + context into one block, so only the **tools
  array** is cleanly separable there (see dossier 03).

## Dossier map

| File | Backs article section |
|---|---|
| `01-first-call-footprint.md` | "Before you type anything" / the footprint table |
| `02-system-prompt-and-autonomy.md` | "The system instructions" / autonomy posture |
| `03-tool-catalog.md` | "The tools" / discovery & deferral |
| `04-mcp-config-lever.md` | "MCP" as a config surface |
| `05-memory-and-skills.md` | "Memory and skills" |
| `06-work-orchestration-and-cost.md` | "How work gets done" / the cost gap |
| `07-caching-and-context.md` | "Caching" / "Long sessions" |
| `08-control-matrix-and-levers.md` | "The control matrix" / the levers framing |
