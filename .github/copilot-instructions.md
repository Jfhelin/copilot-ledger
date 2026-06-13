# Copilot Ledger — repo instructions

## What this project is

Copilot Ledger is a project for **analyzing VS Code Copilot diagnostic logs** (exported
chat sessions) to understand how agents actually behave — token spend, cache efficiency,
sub-agent fan-out, tool usage, and prompt-shape anomalies. It pairs two things:

- a **GitHub app canvas** that opens a visual cost view in a Copilot CLI side panel, so
  you and the agent can discuss a log together and dig into it more deeply, and
- a **skill** that makes it easier to analyze those logs through LLM discussion in chat
  (it digests a large raw export into a compact form the agent can reason over).

The goal is to make agent runs legible: where the time and credits went, what the cache
bought you, which sub-agents did what, and how the conversation was shaped.

Tools for understanding and improving **VS Code Copilot Chat** session efficiency.
This is an npm-workspaces monorepo (`type: module`, Node 22). Three packages, one repo.

## Packages

| Package | What it is |
|---|---|
| `packages/skill` | Copilot CLI **skill** (`copilot-chat-export`) that digests an exported chat session and reports token spend, cache efficiency, sub-agent flow, and prompt-shape anomalies. |
| `packages/cost-view` | A focused **React app** (Vite + React 18) that renders the same export visually — per-prompt cost, cache attribution, tool usage, multi-model projections. Also holds the parser/cost-analysis library. |
| `packages/canvas-extension` | A thin **canvas extension** that opens the cost-view in a Copilot CLI side panel and round-trips the "currently selected prompt" between the canvas and the chat. |

## Commands

Run from the repo root unless noted.

```sh
npm install        # install all workspaces
npm run dev        # run cost-view standalone (Vite dev server, file-picker UI)
npm run build      # build cost-view for embedding in the canvas
npm test           # run all workspace tests (vitest in cost-view)
npm run typecheck  # tsc --noEmit across workspaces
```

Per-package scripts live in each `packages/*/package.json`. The cost-view test
runner is **vitest** (`npm test --workspace=@copilot-ledger/cost-view`).

## Conventions

- ES modules only (`"type": "module"`). Use `import`/`export`, not `require`.
- React 18 function components and hooks. No class components.
- Styling is driven by the shared theme in `packages/cost-view/src/lib/theme.js`
  (light-mode only). Prefer theme tokens over hard-coded colors.
- Keep changes surgical and add/adjust vitest coverage for behavior changes.
- Always run `npm test` and `npm run build` before considering a change done.

## How the cost view loads an export

The cost view accepts an export three ways (see `packages/cost-view/src/lib/bridge.js`
for the full `postMessage` protocol):

1. **Standalone** — drop a Copilot Chat export file onto the page.
2. **URL param** — `?export=<url>` fetches and renders.
3. **Canvas / parent** — parent sends `postMessage({ type: "loadExport", content })`.

## Canvas extension workflow

The extension (`packages/canvas-extension/extension.mjs`) runs a small loopback HTTP
server per canvas instance that serves the cost-view `dist/` build, with SSE for
agent→iframe messages and POST endpoints for iframe→extension. Canvas actions:
`loadExport`, `getPendingRequests`, `setSummaries`, `selectPrompt`, `getSelection`,
`clearSelection`.

When iterating on canvas UI: edit → `npm run canvas:sync` → reload the extension →
open the canvas with a **new `instanceId`**.

Two gotchas that look like "my change didn't take":

- **The installed extension serves its *own* copy of `dist/`.** `canvas:install`/
  `canvas:sync` copy the freshly built `dist/` into
  `~/.copilot/extensions/copilot-ledger-canvas/dist/`. A bare `npm run build` only
  updates the in-repo `packages/cost-view/dist/` and is **not** what the running
  canvas serves. Use `npm run canvas:sync` (build + stage) — or `npm run
  canvas:install` for a full reinstall — then `extensions_reload`.
- **Reopening the same `instanceId` only *focuses* the existing panel**; the iframe
  keeps the old bundle in memory. To load a fresh build, open with a new
  `instanceId` (the old panels can be closed).

Extension in-memory state (loaded export, summaries) is keyed by instance and is lost
if the extension process restarts.

## Article series & where data lives

This repo also hosts a **content/research series** about agent behavior. If you are
doing article, experiment, or data work (not the cost-view/canvas code), start here:

| Layer | Location | What it is |
|---|---|---|
| **Series plan (current)** | `docs/series/INDEX.md` + `docs/series/article-0N-*.md` | The six-article flagship plan. One editable working file per article — a **shared human/agent scratchpad** of facts, supporting runs, visuals, writing ideas, and open data needs. Start here to see plan + status. |
| **Published articles** | `docs/articles/*.md` | The live markdown that actually ships to Pages/Blog. |
| **Publish manifest** | `packages/articles/articles.config.mjs` | Controls which `.md` becomes which `<slug>.html`. **You MUST edit this to publish or relocate an article** (verify: `npm run build --workspace=@copilot-ledger/articles`). |
| **Data catalog + run ledger** | `docs/content-lab/data/INDEX.md`, `docs/content-lab/data/db/runs.jsonl` | Canonical record of every captured run. The ledger is the **queryable spine** — cite a run from here, never a remembered number. |
| **Experiment pre-regs** | `docs/content-lab/experiments/*.md` | Older experiment designs; some feed the new series. |
| **Raw captures** | `~/copilot-ledger-data/captures/` (external, **not in git**) | Wire logs, transcripts, IDE exports, the 40-run metrics. |

`docs/content-lab/` is the **earlier** article-series idea + raw experiment scratch;
`docs/series/` is the clean home for the **new** six-article plan. Keep them separate —
do not edit the wrong one. Skills that go deeper: `copilot-behavior-lab` (publishing),
`copilot-chat-export` / `copilot-cli-export` / `claude-code-export` (digesters),
`data-catalog-backfill` (audit the catalog).

## The export format

A Copilot chat export is one JSON object with top-level `prompts`, `mcpServers`, and
`exportedAt`. Each prompt has `logs[]` of interleaved `request` and `toolCall` entries.
Every `request` carries a full snapshot of the conversation prefix (not a delta), which
is why exports are large. The `copilot-chat-export` skill generates a compact digest
sidecar for analysis rather than reading the raw file directly.
