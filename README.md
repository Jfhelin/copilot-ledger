# Copilot Ledger

Tools for understanding and improving **VS Code Copilot Chat** session efficiency.

Two artifacts, one repo:

| Package | What it is | Who uses it |
|---|---|---|
| [`packages/skill`](./packages/skill) | A Copilot CLI **skill** (`copilot-chat-export`) that digests an exported chat session and reports token spend, cache efficiency, sub-agent flow, and prompt-shape anomalies | The agent, when you ask it to analyse a session |
| [`packages/cost-view`](./packages/cost-view) | A focused **React app** that renders the same export visually — per-prompt cost breakdown, cache attribution, tool usage, multi-model projections. Includes the parser/cost-analysis library | You, in a browser or inside a canvas |
| [`packages/canvas-extension`](./packages/canvas-extension) | A thin **canvas extension** that opens the cost-view in a Copilot CLI side panel and round-trips a "currently selected prompt" between the canvas and the chat | You + the agent, working on the same session together |

## Why a separate repo?

This started as a few additions on top of [AGENTVIZ](https://github.com/jayparikh/agentviz),
but the cost-and-discussion workflow is its own product:

- **The skill** is a Copilot CLI artifact, not an AGENTVIZ thing.
- **The cost view** is one of seven views in AGENTVIZ; the other six (replay, tracks,
  waterfall, graph, stats, coach) are unrelated to the workflow this repo is about.
- **The canvas** wants to drive the cost view directly, not the whole AGENTVIZ shell.

Living separately lets each piece be exactly the size it needs to be.

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

1. **Standalone**: open <http://127.0.0.1:3000>, drop a Copilot Chat export onto the page.
2. **URL param**: `?export=<url>` fetches and renders.
3. **Canvas / parent**: parent window sends `postMessage({type:"loadExport", content})`.

See [`packages/cost-view/src/lib/bridge.js`](./packages/cost-view/src/lib/bridge.js) for the
full `postMessage` protocol.

## Status

Early. Ports the proven CostView from AGENTVIZ + the v7 `copilot-chat-export` skill into
a focused home, and adds the canvas glue for two-way discussion of a session.

## License

MIT.
