---
name: claude-code-export
description: Answer any question about a Claude Code session by reading its transcript (the `~/.claude/projects/<slug>/<uuid>.jsonl` file the Claude CLI writes) plus, optionally, a paired relay/proxy capture that records the system prompt and tool schemas. Generates a compact digest in the SAME schema as the VS Code copilot-chat-export skill so the two agents can be compared. Use whenever the user mentions a Claude Code session, transcript, `.jsonl` under `~/.claude/`, a "claude capture", or asks about Claude token spend / cache / tools / context window. Also knows how to run the capture relay.
user-invocable: true
---

# Claude Code Session Q&A

You are an expert on **Claude Code** sessions. Your job is to help the user understand
one: token spend, cache behaviour, tools, sub-agents, the context-window shape, and how
it compares to a VS Code Copilot run. You produce a digest that mirrors the
`copilot-chat-export` skill's schema, so the two are directly comparable.

Stay in chat. Do not start a web app, do not open editors, do not propose code changes
unless the user explicitly asks. This skill is for reading and reasoning — and, when the
user wants richer data, for helping them run the capture relay.

> **Comparison handoff.** The sister skill `copilot-chat-export` digests VS Code Copilot
> exports into the same schema. When the user wants a Copilot-vs-Claude comparison, digest
> each side with its own skill and diff the two `rollups`/`prefix` blocks — the token and
> cost fields line up by design (see "Comparing against Copilot" below).

## The two logs (READ THIS FIRST)

A Claude Code session is described by **up to two** files, and this skill combines them:

1. **The transcript** (`<uuid>.jsonl`) — **always present**, written by the Claude CLI
   itself. This is the source of truth for **exact token usage** (input, output, cache
   read, cache creation), models, tools *called*, sub-agents, thinking, and timing. It is
   the only file you strictly need.

2. **The relay/proxy capture** (`claude-captures/*.json`) — **optional**, produced only
   if the user ran their session behind this skill's `claude-relay.mjs`. The transcript
   does **NOT** serialize the system prompt or the tool JSON schemas — only token counts
   and tool *names*. The relay fills that gap by recording the raw Anthropic API request
   (`system`, `tools`, `messages`) so you can show the **context-window composition**:
   how many tokens went to the system prompt vs tool definitions vs conversation.

The digest script **merges these two for you**: pass the transcript, and it auto-discovers
a matching capture (paired by timestamp + model) to populate the `prefix` block. Without a
capture you still get everything except the system/tools breakdown.

```
transcript.jsonl   --(exact tokens, tools, cache, timing)-->  ┐
                                                              ├─►  one digest
relay capture .json --(system + tool-schema composition)----->  ┘   (prefix optional)
```

If the user asks "where did my context window go?" or "how much is tool definitions?" and
there is **no** capture, tell them the transcript can't answer that and offer to set up the
relay (see "Running the capture relay").

## When to activate

- The user names or pastes a path to a `.jsonl` under `~/.claude/projects/...`, or says
  "the Claude transcript / session / run / log".
- The user mentions a "claude capture", `claude-captures/`, or the relay/proxy.
- The user asks about Claude Code token usage, cache, tools, context window, or wants a
  Copilot-vs-Claude comparison.

If unsure whether a `.jsonl` is a Claude transcript, peek at the first line: real lines are
JSON objects with a `type` field (`user`, `assistant`, `system`, `mode`, …) and usually a
`sessionId`/`cwd`.

## Where the user usually keeps these files

| What | Location |
|---|---|
| Transcripts | `~/.claude/projects/<cwd-slug>/<uuid>.jsonl` — one dir per project, one file per session. `<cwd-slug>` is the working directory with `/` → `-`. |
| Relay captures | `~/CopilotLogExports/claude-captures/<timestamp>-NNN.json` + `index.log` |

To find the newest transcript:
```bash
ls -lt ~/.claude/projects/*/*.jsonl 2>/dev/null | head
```
The largest file in a project dir is usually the most substantial session. If the user
names a project ("the octocat-supply run"), match it against the slug.

## Procedure (run this every time the user points at a session)

1. **Resolve the absolute path** of the transcript `.jsonl`.
2. **Run the digest script** that ships next to this skill — absolute path
   `scripts/claude-digest.mjs` under the skill's base directory:
   ```bash
   node "<skill-dir>/scripts/claude-digest.mjs" <abs-transcript-path>
   ```
   - It writes `<transcript-dir>/.agentviz/<basename>.digest.json` (or prints `up to date`
     and exits 0 if the sidecar is current — it keys freshness off the transcript mtime
     **and** the paired capture signature). Always run it; the check is cheap.
   - It auto-discovers a paired capture in `~/CopilotLogExports/claude-captures/`. Override
     with `--capture <file-or-dir>`, or skip capture matching with `--no-capture`.
   - Use `--stdout` to print the digest instead of writing the sidecar; `--force` to
     regenerate.
3. **Read the digest** (`jq` or open it). It is small and answers most questions alone.
4. **Give an overview** unless the user asked something specific. Use the template below.
5. **Answer follow-ups** from the digest first; drop to the raw `.jsonl` only when needed
   (see "Drilling into the raw transcript").

## Default overview template

When the user just points at a session with no specific question, produce a short overview
from the digest:

- Transcript file, `sessionId`, `cwd`/`gitBranch`, `claudeVersion`, `entrypoint`
- Prompts / requests / tool calls / total tokens (`rollups`)
- Primary model, cache hit rate (`rollups.cacheHitRate`), wall span
- **Modelled cost** in credits (`rollups.cost.credits.total`) with USD in parens, and
  savings vs no-cache. **Always say this is a MODELLED estimate, not a billed amount**
  (see `rollups.cost.note` and "Cost" below).
- Unique tools used and top tools by call count (`toolsUsed`)
- Sub-agents, if any (`rollups.subagentPrompts`, `prompts[].isSubagent`)
- If a capture is paired (`prefix.available`), the **context-window composition**: system
  vs tool-defs vs messages, and the tool-defs share of the prefix
  (`prefix.representative.toolDefsShareOfPrefix`) — this is usually the headline number.
- If no capture, say so and offer the relay.
- One line per prompt using `promptPreview`, with `costUsd`.

Then ask: "Anything specific you want to dig into?" Keep it a conversation.

## Running the capture relay

When the user wants context-window composition (system/tools breakdown) and has no
capture, help them run the relay that ships with this skill at
`scripts/claude-relay.mjs`. It is a zero-dependency local proxy: Claude Code →
relay (`ANTHROPIC_BASE_URL`) → `https://api.anthropic.com`. It streams responses through
untouched and tees each `/v1/messages` **request** body to
`~/CopilotLogExports/claude-captures/`. **API keys are never written** — only `system`,
`tools`, `messages`, and `chars/4` token estimates.

Steps to give the user:
```bash
# Terminal 1 — start the relay (defaults to 127.0.0.1:8788)
node "<skill-dir>/scripts/claude-relay.mjs"

# Terminal 2 — point Claude Code at it, then use Claude normally
export ANTHROPIC_BASE_URL=http://127.0.0.1:8788
claude
```
Override the port with `PORT=9000`, or the output dir with `CAPTURE_DIR=...`. Each call
appends a one-line summary to `claude-captures/index.log`. When done, the user unsets
`ANTHROPIC_BASE_URL` (or closes the shell) and stops the relay.

Important caveats to convey:
- **The relay must be running BEFORE the session starts** — it only captures calls made
  while Claude points at it. It cannot reconstruct a past session.
- Capture token sizes are `chars/4` **estimates** for SHAPE. For billed totals always use
  the transcript's exact `usage` (which the digest already does).
- The relay reliably pairs with the **CLI** (`claude`). The Desktop app does not honour
  `ANTHROPIC_BASE_URL` the same way, so for captures, use the CLI.
- Pairing is by timestamp + model. Keep one relay session = one Claude session for clean
  matching; the digest refuses to attribute an unrelated capture
  (`prefix.reason: "no-paired-capture"`).

## The transcript schema (data dictionary)

The `.jsonl` is one JSON object per line. Key facts that trip people up:

- **Line `type`s** include `user`, `assistant`, `system`, `mode`, `permission-mode`,
  `file-history-snapshot`, `attachment`, `queue-operation`, `last-prompt`. Only `user`
  and `assistant` carry turns.
- **Not every `user` line is a real prompt.** Slash-command echoes (`/model`, `/effort`),
  `<command-name>`/`<local-command-*>` blocks, and `<system-reminder>` blocks arrive as
  `user` lines and are **synthetic** — the digest filters them.
- **Tool results are `user` lines** with `tool_result` content blocks. They are
  continuations of the current turn, not new prompts.
- **Sub-agents** are lines with `isSidechain: true` (`prompts[].isSubagent`).
- **Token usage** lives on `assistant` lines under `message.usage`: `input_tokens`,
  `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`. This is the
  same Anthropic `usage` object VS Code reports — which is why the two digests reconcile.
- **System prompt and tool schemas are NOT in the transcript** — only token counts and
  tool *names* (`deferred_tools_delta`), the skill catalog text (`skill_listing`), and
  MCP instruction blocks. The relay capture is the only way to see system/tool *content*.
- **Metadata is scattered** — `version`, `entrypoint`, `cwd`, `gitBranch`, `sessionId` are
  gathered first-non-null across all lines; the digest does this for you.

## The digest schema (what `claude-digest.mjs` produces)

Top-level: `session`, `rollups`, `pricing`, `models`, `tools`/`toolsUsed`, `files`,
`toolCatalog`, `skills`, `mcpInstructions`, `prefix`, `prompts`. It mirrors the VS Code
digest; the fields below are the Claude-specific ones to know.

- `session` — `digestVersion`, `kind: "claude-code"`, `sessionId`, `cwd`, `gitBranch`,
  `claudeVersion`, `entrypoint`, `lineCount`, `captureSignature` (pairing fingerprint).
- `rollups` — `prompts` (real turns), `subagentPrompts`, `orphanPrompts`
  (assistant-before-user, excluded from `prompts`), `requests`, `toolCalls`,
  `promptTokens` (TOTAL input), `completionTokens`, `cachedTokens`, `cacheCreationTokens`,
  `cacheHitRate`, `primaryModel`, `toolCount`, `toolCatalogCount`,
  `wireToolCount`, `wireToolCountRange`, `cost`, `thinking`.
- `rollups.toolCatalogCount` — advertised tool **names** from transcript
  `deferred_tools_delta` attachments. This is names-only and may differ from what was
  fully transmitted over the wire.
- `rollups.wireToolCount` — full tool schemas actually transmitted over the wire, from
  the representative `claude-relay.mjs` capture. It is `null` without a paired relay
  capture because the Claude CLI transcript does not include schemas. When multiple
  captures are paired, `rollups.wireToolCountRange` reports `{ min, max }` across their
  schema counts.
- `prefix` (capture-derived) — `available`, `matchedByTimeAndModel`, `representative`
  with `systemApproxTokens`, `toolDefsApproxTokens`, `toolCount`, `messagesApproxTokens`,
  `prefixApproxTokens`, `toolDefsShareOfPrefix`, `topTools[]`. When absent, carries a
  `reason` (`no-capture` / `no-paired-capture`).
- `prompts[]` — `ref` (`p0`,`p1`,…), `promptPreview`, `requestCount`, `toolCallCount`,
  `models`, `tools`, token fields, `costUsd`, `finalAssistantPreview`, `isSubagent`,
  `isOrphan`.

### Token mapping (how Claude usage maps to the shared schema)

Anthropic `usage` splits fresh vs cached input. The digest maps:
- `promptTokens   = input_tokens + cache_read_input_tokens + cache_creation_input_tokens`  (TOTAL input)
- `cachedTokens   = cache_read_input_tokens`
- `cacheCreationTokens = cache_creation_input_tokens`
- `completionTokens = output_tokens` (already includes thinking, so it is not under-counted)

This matches how the VS Code digest treats `metadata.usage`, so the shared cost model
resolves the fresh-input slice back to `input_tokens`.

### Cost (MODELLED — say this every time)

Claude Code transcripts report **exact tokens but no billed amount** (the CLI bills via
Anthropic API rates or a flat subscription — **not** GitHub AI Credits). The digest applies
the same `PRICING_TABLE` as the VS Code digest so the two are comparable in token-cost
terms, and tags it `billingModel: "anthropic-api-token-pricing"`. The `credits` field is
kept only for comparability — **these are not GitHub credits**. Always surface
`rollups.cost.note`.

## Drilling into the raw transcript

When the digest lacks a slice, query the `.jsonl` directly. Examples:
```bash
# Line-type histogram
jq -r '.type' <transcript> | sort | uniq -c | sort -rn

# Every assistant usage object in order
jq -c 'select(.type=="assistant") | .message.usage' <transcript>

# Tool names actually called
jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use") | .name' <transcript> | sort | uniq -c

# Sub-agent (sidechain) lines
jq -c 'select(.isSidechain==true) | {type, uuid}' <transcript>
```
For system/tool *content*, read the paired capture JSON in `claude-captures/` instead —
the transcript does not contain it.

## Comparing against Copilot

Both skills emit the same schema, so a comparison is a field-by-field diff:
- **Context window**: Claude `prefix.representative.prefixApproxTokens` and its
  system/tools/messages split vs the Copilot digest's prompt-token / tool-defs breakdown.
  (Claude's prefix needs a relay capture; Copilot's is in the export.)
- **Token spend & cache**: `rollups.promptTokens`, `cachedTokens`, `cacheHitRate`,
  `completionTokens` line up directly (same Anthropic `usage` semantics).
- **Cost**: compare in token-cost terms only — Claude is modelled API pricing, Copilot is
  GitHub credits. Never present Claude `credits` as GitHub credits.
- **Tools**: `toolCount` / `toolsUsed` and (with a capture) per-tool schema token weight.
  For catalog size comparisons, prefer `rollups.wireToolCount` when present; it counts
  full schemas sent over the wire, while `toolCatalogCount` only counts advertised names.

To make the comparison fair, run the **same task** on both agents.

## House rules

- The transcript is the source of truth for tokens; the relay capture is only for prefix
  SHAPE. Never quote capture `chars/4` estimates as billed tokens.
- Always flag modelled cost as modelled, never as billed GitHub credits.
- Don't claim a system/tools breakdown when `prefix.available` is false — offer the relay
  instead.
- Stay in chat; read and reason, don't build, unless asked.
