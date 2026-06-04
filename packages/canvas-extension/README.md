# @copilot-ledger/canvas-extension

Copilot CLI extension that exposes the **Copilot Ledger** cost view as a canvas panel.

The extension serves the `@copilot-ledger/cost-view` Vite build from a loopback HTTP server,
and routes selection events between the agent (via canvas actions) and the iframe
(via `postMessage`).

## Install

From the repo root:

```sh
npm install          # once, installs all workspace deps
npm run canvas:install
```

`canvas:install` builds the cost-view bundle and stages a **real copy** of the extension
(`extension.mjs`, `copilot-extension.json`, and `dist/`) into
`~/.copilot/extensions/copilot-ledger-canvas/`.

Then, in your Copilot CLI session, reload extensions so the canvas registers:

```text
extensions_reload
```

You can confirm it loaded with `extensions_manage list` — look for `copilot-ledger-canvas`.

To remove it: `npm run canvas:uninstall`.

### Why a copy and not a symlink

The Copilot CLI discovers extensions by scanning **real** subdirectories that contain
`extension.mjs` (under `.github/extensions/` and the user's `~/.copilot/extensions/`). It
does **not** follow symlinked extension directories, so the install script copies files
rather than linking. The extension also needs the cost-view `dist/` present next to
`extension.mjs` (it falls back to `../cost-view/dist` only in a repo checkout), which is why
the install step builds and stages it.

## Iterating on the canvas UI

After editing the cost-view or the extension:

```sh
npm run canvas:install   # rebuilds dist + re-stages the copy
```

Then `extensions_reload` and reopen the canvas. Extension in-memory state (loaded export,
summaries) is keyed by instance and is lost when the extension process restarts.

## Entry point

`extension.mjs` declares the `copilot-ledger` canvas and its actions (`loadExport`,
`getPendingRequests`, `setSummaries`, `selectPrompt`, `getSelection`, `clearSelection`). It
is built against the Copilot SDK (`@github/copilot-sdk/extension`), which the CLI resolves
automatically for the forked extension process.
