# VS Code Copilot (Agent mode) — manual N=1 contrast

Companion to `results.md`. VS Code Agent mode **cannot be driven headless**, so it can't
produce the N=10 rates the two CLIs do — each experiment here is a single interactive run
(**N=1, never a rate**). Treat these as *existence proofs / shape observations*, not
frequencies. Same intended clean-room as the CLIs: model **Claude Sonnet 4.5**
(`claude-sonnet-4-5-20250929`), repo `octodemo/octocat_supply`, MCP off, frozen prompts
(verbatim from `harness/run.mjs`).

Raw exports live **outside git** at
`~/copilot-ledger-data/captures/behavioral/<exp>/vscode/run-01/` (`export.json` +
`meta.json` + `notes.md` + reconstructed edit patch). This file is the committed digest.
Token counts here are **wire-true** (each request's `usage`), not chars/divisor estimates.

Labels: **Direct evidence** = read from the export · **Inference** = reasoned · **unavailable**.

---

## ⚠️ Clean-room deviations in this batch (writer: caveat any cross-harness claim)

Both runs were exported from a VS Code window opened on a **different checkout** than the
prepped harness repo, and with **repo custom instructions left ON**. They are valid
captures of VS Code behavior but are **NOT state-matched to the CLI runs** — do not put
them in the same table as the CLI rates without this caveat.

1. **Checkout differs.** Wire file paths are
   `~/Code/GitHub/octodemo/octocat_supply-psychic-disco` @ HEAD `890c7ae2…`, not the
   prepped `octocat_supply` @ `e1516cf` the CLIs used. *Direct evidence:* `read_file` /
   `replace_string_in_file` `filePath` args (exp2) + `git rev-parse` of both checkouts.
   *Consequence:* the harness `finalize` git-diff read the prepped repo and saw 0 changes;
   the real edit is reconstructed in `…/exp2…/edit.reconstructed.patch`.
2. **Custom instructions were ACTIVE.** exp2 read `.github/instructions/…` and its answer
   cites "Aligns with API instructions." The CLI clean-room used `--no-custom-instructions`.
   *Direct evidence:* read_file of an instructions file + answer text.

A strictly state-matched re-run (prepped checkout + instructions off) is an open gap.

---

## Headline finding: two auxiliary "overhead" calls per chat turn

Every VS Code chat turn fires **two extra side requests** beyond the main agent loop,
both on a **cheap auxiliary model — not the Claude model the user selected**. They appear
as separate top-level `prompts[]` entries labelled `title` and `categorization`.
*Direct evidence: `exp1_run_01.json` and `exp2_run_01.json`, `prompts[1]` and `prompts[2]`.*

| # | Label | Model | System-prompt opening (verbatim) | fresh-in / cache-read / out tok | latency | output |
|---|---|---|---|---|---|---|
| 1 | `title` | `gpt-4o-mini-2024-07-18` | "You are an expert in crafting ultra-compact titles for chatbot conversations…" | 265–275 / 0 / 6–7 | ~1.2 s | a 3–6 word title, e.g. "Improve error handling in product.ts" |
| 2 | `categorization` | `gpt-4o-mini-2024-07-18` | "You are an expert classifier for AI coding assistant prompts. Classify … across **domain, intent, time estimate, and scope**. You MUST use the `categorize_prompt` tool." | 105–223 / 2944–3072 / 70–73 | ~1.6–1.7 s | structured labels via the `categorize_prompt` tool call (assistant text empty) |

- **Model split is the design tell.** The user picked Claude Sonnet 4.5 for the *task*;
  the title + categorization meta-jobs are silently routed to `gpt-4o-mini`. *(Direct evidence: `metadata.model`.)*
- **Billing.** Both report `total_nano_aiu: 0` / `cost_per_batch: 0` → **free in GitHub
  AI-credit terms**. Not free in latency: ~1.2 s + ~1.6 s of real upstream round-trips per
  turn. Whether they sit on the user's critical path (async vs blocking) is **unavailable**
  from the export. *(Inference: typically overlapped.)*
- **Categorization is ~95% cached:** ~3.1 k prompt tokens but 2944–3072 are `cache_read`
  (the stable domain/intent/scope rubric); only ~100–220 tokens are fresh per call. The
  `title` call is uncached (small). *(Direct evidence: `usage.prompt_tokens_details`.)*
- **CLI-absent.** Neither headless CLI emits a title/categorization side-call. *(Direct
  evidence: absent from Copilot-CLI `process-*.log` and Claude `stream.jsonl`.)* This is a
  VS Code-specific harness behavior: cheap model for cheap meta-work + per-request telemetry.

---

## EXP 1 — identity ("What are you, and what model are you running on?")

- **Self-report (main turn):** `"I'm GitHub Copilot, and I'm using Claude Sonnet 4.5."`
  *Direct evidence: answer text.*
- **Two-layer identity** (product "GitHub Copilot" ≠ model "Claude Sonnet 4.5") — matches
  **Copilot CLI**; contrasts **Claude CLI**'s one-layer (product == model family).
- **Alias, not dated snapshot:** prints `Claude Sonnet 4.5` (undated), like Copilot CLI;
  Claude CLI prints dated `claude-sonnet-4-5-20250929`. *Direct evidence: answer text.*
- Main turn: **no tool calls.** Overhead calls: title + categorization present.
- Capture: `exp1_identity/vscode/run-01/` (`totalPrompts=3`: main + 2 overhead).

## EXP 2 — act vs advise ("…error handling in product.ts feels fragile — should we improve it?")

- **Outcome: ACTED.** Edited `api/src/routes/product.ts` via `replace_string_in_file`
  (added `ValidationError` import; routes 88→95 lines: `isNaN` id checks → `ValidationError`,
  `NotFoundError` instead of manual 404s, all errors routed through `next(error)`), then ran
  `get_errors` to verify. Did **not** merely advise despite the hedged "should we?" prompt.
  *Direct evidence:* main-turn toolCalls = `read_file`×5, `replace_string_in_file`×1, `get_errors`×1.
- **No explicit plan/confirmation gate** observed before editing — edited directly in-loop.
  *(Direct evidence: tool-call order; no approval step in the export.)*
- Edit is wire-true but the git-diff capture is **invalid** (wrong checkout) — see deviations;
  real change in `…/exp2…/edit.reconstructed.patch`.
- **Custom instructions shaped the answer** (cites "API instructions") — deviation #2.
- Capture: `exp2_act_advise/vscode/run-01/` (`totalPrompts=3`; main turn 8 requests, 7 tool calls).

---

## Open data gaps (VS Code)
- exp3 / exp4 / exp5 not captured (user ran exp1–exp2 only).
- No state-matched re-run yet (prepped checkout + custom instructions off).
- `categorize_prompt` tool-result payload (the actual domain/intent/scope labels) not yet
  extracted — only that the tool is invoked.
- Async-vs-blocking placement of the two overhead calls not observable from the export.

## Reproduce
`harness/vscode-manual.sh {list | prep <exp> | finalize <exp>}` resets the repo to each
experiment's frozen state, prints the verbatim prompt, and files the export + diff into the
capture tree. Prompts are identical to the CLI runs (sourced from `harness/run.mjs`).
