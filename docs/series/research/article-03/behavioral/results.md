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
