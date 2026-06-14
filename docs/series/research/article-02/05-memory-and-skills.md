# Memory & skills — the configurable layer that rides inside the prompt

> Supporting research for [`article-02-more-than-a-model.md`](../../article-02-more-than-a-model.md).
> This is a shared human/agent scratchpad, not published copy.

**Capture.** VS Code Copilot agent-mode export (MCP off), 2026-06; CLI system prompts.
**Model.** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`).
**Source captures.** `co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json` (skill/agent blocks
extracted by regex over `requestMessages.messages`). Cross-checked against
`docs/content-lab/data/harness-data-FINAL.md` §1.1–1.3.

---

## One-line thesis

"Skills," "agents," and "memory" files are **user/repo/extension configuration the harness
injects into the system block**. Most of what makes a VS Code Copilot prompt big isn't the
product — it's *your* installed config. The model never changes; the prompt around it does.

## The headline correction (Direct evidence)

The VS Code first-call surface carries **16 `<skill>` blocks + 8 `<agent>` blocks = 24
preloaded customization blocks**, verified by counting `<skill` / `<agent` tags in the raw
export. **Only 6 of the 24 are Copilot product defaults; 18 are repo/user/extension config.**

> ⚠️ Citation hazard: an older figure of "37 skills / 11 agents" appears in
> `system-prompt-comparison.md`. That is the **full system-prompt catalog count**, a
> different thing from the **first-call agent-mode surface** (16 + 8) measured here. The
> article must cite **16 skills + 8 agents** for the captured cold start, not 37/11.

## Provenance of the 24 blocks (Direct evidence)

Every block's `<file>` path tells you who installed it:

| Source | Count | Examples |
|---|---:|---|
| **Product built-in** (VS Code Copilot ext) | 5 skills | `project-setup-info-local`, `get-search-view-results`, `troubleshoot`, `agent-customization`, `chronicle` |
| Repo `.github/skills/` | 2 skills | `api-endpoint`, `walkthrough-writer` |
| User `~/.agents/skills/` | 1 skill | `microsoft-foundry` |
| GitHub PR extension | 6 skills | `suggest-fix-issue`, `create-pull-request`, `address-pr-comments`, … |
| Chat-customizations-eval extension | 2 skills | `analyze-prompt`, `fix-customization-evaluation-diagnostics` |
| **Agents — repo `.github/agents/`** | 7 agents | `API Specialist`, `BDD Specialist`, `tdd-red/green/blue`, `Walkthrough Writer`, `API Test Writer` |
| **Agents — product built-in** | 1 agent | `Explore` |

**Tally:** product defaults = 5 skills + 1 agent (`Explore`) = **6**. Everything else (18
blocks) came from the repo, the user's home dir, or installed VS Code extensions.

## What this means for footprint (Direct evidence + Inference)

- These 24 blocks are **preloaded full-body** into the system block — they're why VS Code's
  system prompt is ≈44,165 chars vs ≈26–28k for the CLIs (dossier 02).
- The ~2,000-token "environment-driven skills" subtraction behind the **≈18.5k product-floor
  projection** (dossier 01) comes from exactly this layer: strip the repo/user/extension
  blocks and you approximate a clean install. (Projection, not measurement.)
- **Direct evidence:** the 16+8 count and per-block provenance. **Inference:** the precise
  token weight of each block (SHAPE-estimated, not individually billed).

## Memory files across harnesses (Direct evidence)

The "memory" lever is the same idea in every harness — a file auto-loaded into context:

| Harness | Memory mechanism |
|---|---|
| Copilot CLI / VS Code | `copilot-instructions.md`, `AGENTS.md`, path-scoped `*.instructions.md` with `applyTo` globs |
| Claude CLI / Code | `CLAUDE.md`; an explicit `# Memory` section in the system prompt telling the model to use it |

- Claude's system prompt **names memory as a first-class section**; Copilot relies on
  auto-loaded instruction files. Same outcome (repo conventions injected), different framing.
- VS Code **inlines `copilot-instructions.md`** directly into the system block (part of why
  it's the largest) — verified in §1.1 of the master dossier.

## UX consequences (Inference)

1. A repo with a rich `.github/skills` + `.github/agents` + `copilot-instructions.md` makes
   **every teammate's cold start heavier**, regardless of model — a shared, invisible cost.
2. The same repo opened in a *clean* profile would send ≈6 fewer skill blocks' worth of
   tokens; the customization is opt-in cost.
3. Skills/agents are leverage **and** tax: they encode behaviour for free at authoring time
   but bill on every cold call.

## Notable quirks / tells

- Several skills come from **unrelated installed extensions** (GitHub PR, customizations
  eval) — users often don't realize an extension is injecting skill blocks into their agent
  prompt.
- The system prompt text appears in `requestMessages.messages` content as structured parts
  (the message `content` is a list), not a flat string — extraction requires concatenating
  the text parts (capture gotcha).

## Open data gaps

- Per-block token weights are SHAPE estimates; a precise per-skill token bill would need the
  Anthropic-exact tokenizer over each block.
- The ≈18.5k product-floor depends on which blocks count as "environment" vs "product"; a
  clean-profile capture would settle it as Direct evidence.
