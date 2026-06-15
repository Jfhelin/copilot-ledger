# Tool catalog — discovery, deferral, and the toolDef tax

> Supporting research for [`article-02-more-than-a-model.md`](../../article-02-more-than-a-model.md).
> This is a shared human/agent scratchpad, not published copy.

**Capture.** Structural-prefix CLIs + VS Code agent-mode exports (MCP on/off), 2026-06.
**Model.** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`).
**Source captures.** `structural-prefix/{copilot,claude}/digest.json`;
`co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json`;
`co-ide-exports/CO-IDE_CopilotChat_sonnet4.5_MCPon.json`. Tool arrays read from
`metadata.tools` of `ChatMLSuccess` log entries (NOT `body.tools`).

---

## One-line thesis

Tools are the **single biggest swing** in cold-start size, and harnesses manage them very
differently: Claude CLI ships a fat static catalog, Copilot CLI ships a lean one, and VS
Code ships a **huge** catalog but **defers most of it** behind a `tool_search` tool so the
model loads definitions on demand.

## CLI tool catalogs (Direct evidence)

From `prefix.representative`:

| Harness | Tools | toolDef tokens (SHAPE) | toolDefsShare |
|---|---:|---:|---:|
| **CO-CLI** | 19 | 8,064 | 0.542 |
| **CL-CLI** | 27 | 18,877 | 0.694 |

- Claude CLI carries **+8 tools** and **+10,813 toolDef tokens** over Copilot CLI — and tool
  definitions are nearly **70%** of its entire cold prefix.
- This single difference accounts for most of the CL-CLI > CO-CLI footprint gap in dossier
  01. The system prompts are nearly the same size; **the tools are the tax.**

> Divisor note: toolDef tokens are SHAPE (chars/4) floors, ~8–9% under the exact count.

## VS Code: a big catalog that mostly stays asleep (Direct evidence)

VS Code Copilot Chat takes the opposite approach to the CLIs — ship everything, but defer:

| Condition | Tools in array | Deferred (`defer_loading: true`) | Active at turn 0 | `tool_search` present? |
|---|---:|---:|---:|---|
| **MCP off** | 56 | 33 | **23** | ✅ yes |
| **MCP on** | 95 | 0 | **95** | ✅ yes |

- With MCP off, **33 of 56 tools are marked `defer_loading: true`** — their schemas are
  withheld from the active set and fetched only if the model calls `tool_search`. Just **23**
  are live at turn 0. Reproduced on both agent-mode captures.
- With MCP on, the catalog jumps to **95 tools and deferral drops to 0** — every MCP tool is
  loaded eagerly. First-call `prompt_tokens` for the MCP-on capture is **46,428** (vs the
  20,598 MCP-off footprint in dossier 01): turning MCP on more than **doubles** the VS Code
  cold surface.
- **All 56 MCP-off tools are product-native VS Code / Copilot Chat built-ins — none come
  from a user-installed extension or MCP server.** MCP off is the controlled condition that
  isolates the native catalog: with every configured MCP server disabled, the 56 are exactly
  what VS Code + the Copilot Chat extension ship by default. The MCP-injected surface is
  precisely the **+39** tools that appear only when MCP is switched on (56 → 95); subtract
  those and what remains is 100% native. (The export carries no per-tool `source` field, so
  this rests on the MCP-off isolation plus every name matching a documented product built-in,
  in a controlled capture environment — not a tagged origin field.)
- Deferral is a real, observable harness lever: the flag is `defer_loading: true` on each
  tool object in `metadata.tools`.

## Why this matters (the article's point)

Three harnesses, same model, three philosophies of the tool surface:

- **Copilot CLI — curated minimalism.** 19 tools, all live. Lowest tool tax.
- **Claude CLI — eager breadth.** 27 tools, all live, ~69% of the prefix. You pay for the
  whole toolbox every call.
- **VS Code — lazy breadth.** 56–95 tools, but most **deferred** behind `tool_search` when
  MCP is off. Big catalog, smaller *active* surface — until MCP eagerly loads everything.

None of these is "the model." They are packaging decisions a harness author makes.

## UX consequences (Inference)

1. Copilot CLI's lean set means **less to read every turn** but may push the model toward
   `bash` when a specialized tool is absent.
2. VS Code's deferral keeps cold starts moderate but adds a **round-trip**: the model must
   `tool_search` then call — a latency/clarity tradeoff, not a token-free win.
3. Claude CLI's eager catalog maximizes **first-attempt tool availability** at a standing
   per-call token cost.

## Notable quirks / tells

- The tools array lives in `metadata.tools` of `ChatMLSuccess` entries, **not** `body.tools`
  — a capture gotcha worth stating so the writer trusts the counts.
- VS Code MCP-on eagerly loads all 95 tools (0 deferred): MCP doesn't just *add* tools, it
  appears to **switch off deferral** for the session, compounding the footprint hit.
- `tool_search` is itself one of the always-active tools — deferral is a first-class,
  model-driven mechanism, not a background optimization.
- The browser-automation tool names in the native set (`open_browser_page`, `navigate_page`,
  `click_element`, `screenshot_page`, `run_playwright_code`, …) are **VS Code's built-in
  browser tools**, not the configured `playwright` MCP server. They are present with MCP
  **off**, so despite the Playwright-style naming they ship with the product — do not
  attribute them (or any of the 56) to an installed MCP server / machine extension.

## Open data gaps

- We have the *count* of deferred tools but not a measurement of how often the model
  actually calls `tool_search` in a real session (does deferral pay off, or does the model
  immediately fault most tools back in?). Needs a behavioural capture.
- CLI tool catalogs are from one structural run each; tool counts are stable per product
  version but could drift across releases.
