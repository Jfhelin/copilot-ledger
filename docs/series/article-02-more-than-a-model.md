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
| Figure totals (turn-0 billed, MCP off) | CO-CLI 16.2k · CL-CLI 18.1k · VS Code 20.6k | Direct (`prefix-size-comparison.svg`, one Anthropic tokenizer) | n/a |
| Tool catalog size | CO-CLI 8,064 tok / 19 tools · CL-CLI 18,877 tok / 27 tools | Direct (`tool-catalog-size.svg`) | n/a |
| Tool defs dominate the re-sent prefix | CO-CLI ~54–56% · CL-CLI ~73% | Direct | n/a |
| One filesystem MCP server adds | +14 tools, +1,876 prefix tokens | Direct (MCP on/off pair) | n/a |
| CO-IDE MCP on vs off | ~46,428 / 95 tools vs ~20,598 / 56 tools | Direct (`co-ide-exports/*`) | n/a |
| Worked example shape | requests 7 vs 19; tool calls 19 vs 16 | Direct (40-run / structural) | Copilot $0.163 exact; Claude estimate |
| Cache hit | CO-CLI 87.2% · CL-CLI 90.2% | Direct | n/a |
| max_tokens | CO-CLI 8,192 · CL-CLI 32,000 | Direct | n/a |

## ⚠️ Known inconsistency to resolve (top priority)

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
