# Article 2 — A coding agent is more than a model

> Working file (shared scratchpad). Collects facts, supporting runs, writing ideas, and
> open data needs. Not the published article.

- **Role:** Explain the harness — the architecture and control surfaces around the model.
- **Status:** 🟡 Research dossier complete; article drafted and in polish (this session's focus).
- **Proposed destination:** GitHub Blog. **Scope guard:** do NOT expand into a full product
  comparison — that is Article 6.
- **Core message:** The model is one component. The harness decides what the model sees,
  what it can do, how much context it carries, and how hard it has to work. Same model →
  very different behavior. No magic, only engineering tradeoffs.

## Published draft

- `docs/articles/more-than-a-model.md` — slug `more-than-a-model` (manifest order 7).
- ⚠️ **Sibling stub:** `docs/articles/what-actually-differs.md` (slug `what-actually-differs`,
  order 6) — the earlier name, overlapping scope. Decide: retire, redirect, or repurpose.
  Do not accidentally edit the wrong file.

## The 8 levers (article spine)

1. system prompt & autonomy · 2. tools · 3. MCP · 4. memory · 5. context management /
compaction · 6. caching · 7. thinking / sampling / max_tokens · 8. agent orchestration.
Control-matrix framing: **provider owns the engine (weights, training, API, caching/thinking
primitives); harness builds the car** (everything above).

## Key facts & numbers (label every claim before it ships)

| Claim | Value | Evidence | Cost label |
|---|---|---|---|
| Pre-reasoning prefix varies a lot on the same model | floors ~15k (CO-CLI) / ~27k (CL-CLI) / ~17k est (CO-IDE) / ~46k (CL-IDE) | Direct (structural digests) | n/a (token counts) |
| Figure totals (first-call footprint, MCP off, exact) | CO-CLI 16,200 · CL-CLI 29,453 · VS Code 20,598 | Direct (`prefix-size-comparison.svg`; uncached+cache-read+cache-creation, one Anthropic tokenizer) | n/a |
| Tool catalog size | CO-CLI 8,064 tok / 19 tools · CL-CLI 18,877 tok / 27 tools | Direct (`tool-catalog-size.svg`) | n/a |
| Tool defs dominate the re-sent prefix | CO-CLI ~56% · CL-CLI ~69% · VS Code ~49% (of exact first-call) | Direct | n/a |
| One filesystem MCP server adds | +14 tools, +1,876 prefix tokens | Direct (MCP on/off pair) | n/a |
| CO-IDE MCP on vs off | ~46,428 / 95 tools vs ~20,598 / 56 tools | Direct (`co-ide-exports/*`) | n/a |
| Worked example shape | requests 7 vs 19; tool calls 19 vs 16 | Direct (40-run / structural) | Copilot $0.163 exact; Claude estimate |
| Cache hit | CO-CLI 87.2% · CL-CLI 90.2% | Direct | n/a |
| max_tokens | CO-CLI 8,192 · CL-CLI 32,000 | Direct | n/a |

## ✅ RESOLVED — first-call context footprint (gap #1)

**Metric definition (one metric, all three harnesses):**
*First-call context footprint* = the total logical input the harness sends on its **first
model request**, measured as the API-reported prompt input the model actually tokenizes:
`uncached input + cache-read + cache-creation`. Same Anthropic tokenizer (Claude Sonnet
4.5 snapshot) across all three. MCP off, fresh session, no user skills, no repo
memory/instruction file, same repo+commit, same minimal task. This is the **size of the
logical prefix**, independent of how it was billed (cold vs warm). Cache split only
affects *cost*, not footprint.

| Harness | Uncached | Cache-read | Cache-creation | **First-call footprint** | Native tools |
|---|---:|---:|---:|---:|---:|
| Copilot CLI | 10 | 9,071 | 7,119 | **16,200** | 19 |
| Copilot coding agent in VS Code | 9 | 9,745 | 10,844 | **20,598** | 56 |
| Claude CLI | 10 | 21,264 | 8,179 | **29,453** | 27 |

**Evidence (exact, direct measurement):**
- CO-CLI 16,200 — `structural-prefix/copilot/logs/process-1781029040975-75037.log`, first
  response `input_tokens` (= uncached 10 + cache_read 9,071 + cache_write 7,119).
- CO-IDE 20,598 — `co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json`, prompt#0 first
  `ChatMLSuccess` (claude-sonnet-4.5) `usage.prompt_tokens` (= 9 + cache_read 9,745 +
  cache_creation 10,844).
- CL-CLI 29,453 — `~/.claude/projects/-private-tmp-octocat-supply-ak/137badef-…​.jsonl`,
  first assistant `message.usage` (= input 10 + cache_creation 8,179 + cache_read 21,264).
  (Digest `sourceFile`; sessionId 137badef-286c-4706-9c6c-734171d03e83.)

**Composition (chars/4 SHAPE attribution, from structural digests — used only for the
system/tools/messages split, not the headline totals):**
- CO-CLI: system 6,657 + tool defs 8,064 + messages 156 = 14,877 (19 tools).
- CL-CLI: system 7,015 + tool defs 18,877 + messages 1,325 = 27,217 (27 tools).
- chars/4 underestimates the exact Anthropic count by ~8–9% (CO-CLI 16,200/14,877=1.089;
  CL-CLI 29,453/27,217=1.082) — consistent, so proportions hold. Tool defs are ~54% of
  CO-CLI's prefix and ~69% of CL-CLI's.

**This RESOLVES the old "tools > total" inconsistency:** the prior article cited Claude CLI
turn-0 as ~18.1k (a cache-served run) while its tool catalog alone is ~18.9k. The real
first-call footprint is **29,453** (tool defs 18,877 sit correctly inside it). Stop citing
18.1k. SVG `prefix-size-comparison.svg` must be regenerated to 16,200 / 20,598 / 29,453.

**Caveat to state in-article:** all three "first" calls already had cache_read > 0 (warm
from prior identical runs). The footprint total is invariant to warm/cold; only billing
differs. Footprint is a context-size metric, not a cost metric.

## ✅ Known inconsistency — RESOLVED (was top priority)

> Resolved by the block above. Final first-call footprints are exact: CO-CLI 16,200 ·
> CL-CLI 29,453 · VS Code 20,598. The old ~18.1k Claude CLI figure (a cache-served run)
> is retired; the real footprint is 29,453 with tool defs (18,877) sitting inside it.
> The `prefix-size-comparison.svg` figure has been regenerated to match. Original
> diagnosis kept below for the record.

The article gives **Claude CLI's whole turn-0 prefix as ~18.1k** (prefix figure, a billed
*cache-served* run whose composition was not captured) but also states **Claude CLI's tool
catalog alone is ~18.9k** (`tool-catalog-size.svg`, line ~213) — and the data catalog floor
is **~27k**. Tool defs cannot exceed the total prefix; these are **two different captures**
the article never reconciles. A skeptic will catch "tools > total." **Fix or footnote
before the GitHub Blog pitch.** (Options: use the ~27k structural total for the Claude bar;
or clearly label the 18.1k as a different, cache-served run and stop citing 18.9k tools next
to it.)

## Other open improvements (from this session's review)

1. **Fill the blank cost cell.** Worked-example table shows `$0.163 exact` for Copilot vs
   *"modelled estimate"* (no number) for Claude — the engagement payload is missing. Pull
   the 40-run numbers (~$0.13 vs ~$0.36, ~2.8×) with the variance caveat; ties to Article 1.
2. **Sharpen hook + ending; add `readNext`.** Generic open ("Developers talk a lot about
   models"); no single memorable stat up top. Per lab structure (surprise → why → cost →
   guidance → evidence) lead with the strongest concrete number. Wire a `readNext` onward.
3. **Resolve the `what-actually-differs` duplicate** in the manifest.

## Supporting runs / data

- **Structural:** `structural-prefix/{copilot,claude}/digest.json`
  (`toolCatalog`, `prefix`, `skills`, `mcpInstructions`, `prompts` breakdowns).
- **CO-IDE:** `co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json` (56 native tools, 20,598)
  and `…_MCPon.json` (95 tools, 46,428).
- **CL-IDE:** `cl-ide-transcripts/CL-IDE_extension_{OFF,ON}.jsonl` (46,364 vs 46,418 = +54
  noise → extension does not inject a project `.mcp.json` server into the prefix).
- **Dossier:** `docs/content-lab/data/harness-data-FINAL.md` (+ `harness-levers-taxonomy.md`,
  `lever-investigation-results.md`, `system-prompt-comparison.md`, `system-prompts/*.txt`).
- **Levers table:** `docs/content-lab/data/db/levers.sql` (15 levers A–O).

## Visuals

Have: `agent-is-more-than-model.svg`, `prefix-size-comparison.svg`,
`model-provider-vs-harness-control.svg`, `tool-catalog-size.svg`.
⚪ **Missing but planned:** `mcp-delta-callout.svg` (visualize +14 tools / +1,876 tokens).

## Required evidence checklist (from plan)

Direct/inference/speculation labels · correction history · control matrix (provider /
harness / shared) · glossary (harness, prefix, cache read, cache creation, MCP, skill,
memory, compaction, orchestration).

## Limitations (must state)

IDE captures are N=1 structural snapshots, not distributions · some IDE fields not
observable in exports · only Copilot CLI gives exact billed credits · structural difference
does not establish quality difference.

## Open items / TODO

- [ ] Resolve the Claude-CLI 18.1k-vs-18.9k-vs-27k inconsistency.
- [ ] Add Claude cost number (with label) to the worked-example table.
- [ ] Sharpen hook/ending; add `readNext`.
- [ ] Decide fate of `what-actually-differs` stub.
- [ ] Build `mcp-delta-callout.svg` (optional).
- [ ] Add the glossary + explicit evidence labels if not yet present.
