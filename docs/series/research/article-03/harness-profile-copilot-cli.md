# Harness profile — GitHub Copilot CLI (headless)

> Supporting research for [`article-03-what-your-ide-sends.md`](../../article-03-what-your-ide-sends.md).
> This is a shared human/agent scratchpad, not published copy.

**Capture.** Baseline system prompt, captured from the wire on 2026-06-09.
**Model.** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`).
**Repo / prompt.** `octodemo/octocat_supply`; fixed task *"Explain this repository to a
new developer: purpose, components, data flow, install/run/test."*
**Source capture.** `structural-prefix/copilot/` (`digest.json` + raw `logs/process-*.log`
wire body; `answer.txt` for the produced output). Raw captures live outside git at
`~/copilot-ledger-data/captures/`.
**System prompt size.** ~26.6k chars; 19 native tools; system ≈6,657 shape tokens.

All quotes below are **direct evidence** from the captured prompt text. Predicted
behaviors are labelled **Inference** and would need N=10/condition runs before any
ranking claim.

---

## One-line thesis

A quiet, autonomous **terminal operator**: complete the whole task end-to-end, use tools
aggressively and in parallel, delegate when useful, and report back in minimal,
CLI-friendly prose.

## Top design decisions

- **Autopilot first.** *"running in non-interactive mode and have no way to communicate
  with the user,"* *"Do not stop to ask questions or request confirmation,"* *"make
  reasonable assumptions and proceed autonomously."* Suppresses clarification loops — the
  intended UX is "give a task, the agent just does it."
- **Completion over conversation.** *"You must work on the task until it is completed"* and
  *"Complete the entire task before finishing."* Steers away from partial advice toward
  persistent execution plus validation.
- **Hard brevity pressure.** *"try to limit your response to 100 words or less"* and *"Be
  concise in routine responses."* The operator should feel like a CLI tool, not a chatty
  assistant.
- **Tool throughput as a first-class behavior.** *"CRITICAL: Maximize tool efficiency,"*
  *"USE PARALLEL TOOL CALLING,"* *"Chain related bash commands,"* *"Suppress verbose
  output."* Optimizes wall-clock time and transcript cleanliness.
- **Prescribed search hierarchy.** *"code intelligence tools … > LSP-based tools … > glob >
  grep with glob pattern > bash tool,"* plus *"Use built-in tools instead of bash tools
  whenever possible."* Not a generic shell agent — structured/safer tools come before raw
  terminal.
- **Delegation is normalized.** *"Prefer using relevant sub-agents,"* *"your role changes
  from a coder … to a manager of software engineers,"* *"Once you delegate a scope to an
  agent, that agent owns it."* The native `task` tool reinforces this (explore / task /
  general-purpose / rubber-duck / code-review / research).
- **Validation is mandatory.** *"Always validate that your changes don't break existing
  behavior,"* *"Run the repository linters, builds and tests,"* *"A task is not complete
  until the expected outcome is verified and persistent."* Prevents patch-only completions.
- **Product integration leaks into behavior.** `report_intent` *"is displayed in the user
  interface"* and must be called *"at least once per user message."* A headless agent that
  is nonetheless instrumented for a UI progress surface.

## Tone & verbosity contract

*"try to limit your response to 100 words or less,"* *"Be concise in routine responses,"*
*"For complex tasks, briefly explain your approach before implementing,"* *"Remember that
your output will be displayed on a command line interface."* The `task` tool also returns a
*"brief summary on success"* but *"full output on failure"* — failures are verbose,
successes compact.

**What the user sees:** short status-style messages, terse final summaries, successful
test/build output summarized rather than pasted.

## Autonomy & stopping behavior

Dominant instruction is *proceed*: *"Do not stop to ask questions or request
confirmation,"* *"make reasonable assumptions,"* *"complete the entire task."* Escape
hatches exist (*"Ask for guidance if uncertain"*; background-agent waiting messages) and
safety overrides autonomy (refuse harmful / secret-leaking / copyright / shell-obfuscation
requests; never bypass content-exclusion denials). Practical rule: continue unless blocked
by safety, tool/content policy, or genuine impossibility.

## Predicted behavioral fingerprint (Inference)

1. On ambiguous implementation tasks it **chooses and proceeds** (*"make reasonable
   assumptions and proceed autonomously"*) — fewer "Do you want me to…" turns.
2. Tool calls are **batched** (*"make ALL tool calls in a SINGLE response"*) — parallel
   `view`/`glob`/`grep` rather than one file at a time.
3. **Prefers built-in file/search tools over shell** (*"Use the grep tool instead of …
   bash,"* *"Use the view tool instead of cat/head/tail"*).
4. **Launches sub-agents on broad tasks** (*"manager of software engineers"*).
5. **Final answers are short for a coding agent** (*"100 words or less"*) — though *complex*
   tasks are exempted, so the repo-explainer still ran ~953 words.
6. **Runs tests/builds after code changes** when scripts exist (*"verified and persistent"*).
7. **Adds the Co-authored-by commit trailer** when committing.

> Observed in this capture: the produced `answer.txt` is ~953 words with 🐱 emoji section
> headers and an inline tool-call trace. The prompt has **no emoji prohibition** — a useful
> contrast with the Claude CLI profile.

## Notable quirks / tells

- Says the agent has *"no way to communicate with the user,"* yet carries extensive
  user-facing reply rules and `report_intent` — a headless/autopilot mode grafted onto an
  interactive product shell.
- Conservative safety framing: *"not operating in a sandboxed environment dedicated to this
  task."*
- Bans name-based process killing: *"Commands like pkill, killall … are not allowed."*
- Self-documentation is gated: capability questions must call
  `fetch_copilot_cli_documentation` first — the model is not trusted to describe the product
  from memory.
