---
name: copilot-cli-export
description: Answer any question about a GitHub Copilot CLI session by reading the debug log the CLI writes with `--log-level all --log-dir <dir>` (a `process-*.log` file). One log carries exact token usage, the full system prompt + tool schemas, AND the EXACT GitHub AI Credits billed (`copilot_usage.total_nano_aiu`) — no proxy needed. Generates a compact digest in the SAME schema as the VS Code copilot-chat-export and Claude claude-code-export skills so the three agents can be compared. Use whenever the user mentions a Copilot CLI run, a `copilot -p` headless run, a `process-*.log`, "copilot cli log", or asks about Copilot CLI token spend / credits / cache / tools / context window. Also knows how to run Copilot CLI headlessly and capture the log.
user-invocable: true
---

# Copilot CLI Session Q&A

You are an expert on **GitHub Copilot CLI** sessions. Your job is to help the user understand
one: token spend, **native GitHub AI Credits**, cache behaviour, tools, the context-window
shape, and how it compares to a VS Code Copilot run or a Claude Code run. You produce a digest
that mirrors the `copilot-chat-export` and `claude-code-export` skills' schema, so the three are
directly comparable.

Stay in chat. Do not start a web app, do not open editors, do not propose code changes unless
the user explicitly asks. This skill is for reading and reasoning — and, when the user wants to
gather data, for helping them run Copilot CLI headlessly and digest the log.

> **Safe publishing handoff.** If the user wants to publish, share, bundle, commit, upload, or
> generate a web page from this log or its digest, invoke the `publish-session-export` skill.
> Never publish the raw `process-*.log`.

> **Comparison handoff.** The sister skills `copilot-chat-export` (VS Code Copilot) and
> `claude-code-export` (Claude Code) digest into the same schema. For a three-way comparison,
> digest each side with its own skill and diff the `rollups`/`prefix` blocks. **Compare cost
> in token-normalized terms** (`rollups.cost.tokenNormalized` here vs the modelled cost there) —
> the native credits below are real GitHub spend and have no equivalent in the other two.

## The one log (READ THIS FIRST)

Unlike Claude (which needs a transcript **plus** a relay capture) and VS Code (which needs an
exported chat), a Copilot CLI session is captured in **a single debug log** — *provided it was
run with logging on*:

```bash
copilot -p "<prompt>" --allow-all-tools --model <model> \
        --log-dir <dir> --log-level all
```

That log (`<dir>/process-*.log`) contains, for every LLM round trip:

1. **The `Wire request`** — the full Anthropic-format request body: the system prompt, the tool
   JSON schemas, and the conversation messages. This is the **context-window composition** the
   Claude transcript can't show without a relay.
2. **The response** — OpenAI-shaped, with exact `usage` (prompt/completion/cached/cache-creation/
   reasoning tokens), the **full model snapshot** (e.g. `claude-sonnet-4-5-20250929`), and
3. **`copilot_usage`** — the **native billing**: `total_nano_aiu / 1e9` is the EXACT GitHub AI
   Credits the request was billed, and `token_details[]` decomposes it by input / cache_read /
   cache_write / output. This is real spend, already including any premium-request multiplier.

So one file gives you what took two for Claude (exact tokens + prefix shape) **plus** the real
billed amount neither Claude nor VS Code expose.

> **Logging must be ON at run time.** The CLI only writes this detail with `--log-level all`
> (or `debug`). A run done without `--log-dir`/`--log-level` cannot be reconstructed afterwards.
> If the user has no such log, offer to help them re-run (see "Capturing a run").

## When to activate

- The user names or pastes a path to a `process-*.log` (or a `--log-dir`), or says "the Copilot
  CLI log / run".
- The user mentions `copilot -p`, a headless Copilot run, or Copilot CLI credits / tokens / cache
  / tools / context window.
- The user wants a Copilot-CLI-vs-Claude or Copilot-CLI-vs-VS-Code comparison.

If unsure whether a `.log` is a Copilot CLI log, peek at the first lines: they are
`<ISO timestamp> [LEVEL] <message>`, and the file contains `Wire request:` blocks and
`copilot_usage` objects.

## Procedure (run this every time the user points at a log)

1. **Resolve the absolute path** of the `process-*.log`.
2. **Run the digest script** that ships next to this skill:
   ```bash
   node "<skill-dir>/scripts/copilot-cli-digest.mjs" <abs-log-path>
   ```
   - Writes `<log-dir>/.agentviz/<basename>.digest.json` (or prints `up to date` and exits 0 if
     the sidecar is current — it keys freshness off the log mtime). Always run it; the check is
     cheap.
   - Use `--stdout` to print the digest instead of writing the sidecar; `--force` to regenerate.
3. **Read the digest** (`jq` or open it). It is small and answers most questions alone.
4. **Give an overview** unless the user asked something specific. Use the template below.
5. **Answer follow-ups** from the digest first; drop to the raw log only when needed (see
   "Drilling into the raw log").

## Capturing a run

When the user wants fresh, comparable data, help them run Copilot CLI headlessly with the runner
that ships with this skill — it runs `copilot -p`, captures the log, digests it, and prints a
table:

```bash
node "<skill-dir>/scripts/copilot-run.mjs" \
  --prompt "Explain what this repository does." \
  --model claude-sonnet-4.5 --cwd /path/to/repo --reps 3
```

- `--reps N` runs the same prompt N times (Copilot CLI cost varies run-to-run because the agent
  takes a different number of exploration round trips — capture several).
- Artifacts land in `./copilot-runs/<label>/rep-*/` (`logs/`, `stdout.txt`, `digest.json`,
  `meta.json`). Use `--json` for machine-readable output, `--keep-going` to tolerate a failed rep.
- To run a single ad-hoc capture without the runner:
  ```bash
  copilot -p "<prompt>" --allow-all-tools --model claude-sonnet-4.5 \
          --log-dir ./logs --log-level all
  node "<skill-dir>/scripts/copilot-cli-digest.mjs" ./logs/process-*.log
  ```

Important caveats to convey:
- **Copilot CLI is a DIFFERENT harness from Copilot in VS Code.** It has its own system prompt
  and its own tool roster. A Copilot CLI run does **not** stand in for a "Copilot in VS Code" run;
  it is its own environment. Say so whenever the comparison is about the IDE.
- **`-p` is non-interactive** ("autopilot"): the agent works without asking, so behaviour and tool
  use differ from an interactive session.
- The native credits are exact for the run as executed; they already include the model's
  premium-request multiplier.

## Default overview template

When the user just points at a log with no specific question, produce a short overview from the
digest:

- Log file, `copilotVersion`, `workspaceId`, `cwd` (if found), `groupingConfidence`, any
  `warnings`.
- Prompts / requests / tool calls / total tokens (`rollups`).
- Primary model (full snapshot), cache hit rate (`rollups.cacheHitRate`).
- **Native cost** in credits (`rollups.cost.native.credits`) — *this is the real billed amount*,
  with the by-type split (`byTypeCredits`) and the no-cache counterfactual if present. Say it is
  **exact GitHub AI Credits**, not a model.
- The token-normalized estimate (`rollups.cost.tokenNormalized.totalUsd`) **only** when comparing
  efficiency against Claude/VS Code — and label it modelled, not spend.
- Unique tools used and top tools (`toolsUsed`); advertised catalog size (`toolCatalog.count`).
- The **context-window composition** (`prefix.representative`): system vs tool-defs vs messages,
  the tool-defs share of the prefix (`toolDefsShareOfPrefix`), and `skillBlockCount` — usually the
  headline shape number.
- One line per prompt using `promptPreview`, with `nativeCredits`.

Then ask: "Anything specific you want to dig into?" Keep it a conversation.

## The digest schema (what `copilot-cli-digest.mjs` produces)

Top-level: `session`, `rollups`, `pricing`, `models`, `tools`/`toolsUsed`, `files`,
`toolCatalog`, `prefix`, `prompts`. Mirrors the VS Code / Claude digests; the Copilot-CLI-specific
fields to know:

- `session` — `digestVersion`, `kind: "copilot-cli"`, `copilotVersion`, `workspaceId`, `cwd`,
  `lineCount`, `groupingConfidence` (`high` for `-p`; `ambiguous-compaction` if the log shows a
  history shrink), `warnings[]`.
- `rollups` — `prompts`, `orphanPrompts`, `requests`, `responsesWithUsage`,
  `responsesWithNativeBilling`, `nativeBillingComplete`, `toolCalls`, `freshInputTokens`,
  `promptTokens` (TOTAL input), `completionTokens`, `cachedTokens`, `cacheCreationTokens`,
  `reasoningTokens`, `cacheHitRate`, `primaryModel`, `toolCount`, `toolCatalogCount`,
  `wireToolCount` / `wireToolCountRange` (full tool schemas actually sent in `Wire request`
  bodies), `cost`, `tokenSemantics`.
- `rollups.cost` — **two parallel, explicitly-labelled blocks**:
  - `native` — **authoritative**. `credits` (= Σ `total_nano_aiu`/1e9), `totalNanoAiu`,
    `byTypeCredits` (input/cache_read/cache_write/output), `withoutCacheCounterfactual`
    (best-effort, NOT authoritative), `billingModel: "github-ai-credits-native"`. **Real spend.**
  - `tokenNormalized` — **not authoritative**. Modelled from `PRICING_TABLE` for cross-agent
    efficiency comparison only; `billingModel: "token-normalized-model-estimate"`. **Not spend,
    not GitHub credits.**
- `prefix.representative` (from the largest `Wire request`) — `systemApproxTokens`,
  `toolDefsApproxTokens`, `messagesApproxTokens`, `toolCount`, `prefixApproxTokens`,
  `toolDefsShareOfPrefix`, `skillBlockCount`, `topTools[]` (chars/4 SHAPE estimates).
- `toolCatalog` — tool **names** advertised; unlike the Claude transcript, schemas ARE in the log
  (their weight is in `prefix`).
- `prompts[]` — `ref`, `promptPreview` (CLI plumbing stripped), `requestCount`, `toolCallCount`,
  `models`, `tools`, token fields incl. `freshInputTokens`/`reasoningTokens`, `nativeCredits`,
  `tokenNormalizedUsd`, `finalAssistantPreview`, `isOrphan`.

### Token mapping (how Copilot CLI usage maps to the shared schema)

OpenAI-shaped `usage` already splits cached from fresh input. The digest maps:
- `promptTokens         = usage.prompt_tokens` (TOTAL input: fresh + cache read + cache creation)
- `freshInputTokens     = prompt_tokens - cached_tokens - cache_creation_tokens`
- `cachedTokens         = prompt_tokens_details.cached_tokens`
- `cacheCreationTokens  = prompt_tokens_details.cache_creation_tokens`
- `completionTokens     = usage.completion_tokens` (already INCLUDES reasoning — don't add again)
- `reasoningTokens      = completion_tokens_details.reasoning_tokens`

This matches the Claude and VS Code digests, so the three reconcile field-by-field.

### Cost (NATIVE is real, token-normalized is modelled — say which every time)

Copilot CLI logs the **actual billed amount** in `copilot_usage.total_nano_aiu`
(`/ 1e9` = GitHub AI Credits, `token_details[]` decomposes it, and the sum reconciles to the
total — the digest checks this and warns on mismatch). That is the headline number and it is
*real spend*. The `tokenNormalized` block is only for comparing **efficiency** against the
Claude/VS Code digests on equal token rates — never present it as spend, and never present native
credits as Anthropic API cost.

## Drilling into the raw log

When the digest lacks a slice, query the log directly. The blocks are pretty-printed JSON whose
body lines are un-prefixed (no timestamp) until the next `<ts> [LEVEL]` line.

```bash
# Every billed amount (one per request) — values may repeat if a block is logged twice
grep -aoE '"total_nano_aiu": [0-9]+' <log>

# Each response's usage block
grep -aA8 '"usage": {' <log>

# The system prompt of the first request (read the Wire request block)
grep -an 'Wire request:' <log> | head

# Tool names advertised in the first Wire request
grep -aoE '"name": "[a-z_-]+"' <log> | sort -u
```

For the exact, reconciled numbers always prefer the digest — it dedupes duplicate response dumps
by `id` (the raw `grep` above does not) and excludes the session-cumulative total.

## Comparing across the three environments

All three skills emit the same schema, so a comparison is a field-by-field diff:
- **Context window**: `prefix.representative` system/tools/messages split and
  `toolDefsShareOfPrefix` — directly comparable across all three (all chars/4 SHAPE estimates).
- **Token spend & cache**: `rollups.promptTokens`, `freshInputTokens`, `cachedTokens`,
  `cacheHitRate`, `completionTokens` line up (same usage semantics).
- **Cost**: compare `tokenNormalized` to `tokenNormalized`/modelled cost only. Native Copilot
  credits are a *fourth* number — real GitHub spend — with no Claude/VS-Code equivalent; report it
  on its own, never as the comparison axis.
- **Tools**: `toolCount` / `toolsUsed` and per-tool schema weight (`prefix.topTools`).

To make the comparison fair, run the **same task, same model, matched config** on each agent.

## House rules

- The response `usage` + `copilot_usage` are the source of truth for tokens and cost; the
  `Wire request` is the source of truth for prefix SHAPE. Never quote chars/4 prefix estimates as
  billed tokens.
- Native credits are real GitHub spend; the token-normalized estimate is modelled — always say
  which you're quoting.
- Copilot CLI is its own harness; never present a Copilot CLI run as "Copilot in VS Code".
- Surface `warnings` and `groupingConfidence` when they are not clean.
- Stay in chat; read and reason, don't build, unless asked.
