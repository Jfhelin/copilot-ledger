# Copilot Ledger

Tools for understanding and improving **VS Code Copilot Chat** session efficiency.

🔬 **Live site: [Copilot Behavior Lab →](https://jfhelin.github.io/copilot-ledger/)** — read the experiments and explore example reports without installing anything.

📄 **Flagship article (stable link): [One run can't rank two coding agents →](https://jfhelin.github.io/copilot-ledger/one-run-cant-rank-two-agents-blog3.html)** — same model, same repo, same prompt, 40 runs across the Copilot CLI and the Claude CLI. This per-article URL stays valid even after the site's front page changes.

> ℹ️ **This is the public mirror.** It's a generated subset of a private research repo —
> the tool packages, the three digest skills, and published articles, promoted
> automatically. Drafts, the article series, and raw data stay private. `main` here is
> periodically overwritten from upstream, so open an issue/PR rather than relying on direct
> commits. (See [`.github/copilot-instructions.md`](./.github/copilot-instructions.md).)

What's in the repo:

| Package | What it is | Who uses it |
|---|---|---|
| [`packages/skill`](./packages/skill) | A Copilot CLI **skill** (`copilot-chat-export`) that digests an exported chat session and reports token spend, cache efficiency, sub-agent flow, and prompt-shape anomalies | The agent, when you ask it to analyse a session |
| [`packages/skill-claude`](./packages/skill-claude) | A sister Copilot CLI **skill** (`claude-code-export`) that digests a **Claude Code** session into the *same* schema, so Copilot and Claude runs can be compared side by side. Knows the two-log workflow (CLI transcript + optional proxy capture) and ships the capture relay | The agent, when you ask it to analyse or compare a Claude Code session |
| [`packages/skill-copilot-cli`](./packages/skill-copilot-cli) | A third sibling **skill** (`copilot-cli-export`) that digests a **Copilot CLI** session from its `process-*.log` — exact tokens *and* the exact billed GitHub AI Credits, no proxy needed — into the same schema, completing the three-way Copilot / Claude / CLI comparison. Also knows how to run Copilot CLI headlessly and capture the log | The agent, when you ask it to analyse or compare a Copilot CLI run |
| [`packages/cost-view`](./packages/cost-view) | A focused **React app** that hosts the **Copilot Behavior Lab** knowledge site (Home, Learn, Experiments, Observations, Session Gallery, About) and renders the report viewer under **Analyze Session** — per-prompt cost breakdown, cache attribution, tool usage, multi-model projections. Includes the parser/cost-analysis library | You, in a browser or inside a canvas |
| [`packages/canvas-extension`](./packages/canvas-extension) | A thin **canvas extension** that opens the cost-view in a Copilot CLI side panel and round-trips a "currently selected prompt" between the canvas and the chat | You + the agent, working on the same session together |
| [`packages/articles`](./packages/articles) | The published **"bubble"** that builds the live [Copilot Behavior Lab](https://jfhelin.github.io/copilot-ledger/) site — one standalone HTML page per article, deployed to GitHub Pages | You, reading the experiments online |

### Capture & analysis toolkit

The data-gathering pieces we built so a session can be captured *and* compared
apples-to-apples across the three harnesses:

| Piece | What it does |
|---|---|
| [`scripts/digest.mjs`](./packages/skill/scripts/digest.mjs) | Digests a **VS Code Copilot Chat** export into the shared schema (tokens, cache, sub-agents, prompt shape). |
| [`scripts/claude-relay.mjs`](./packages/skill-claude/scripts/claude-relay.mjs) | A minimal **Anthropic API logging proxy** for Claude Code: sits at `ANTHROPIC_BASE_URL`, streams responses through untouched, and tees each `/v1/messages` request (`system`, `tools`, `messages`) to a JSON capture — the only way to see Claude's exact system prompt + tool schemas. |
| [`scripts/claude-digest.mjs`](./packages/skill-claude/scripts/claude-digest.mjs) | Digests a **Claude Code** session (CLI transcript + optional relay capture) into the shared schema. |
| [`scripts/copilot-cli-digest.mjs`](./packages/skill-copilot-cli/scripts/copilot-cli-digest.mjs) | Digests a **Copilot CLI** `process-*.log` — exact tokens **and** exact billed GitHub AI Credits, no proxy needed. |
| [`scripts/copilot-run.mjs`](./packages/skill-copilot-cli/scripts/copilot-run.mjs) | Runs **Copilot CLI headlessly** for N repetitions, captures each debug log, digests it, and prints a comparison table — the repeatable-capture harness behind the experiments. |

All three digesters emit the **same schema**, which is what makes the Copilot CLI /
Claude Code / VS Code Copilot numbers directly comparable.

## Quick start

```sh
# Install
npm install

# Run the cost view on its own (file-picker UI)
npm run dev

# Build the cost view for embedding in the canvas
npm run build

# Tests (cost-view vitest suite + skill digest smoke test)
npm test

# Type-check all workspaces
npm run typecheck

# Coverage report for the cost-view lib/hooks (HTML in packages/cost-view/coverage)
npm run coverage --workspace=@copilot-ledger/cost-view
```

The cost view loads in three ways:

1. **Standalone**: open <http://127.0.0.1:3000>, navigate to **Analyze Session**, drop a Copilot Chat export onto the page.
2. **URL param**: `?export=<url>` fetches and renders (auto-routes to Analyze Session).
3. **Canvas / parent**: parent window sends `postMessage({type:"loadExport", content})`.

See [`packages/cost-view/src/lib/bridge.js`](./packages/cost-view/src/lib/bridge.js) for the
full `postMessage` protocol.

## Comparing Copilot against Claude Code

The [`claude-code-export`](./packages/skill-claude) skill brings **Claude Code** sessions
into the same digest schema as the VS Code skill, so a Copilot-vs-Claude comparison becomes
a field-by-field diff (context window, cache, token spend, tools, modelled cost).

A Claude Code session is described by **up to two logs**, and the skill combines them:

1. **The transcript** — `~/.claude/projects/<cwd-slug>/<uuid>.jsonl`, written by the Claude
   CLI itself. Always present; the source of truth for exact tokens, cache, tools,
   sub-agents, and timing.
2. **An optional proxy capture** — the transcript does **not** serialize the system prompt
   or tool schemas, so to see the *context-window composition* (system vs tool-defs vs
   messages) you run the bundled relay
   [`claude-relay.mjs`](./packages/skill-claude/scripts/claude-relay.mjs) and point Claude
   Code at it:

   ```sh
   # Terminal 1 — start the local relay (never writes API keys)
   node packages/skill-claude/scripts/claude-relay.mjs

   # Terminal 2 — route the CLI through it, then use Claude normally
   export ANTHROPIC_BASE_URL=http://127.0.0.1:8788
   claude
   ```

   Captures land in `~/CopilotLogExports/claude-captures/`.

The digest generator pairs the two automatically (by timestamp + model):

```sh
node packages/skill-claude/scripts/claude-digest.mjs <transcript.jsonl>
# --capture <file|dir> to point at a specific capture, --no-capture to skip pairing
```

Cost is a **modelled** estimate (Anthropic API token pricing) — transcripts report exact
tokens but no billed amount, so it is comparable to Copilot in token-cost terms but is
**not** GitHub AI Credits. See [`packages/skill-claude/SKILL.md`](./packages/skill-claude/SKILL.md)
for the full workflow.

## Copilot Behavior Lab site

> **Live at [jfhelin.github.io/copilot-ledger](https://jfhelin.github.io/copilot-ledger/)** (the articles bubble in [`packages/articles`](./packages/articles) is built and deployed on every push to `main`).

The cost view is also wrapped in a small, dependency-free **knowledge site** with a
persistent left-side navigation (it collapses to a hamburger menu on narrow screens).
Routing is **hash-based** (`#/learn`, `#/experiments/<id>`, `#/analyze`, …) so deep links
and refreshes work on GitHub Pages project subpaths without server rewrites.

- **Navigation:** Home, Learn, Experiments, Observations, Session Gallery, Analyze Session, About.
- **Viewer preserved:** the report viewer lives in
  [`src/pages/AnalyzeSession.jsx`](./packages/cost-view/src/pages/AnalyzeSession.jsx). The
  canvas extension loads it with `?embed=1`, which bypasses the site shell entirely.
- **Content is data-driven:** all editorial content lives in
  [`src/content/site.js`](./packages/cost-view/src/content/site.js).

## License

MIT.
