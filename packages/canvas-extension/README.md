# @copilot-ledger/canvas-extension

Copilot CLI extension that exposes the **Copilot Ledger** cost view as a canvas panel.

The extension serves the `@copilot-ledger/cost-view` Vite build from a loopback HTTP server,
and routes selection events between the agent (via canvas actions) and the iframe
(via `postMessage`).

## Scaffolding the entry point

The extension entry file (`extension.mjs`) is intentionally left to be scaffolded with the
`extensions_manage` tool so it tracks the latest Copilot SDK shape. Run:

```sh
# from a Copilot CLI session
extensions_manage scaffold kind=canvas name=copilot-ledger-canvas location=project
```

Then point the scaffold's `open()` handler at the cost-view dist (or dev server) and wire
the `selectPrompt` / `getSelection` actions to the `postMessage` protocol documented in
`../cost-view/src/lib/bridge.js`.
