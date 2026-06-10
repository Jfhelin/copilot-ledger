# Copilot Ledger

Tools for understanding and improving **VS Code Copilot Chat** session efficiency.

🔬 **Live site: [Copilot Behavior Lab →](https://jfhelin.github.io/copilot-ledger/)** — read the experiments and explore example reports without installing anything.

📄 **Flagship article (stable link): [One run can't tell two coding agents apart →](https://jfhelin.github.io/copilot-ledger/one-run-cant-rank-two-agents.html)** — same model, same repo, same prompt, 40 runs across the Copilot CLI and the Claude CLI. This per-article URL stays valid even after the site's front page changes.

Two artifacts, one repo:

| Package | What it is | Who uses it |
|---|---|---|
| [`packages/skill`](./packages/skill) | A Copilot CLI **skill** (`copilot-chat-export`) that digests an exported chat session and reports token spend, cache efficiency, sub-agent flow, and prompt-shape anomalies | The agent, when you ask it to analyse a session |
| [`packages/skill-claude`](./packages/skill-claude) | A sister Copilot CLI **skill** (`claude-code-export`) that digests a **Claude Code** session into the *same* schema, so Copilot and Claude runs can be compared side by side. Knows the two-log workflow (CLI transcript + optional proxy capture) and ships the capture relay | The agent, when you ask it to analyse or compare a Claude Code session |
| [`packages/cost-view`](./packages/cost-view) | A focused **React app** that hosts the **Copilot Behavior Lab** knowledge site (Home, Learn, Experiments, Observations, Session Gallery, About) and renders the report viewer under **Analyze Session** — per-prompt cost breakdown, cache attribution, tool usage, multi-model projections. Includes the parser/cost-analysis library | You, in a browser or inside a canvas |
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

> **Live at [jfhelin.github.io/copilot-ledger](https://jfhelin.github.io/copilot-ledger/)** (deployed from `packages/cost-view/dist` on every push to `main`).

The cost view is wrapped in a small, dependency-free **knowledge site** with a persistent
left-side navigation (it collapses to a hamburger menu on narrow screens). Routing is
**hash-based** (`#/learn`, `#/experiments/<id>`, `#/analyze`, …) so deep links and refreshes
work on GitHub Pages project subpaths without server rewrites.

- **Navigation:** Home, Learn, Experiments, Observations, Session Gallery, Analyze Session, About.
- **Viewer preserved:** the original report viewer is untouched logic, moved verbatim into
  [`src/pages/AnalyzeSession.jsx`](./packages/cost-view/src/pages/AnalyzeSession.jsx) and
  hosted under the **Analyze Session** route. The canvas extension still loads it with
  `?embed=1`, which bypasses the site shell entirely — behavior is identical to before.
- **Content is data-driven:** all editorial content lives in
  [`src/content/site.js`](./packages/cost-view/src/content/site.js).

### Add a new experiment

Append one object to the `EXPERIMENTS` array in `src/content/site.js`:

```js
emptyExperiment({
  id: "my-experiment",          // becomes #/experiments/my-experiment
  title: "My Experiment",
  hook: "A surprising one-line observation.",
  status: "Draft",              // Draft | Published | Planned | Under investigation
  executiveSummary: "…",        // fill in any of the structured fields; blanks render
  hypothesis: "…",              // as italic "Placeholder — to be written."
  // whyThisMatters, sessionSummary, keyFindings, whatHappened, interpretation,
  // practicalGuidance, confidence, evidence, linkedInDraft, videoOutline
});
```

The card (Experiments list + Home) and the detail page render automatically.

### Add a new gallery session

Drop the export JSON into `packages/cost-view/public/sessions/` and append one object to
`GALLERY_SESSIONS` in `src/content/site.js`:

```js
{
  id: "my-session",
  title: "My example session",
  description: "What this session demonstrates.",
  file: "sessions/my-session.json", // null => renders a "Coming soon" card
}
```

The card links to `#/analyze?src=<base-safe url>` and opens the existing viewer with that
export. Use `file: null` to publish a placeholder card before the JSON exists.

### Add a fixed report (pinned evidence for an experiment)

A **fixed report** pins one bundled export to a stable `#/reports/<id>` route and renders it
in the *read-only* viewer — same UI as Analyze Session, but with no file picker and no file
switching, plus a "back to experiment" link. This is how an experiment links to its own
evidence without exposing the uploader.

1. Drop the export JSON into `packages/cost-view/public/sessions/`.
2. Append one object to the `FIXED_REPORTS` array in `src/content/site.js`:

```js
{
  id: "my-report",                                  // becomes #/reports/my-report
  title: "My session — what it shows",
  file: "sessions/my-report.json",
  backTo: "/experiments/my-experiment",             // where the back link points
  backLabel: "Back to experiment",
}
```

3. Link to it from the experiment page with `hrefFor("/reports/my-report")`.

The viewer is reused verbatim via its `fixed` prop (see
[`src/pages/FixedReport.jsx`](./packages/cost-view/src/pages/FixedReport.jsx)); the bundled
export is never written to the user's recents. The first one,
[`#/reports/02-one-tool`](./packages/cost-view/src/pages/ContextQualityReadme.jsx), backs the
"The README was cheap. Finding it wasn't." experiment.

## Status

Early. Ports the proven CostView from AGENTVIZ + the v7 `copilot-chat-export` skill into
a focused home, and adds the canvas glue for two-way discussion of a session.

## License

MIT.
