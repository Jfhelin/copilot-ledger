# MCP as a config lever (not a harness-architecture difference)

> Supporting research for [`article-02-more-than-a-model.md`](../../article-02-more-than-a-model.md).
> This is a shared human/agent scratchpad, not published copy.

**Capture.** Within-harness MCP on/off re-runs (same repo, same prompt), 2026-06.
**Model.** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`).
**Source captures.** CL-CLI relay wire capture (filesystem server toggled);
`co-ide-exports/*MCPoff*` vs `*MCPon*`; cross-checked against
`docs/content-lab/data/harness-data-FINAL.md` §1.6.

---

## One-line thesis

MCP isn't a property of the model **or** really of the harness — it's a **deployment
config** the user supplies. Every harness ships the tool catalog flat and **pays per tool**;
turning MCP on adds its tools (and their tokens) linearly. The same lever scales from "+14
tools" to "doubles the cold prefix" depending only on how much you bolt on.

## Clean within-harness delta — one small server (Direct evidence)

To isolate MCP from harness design, the same single filesystem server
(`@modelcontextprotocol/server-filesystem`, 14 tools) was toggled off→on, same repo, same
task:

| Harness | OFF | ON | Delta | Evidence quality |
|---|---|---|---|---|
| **CL-CLI** | 28 tools / 21,071 toolDef tok | 42 tools / 22,947 toolDef tok | **+14 tools, +1,876 toolDef tok** | wire-measured (High) |
| **CO-CLI** | 11.9 credits | 15.5 credits | **+3.6 credits (~+30%)** | native billing; *illustrative* (run variance) |

- The CL-CLI delta is the clean one: **+14 tools is exactly the server's tool count**, and
  it costs **+1,876 toolDef tokens**. Linear in tools.
- **Important framing:** +1,876 is the **tool-DEFINITION token** delta on the wire, *not* an
  API `prompt_tokens` delta. Cite it as "tokens added to the tool catalog," not "added to
  billed input."
- The CO-CLI credit delta (+3.6) also folds in agent run-to-run variance — treat the +30%
  as **illustrative**, not a clean prefix-only measurement.

## The same lever at scale — VS Code (Direct evidence)

| VS Code condition | Tools | Deferred | First-call `prompt_tokens` |
|---|---:|---:|---:|
| MCP off | 56 | 33 | 20,598 |
| MCP on | 95 | 0 | 46,428 |

- The MCP-off VS Code capture already lists **12 configured MCP servers** (Azure MCP,
  github, playwright, pylance, Bicep, kusto, …) — MCP is clearly a *user/workspace* config
  surface, not something the product fixes.
- Turning MCP on takes the catalog from 56→95 tools, **switches deferral off** (33→0), and
  **more than doubles** the cold prefix (20,598 → 46,428). That's the same per-tool tax as
  CL-CLI's +14/+1,876, just multiplied by a much bigger config.

## Why this is the article's point

A reader might assume "Claude CLI is heavier than Copilot CLI" is an architecture verdict.
The MCP data shows the heavier driver is often **what you configured**, not which product
you picked:

- Every harness ships the catalog **flat** and pays **linearly per tool**.
- MCP load is therefore a **config/deployment choice**. You can make the lean harness heavy
  (add servers) or keep the heavy one lean (don't).
- This is the cleanest example of "more than a model": the cost moved without touching the
  weights *or* swapping harness — just a JSON config file.

## UX consequences (Inference)

1. A repo that ships a fat `.mcp.json` silently raises every collaborator's per-call cost,
   independent of which agent they run.
2. VS Code's deferral (dossier 03) is the mitigation — but MCP-on **defeats** it by loading
   everything eagerly, so MCP-heavy users lose the deferral savings.
3. "Audit your MCP config" is a concrete, model-agnostic cost lever the article can
   recommend.

## Notable quirks / tells

- CL-IDE (Claude Code in VS Code) had a filesystem server **approved at CLI level but not
  injected** by the extension (cold prefix 46,364 OFF vs 46,418 ON = +54, noise). So the
  extension enables project MCP through its own path, not `~/.claude.json`. Evidence that
  "MCP on" means different things in different harnesses — supplementary, keep in a footnote.
- MCP-on in VS Code doesn't just append tools; it appears to **disable tool deferral** for
  the session, compounding the footprint hit beyond the raw tool count.

## Open data gaps

- The CO-CLI native-billing MCP delta is contaminated by run variance; a repeated n≈10
  on/off batch would turn it into a clean credit figure.
- We measured *catalog* growth, not how often the added MCP tools were actually **used** —
  cost added vs value added is unmeasured.
