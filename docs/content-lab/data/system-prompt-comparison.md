# The 4 system prompts, compared

Raw prompts saved alongside this file in `system-prompts/`:
`copilot-cli.txt`, `vscode-copilot.txt`, `claude-cli.txt`, `claude-vscode.txt`.
All captured on the same repo (octocat_supply) / Sonnet snapshot. System-prompt
structure is a **harness choice**, model-agnostic.

## Size & format at a glance
| Harness | System-prompt chars | Markup style | Skills in prompt | Agents in prompt | Tools described in prompt? | Repo instructions in prompt? |
|---|---:|---|---:|---:|---|---|
| **Copilot CLI** | ~26,650 | Markdown headers + heavy XML tags | 0 (via `skill` tool) | 0 (via `task` tool) | **Yes** — per-tool `<bash>/<view>/<edit>/…` usage guides + examples | No (BARE capture) |
| **VS Code Copilot** | **~44,165** (largest) | Almost all XML | **37 `<skill>`** | **11 `<agent>`** | Light (tool guidance terse) | **Yes** — `copilot-instructions.md` auto-attached |
| **Claude CLI** | ~28,130 | Markdown `#`/`##` | 0 (injected in user msg) | 0 (via `Agent` tool) | No (only in `tools` field) | No (loads CLAUDE.md separately) |
| **Claude Code in VS Code** | ~26,610 | Markdown `#`/`##` | 0 (injected in user msg) | 0 (via `Agent` tool) | No | No |

## Sections per harness

### Copilot CLI — "You are the GitHub Copilot CLI, a terminal assistant built by GitHub"
Markdown behavior headers, then XML blocks:
- `# Tone and style`, `# Search and delegation`, `# Tool usage efficiency`
- `<environment_context>` (cwd, git repo, OS, available tools)
- `<code_change_instructions>` → `<rules_for_code_changes>`, `<linting_building_testing>`, `<using_ecosystem_tools>`, `<style>`
- `<self_documentation>`, `<git_commit_trailer>`, `<tips_and_tricks>`
- `<environment_limitations>` → `<prohibited_actions>`
- `<tools>` → per-tool blocks `<bash>` (+`<shell_security>`), `<view>`, `<edit>`, `<report_intent>`, `<fetch_copilot_cli_documentation>`, `<sql>`, `<grep>`, `<glob>`, `<task>`, each with `<example>`s
- `<tool_preferences>`, `<gh_cli_preference>`, `<code_search_tools>`
- `<system_notifications>`, `<exploration_and_reading_files>`, `<session_context>`, `<content_exclusion_policy>`, `<task_completion>`
- **Autonomy posture:** "running in non-interactive mode… Do not stop to ask… proceed autonomously."

### VS Code Copilot — "You are an expert AI programming assistant, working with a user in the VS Code editor"
Almost entirely XML; dominated by catalogs:
- `<instructions>`, `<mandatory>`, nested `<instructions>/<instruction>` (terse behavior rules)
- `<skills>` → **37 `<skill>` blocks** (each name + long description)
- `<agents>` → **11 `<agent>` blocks**
- `<attachment filePath=".github/copilot-instructions.md">` → the repo's instructions appended verbatim (`# OctoCAT Supply…`, `## High-Level Architecture`, `## General Review Guidance`)
- Tools are advertised via the (virtualized) tools field, not narrated in the prompt.

### Claude CLI — "You are a Claude agent, built on Anthropic's Claude Agent SDK"
(prefixed by `x-anthropic-billing-header: …; cc_entrypoint=sdk-cli;` + security preamble)
Markdown headers:
- `# System`, `# Doing tasks`, `# Executing actions with care`, `# Using your tools`,
  `# Tone and style`, `# Text output (does not apply to tool calls)`, `# Session-specific guidance`
- `# auto memory` → `## Types of memory` (`<types>/<type>` user/feedback/project/reference),
  `## What NOT to save`, `## How to save memories`, `## When to access memories`,
  `## Before recommending from memory`, `## Memory and other forms of persistence`
- `# Environment` (cwd, platform, knowledge cutoff), `# Context management` (+ live `gitStatus`, git user, recent commits)
- **Autonomy posture:** "# Executing actions with care… check with the user before proceeding… authorization stands for the scope specified" (opposite of Copilot CLI).

### Claude Code in VS Code — same template
(prefixed by `cc_entrypoint=sdk-ts;`) — section list is **identical** to Claude CLI.

## The cross-harness story
1. **Two prompt *families*, not four.** The Claude pair (CLI + VS Code) share **one
   Anthropic "Claude Agent SDK" template** — diff is ~5 lines: `cc_entrypoint`
   (`sdk-cli` vs `sdk-ts`), `TaskCreate` vs `TodoWrite`, a slightly different
   "prefer dedicated tools" list, a CLI-only `ultrareview` note, and the memory path.
   The Copilot pair do **not** share a prompt: CLI is a "terminal assistant", VS Code
   is an "expert assistant in the editor" with a totally different structure.
2. **Markup philosophy differs by vendor.** Copilot leans on **XML tags** (esp. VS Code,
   which is almost all XML); Claude uses **Markdown `#` headers** with light XML only
   for memory types.
3. **What each chooses to spend prompt tokens on:**
   - Copilot CLI → **inline tool-usage manuals + examples** (tool guidance duplicated
     alongside the JSON schemas).
   - VS Code Copilot → **catalogs**: 37 skills + 11 agents + the whole
     `copilot-instructions.md` → why it's the biggest (44k).
   - Claude (both) → an **auto-memory subsystem** + autonomy/"care" guidance; tools and
     skills are kept OUT of the system prompt (tools in the `tools` field, skills in a
     first-user-message reminder).
4. **Autonomy is set right here in the prompt:** Copilot CLI "proceed autonomously, don't
   ask"; Claude "confirm before irreversible, scope-limited authorization." Same weights,
   opposite operating defaults — the cleanest single illustration for the article.
5. **Dynamic injection differs:** VS Code Copilot bakes `copilot-instructions.md` into the
   system prompt; Claude injects **live git status + recent commits + git user**; Copilot
   CLI injects a compact `<environment_context>` only.
