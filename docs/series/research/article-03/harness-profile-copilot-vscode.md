# Harness profile — GitHub Copilot in VS Code (Agent mode)

> Supporting research for [`article-03-what-your-ide-sends.md`](../../article-03-what-your-ide-sends.md).
> This is a shared human/agent scratchpad, not published copy.

**Capture.** Baseline system prompt, read from a Copilot Chat export on 2026-06-09.
**Model.** Claude Sonnet 4.5.
**Repo / prompt.** `octodemo/octocat_supply`; fixed task *"Explain this repository to a
new developer: purpose, components, data flow, install/run/test."*
**Source capture.** `co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json` (system message in the
first request's `requestMessages`; final answer in the last request's response). Raw
captures live outside git at `~/copilot-ledger-data/captures/`.
**System prompt size.** ~32.0k chars (system block). **16 skills** surface as lazy
`<skills>` stubs (not folded into the prompt body); the tool catalog is **gated, not
flat** — **23 eager + 33 `defer_loading:true`** behind a `tool_search` step (all 56 are
native to VS Code; no MCP and no third-party extension surface in this capture).
*(Corrected — see [`tooling-profile-copilot-vscode.md`](./tooling-profile-copilot-vscode.md).
An earlier draft of this line claimed "~37 skills … 56 native tools in the flat catalog";
both figures were wire-falsified and are preserved here per the correction-log rule.)*

All quotes below are **direct evidence** from the captured prompt text. Predicted
behaviors are labelled **Inference** and would need N=10/condition runs before any
ranking claim.

---

## One-line thesis

A terse, tool-orchestrating **IDE operator**: act inside VS Code, implement changes
directly, hide the tool mechanics, and keep working until the task is done.

## Top design decisions

- **Identity lock.** *"respond with 'GitHub Copilot'"* and *"state that you are using Claude
  Sonnet 4.5."* Pins product and model identity, preventing improvisation or evasive
  branding.
- **Policy-first refusal path.** *"Follow Microsoft content policies"* and *"only respond
  with 'Sorry, I can't assist with that.'"* Safety behavior is intentionally canned — no
  explanation, no negotiation.
- **Action over advice.** *"By default, implement changes rather than only suggesting
  them."* Not a Q&A bot — it modifies the workspace when useful.
- **Autonomous persistence.** *"Continue working until the user's request is completely
  resolved"* and *"Do not stop or hand back to the user when you encounter uncertainty —
  research or deduce the most reasonable approach and continue."*
- **Heavy task tracking.** *"Utilize the manage_todo_list tool extensively."* Wants visible,
  stateful progress for complex work to avoid half-finished edits.
- **Parallel but controlled discovery.** *"parallelize discovery efficiently,"* but *"do not
  call semantic_search in parallel"* and *"Don't call the run_in_terminal tool multiple times
  in parallel."* Optimizes read-only context gathering while protecting expensive or
  side-effectful operations.
- **Tool-name secrecy.** *"NEVER say the name of a tool to a user."* The UX should feel like
  Copilot acting naturally, not exposing internal APIs.
- **IDE-native file discipline.** *"always use the absolute file path"* and *"NEVER try to
  edit a file by running terminal commands unless the user specifically asks for it."*
  Strongly prefers editor/file tools over shell hacks.

## Tone & verbosity contract

*"Keep your answers short and impersonal,"* *"Optimize for conciseness,"* *"Target 1-3
sentences for simple answers,"* and it bans ritual phrasing — respond *"directly without
phrases like 'Here's the answer:', 'The result is:', or 'I will now…'."*

**What the user sees:** compact, procedural status updates — clipped and productized, fewer
pleasantries and caveats than a default model.

## Autonomy & stopping behavior

Unusually strong for an interactive surface: *"You can call tools repeatedly,"* *"Don't give
up unless you are sure the request cannot be fulfilled,"* *"Only terminate your turn when you
are certain the task is complete."* Inside the IDE this creates a semi-autonomous worker that
reads, searches, edits, validates, and continues without asking — unless blocked by missing
capability or unresolvable ambiguity.

## Predicted behavioral fingerprint (Inference)

1. **Calls itself "GitHub Copilot," not Claude** (*"When asked for your name… 'GitHub
   Copilot'"*).
2. **Gives exact short refusals** for disallowed content (*"Sorry, I can't assist with
   that."*).
3. **Avoids naming internal tools** in prose (*"NEVER say the name of a tool to a user"*).
4. **Creates todo lists for multi-step work** (*"Utilize the manage_todo_list tool
   extensively"*).
5. **Edits through IDE tools, not shell redirection** (*"NEVER try to edit a file by running
   terminal commands"*).
6. **Batches independent reads/searches but serializes terminal commands** (*"prefer calling
   them in parallel"* vs *"Don't call the run_in_terminal tool multiple times in parallel"*).
7. **Implements first, explains second** (*"implement changes rather than only suggesting
   them"*).

> Observed in this capture: the produced final answer is ~629 words — the most clipped of
> the three surfaces — with ASCII diagrams and zero emoji, consistent with *"short and
> impersonal."*

## Notable quirks / tells

- The strongest tell is **UX concealment** — *"NEVER say the name of a tool"* reveals a
  product desire to make tool use invisible.
- Intensely IDE-specific: workspace-relative markdown links, special notebook rules, browser
  tools encouraged for UI validation, terminal editing discouraged.
- A productive tension: *"Keep your answers short and impersonal,"* yet it also requires
  *"brief progress update[s]"* and extensive todo tracking — the agent is **managed
  concision**: terse to the user, heavily orchestrated underneath.
