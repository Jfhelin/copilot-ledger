# Article 6 — Same model, different harness

> Working file (shared scratchpad). Collects facts, supporting runs, writing ideas, and
> open data needs. Not the published article.

- **Role:** Synthesis / competitive capstone. Applies the framework from Articles 1–5 to the
  misconception that Claude Code has an unexplained or inaccessible structural advantage.
- **Status:** ⚪ Depends on Articles 1–5 (plan Step 6). Build last.
- **Proposed destination:** Personal blog first; possible future official/field-facing
  adaptation. **Alt title:** "Why Copilot and Claude Code behave differently on the same model."
- **Core message:** Copilot and Claude Code can use the same Claude model while making
  different choices (system prompt, autonomy, tools, descriptions, MCP, memory, skills,
  caching, context management, orchestration, sampling, routing). Those choices produce
  different cost/latency/behavior/quality. **Tradeoffs, not magic.** Nothing observed shows
  Anthropic has an exclusive ability to make these tradeoffs.

## Editorial caution (this is the competitive one)

- This is NOT primarily a new leaderboard. Use structural comparisons + worked examples +
  existing repeated CLI data + clearly labeled N=1 IDE captures.
- Direct competitive claims require careful review. Keep the "observation, not universal
  conclusion" discipline tighter here than anywhere else.
- Be willing to show where **Claude Code is better** — credibility depends on it.

## Suggested structure (from plan)

1. Same model, different systems · 2. What the two harnesses send · 3. Where Copilot is
leaner · 4. Where Claude Code exposes more capability · 5. Which choices help which tasks ·
6. What is shared/reproducible · 7. What cannot be concluded · 8. Practical questions for
customers evaluating both.

## Key contrasts already in hand (Direct evidence unless noted)

| Dimension | Copilot (CLI / IDE) | Claude Code (CLI / IDE) |
|---|---|---|
| Cold prefix floor (MCP off) | CO-CLI ~15k · CO-IDE ~17k est | CL-CLI ~27k · CL-IDE ~46k |
| Built-in tools | 19 (CLI) / ~38 (IDE) | 27 (CLI) |
| Tool-catalog tokens | ~8.1k (CLI) | ~18.9k (CLI) |
| Autonomy posture | leaned autonomous / non-interactive | leaned cautious / confirm before irreversible |
| Worked-example shape | 7 requests, 19 tool calls | 19 requests, 16 tool calls |
| Cache hit | 87.2% | 90.2% |
| max_tokens | 8,192 | 32,000 |
| Cost (40-run, this task) | ~$0.13/run **exact billed** | ~$0.36/run **token-derived estimate** |
| Orchestration | leaner, manager-style | richer (task/worktree/monitoring/scheduling/planning) |

> ⚠️ Carry forward Article 2's unresolved Claude-CLI prefix inconsistency (18.1k vs 18.9k
> tools vs 27k floor). Resolve it there first so this capstone inherits a clean number.

## Supporting runs / data

- Structural: `structural-prefix/{copilot,claude}/digest.json`.
- IDE: `co-ide-exports/*`, `cl-ide-transcripts/*`, `matched-pair-baseline/` (Claude CLI
  pinned to VS Code's version 2.1.112 — the cleanest like-for-like).
- Repeated CLI: 40-run `repeatability-40run/` + `e3-model-comparison/`.
- Dossier + system-prompt comparison: `docs/content-lab/data/harness-data-FINAL.md`,
  `system-prompt-comparison.md`, `system-prompts/*.txt`.
- Related pre-reg: `docs/content-lab/experiments/11-harness-vs-environment.md`.

## Visuals

side-by-side request composition · provider-vs-harness control matrix (reuse
`model-provider-vs-harness-control.svg`) · tool-catalog comparison · memory + orchestration
comparison · **tradeoff table** (design choice · possible benefit · possible cost · tasks
likely to benefit).

## Writing ideas / hooks

- Open by naming the misconception directly ("Claude Code must be doing something Copilot
  can't"), then dismantle it mechanism by mechanism.
- The tradeoff table is the centerpiece — every row is "benefit vs cost vs who it helps."
- Land the series message: *same model ≠ same system; different results ≠ magic.*

## Limitations (must state)

versions change quickly · some settings not externally observable · one task cannot rank
products · user configuration may dominate product defaults · direct competitive claims need
careful review.

## Open items / TODO

- [ ] Gather as Articles 1–5 finalize; this is the capstone, written last.
- [ ] Refresh structural captures for current product versions before publishing (versions drift).
- [ ] Build the tradeoff table from the finalized lever findings.
- [ ] Legal/brand review pass given competitive framing.
