# Article 3 — What your IDE sends before you type

> Working file (shared scratchpad). Collects facts, supporting runs, writing ideas, and
> open data needs. Not the published article.

- **Role:** Make the invisible preloaded IDE context visible to developers.
- **Status:** 🔵 Buildable from existing captures — **no large new runs required** (N=1–2
  structural per surface).
- **Proposed destination:** Personal blog first; GitHub Blog if framed as general developer
  education. **Alt title:** "Your prompt is only part of what a coding agent sees."
- **Core message:** The text you type may be a small part of the model's actual request.
  Before reasoning, the IDE may have added system instructions, workspace info, repo state,
  git branch/commits, tools, MCP schemas, skills, memory, repo instructions, and history.
  An IDE and a CLI on the same model do not expose the same world to that model.

## Key facts & numbers (retrieve EXACT values from the ledger before writing)

Approximate structural prefixes (placeholder — confirm against `runs.jsonl`):

| Surface | Approx prefix | Source capture |
|---|---:|---|
| Copilot CLI | ~15k | `structural-prefix/copilot/digest.json` |
| Claude CLI | ~27k | `structural-prefix/claude/digest.json` |
| Copilot in VS Code | ~17–21k (config-dependent) | `co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json` |
| Claude Code in VS Code | ~46k | `cl-ide-transcripts/CL-IDE_extension_OFF.jsonl` |

> The plan explicitly says: **before publishing, retrieve all exact numbers from the run
> ledger rather than relying on remembered values.** Treat the table above as a pointer, not
> a source.

Useful concrete sub-findings already in hand (Direct evidence):
- CO-IDE measured 20,598 tokens / 56 native tools MCP-off; **18 of those tools come from
  notebook + browser extensions**, not Copilot → strip for the ~17k product floor.
- CO-IDE MCP-on jumps to 46,428 / 95 tools (tools sent flat, not behind `tool_search`).
- CL-IDE extension OFF vs "ON" = 46,364 vs 46,418 (+54 noise) → the extension does not
  inject a project `.mcp.json` server into the model prefix.
- Cold vs warm matters: read the cold prefix where `prompt_tokens_details.cached_tokens == 0`.

## Supporting runs / data

- `co-ide-exports/` (CO-IDE MCP-off canonical + MCP-on contrast).
- `cl-ide-transcripts/` (CL-IDE OFF/ON).
- `ask-vs-agent-t6/` — six CO-IDE exports, 8 MCP servers, ask vs agent, cold/warm (also
  backs experiment 10). Ask-mode cold ~17.7k–19.7k; agent turns fire `gpt-4o-mini` aux calls.
- `structural-prefix/` for the CLI baselines to contrast against.
- Tool/skill scaling probes in `~/CopilotLogExports/` (hi*, workiq 142 vs 316 tools, Insider
  401 tools / 93% prefix) — evidence that installed extensions/skills dominate the prefix.

## Required data per surface (plan checklist)

product+version · model+snapshot · workspace+commit · fresh? · MCP list · enabled tools ·
installed skills · memory/repo instructions · total first-call prefix · system prompt size ·
tool schema size (where observable) · dynamic env context · cache-read + cache-creation
tokens · measurement type (direct wire / export-derived / inferred).

## Visuals

- Stacked "what the model receives" request diagram.
- Prefix-size bar chart (can reuse / extend `prefix-size-comparison.svg`).
- IDE-vs-CLI component breakdown.
- MCP-off vs MCP-on callout.
- Cold-vs-warm first-call diagram.

## Writing ideas / hooks

- "You typed 12 words. The model received ~20,000 tokens." Open on the gap.
- Emphasize: bigger context isn't automatically better or worse — it has token + attention
  cost and a cacheability question.
- Key distinction to hammer: **product decision vs user configuration.** Extensions, MCP,
  and skills are mostly *your* config piling onto the product floor.

## Limitations (must state)

IDE operation is manual · N is small · some exports don't expose exact wire composition ·
results describe captured configurations, not every installation. **No means/rankings from
these small samples.**

## Open items / TODO

- [ ] Pull exact prefixes from `runs.jsonl`; replace the placeholder table.
- [ ] Decide which surfaces/configs to include (keep it tight: CO-CLI, CL-CLI, CO-IDE, CL-IDE).
- [ ] Confirm cold captures (cached_tokens==0) for every cited number.
- [ ] Reuse vs rebuild the prefix figure.
