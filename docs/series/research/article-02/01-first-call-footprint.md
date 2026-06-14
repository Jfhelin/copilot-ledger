# First-call footprint — the cold-start input surface

> Supporting research for [`article-02-more-than-a-model.md`](../../article-02-more-than-a-model.md).
> This is a shared human/agent scratchpad, not published copy.

**Capture.** Structural-prefix run (one careful session per harness) + VS Code agent-mode
exports. All on 2026-06-09 / 2026-06.
**Model.** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`), temperature 1.
**Repo / prompt.** `octodemo/octocat_supply`; fixed repo-explainer task.
**Source captures.** `structural-prefix/{copilot,claude}/digest.json`;
`co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json`. Raw captures outside git at
`~/copilot-ledger-data/captures/`.

---

## One-line thesis

Before the user types a single token, the harness has already decided how big the request
is. Same model, **same task, ~1.8× difference in cold-start input** between the leanest and
heaviest harness — purely from what each one front-loads.

## Headline table — first model call, MCP off (Direct evidence)

API-reported `prompt_tokens` on the first call of the session, decomposed into its three
billed parts:

| Harness | Uncached input | Cache-creation | Cache-read | **First-call `prompt_tokens`** |
|---|---:|---:|---:|---:|
| **CO-CLI** (Copilot CLI) | 10 | 7,119 | 9,071 | **16,200** |
| **CO-IDE** (VS Code Copilot) | 9 | 10,844 | 9,745 | **20,598** |
| **CL-CLI** (Claude CLI) | 10 | 8,179 | 21,264 | **29,453** |

- These are **exact API counts**, not estimates: `prompt_tokens = input_tokens +
  cache_creation_input_tokens + cache_read_input_tokens`.
- The split between cache-creation and cache-read just reflects how warm that particular
  session's cache was; the **total** is the stable "how heavy is this harness" number.
- Ratio CL-CLI / CO-CLI = 29,453 / 16,200 = **1.82×**. The model is identical; the harness
  accounts for the entire gap.

## The VS Code "product floor" caveat (Inference / projection)

The measured CO-IDE footprint is **20,598**, but that specific session carried ~2,000
tokens of **environment-driven skills/agents** injected by the user's repo and installed
extensions (see dossier 05). Subtracting those repo/extension-specific blocks gives a
**product-floor projection of ≈18.5k** — what a *clean* VS Code Copilot install would send.

- **20,598** = Direct evidence (this capture).
- **≈18.5k** = Projection. Label it as such; it is a "what the product ships by default"
  estimate, not a measurement. Do not present 18.5k as a captured number.

So the ordering by product default is roughly **CO-CLI 16.2k < CO-IDE ≈18.5k < CL-CLI
29.5k**, and by *as-configured* capture it is **CO-CLI 16.2k < CO-IDE 20.6k < CL-CLI 29.5k**.

## Why the gap exists — prefix composition (Direct evidence)

From `prefix.representative` in each structural digest (SHAPE tokens, chars/4 — floors):

| Component | CO-CLI | CL-CLI |
|---|---:|---:|
| System prompt | 6,657 | 7,015 |
| Tool definitions | 8,064 | 18,877 |
| Tool count | 19 | 27 |
| toolDefsShare (toolDefs / prefix) | 0.542 | 0.694 |
| Skill blocks in prefix | 0 | 0 |
| Messages array entries | 156 | 1,325 |
| Prefix total | 14,877 | 27,217 |

**The tool catalog is the dominant lever.** System prompts are within ~5% of each other
(6,657 vs 7,015), but Claude CLI ships **8 more tools** and **>2× the toolDef tokens**
(18,877 vs 8,064). Tool definitions are ~69% of Claude's cold prefix vs ~54% of Copilot's.
The system prompt is *not* where the harnesses diverge — the tools are (see dossier 03).

> Divisor note: prefix figures are SHAPE tokens (chars/4) and read as **floors** — they
> undercount the exact Anthropic tokenization by ~8–9%. The headline footprint table above
> uses **exact API counts** and is not subject to this caveat.

## Exact cost of one cold start (Direct evidence — Copilot only)

The Copilot CLI structural run reports its real billing: **16.296 GitHub AI Credits =
$0.163** for the whole short session (`copilot_usage.total_nano_aiu` summed). Credit
breakdown: input 0.84, cache-read 4.07, cache-write 6.42, output 4.97. Claude CLI does not
expose native billing, so any Claude dollar figure in this series is **token-normalized**
(modelled), never actual spend.

## Notable quirks / tells

- The first call already pays **cache-creation** on the system+tools block — the agent is
  writing its own prompt into the cache on turn 0, so even a one-shot question is billed for
  cache setup it may never reuse.
- CO-CLI's 156-entry vs CL-CLI's 1,325-entry messages array reflects how much scaffolding
  each harness threads into the conversation array, not user content.
- VS Code folds system + skills + context into one cached block, so its footprint can't be
  cleanly split system-vs-tools the way the two CLIs can — only the tools array is separable.

## Open data gaps

- The ≈18.5k VS Code product-floor figure is a single-capture subtraction; a clean-profile
  capture (no repo `.github/skills`, no GitHub PR extension) would turn it into Direct
  evidence.
- Footprint is from one structural session per harness. The *distribution* of cold-start
  size (does it move with repo size, instructions files?) is unmeasured here; the 40-run
  batch covers behaviour, not prefix size.
