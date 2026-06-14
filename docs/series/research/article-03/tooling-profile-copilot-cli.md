# Tooling profile — GitHub Copilot CLI (headless)

> Supporting research for [`article-03-what-your-ide-sends.md`](../../article-03-what-your-ide-sends.md).
> This is a shared human/agent scratchpad, not published copy.
> Companion to [`harness-profile-copilot-cli.md`](./harness-profile-copilot-cli.md):
> that file profiles the **system prompt**; this one profiles the **tool / skill /
> sub-agent surface** sent over the wire.

**Capture.** Same baseline run as the system-prompt profile, captured from the wire on 2026-06-09.
**Model.** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`). CLI version `v1.0.60`.
**Repo / prompt.** `octodemo/octocat_supply`; fixed task *"Explain this repository to a
new developer: purpose, components, data flow, install/run/test."*
**Source capture.** `structural-prefix/copilot/` — `digest.json` (`toolCatalog.names`,
`prefix.representative.topTools`) reconciled with the raw `logs/process-*.log` `Tools:`
debug block (full JSON schemas, lines 507–1062). Raw captures live outside git at
`~/copilot-ledger-data/captures/`.
**Tool surface size.** 19 native tools; tool definitions ≈8,064 shape tokens =
**54.2%** of the ~14,877-token request prefix.

All quotes below are **direct evidence** from the captured tool schemas. Predicted
behaviors are labelled **Inference** and would need N=10/condition runs before any
ranking claim.

---

## One-line thesis

A **lean, composable operator's toolbox**: a small flat set of orthogonal primitives,
where every richer capability (skills, sub-agents, cross-session memory) is delivered as
a slim *catalog entry* the model expands on demand — keeping the prefix small and
predictable no matter how much is registered behind it.

## Top design decisions

- **Flat, small, always-on.** All 19 schemas ship on every request — no deferral, no
  gating (`prefix.representative.toolCount = 19`). The bet: 19 is small enough that
  paying for the whole catalog every turn is cheaper than a discovery round-trip.
- **Decompose the shell into a process cluster.** Rather than one `bash`, the engineer
  shipped **five** tools — `bash` / `write_bash` / `read_bash` / `stop_bash` /
  `list_bash` — turning the terminal into a manageable async TTY. `detach: true` is
  documented as *"ALWAYS use for servers, daemons, and any process that must stay
  alive"* — first-class intent to run background services mid-session.
- **Sub-agents as the heavy bet.** `task` is the single heaviest schema at **1,544 tok
  (19.1% of all tool tokens)** because its description embeds the whole agent roster.
  Delegation is a headline capability, not an afterthought.
- **Skills ride inside a tool, not the prompt.** The `skill` tool (741 tok) carries an
  `<available_skills>` catalog in its own `description`. `skillBlockCount = 0` — zero
  skill bodies in the prefix. The model picks by name; the harness loads the body at
  call-time.
- **Two SQL scopes, two tools.** `sql` (205 tok, per-session scratchpad, write-enabled)
  vs `session_store_sql` (1,255 tok, read-only DuckDB window over *all past sessions*).
  Memory is split by lifetime into two distinct surfaces.
- **A tool purely for the UI.** `report_intent` (434 tok) emits a ≤4-word gerund label to
  the terminal; its output never returns to the model. The product's progress bar is
  encoded as a tool contract.
- **Self-documentation is a tool, not prefix.** `fetch_copilot_cli_documentation`
  (zero-parameter) keeps "how do I use the CLI?" knowledge out of the always-on prompt.

## The catalog at a glance

| Group | Tools | Notable weight |
|---|---|---|
| File ops | `view` (370), `create`, `edit` (238) | no `delete`/`move` — deletion goes through `bash` |
| Shell cluster | `bash` (679), `write_bash` (346), `read_bash` (278), `stop_bash`, `list_bash` | async TTY + `detach` |
| Search | `grep` (487), `glob` (165) | content vs structure; no semantic/vector search |
| Sub-agents | `task` (**1,544**), `read_agent` (439), `list_agents` (248) | heaviest schema |
| Skills | `skill` (741) | catalog embedded in description |
| SQL / state | `session_store_sql` (1,255), `sql` (205) | cross-session vs per-session |
| Web / docs | `web_fetch` (177), `fetch_copilot_cli_documentation` | gated by `DISABLE_WEB_TOOLS` |
| Meta / UI | `report_intent` (434) | side-channel to the terminal |

## Sub-agent roster (inside the `task` schema)

**6 built-in types** (Direct evidence, wire log 1020–1029):

| Type | Default model | Role |
|---|---|---|
| `explore` | Haiku | fast parallel codebase research |
| `task` | Haiku | run commands; brief on success, full output on failure |
| `general-purpose` | Sonnet | full toolset, high-reasoning multi-step work |
| `rubber-duck` | — | high-signal feedback on plans/implementations |
| `code-review` | — | reviews diffs; *"Will NOT modify code"* |
| `research` | — | thorough searches with citations |

**3 org-injected custom agents** (this deployment) — proof the roster is extensible at
request-time: `compliance-bot` (enterprise compliance vs a named docs repo),
`documentation-specialist`, `react-upgrade-sp` (React 18→19 audit). Custom agents are
appended as `agent_type` enum members, so the org's choices literally grow the `task`
schema's token cost. *(Direct evidence, wire log 1021–1029.)*

## Skills roster

Two skills visible this run, carried as catalog stubs inside the `skill` tool:
`microsoft-foundry` (`location: user`) and `customize-cloud-agent` (`location: builtin`).
The `location` split implies a two-tier model (built-in vs per-user/org injection).
Invocation is a *"BLOCKING REQUIREMENT … BEFORE generating any other response."*

## UX consequences (Inference)

1. **Cheap to extend, predictable to pay for.** Registering more skills/agents grows a
   slim catalog, not the whole prefix — so the per-turn floor stays ~flat.
2. **Background services feel native.** The 5-tool shell + `detach` means "spin up the
   dev server and keep going" is a designed-for path, not a hack.
3. **Delegation is the default mental model.** A 1,544-tok `task` schema in a 19-tool set
   pushes the agent toward "manager of sub-agents" on broad tasks.
4. **"What did I do last week?" is answerable.** `session_store_sql` gives the agent a
   real cross-session memory the IDE and Claude CLI baselines don't expose.

## Notable quirks / tells

- The org's compliance/React-upgrade agents sitting in a shipped schema is the clearest
  "harness-engineer decision → end-user surface" artifact in the whole corpus.
- `MULTI_TURN_AGENTS: false` is set even though `read_agent` exposes `since_turn` —
  capability built, UI/loop feature flag-gated. *(Direct evidence for flag; Inference.)*
- No `delete`/`move`, no semantic search: the built-in set is deliberately minimal,
  pushing anything fancier toward `bash`, `skill`, or MCP.
