# Harness levers — the full taxonomy (Article 2 material)

**Premise:** every harness drives the *same* Sonnet weights. What it controls is the
**payload it assembles and the loop it runs around the model**. This is the complete
list of levers a harness developer can pull, each tagged:

- 🔒 **LOCKED** = fixed by Anthropic's model + API contract (harness can't change the mechanism).
- 🎛️ **DISCRETION** = harness's call.
- 🏷️ tags: `[obs]` = directly observed in our captures; `[known]` = real lever, not wire-verified this session.

Evidence base: Copilot CLI raw wire log + Claude CLI relay captures, both on
`claude-sonnet-4-5-20250929`, same repo-explainer task. (Structure is model-agnostic.)

---

## A. System prompt
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Content / persona / voice | 🎛️ | `[obs]` "GitHub Copilot CLI, a terminal assistant" vs "a Claude agent, built on Anthropic's Claude Agent SDK". |
| Length | 🎛️ | `[obs]` Copilot system ≈26.6k chars in **1 block**; Claude ≈28k-char string. |
| **Shape** (single block vs many vs string) | 🎛️ (the `system` field itself is 🔒) | `[obs]` Copilot: array with **1** cached block; Claude: one string. Shape drives cache granularity. |
| Section taxonomy | 🎛️ | `[obs]` Copilot: Tone, Search/delegation, Tool-efficiency, code-change rules. Claude: Doing tasks, Executing actions with care, Memory, Context management. |
| **Autonomy / permission posture** | 🎛️ | `[obs]` **opposite defaults**: Copilot "non-interactive… do not stop to ask… proceed autonomously"; Claude "confirm before irreversible actions; authorization stands for the scope specified." |
| Safety preamble on top of weights' floor | 🎛️ (floor is 🔒) | `[obs]` Claude prepends an explicit security/dual-use refusal block; Copilot relies more on the trained floor. |
| Embedded headers/telemetry in the prompt | 🎛️ | `[obs]` Claude system starts with `x-anthropic-billing-header: cc_version=…; cc_entrypoint=sdk-cli`. |

## B. Dynamic context injection (assembled per session)
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Environment block (cwd, OS, tools) | 🎛️ | `[obs]` Both inject one. Copilot `<environment_context>` (cwd, git repo, OS, available tools); Claude `# Environment` (cwd, platform, **knowledge cutoff**). |
| **Live VCS state** | 🎛️ | `[obs]` Claude injects `gitStatus`: current branch, **git user**, working-tree status, **recent commits**. Copilot does not front-load commit history. |
| Date / knowledge-cutoff statement | 🎛️ | `[obs]` Claude states "knowledge cutoff is January 2025". |
| Repo instruction files (auto-loaded) | 🎛️ | `[known]` copilot-instructions.md / CLAUDE.md / AGENTS.md / path-scoped `.instructions.md` with `applyTo` globs. |
| How much working-set is pre-read | 🎛️ | `[known]` some harnesses pre-list the dir tree; both here let the model explore via tools. |

## C. Tool catalog & schema design
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Wire format for tools (`input_schema` JSON-Schema) | 🔒 | `[obs]` identical shape both sides. |
| Which tools / how many | 🎛️ | `[obs]` Copilot **19**, Claude **27**. |
| Naming convention | 🎛️ | `[obs]` snake (`bash`,`view`,`edit`) vs Pascal (`Bash`,`Read`,`Agent`). |
| Description verbosity / inlined examples | 🎛️ | `[obs]` drives token weight; tool defs = **54%** (Copilot) vs **73%** (Claude) of prefix. |
| Schema granularity (params, enums, defaults) | 🎛️ | `[obs]` e.g. Copilot `bash` exposes mode/async/timeout params inline. |
| Tool-result formatting / truncation policy | 🎛️ | `[known]` how big tool outputs are trimmed before re-send. |
| Overlap / redundancy across tools | 🎛️ | `[obs]` both ship read+edit+grep+glob families with some overlap. |

## D. Tool delivery / virtualization
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Flat vs **virtualized/deferred** (name-only + on-demand schema) | 🎛️ | `[obs]` VS Code Copilot **defers** above a threshold (~8.4k sent of full catalog); both CLIs + Claude-in-VS-Code send **flat**. The single biggest structural harness difference. |
| Grouping threshold | 🎛️ | `[known]` VS Code Copilot's virtual-tool group count. |
| Tool-search mechanism | 🎛️ | `[known]` how deferred tools get pulled in. |
| Per-phase tool enabling (e.g. plan mode hides edits) | 🎛️ | `[obs]` Claude ships `EnterPlanMode`/`ExitPlanMode` → mode-gated tool sets. |

## E. Skills
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Whether skills exist at all | 🎛️ | `[obs]` both now do (corrects old draft). |
| **Where injected** | 🎛️ | `[obs]` Copilot: skill catalog in system + `skill` tool. Claude: **`<system-reminder>` in the first user message** + `Skill` tool. |
| Progressive disclosure (name+desc in catalog, body on invoke) | 🎛️ | `[obs]` Claude lists 13 skills as name+description (~1.1k tok), bodies loaded on use. |
| Count / which installed (user-controlled) | 🎛️ | `[obs]` Claude 13; VS Code Copilot carried 37 skill blocks. **Not virtualized** → every installed skill taxes every call. |

## F. MCP
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Whether enabled / which servers | 🎛️ (user) | `[obs]` off in these captures; dominant cost driver when on. |
| MCP delivery (flat vs grouped) | 🎛️ | `[known]` VS Code Copilot can group; Claude sends flat. |
| MCP instruction blocks | 🎛️ | `[obs]` `mcpInstructions` slot exists (empty here). |
| Tool namespacing | 🎛️ | `[known]` `server__tool` style prefixes. |

## G. Memory / persistence philosophy
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Memory subsystem design | 🎛️ | `[obs]` Claude has an elaborate **auto-memory** (user memories + project memories, when-to-read/write rules) baked into system. |
| Session scratch model | 🎛️ | `[obs]` Copilot bakes in a **todos/SQL + plan.md** workflow instead. |
| Layering (enterprise/user/repo) | 🎛️ | `[known]` nested memory/instruction precedence. |

## H. Conversation-history management
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Full-prefix resend (no delta) | 🔒-ish (stateless API) → 🎛️ how managed | `[obs]` every request re-sends the whole snapshot; messages grow 1.3k→8k tok across turns. |
| Compaction / summarization of old turns | 🎛️ | `[known]` when/whether to summarize to fit the window. |
| Tool-result pruning | 🎛️ | `[known]` dropping/trimming stale large outputs. |
| Context-management guidance to the model | 🎛️ | `[obs]` Claude has a `# Context management` section. |

## I. Prompt-caching strategy
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Caching mechanism (`cache_control` ephemeral, ≤4, prefix-only, TTL) | 🔒 | `[obs]` identical mechanism. |
| **Breakpoint count & placement** | 🎛️ | `[obs]` Copilot ~3/turn (system, tools boundary, rolling msg). |
| Stable-prefix ordering to maximize hits | 🎛️ | `[obs]` both order system→tools→history; hit rate **87.2%** vs **90.2%**. |
| TTL choice (5-min vs 1-hr) | 🎛️ | `[known]`. |

## J. Sampling / generation params
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| `temperature` | 🎛️ (range 🔒) | `[obs]` Copilot **1**; Claude **unset/default**. |
| `max_tokens` | 🎛️ (ceiling 🔒) | `[obs]` Copilot **8192**; Claude **32000** (4×). |
| `top_p` / stop sequences | 🎛️ | `[known]`. |
| `stream` | 🎛️ | `[obs]` both stream. |

## K. Reasoning / thinking
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Thinking mechanism (`thinking{type,budget_tokens}`, summarized vs raw, blocks echoed back) | 🔒 | `[obs]`. |
| Enabled? per-turn? | 🎛️ | `[obs]` Copilot **enabled every turn**; Claude not set on 1st request. |
| `budget_tokens` | 🎛️ | `[obs]` Copilot **1024** (small). |
| Interleaved-thinking / token-efficient-tools betas | 🔒 feature / 🎛️ opt-in | `[known]` via `anthropic-beta` header (not visible through Copilot proxy log). |

## L. Agent loop / orchestration
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Sub-agent / Task fan-out | 🎛️ | `[obs]` Copilot `task`; Claude `Agent` + `TaskCreate/Get/List/Output/Stop/Update`. |
| Parallel tool calls | 🎛️ (encouraged in prompt) | `[obs]` Copilot prompt: "USE PARALLEL TOOL CALLING". |
| Planning mode | 🎛️ | `[obs]` Claude `EnterPlanMode`/`ExitPlanMode`. |
| Scheduling / background / cron primitives | 🎛️ | `[obs]` Claude ships `CronCreate/Delete/List`, `ScheduleWakeup`, `Monitor`, `RemoteTrigger`, `PushNotification`. |
| Max iterations / turn budget / auto-continue | 🎛️ | `[known]`. |
| Worktree / sandbox management | 🎛️ | `[obs]` Claude `EnterWorktree`/`ExitWorktree`. |

## M. Safety / policy / platform layer
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Trained refusal floor | 🔒 | `[obs]`. |
| **Org content-exclusion** (block files) | 🎛️ (platform) | `[obs]` Copilot enforces org rules — `secrets.json` excluded for 2 repos. |
| Permission prompts / autonomy gating | 🎛️ | `[obs]` see §A autonomy posture. |
| Allowed/blocked command policy | 🎛️ | `[known]`. |

## N. Model routing & transport
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Snapshot/alias resolution | 🎛️ (user pins) | `[obs]` both `claude-sonnet-4-5-20250929`; Copilot labels wire `claude-sonnet-4.5`. |
| Proxy vs direct API | 🎛️ | `[obs]` Copilot routes via GitHub Copilot proxy (hence beta headers invisible); Claude CLI hits Anthropic. Claude-in-VS-Code routes via a Copilot proxy. |
| Multi-model routing (cheap model for sub-tasks) | 🎛️ | `[known]`. |

## O. Metering / telemetry
| Lever | 🔒/🎛️ | Observed |
|---|---|---|
| Billing denomination | 🎛️ (platform) | `[obs]` Copilot **native GitHub AI credits** (exact); Claude none → token-normalized estimate. |
| `metadata` identity | 🎛️ | `[obs]` Claude sends `metadata.user_id` = device_id + account_uuid + session_id. |
| Telemetry events | 🎛️ | `[obs]` Copilot log emits content_exclusion / assistant_usage telemetry. |

---

## Headline takeaways for the article
1. **The mechanism is locked; the payload is not.** Anthropic fixes the wire contract,
   thinking, caching, and the safety floor. Everything that moves cost/behavior —
   prompt, tools, skills, memory, caching placement, sampling, loop — is harness choice.
2. **Tool schemas dominate** the re-sent prefix (54–73%), so *tool catalog + delivery*
   is the highest-leverage lever, not the system prompt.
3. **Opposite autonomy defaults** (Copilot "don't ask" vs Claude "confirm first") are a
   pure prompt choice on identical weights — a clean illustration of the thesis.
4. **Same model, different philosophies**: Claude = memory + git-state + plan-mode +
   scheduling primitives; Copilot = lean tool set + SQL/todos workflow + native credit metering.
