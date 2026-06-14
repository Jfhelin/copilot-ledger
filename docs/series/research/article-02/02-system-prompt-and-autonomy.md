# System prompt & autonomy posture

> Supporting research for [`article-02-more-than-a-model.md`](../../article-02-more-than-a-model.md).
> This is a shared human/agent scratchpad, not published copy.

**Capture.** Baseline system prompts captured from the wire / exports, 2026-06.
**Model.** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`).
**Source.** `structural-prefix/{copilot,claude}/` wire bodies; VS Code & Claude Code exports;
cross-checked against `docs/content-lab/data/system-prompt-comparison.md`.

---

## One-line thesis

The system prompt is where a harness installs its **personality and its rules of
engagement**. The four harnesses ship system prompts of similar *size* but **opposite
autonomy defaults** — same weights, different boss.

## System prompt sizes (Direct evidence)

Character counts of the assembled system prompt text:

| Harness | System prompt (chars) | Notes |
|---|---:|---|
| **Copilot CLI** | ≈26,650 | one cached block; terminal-operator persona |
| **Claude CLI** | ≈28,130 | one string; SDK billing header prepended |
| **VS Code Copilot** | ≈44,165 | **largest** — folds skills + agents + `copilot-instructions.md` |
| Claude Code (VS Code) | ≈26,610 | supplementary harness |

- In SHAPE tokens (chars/4, floor) the two CLIs land at ≈6,657 (Copilot) and ≈7,015
  (Claude) — within ~5% of each other (from `prefix.representative`, dossier 01).
- VS Code is largest because it **bakes the customization surface into the system block**:
  16 `<skill>` + 8 `<agent>` blocks + repo instructions all live inside it (dossier 05).
  That is a packaging choice, not a bigger "personality."

> Divisor note: char counts are exact; the token figures are SHAPE (chars/4) floors and
> undercount the true Anthropic count by ~8–9%.

## The autonomy contrast — opposite defaults (Direct evidence)

This is the sharpest behavioural lever and it costs **zero** extra tokens to flip — it is
pure wording over identical weights.

| | **Copilot CLI** | **Claude CLI** |
|---|---|---|
| Default posture | **proceed autonomously** | **confirm first** |
| Quote | *"running in non-interactive mode… Do not stop to ask questions or request confirmation… make reasonable assumptions and proceed autonomously."* | *"confirm before irreversible actions; authorization stands for the scope specified."* |
| Effect | fewer "Do you want me to…" turns; runs to completion | scope-limited; pauses at irreversible / out-of-scope steps |

Both are steering the **same model**. The divergence in how "pushy" each agent feels is a
prompt decision, not a capability of the weights.

## Section taxonomy — what each prompt chooses to legislate (Direct evidence)

| Copilot CLI sections | Claude CLI sections |
|---|---|
| Tone & style | Doing tasks |
| Search / delegation | Executing actions with care |
| Tool-call efficiency (parallelism) | Memory |
| Code-change rules (lint/build/test) | Context management |
| Safety / sandbox caveats | Security & dual-use refusal preamble |

- Copilot spends its words on **throughput** (parallel tool calls, brevity, validation).
- Claude spends its words on **care** (memory hygiene, context management, an explicit
  security/dual-use refusal block on top of the trained floor).
- Copilot relies more on the model's **trained safety floor**; Claude **prepends** an
  explicit refusal preamble. Different trust models for the same weights.

## Other free wording levers (Direct evidence)

- **Persona.** *"GitHub Copilot CLI, a terminal assistant"* vs *"a Claude agent, built on
  Anthropic's Claude Agent SDK."*
- **Brevity contract.** Copilot: *"limit your response to 100 words or less."* Claude has no
  equivalent hard cap.
- **Embedded telemetry.** Claude's system text begins with an
  `x-anthropic-billing-header: cc_version=…; cc_entrypoint=sdk-cli` line — product plumbing
  riding inside the prompt.
- **Knowledge-cutoff statement.** Claude states *"knowledge cutoff is January 2025"* in its
  environment block; Copilot does not front-load one.

## UX consequences (Inference)

1. Copilot CLI will tend to **finish without checking in**; Claude CLI will tend to **pause
   at risky/ambiguous steps**. Predicted, not yet ranked — needs N≈10/condition.
2. VS Code's larger system block means a **bigger fixed cache-creation cost per cold start**,
   amortized only if the session is long (dossier 07).
3. Identical weights can be made to feel like a cautious pair-programmer or an autopilot
   purely by swapping these paragraphs — the article's core point.

## Notable quirks / tells

- Copilot CLI tells the model it has *"no way to communicate with the user"* yet ships
  extensive reply-formatting rules and a `report_intent` UI hook — a headless mode grafted
  onto an interactive product shell.
- VS Code's "system prompt" is really *system + customization catalog + repo instructions*
  concatenated; comparing its raw char count to a CLI's is apples-to-oranges unless you
  separate the layers (dossier 05).

## Open data gaps

- Autonomy effect on *real* turn counts is asserted from wording; the 40-run batch
  (dossier 06) shows request-count differences but doesn't isolate "paused to ask" events.
- VS Code system-vs-skills split is reconstructed by regex on the export, not a
  harness-provided breakdown.
