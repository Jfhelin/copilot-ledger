# Harness Lever Investigation — Consolidated Results

15 per-lever subagent investigations across 4 harnesses, all running **Claude Sonnet
4.5** (`claude-sonnet-4-5-20250929`) on `octodemo/octocat_supply`. Each lever is tagged
🔒 (Anthropic locks it) or 🎛️ (harness discretion). Evidence is from real captures;
editorial corrections applied where subagents over-claimed (see "Corrections" per lever).

## The four harnesses

| Short | Harness | Capture source | MCP |
|---|---|---|---|
| **CO-CLI** | Copilot CLI (headless) | `structural/copilot/` raw wire log | OFF |
| **CL-CLI** | Claude CLI (headless) | `structural/claude/` + relay captures | OFF |
| **CO-IDE** | VS Code Copilot | `CopilotLogExports/hi18.json` | **ON (12)** |
| **CL-IDE** | Claude in VS Code | `Claudeok.json` / `hi_VSCInsider_claude.json` | **ON (8 / 9)** |

> ⚠️ **Capture caveat (applies everywhere):** the two IDE exports were taken with
> **MCP ON** and as **single cold-start turns**, while the two CLIs were MCP-OFF
> multi-turn runs. So IDE tool-counts, prefix sizes, and cache hit-rates reflect *that
> configuration*, not a pure harness-vs-harness contrast. Treat IDE numbers as
> "what a real desktop session looks like," not a matched experimental arm.

---

## The 15 levers

### A — System prompt content & shape 🎛️
Identity, size, markup, and **autonomy posture** all differ. CO-CLI: *"non-interactive…
proceed autonomously, don't ask."* Both Claude harnesses: *"…confirm before
irreversible."* Same model weights, opposite defaults. The two Claude prompts share one
Anthropic "Claude Agent SDK" template (diff ≈ 5 lines: `cc_entrypoint` sdk-cli vs sdk-ts,
version, `TaskCreate` vs `TodoWrite`, a CLI-only ultrareview note, memory path). The two
Copilot prompts share nothing structurally. CO-IDE is largest (~44k chars) because it
inlines `copilot-instructions.md` + 37 skills + agent catalog.

### B — Dynamic / runtime context injection 🎛️
All four inject runtime context, but at **different attachment points**:
- CO-CLI: `<environment_context>` in **system** (cwd, repo, OS).
- CL-CLI: `<system-reminder>` in the **first user message** (userEmail, date, skills).
- CL-IDE: `# Environment` in **system** (cwd, platform, shell, OS ver, **git status +
  recent commits**, branch, user).
- CO-IDE: minimal/none observed.

### C — Tool catalog & schema shape 🎛️
Naming convention is **discretion, not locked** (Anthropic only requires
`^[a-zA-Z0-9_-]{1,64}$`):
- CO-CLI: **snake_case** (`bash`, `view`, `edit`), 19 tools, ~8.1k tokens.
- CL-CLI: **PascalCase** (`Bash`, `Read`, `Edit`), 27 tools, ~18.9k tokens, very verbose
  descriptions (~2,145 chars avg).
- CL-IDE: PascalCase native (27) + **dotted MCP** (`mcp__azure_mcp_server__…`), ~220 MCP
  = 247 total; terser descriptions (~483 chars).
- **Correction:** subagent called PascalCase "Anthropic-locked" — it's the SDK's *choice*.

### D — Tool delivery / virtualization 🎛️ (the headline lever)
- CO-CLI & CL-CLI: **FLAT** — full schemas every request (54% and 69–73% of prefix).
- **CO-IDE alone VIRTUALIZES**: `deferred_tools_delta` protocol, progressive activation
  (0 → 1 → 23 tools). This is the single biggest structural divergence.
- CL-IDE: FLAT and huge — **247 tools (89%)**, Insider **401 (93%)** — inflated by MCP.

### E — Skills 🎛️
- CO-IDE: **37 skills, full-body, baked into the system prompt** (taxes every call).
- CL-CLI & CL-IDE: **13 skills**, name+desc via first-user-message `<system-reminder>`
  + a `Skill` tool (on-demand body load).
- CO-CLI: `Skill` tool + contextual `<available_skills>` blocks.
- **Correction to old draft:** Claude carries **13 skills, not zero.**

### F — MCP exposure 🎛️
- CLIs: **OFF** (CO-CLI log: 0 servers; CL-CLI `mcpInstructions` empty).
- IDEs: **ON** — CO-IDE 12 servers, CL-IDE 8, Insider 9 (Azure, github, playwright,
  bicep, pylance common). This is the root cause of the IDE prefix blow-up and is a
  *config* difference as much as a harness one.

### G — Memory subsystem 🎛️
- Both Claude harnesses: elaborate **file-based auto-memory** (user/feedback/project
  types, `[[cross-links]]`, a memory dir).
- CO-CLI: session-scoped **SQL todos + plan.md** (no cross-session memory).
- CO-IDE: scoped **`/memories/`** (user/session/repo), brevity-capped, ~200-line
  auto-load. **Correction:** memory is discretion, not locked.

### H — Conversation-history management 🎛️ (mechanism 🔒)
🔒 Stateless full-prefix resend is locked (every turn re-sends system + tools). 🎛️
*Management* differs: CO-CLI linear message growth, no visible compaction, no context
note. CL-CLI grows 1,325→8,090 tok with a **plateau at request 13** (opaque
summarization) **and** an explicit `# Context management` system section telling the
model summarization will happen. IDE exports lack wire bodies.

### I — Prompt-caching strategy 🎛️ (mechanism 🔒)
🔒 `cache_control:{type:ephemeral}`, ≤4 breakpoints, 5m TTL. 🎛️ placement: CO-CLI ~3
breakpoints (system/tools/rolling) → **87.2%** hit; CL-CLI → **90.2%** (relay hides
breakpoint detail). IDE hit-rates (0–12%) are **not meaningful** — cold-start single
turns, no prefix reuse.

### J — Sampling parameters 🎛️ (ranges 🔒)
- CO-CLI: `max_tokens` **8192**, `temperature` **1**, `stream` true.
- CL-CLI: `max_tokens` **32000**, temperature **unset** (→ Anthropic default), stream
  true.
- IDEs: exports don't expose sampling params (only `maxResponseTokens`/`maxPromptTokens`).

### K — Reasoning / extended thinking 🎛️
- CO-CLI: **explicitly** sends `thinking:{type:enabled,budget_tokens:1024,
  display:summarized}` every turn (≈580 reasoning tok).
- CL-CLI: **no `thinking` field in the relay body**, yet a thinking block appears in the
  transcript (~103 tok) → almost certainly **interleaved-thinking via a beta header the
  relay strips**. **Correction:** this is discretion (delivered differently), not
  "locked off."
- IDEs: 0 reasoning tokens (thinking off in these captures).

### L — Agent loop & sub-agent orchestration 🎛️
- CO-CLI: `task` + `read_agent`/`list_agents` (manager framing).
- Both Claude: large fleet — `Agent`, `Task*`, `EnterPlanMode`, **`Cron*`**,
  **`Worktree`/`EnterWorktree`**, `Monitor`, `Schedule/Push/Remote` triggers.
- CO-IDE: a **locked catalog of 11 named agents** via `runSubagent`.
- All four push **parallel tool calls**.

### M — Safety / policy layering 🎛️ (trained floor 🔒)
🔒 The model's trained refusal behavior is constant. 🎛️ harnesses add their own layers:
CO-CLI adds `<prohibited_actions>` + `<shell_security>` + **org content-exclusion**
(e.g. `secrets.json` blocked at runtime). Both Claude add a dual-use security preamble +
autonomy "care" gating. CO-IDE adds a short Microsoft content-policy clause.
**Correction:** safety *layering* is discretion; only the base refusal floor is locked.

### N — Model routing / endpoint 🎛️
All resolve to `claude-sonnet-4-5-20250929`, via different paths: CO-CLI via GitHub proxy
(labels it `claude-sonnet-4.5`), CL-CLI direct (`cc_entrypoint=sdk-cli`), CL-IDE via the
Copilot proxy (`sdk-ts`). **Correction:** CO-IDE's agent turn ran on **claude-sonnet-4.5**;
the `gpt-4o-mini` calls in hi18 are **auxiliary requests** (e.g. title generation), not
the agent turn. (Aux-model routing for cheap side-tasks is itself a real lever.)

### O — Usage metering / telemetry 🎛️
- CO-CLI: **exact native GitHub AI credits** (16.3 cr / $0.163).
- CL-CLI: no native meter → token-normalized estimate (~$0.50); also sends
  `metadata.user_id` (device/account/session) + a billing header inside the system string.
- IDE exports: billing/usage **stripped** (null).

---

## Locked vs discretion — one-line summary

🔒 **Anthropic locks the *contract and mechanisms*:** wire shape (system/messages/tools
with JSON-Schema, tool_use/tool_result), stateless full-prefix resend, the caching
*primitive*, the thinking *primitive*, sampling *ranges*, and the trained safety floor.

🎛️ **Everything that determines what the model actually sees is harness discretion:**
prompt content & autonomy posture, runtime-context injection point, tool naming/verbosity,
**flat-vs-virtualized tool delivery**, skills count & injection, MCP on/off, memory model,
history-compaction strategy, cache *placement*, sampling *values*, thinking budget/display,
sub-agent fleet, safety *layering*, routing path + aux-model use, and telemetry exposure.

## Cleanest illustrations for the article
1. **Tool virtualization (D):** CO-IDE defers (0→1→23) while everyone else ships flat —
   8k vs 19k vs 72–114k tokens of tool defs, same model.
2. **Autonomy posture (A):** "proceed autonomously" vs "confirm before irreversible."
3. **Skills (E):** 37-in-system vs 13-on-demand vs 0.
4. **Thinking (K):** explicit per-turn budget vs implicit beta-header interleaved.
