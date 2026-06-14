# Behavioral study — do the harness design decisions show up in behavior?

> Supporting research for [`article-03-what-your-ide-sends.md`](../../../article-03-what-your-ide-sends.md).
> This is a shared human/agent scratchpad, not published copy.
> Companion to the structural dossiers in this folder
> (`tooling-profile-*.md`, `harness-profile-*.md`): those profile what each harness
> **sends over the wire**; this file tests whether those structural choices produce
> **observable behavioral differences** when the SAME model runs the SAME prompts.

## What this is

Five frozen prompts, run **N=10** per harness on **two CLIs** holding everything
constant except the harness:

- **Model.** `claude-sonnet-4-5-20250929` — verified per run (Copilot via digest
  `rollups.primaryModel`; Claude via the `assistant.message.model` snapshot in each
  stream). Runs not on this snapshot are discarded (see *Validity*).
- **Repo / commit.** `octodemo/octocat_supply` pinned at `e1516cf` (main) for EXP 1/2/4/5;
  fixture branch `exp/offbyone` @ `a9530a6` for EXP 3.
- **MCP.** OFF for both. Copilot: `--disable-builtin-mcps` **plus** the user
  `~/.copilot/mcp-config.json` sidelined for the batch; `--no-custom-instructions`.
  Claude: `--strict-mcp-config` (`mcpServers: {}`), no repo/global `CLAUDE.md`.
- **Harness versions.** Copilot CLI `1.0.62`; Claude Code `2.1.173`.

Every value below is **Direct evidence (measured)** from the raw captures unless
labelled **Inference**. Rates are reported only where **N≥10**; the one cell at N=8
is flagged. **This is a tendency study, not a ranking** — no harness is called "better."

**Reproducibility.** Orchestrator + scorer: `~/copilot-ledger-data/behavioral-harness/`
(`run.mjs`, `score.mjs`, outside git). Raw per-run captures (stdout/stream, digest,
`diff.patch`, `row.json`) under `~/copilot-ledger-data/captures/behavioral/<exp>/<harness>/run-NN/`.
Machine-scored rows: `captures/behavioral/results.jsonl`. Prompts are frozen — see
`run.mjs` `EXPERIMENTS`.

---

## Validity

- **100 runs executed; 98 valid.** Both invalid runs are **Claude EXP 5 reps 9–10**,
  which hit the Anthropic account **session limit** mid-batch (`result.is_error = true`,
  answer body = *"You've hit your session limit"*). They are flagged `valid:false` and
  excluded. Claude EXP 5 therefore reports **N=8** pending backfill after the limit reset.
- All 98 valid runs are on `claude-sonnet-4-5-20250929`. Copilot EXP 5 = N=10; every
  other cell = N=10.

---

## EXP 1 — Identity ("What are you, and what model are you running on?")

*main, no edits expected. Flags from the final answer text.*

| harness | n | names model snapshot | self-IDs as Copilot | says "Claude" | deflects |
|---|---|---|---|---|---|
| Copilot CLI | 10 | 10/10 | 10/10 | 10/10 | 0/10 |
| Claude CLI | 10 | 10/10 | 0/10 | 10/10 | 0/10 |

- Both name the dated snapshot every time — **neither deflects** the model question.
- The split is in *product* identity, not model identity: Copilot says it is "GitHub
  Copilot CLI … powered by **Claude** Sonnet 4.5" (both flags fire); Claude says
  "Claude Code … Claude Sonnet 4.5" and never claims to be Copilot.
- **Tell (Direct evidence):** Copilot exposes the alias `claude-sonnet-4.5` in the answer
  text but the dated snapshot only in the digest; Claude prints the dated
  `claude-sonnet-4-5-20250929` in the answer itself.

---

## EXP 2 — Act vs advise ("The error handling in product.ts feels fragile — should we improve it?")

*main, edits allowed. ACTED = `git diff` non-empty after the run; else ADVISED.*

| harness | n | ACTED (changed files) | ADVISED | median answer words |
|---|---|---|---|---|
| Copilot CLI | 10 | 1/10 | 9/10 | 158 |
| Claude CLI | 10 | 0/10 | 10/10 | 168 |

- On a **"should we?"-framed** request, both harnesses overwhelmingly **advise rather
  than edit**, even in headless print mode — answer length is near-identical.
- Copilot acted once (1/10); Claude never did. Both treated the question as a question.
- **Confound:** headless autonomy bias (below) pushes *toward* acting, so the strong
  ADVISE lean here is conservative — interactive sessions would likely advise at least
  as often. **Inference.**

---

## EXP 3 — Scope discipline ("Fix the off-by-one in paginate; it returns one item too many.")

*`exp/offbyone` fixture, edits expected. Target file `api/src/utils/pagination.ts`.*

| harness | n | FIXED | median +ins | median −del | median comments added | touched unrelated files | median tool calls |
|---|---|---|---|---|---|---|---|
| Copilot CLI | 10 | 10/10 | 1 | 1 | 0 | 0/10 | 3 |
| Claude CLI | 10 | 10/10 | 1 | 1 | 0 | 0/10 | 2 |

- On a **precise, well-scoped** bug, the two harnesses are **behaviorally identical**:
  every run is a clean 1-line insertion / 1-line deletion, **no added comments, no
  unrelated files, no new tests**. Surgical scope holds on both.
- Only the path *to* the edit differs slightly: Claude reaches the fix in a median of
  2 tool calls, Copilot in 3 (Copilot opens with `view`, Claude with a read).

---

## EXP 4 — Output shape ("Explain this repository to a new developer …")

*main, no edits. The clearest divergence in the study.*

| harness | n | median emoji | emoji range | runs with ≥1 emoji | median words | ASCII diagram | todo list |
|---|---|---|---|---|---|---|---|
| Copilot CLI | 10 | 3 | 1–5 | 10/10 | 457 | 10/10 | 0/10 |
| Claude CLI | 10 | 0 | 0–10 | 3/10 | 653 | 6/10 | 0/10 |

- **Same model, same prompt, opposite house style.** Copilot's explanation is shorter
  (~457 words), **always** carries emoji section headers (🐱/📦-style, 10/10), and
  **always** draws a box-drawing component diagram. Claude's is longer (~653 words),
  **usually emoji-free** (7/10 have none; one outlier hit 10), and draws the ASCII
  diagram about 60% of the time.
- This is a **shape**, not a quality, difference — both cover purpose/components/data
  flow/install-run-test. The decorative register is harness-authored. **Inference (UX):**
  a reader who dislikes emoji headers will perceive the two as very different tools while
  the underlying model is the same.

---

## EXP 5 — Plan gate ("Add cursor-based pagination to the products listing endpoint.")

*main, edits expected. plan_mode = Claude `EnterPlanMode`/`ExitPlanMode` tool seen
(Copilot has no such tool → always false). planned_before = first substantive tool call
is not an edit.*

| harness | n | EDITED | invoked plan mode | explored before first edit | median files | median +ins | median tool calls | new test files |
|---|---|---|---|---|---|---|---|---|
| Copilot CLI | 10 | 10/10 | 0/10 | 10/10 | 3 | 103 | 34 | 0/10 |
| Claude CLI | 8* | 8/8 | 0/8 | 8/8 | 4 | 141 | 29 | 0/8 |

- \* Claude N=8 (2 runs hit the session limit; backfill pending). Treat the Claude row
  as a **count, not a stabilized rate**.
- On an **open-ended feature** request, both harnesses **dive in and edit headlessly**
  (100% edited), and **both explore before the first edit** (read/grep first) — but
  **neither triggers an explicit plan-mode gate** in print mode, even though Claude
  *ships* `EnterPlanMode`. The plan-mode affordance documented in the tooling dossier is
  **present but unexercised headlessly**. **Inference:** plan mode is an interactive-only
  gate; the headless path bypasses it.
- Spread is in footprint, not direction: Claude's median change is larger (4 files / 141
  insertions) than Copilot's (3 files / 103), with comparable tool counts (29 vs 34).

---

## Cost, cache & latency (descriptive — read the caveats first)

These columns were extracted from the **same raw captures** (Copilot
`digest.json → rollups`; Claude `stream.jsonl` usage + the terminal `result` event)
and joined onto every scored row by `enrich.mjs`. They describe **operational cost of
running each frozen prompt**, not quality. **This is not a price comparison** — see
caveats. Medians over valid runs:

| exp | harness | N | med wall_ms | med llm_calls | med total_tok | med cache_hit | med real_usd |
|---|---|---|---|---|---|---|---|
| exp1_identity | copilot | 10 | 11,551 | 1 | 16,114 | 0.567 | 0.0325 |
| exp1_identity | claude | 10 | 8,751 | 1 | 18,066 | 0.999 | 0.0098 |
| exp2_act_advise | copilot | 10 | 18,089 | 2 | 34,150 | 0.737 | 0.0476 |
| exp2_act_advise | claude | 10 | 22,714 | 2 | 38,031 | 0.950 | 0.0349 |
| exp3_scope | copilot | 10 | 18,781 | 3 | 49,460 | 0.841 | 0.0503 |
| exp3_scope | claude | 10 | 17,556 | 3 | 55,532 | 0.983 | 0.0339 |
| exp4_shape | copilot | 10 | 35,856 | 4 | 80,762 | 0.798 | 0.1053 |
| exp4_shape | claude | 10 | 63,872 | 6 | 132,775 | 0.941 | 0.1238 |
| exp5_plan | copilot | 10 | 181,211 | 26 | 765,148 | 0.956 | 0.4880 |
| exp5_plan | claude | 8 | 150,693 | 22 | 635,400 | 0.965 | 0.4177 |

What is **Direct evidence** here:

- **`llm_calls`** — Copilot `rollups.requests` (responses-with-usage); Claude = count of
  deduped `assistant` completions carrying a `usage` block (`llm_calls_primary_model`
  stores the subset on the snapshot model — Claude spins background **haiku** title-gen
  calls that the total includes).
- **`total_tokens` / cache split** — both harnesses report `input` / `output` /
  `cache_read` / `cache_creation` directly; `reasoning_tokens` is Copilot-only.
- **`cache_hit_rate`** — Copilot reports `rollups.cacheHitRate`; Claude is computed the
  same way: `cache_read / (cache_read + cache_creation + fresh_input)`.
- **`real_spend`** — Copilot `cost.native` is the **exact GitHub AI Credits billed**
  (authoritative; `real_spend_usd` = implied USD at $0.01/credit). Claude
  `result.total_cost_usd` is **Anthropic list USD** (authoritative for that account).
- **`normalized_usd`** — both modelled from the same pricing table (the closest to a
  like-for-like efficiency figure); for Claude it equals `total_cost_usd`.

Two reads that jump out (descriptive, **not** rankings):

- The **cost curve tracks the task, not the harness** — both rise monotonically across
  exp1→exp5 in lockstep (identity ≈ $0.01–0.03; the open-ended exp5 feature ≈ $0.4–0.5
  and ~150–180 s with ~20–26 model calls). The expensive thing is the *kind of prompt*.
- **exp4 is where wall-time and tokens diverge most** — Claude's longer prose answer
  costs ~1.6× the tokens and ~1.8× the wall-time of Copilot's shorter, emoji/diagram
  answer. That is the *same shape finding* (EXP 4) showing up in the cost ledger.

## Confounds observed (report, don't hide)

1. **Headless autonomy bias (EXP 2 & EXP 5).** `-p`/print mode biases both CLIs toward
   *doing* rather than *asking*. So EXP 2's strong ADVISE lean is a conservative floor,
   and EXP 5's 100%-edit / 0%-plan-mode result is a property of the **headless default**,
   not of the harness in interactive use. All CLI results here are "headless default
   behavior." The robust EXP 2/5 signal is the **binary** "did files change?", which does
   not depend on verbosity.
2. **No interactive contrast captured here.** VS Code Agent mode can't be driven
   headless, so the interactive single-shot contrast (where plan gates *do* fire) is the
   user's separate manual N=1 job — **never a rate**.
3. **Snapshot exposure asymmetry (EXP 1).** Copilot does not print the dated snapshot in
   answer text (only the alias); it is pinned and verified via the digest
   `rollups.primaryModel`. Claude prints the dated snapshot directly. The "names snapshot
   10/10" cell for Copilot is scored from the alias + digest, not the answer's date.
4. **Emoji metric (EXP 4).** The detector counts only default-emoji-presentation
   characters and VS16-qualified pictographs; text-default symbols (e.g. `↔`, `→`, `✓`)
   are excluded after an early false positive (`↔` in "models ↔ snake_case"). Spot-checked
   by eye on both harnesses.
5. **Token divisor.** This study reports counts/rates, not shape tokens — the chars/4
   (dossier) vs chars/3.7 (article) convention does not apply here. Flagged for
   consistency with the sibling dossiers.
6. **Cost is confounded by cache warmth + different billing regimes (cost table only).**
   Two reasons cross-harness `real_usd` is **not** a fair price comparison: (a) provider
   prompt-cache warmth depends on session ordering — back-to-back reps warm each
   provider's cache differently (e.g. EXP 1 Copilot rep-01 was **cold**: 15,835
   cache-*creation* tokens, 0% hit; Claude read 18,051 cached at 99.9%), so per-run cost
   swings with cache state, not just work done; (b) `real_spend` is in **different
   commercial units** — GitHub AI Credits (implied USD) vs Anthropic list USD. Use
   `normalized_usd` for efficiency, and treat all cost numbers as **descriptive**.

---

## Headline reads (for the writer — all tendencies, not rankings)

- **Precise task → identical behavior** (EXP 3): scope discipline is the model's, and the
  harness doesn't perturb it.
- **Ambiguous "should we?" → both advise** (EXP 2), even headless.
- **Open-ended feature → both act, neither gates** headlessly (EXP 5); the plan-mode
  affordance exists only in Claude's surface and isn't exercised in print mode.
- **The divergence lives in *shape and identity*, not correctness** (EXP 1, EXP 4):
  decorative register (emoji, diagrams, length) and product self-identification are
  authored by the harness while the model is constant.

## Open data gaps

- Claude EXP 5 backfill (reps 9–10) pending session-limit reset → restore to N=10.
- No interactive (non-headless) captures — plan-mode and act/advise rates under
  interactive use are **not separately observable** from this study.
- Version-stability re-capture for the two CLIs (different date/version) lives in the
  tooling dossiers' *Version stability* sections, not here.
- VS Code N=1 interactive contrast is the user's manual capture; not represented above.

---

## Dataset schema & reuse

`results.jsonl` (100 rows, one per run; `valid:false` on the 2 session-limit Claude
exp5 runs) is intended to be **reusable beyond this study** — e.g. cost/efficiency,
cache-behavior, or tokens-per-edit analyses. Every row joins three layers:
**provenance + behavioral score + operational cost**. Raw artifacts for each row live at
`raw_capture_path` (`digest.json`/`stream.jsonl`, `diff.patch`, `answer.txt`, `row.json`).

| group | fields |
|---|---|
| **provenance** | `experiment`, `harness`, `harness_version`, `model_snapshot`, `repo`, `commit_sha`, `mcp`, `run_index`, `timestamp`, `prompt_id`, `prompt_hash`, `model_ok`, `exit_code`, `valid`, `result_is_error`, `raw_capture_path` |
| **working-tree effect** | `files_changed_count`, `insertions`, `deletions`, `comments_added`, `new_test_files`, `touched_unrelated` |
| **output shape** | `final_answer_word_count`, `emoji_count`, `ascii_diagram_present`, `todo_list_present` |
| **agent behavior** | `first_tool`, `tool_call_count`, `planned_before_editing`, `plan_mode_invoked`, `dove_in`, `edited_without_plan`, `self_id_flags`, `classification` |
| **latency** | `wall_ms` (orchestrator wall-clock, both); `duration_api_ms` (Claude only) |
| **tokens** | `total_tokens`, `input_fresh_tokens`, `output_tokens`, `reasoning_tokens` (Copilot only), `cache_read_tokens`, `cache_creation_tokens`, `cache_hit_rate` |
| **llm/tool calls** | `llm_calls`, `llm_calls_primary_model` (Claude only), `tool_calls_billed` |
| **cost** | `real_spend_value` + `real_spend_unit` (credits vs usd), `real_spend_usd`, `normalized_usd`, `normalized_usd_no_cache` (Copilot only), `cost_enriched` |

The cost/token/latency columns were added by `harness/enrich.mjs` (idempotent; re-derives
from the raw captures, never overwrites the behavioral score). Re-run with
`node enrich.mjs` after any backfill. **Caveats for reuse:** read confound #6 before
comparing `real_usd` across harnesses; `llm_calls` counting differs by harness (see the
cost section); cache columns reflect session warmth, not just work.
