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
| Cache hit | CO-CLI 80.9% · CL-CLI 86.4% (40-run, token-weighted) | Direct (`captures.jsonl`); single-session digest 87.2/90.2 corroborates | n/a |
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

## ✅ RESOLVED — tool-definition footprint (gap #2)

**Metric:** approximate token size of the full tool-schema array on the first main-agent
request (MCP off, fresh session, no optional tools/skills), via the structural chars/4
estimate. A SIZE estimate, distinct from the exact API-reported first-call totals (gap #1);
chars/4 underestimates the exact Anthropic count by ~8–9%, so reported with `≈` as floors.

| Harness | Tools | Tool-def footprint | Share of chars/4 prefix |
|---|---:|---:|---:|
| Copilot CLI | 19 | ≈8,064 tok | 54.2% (of 14,877) |
| Claude CLI | 27 | ≈18,877 tok | 69.4% (of 27,217) |

**Evidence (direct, structural digests):**
- CO-CLI — `structural-prefix/copilot/digest.json` `prefix.representative`:
  `toolCount` 19, `toolDefsApproxTokens` 8,064, `toolDefsShareOfPrefix` 0.5420. Tool schemas
  are present in the Copilot CLI log. `toolCatalog.count` also = 19 (names verified).
- CL-CLI — `structural-prefix/claude/digest.json` `prefix.representative`
  (file `2026-06-09T18-18-47-402Z-008.json`): `toolCount` 27, `toolDefsApproxTokens` 18,877,
  `toolDefsShareOfPrefix` 0.6936. Schema weight from the relay capture (the Claude transcript
  omits tool schemas, so `toolCatalog.count` reads 0 from `deferred_tools_delta` — the 27
  count comes from the relay-captured request). Model claude-sonnet-4.5 both.

**Article changes:** filled the tool-catalog table (≈8,100 / ≈18,900); replaced the
`EXPERIMENT TODO: VERIFY TOOL-CATALOG FIGURES` comment with prose + a `METRIC DEFINITION`
provenance comment. Figure `tool-catalog-size.svg` already carries ~8.1k/19 and ~18.9k/27 —
verified, no regen needed. Kept neutral on delivery mechanism (flat/virtualized/progressive →
Article 3).

## ✅ VERIFIED — MCP delta + autonomy wording; MCP figure created

**MCP delta (+14 tools / +1,876 tokens) — VERIFIED.** Source:
`docs/content-lab/data/harness-data-FINAL.md` §1.6. CL-CLI, same repo+prompt, one
`@modelcontextprotocol/server-filesystem` (14 tools) toggled off→on: OFF 28 tools / 21,071
tool-def tok → ON 42 tools / 22,947 → **+14 / +1,876** (relay wire capture, High). The
+1,876 = tool-DEFINITION (schema) token delta, not API-reported input. Article reports only
the delta, so the OFF=28 here does not conflict with the 27-tool structural-digest session
(gap #2). Replaced the `VERIFY THE MCP DELTA` TODO with a provenance comment.

**Autonomy wording — VERIFIED.** Source: `system-prompt-comparison.md` (+ `system-prompts/
{copilot-cli,claude-cli}.txt`). CO-CLI = "non-interactive mode… proceed autonomously"; CL-CLI
= "executing actions with care… check with the user before proceeding." Article paraphrases
(no proprietary quote) — supported. Replaced the `VERIFY AUTONOMY WORDING` TODO with a
provenance comment.

**Missing figure created:** `docs/articles/figures/harnesses/mcp-delta-callout.svg` (was
⚪ planned, referenced at article line ~330 → would have been a broken image). Two-stat
callout (+14 tools / +1,876 prefix tokens), GitHub palette, role=img + title/desc, validated
well-formed XML; build copies it to `dist/` and the page references it.

**Remaining TODO comments are optional guardrails, not data gaps:** `OPTIONAL SUPPORTING
EXAMPLE` (line ~390, explicitly "do not delay Article 2") and `DO NOT OVERSTATE COMPACTION`
(line ~568, satisfied — section stays conceptual, claims no specific compaction event). Both
are invisible HTML comments; left in place.

## ✅ RESOLVED — cache-read rate (gap #4)

**Formula (one, applied to both):** `cache_read / (uncached_input + cache_read +
cache_creation)` — cached reads over ALL logical prompt tokens, **token-weighted** (sum token
fields across requests, then divide; NOT a mean of per-request %).

**Source:** `~/copilot-ledger-data/captures/repeatability-40run/captures.jsonl` — the **same
n=40 dataset** as gap #3 (explain-repo, BARE+TRIM, 20/harness, MCP off, Claude Sonnet 4.5).
Fields `cached_tokens`, `cache_creation_tokens`, `fresh_input_tokens`.

| Harness | Cache-read rate (40-run, token-wtd) | Per-run mean | Single-session digest |
|---|---:|---:|---:|
| Copilot CLI | **80.9%** | 80.2% | 0.8722 |
| Claude CLI | **86.4%** | 85.0% | 0.9022 |

- Decision: **publish the 40-run token-weighted figure** (larger N; same dataset the
  $0.13/$0.36 cost ratio comes from → internally consistent). The single dedicated
  structural-prefix session (`digest.json` `rollups.cacheHitRate` 0.8722 / 0.9022) uses the
  *same formula* and corroborates (same ballpark, same ordering) — kept as a footnote, not the
  headline, to avoid mixing an N=1 session into a 40-run claim.
- **Not** labeled a provider "cache-hit rate" — it's our ratio from captured usage fields.
- **Article changes:** filled the table (80.9% / 86.4%); replaced the
  `EXPERIMENT TODO: DEFINE AND VERIFY THE CACHE METRIC` with prose (defines the formula inline)
  + a `METRIC DEFINITION` provenance comment with the exact token sums.

## ✅ RESOLVED — Article-1 40-run aggregates (gap #3)

**Source:** `docs/content-lab/data/db/runs.jsonl`, task `explain-repo`, conditions BARE+TRIM,
harnesses CO-CLI & CL-CLI, MCP off, `claude-sonnet-4-5-20250929`. **n = 40** (20/harness:
10 BARE + 10 TRIM). Arithmetic means:

| Harness | Mean requests | Mean tool calls | Mean cost |
|---|---:|---:|---:|
| Copilot CLI | 4.50 | 13.90 | $0.1299 |
| Claude CLI | 16.40 | 12.90 | $0.3594 |

- **Cost ratio CL/CO = 2.77× (~2.8×).** Requests 4.5 / 16.4 **match Article 1's published
  "Avg requests" exactly** (`one-run-cant-rank-two-agents.md` line 229–230) → cross-article
  consistency confirmed. Tool calls (13.9 vs 12.9) back the "broadly similar tool work, very
  different request counts" framing.
- **Non-conflict checked:** Article 1's "21.0 / 20.4" column is **Quality avg**, not tool
  calls — so Article 2's tool-call means do not contradict Article 1.
- **Article changes:** filled the mean-requests/tool-calls table; replaced the
  `EXPERIMENT TODO: INSERT ARTICLE 1 AGGREGATES` with prose (adds the 2.8× cost tie-in) + a
  `METRIC DEFINITION` provenance comment. Scoped to this task/repo/model/config; not universal.

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
`model-provider-vs-harness-control.svg`, `tool-catalog-size.svg`,
`mcp-delta-callout.svg`.
✅ **Created:** `mcp-delta-callout.svg` (+14 tools / +1,876 prefix tokens).

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
- [x] Build `mcp-delta-callout.svg` (optional).
- [ ] Add the glossary + explicit evidence labels if not yet present.
