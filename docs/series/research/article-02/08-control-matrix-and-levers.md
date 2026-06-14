# The control matrix & the harness levers

> Supporting research for [`article-02-more-than-a-model.md`](../../article-02-more-than-a-model.md).
> This is a shared human/agent scratchpad, not published copy.

**Capture.** Synthesis dossier — pulls together every lever measured in 01–07.
**Model.** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`).
**Source.** `harness-data-FINAL.md` DELIVERABLE 4 (control matrix);
`harness-levers-taxonomy.md` (A–O); sampling params from structural wire bodies.

---

## One-line thesis

Draw the line between what **Anthropic** controls and what the **harness** controls, and the
article's title proves itself: Anthropic owns the **weights and the API contract**; the
harness owns **everything that decides what the model actually sees and how hard it works.**

## The control matrix (Direct evidence)

Who controls each lever, from DELIVERABLE 4:

| Lever | Anthropic controls | Harness controls |
|---|---|---|
| Model weights | ✅ entirely | — |
| Training / RLHF | ✅ entirely | — |
| System prompt | slot fixed by API | ✅ content, size, autonomy |
| Tools | name+schema *shape* | ✅ which tools, naming, verbosity |
| MCP | protocol spec | ✅ on/off, which servers |
| Skills | — | ✅ count, injection, pre/on-demand |
| Memory | — | ✅ architecture, scope, footprint |
| Thinking | ✅ mechanism (budget/blocks) | ✅ enable, budget, display |
| Caching | ✅ primitive (≤4 breakpoints, TTL) | ✅ breakpoint placement & count |
| Context management | ✅ stateless-resend requirement | ✅ when/how to compact |
| Safety | ✅ trained refusal floor | ✅ added policy layers, content-exclusion |
| Agent orchestration | — | ✅ entirely (fleet vs roster) |
| Model routing | ✅ serves the snapshot | ✅ endpoint, proxy, aux-model use |
| Sampling | ✅ legal ranges/defaults | ✅ chosen values (temp, max_tokens) |

**The pattern:** Anthropic owns the **mechanisms** (the locked column); the harness owns the
**choices** (almost every row has a harness ✅). The model is one cell in a 14-row table.

## Sampling — a lever hiding in plain sight (Direct evidence)

Same model, same API, different chosen values:

| Param | CO-CLI | CL-CLI |
|---|---:|---:|
| temperature | 1 | 1 |
| **max_tokens** | **8,192** | **32,000** |

A **4× difference in output ceiling** — pure harness config, identical weights. It caps how
long a single response can run and shapes the "feel" (terse operator vs room to ramble).

## From matrix to the "levers" framing (Direct evidence)

The taxonomy file enumerates **15 levers (A–O)**; the article distils them to a shorter
working set. Each is tagged 🔒 LOCKED (Anthropic) or 🎛️ DISCRETION (harness):

| | Lever (taxonomy) | Backing dossier |
|---|---|---|
| A | System prompt (content, size, autonomy) | 02 |
| B | Dynamic context injection (env, git state, instr files) | 02, 05 |
| C | Tool catalog & schema design | 03 |
| D | Tool delivery / virtualization (deferral) | 03 |
| E | Skills | 05 |
| F | MCP | 04 |
| G | Memory / persistence | 05 |
| H | Conversation-history management | 07 |
| I | Prompt-caching strategy | 07 |
| J | Sampling / generation params | this file |
| K | Reasoning / thinking | (light coverage) |
| L | Agent loop / orchestration | 06 |
| M | Safety / policy / platform layer | 02 |
| N | Model routing & transport | (light coverage) |
| O | Metering / telemetry | 01 (native credits) |

Almost every lever is 🎛️ **harness discretion**. The genuinely 🔒 locked ones (weights,
training, the caching *primitive*, the stateless-resend contract) are exactly the cells the
harness can't touch — and they're the minority.

## The synthesis claim (the article's spine)

Every dossier in this folder is one row of the matrix, **measured**:

- Footprint differs 1.8× (01) → system+tools choices (02, 03).
- Cost differs 2.8× at equal quality (06) → orchestration loop (L) × prefix size.
- Turning one config knob (MCP) doubles the prefix (04) → lever F is config, not model.
- 81–86% of tokens are cache reads (07) → levers H and I, harness-tuned.
- The heaviest prompt is mostly *your* installed skills (05) → levers B, E, G.

Conclusion the writer can stand on: **pick the same model in three harnesses and you get
three different cost/behaviour profiles, because 12 of 14 control-matrix rows are the
harness's call.**

## "Different isn't better" (guardrail for the writer)

The data supports **difference**, not a quality ranking:

- Quality scores were near-equal (15.57 vs 15.09, dossier 06).
- Lean (Copilot CLI) wins on this well-scoped task's cost; rich orchestration (Claude CLI)
  may justify its turns on open-ended work — unmeasured here.
- So frame levers as **tradeoffs to match to the job**, never as "harness X is best."

## Open data gaps

- Thinking/reasoning (K) and model routing/transport (N) are lightly covered — no clean
  per-harness thinking-budget capture in this set.
- The A–O taxonomy is a framework; only the levers cited in dossiers 01–07 are
  wire-measured. The rest are `[known]` real levers, not `[obs]` for this task.
- Quality rubric is one task; "different isn't better" is supported for repo-explainer, not
  proven across task types.
