# Copilot Ledger

Tools for understanding and improving **VS Code Copilot Chat** session efficiency — a
digest **skill**, a **cost-view** React app, and a Copilot CLI **canvas extension** that
render an exported chat session: per-prompt token spend, cache efficiency, sub-agent
fan-out, and tool usage.

## This repo is a promoted mirror

This public repo is a **generated subset** of a private research repo. It carries the
shippable tools and the published article(s) only; drafts, the article series, the data
catalog, and internal notes live in the private repo and are intentionally not here.

**Do not expect changes pushed directly here to stick.** `main` is periodically rewritten
from the private repo's promotion script (`scripts/sync-public.mjs`). Tool fixes and
article updates flow **private → public**. Issues and PRs are welcome for discussion, but
durable changes land in the private primary repo first and are then promoted.

## Packages

| Package | What it is |
|---|---|
| `packages/skill` | The `copilot-chat-export` digest skill (token spend, cache, sub-agent flow, prompt-shape anomalies). |
| `packages/skill-publish-session-export` | The `publish-session-export` skill for user-guided redaction before publishing session evidence. |
| `packages/cost-view` | React app (Vite + React 18) that renders a chat export visually. |
| `packages/canvas-extension` | Canvas extension that opens cost-view in a Copilot CLI side panel. |
| `packages/articles` | Builds the published article(s) to GitHub Pages. |

## Commands

```sh
npm install        # install all workspaces
npm run build      # build cost-view
npm test           # run workspace tests
npm run typecheck  # tsc --noEmit across workspaces
```

## Conventions

- ES modules only (`"type": "module"`, Node 22). Use `import`/`export`, not `require`.
- React 18 function components and hooks. No class components.
- Keep changes surgical and run `npm test` + `npm run build` before considering a change done.
