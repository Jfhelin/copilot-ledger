# Tooling profile — GitHub Copilot in VS Code (Agent mode)

> Supporting research for [`article-03-what-your-ide-sends.md`](../../article-03-what-your-ide-sends.md).
> This is a shared human/agent scratchpad, not published copy.
> Companion to [`harness-profile-copilot-vscode.md`](./harness-profile-copilot-vscode.md):
> that file profiles the **system prompt**; this one profiles the **tool / skill /
> sub-agent surface** sent over the wire.

**Capture.** Same baseline run as the system-prompt profile, read from a Copilot Chat
export on 2026-06-09.
**Model.** Claude Sonnet 4.5.
**Repo / prompt.** `octodemo/octocat_supply`; fixed task *"Explain this repository to a
new developer: purpose, components, data flow, install/run/test."*
**Source capture.** `co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json` — tool array at
`prompts[0].logs[1].metadata.tools` (56 tool objects with `defer_loading` flags); skills
and sub-agents from the `<skills>` and `<agents>` blocks in the system message
(`messages[0].content[0].text`). Raw captures live outside git at
`~/copilot-ledger-data/captures/`.
**Tool surface size.** 56 native tools; tool schemas ≈16,600 tokens (chars/4) ≈ **80.5%**
of the 20,598 API-reported `prompt_tokens` — the highest tool share of the three.
**Token divisor.** Shape-token counts use **chars/4** (dossier convention); the published
Article 3 uses **chars/3.7**, so figures here run ~7% low — normalize before quoting. (The
80.5% share is measured against the API's own `prompt_tokens`, not a divisor estimate.)

All quotes below are **direct evidence** from the captured export. Predicted behaviors
are labelled **Inference** and would need N=10/condition runs before any ranking claim.

> ⚠️ **Correction vs the system-prompt profile.** The companion `harness-profile-` file
> says "~37 skills … 56 native tools in the flat catalog." Verified against the raw
> export, the truth is **16 skills** and a **gated** catalog: **23 eager + 33
> `defer_loading:true`** tools behind a `tool_search` step (not flat). Numbers in *this*
> file are the corrected, wire-verified ones.

---

## One-line thesis

A **big, extension-stuffed catalog the engineer then had to manage**: 56 tools is so
heavy that the surface ships its own gate (`tool_search` + `defer_loading`) and hides the
mechanics from the user (*"NEVER say the name of a tool"*) — capability maximized, then
damage-controlled.

## Top design decisions

- **Ship everything the IDE can do, then gate most of it.** 56 schemas are all present
  (full token cost paid), but **33 carry `defer_loading:true`** and surface only after
  the model calls `tool_search`. 23 load eagerly. The bet: keep the *active* choice set
  small without dropping any capability. *(Direct evidence: `defer_loading` on 33 objects.)*
- **Lean on the extension ecosystem.** Of 56 tools, **18 are extension-contributed** (8
  Jupyter notebook + 10 browser/Playwright) and **all 18 are deferred**. The apparent
  catalog is inflated by installed extensions, not product-default commitment.
- **IDE-exclusive tools are the whole point.** `get_errors`, `vscode_renameSymbol`,
  `vscode_listCodeUsages`, `run_in_terminal`, `runSubagent`, `manage_todo_list` — things
  a CLI can't offer. The harness sells *being inside the editor*.
- **A curated, named sub-agent roster.** `runSubagent` (eager, tool #36) dispatches **8
  named agents** from an `<agents>` block — a fixed menu, ~400-char schema, stateless
  one-shot. The opposite of the CLIs' open-ended `Agent`/`task`.
- **Skills as lazy stubs.** 16 skills appear in a `<skills>` block as name + description
  + `<file>` path; bodies are pulled only when the model `read_file`s them. Zero skill
  bodies on the cold turn.
- **Protect the expensive operations.** *"do not call semantic_search in parallel"* and
  *"Don't call the run_in_terminal tool multiple times in parallel"* — concurrency is
  encouraged for cheap reads, fenced off for costly/side-effectful ones.
- **Hide the machinery.** *"NEVER say the name of a tool to a user"* — the 56-tool reality
  is deliberately invisible in the UX.

## The catalog at a glance (56 tools)

| Group | Eager (L) | Deferred (D) |
|---|---|---|
| File read / write / edit | `read_file`, `create_file`, `replace_string_in_file`, `multi_replace_string_in_file` | `create_directory`, `create_new_workspace` |
| Search / explore | `file_search`, `grep_search`, `semantic_search`, `list_dir`, `tool_search` | `github_repo`, `github_text_search`, `get_vscode_api` |
| Terminal | `run_in_terminal`, `get_terminal_output`, `send_to_terminal`, `kill_terminal` | `terminal_last_command`, `terminal_selection` |
| VS Code ops | `vscode_renameSymbol`, `vscode_listCodeUsages`, `vscode_askQuestions` | `run_vscode_command`, `install_extension`, `vscode_searchExtensions_internal` |
| Tasks / diagnostics | `manage_todo_list`, `get_errors` | `create_and_run_task`, `run_task`, `get_task_output`, `testFailure` |
| Memory / state | `memory`, `session_store_sql` | `resolve_memory_file_uri` |
| Sub-agents | `runSubagent` | — |
| Web / media | `fetch_webpage`, `view_image` | — |
| Notebook (ext) | — | 8 tools incl. `edit_notebook_file`, `run_notebook_cell`, `create_new_jupyter_notebook` |
| Browser/Playwright (ext) | — | 10 tools incl. `open_browser_page`, `click_element`, `run_playwright_code`, `screenshot_page` |

**Split:** 23 eager (~8.8k tok) / 33 deferred (~6.3k tok). 38 core Copilot + 18 extension.
*(Direct evidence: per-object `defer_loading`; chars/4 token estimate.)*

## Sub-agent roster (`<agents>` block, 8 named)

`API Specialist`, `API Test Writer`, `BDD Specialist`, `tdd-red`, `tdd-green`,
`tdd-blue`, `Walkthrough Writer`, `Explore`. Selected by name string; stateless,
one-shot, no background/parallel param. Curated and fixed — not an arbitrary type enum.
*(Direct evidence: `runSubagent` schema line 712; `<agents>` block.)*

## Skills roster (16, lazy-loaded via `read_file`)

| Source | Count | Examples |
|---|---|---|
| Core Copilot extension (app bundle) | 5 | `troubleshoot`, `chronicle`, `agent-customization`, `get-search-view-results`, `project-setup-info-local` |
| GitHub Pull Request extension | 6 | `create-pull-request`, `address-pr-comments`, `suggest-fix-issue`, `form-github-search-query`, … |
| Chat Customizations Eval extension | 2 | `analyze-prompt`, `fix-customization-evaluation-diagnostics` |
| Repo-level (`.github/skills/`) | 2 | `api-endpoint`, `walkthrough-writer` |
| User-level (`~/.agents/skills/`) | 1 | `microsoft-foundry` |

**8 of 16 skills come from installed extensions; only 5 are core.** Same pattern as the
tools: extensions inflate the visible catalog. *(Direct evidence: `<file>` paths in
`<skills>` block.)*

## Memory & state

Three surfaces — the richest memory model of the three harnesses.

| Surface | Defer | Scope | Mechanism |
|---|---|---|---|
| `memory` | eager | **3 tiers**: user (`/memories/`, cross-workspace persistent), session (`/memories/session/`, per-conversation — *"Cleared after the conversation ends"*), repo (`/memories/repo/`, workspace-local) | file CRUD (`view`/`create`/`str_replace`/`insert`/`delete`/`rename`) |
| `resolve_memory_file_uri` | **deferred** | resolves a `/memories/...` path → URI | helper for `setArtifacts` |
| `session_store_sql` | eager | cross-session history (past sessions) | SQLite, **read-only** (SELECT/WITH); tables `sessions`/`turns`/`session_files`/…; schema via the `chronicle` skill |

- **It tells the model what to put where — and *encourages* storing code facts.** Repo scope
  is explicitly for *"codebase conventions, build commands, project structure facts, and
  verified practices."* This is the **opposite** of a "don't store architecture, re-read it"
  refusal; no such refusal appears in any of these three captures. *(Direct evidence,
  `memory` schema.)*
- **Read/write split.** `memory` is full read/write file CRUD; `session_store_sql` is
  read-only history. Both costs fold into the eager-tool total (counted in the ~8.8k eager
  budget); not separately broken out here.
- **UX consequence (Inference).** Persistence spans three lifetimes (conversation / repo /
  user) without the user hand-managing files — but it's only as good as what the model
  remembers to write.

## Version stability (not captured)

No second VS Code data point: **Agent mode can't be driven headless**, so a fixed-prompt
rerun at a different build isn't scriptable the way the two CLIs are. Treat the 56-tool /
23-eager-33-deferred / 16-skill figures as a **single-build snapshot (2026-06-09)**; drift
across VS Code / extension versions is **unavailable**.

## UX consequences (Inference)

1. **Capability ceiling is highest, but so is the hidden cost.** ~80% of the prefix is
   tool schema before the user types — the price of "everything the IDE can do."
2. **The catalog the model *acts on* is smaller than the one it pays for.** Gating keeps
   the active choice set near 23, but the token bill is for all 56.
3. **What's installed shapes the agent.** Two users with different extensions get
   materially different tool/skill surfaces from the same product.
4. **Editor-native moves the CLIs can't make.** Real rename-symbol, find-all-references,
   live diagnostics, browser validation — the differentiator is being in the IDE.
5. **The agent feels tidy because the mechanics are hidden** (*"NEVER say the name of a
   tool"*), even though 56 tools are churning underneath.

## Notable quirks / tells

- "Full cost, gated activation": deferral here protects the model's *attention*, not the
  *token budget* — schemas are present regardless. A real contrast with Copilot CLI's
  slim-catalog progressive disclosure.
- All 18 extension tools deferred = a deliberate "core eager, ecosystem on-demand" line.
- The companion sibling export `CO-IDE_CopilotChat_sonnet4.5_MCPon.json` is **mislabeled**
  — it's actually a Claude Code CLI session (24 native incl. `Agent`/`Bash`/`Cron*`/
  `EnterPlanMode` + 71 `mcp__` = 95 tools). Do **not** cite it as Copilot-in-VS-Code.
  *(Direct evidence: tool names in that file.)*

## Open data gaps

- No second build snapshot (headless Agent mode unavailable) — version drift **unavailable**.
- Per-tool token weights are chars/4 estimates from schema text, not API-reported per-tool
  costs.
- The eager/deferred token split (~8.8k / ~6.3k) is an estimate, not a wire-reported figure.
- Exact `tool_search` trigger conditions (what makes the model fetch a deferred tool) not
  exercised in this capture.
