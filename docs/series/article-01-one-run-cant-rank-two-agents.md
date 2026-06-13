# Article 1 — One run can't rank two coding agents

> Working file (shared scratchpad). Collects facts, supporting runs, writing ideas, and
> open data needs. Not the published article. See `../articles/` for the live drafts.

- **Role:** Establish measurement discipline — the foundation for the whole series.
- **Status:** ✅ Research + article largely complete (multiple drafts published).
- **Proposed destination:** GitHub Blog.
- **Core message:** A single coding-agent run measures variance, task fit, and local
  configuration — *not* which agent is generally better. One run shows behavior; it cannot
  establish a ranking.

## Published drafts (already in the build)

| Slug | File | Notes |
|---|---|---|
| `one-run-cant-rank-two-agents` | `docs/articles/one-run-cant-rank-two-agents.md` | `home: true` — the front page; lab layout |
| `one-run-cant-rank-two-agents-blog` | `…-blog.md` | github-blog theme variant |
| `one-run-cant-rank-two-agents-blog2` | `…-blog2.md` | github-blog variant |
| `one-run-cant-rank-two-agents-blog3` | `…-blog3.md` | github-blog variant; `readNext: more-than-a-model` |
| `why-n1-benchmarks-mislead` | `why-n1-benchmarks-mislead.md` | sibling framing (~18× spread) |

> ⚠️ Several near-duplicate variants exist. Before more polish, decide which single slug is
> canonical for the GitHub Blog pitch and whether the others should be retired from the manifest.

## Key facts & numbers (label every claim before it ships)

The backbone is the **40-run grid**: same model, same repo+commit, same prompt, MCP off,
headless. 2 harnesses × 2 conditions (BARE / TRIM) × 10 reps = 40 runs.

| Claim | Value | Evidence | Cost label |
|---|---|---|---|
| Copilot CLI materially cheaper for this task | ~$0.13/run vs Claude ~$0.36/run (~2.8×) | Direct (40-run `captures.jsonl`) | Copilot = exact billed credits; Claude = token-derived estimate |
| Quality effectively tied | 21.0 vs 20.4 / 27 | Direct (blind `scores.json`, 27-item rubric) | n/a |
| Run-to-run variance large enough to make pairwise N=1 misleading | (report mean/median/min/max/SD per arm) | Direct | n/a |
| The "port tell" | all 40 runs said port **5173**; real value is **5137** | Direct | n/a — great narrative hook |
| Cache hit rate | Copilot 87.2% / Claude 90.2% | Direct | n/a |

> ⚠️ **Do not mix cost labels.** The 2.8× headline pairs an *exact billed* Copilot number
> with a *token-derived estimate* for Claude. The article must say so explicitly.

## Supporting runs / data

- **Dataset:** `~/copilot-ledger-data/captures/repeatability-40run/`
  (`captures.jsonl` = 40 metric rows, `scores.json` = blind scores, `analyze.mjs`,
  `score.mjs`, `chart.mjs`, `chart-interactive.mjs`, `run-capture.sh`).
- **Ledger:** the 40 repeatability rows in `docs/content-lab/data/db/runs.jsonl`
  (rebuilt in CI from `db/captures.sql`).
- **Pinned env:** repo `octodemo/octocat_supply` @ `e1516cf`, model `claude-sonnet-4-5-20250929`, MCP off.
- **Adjacent variance evidence:** `e3-model-comparison/` shows a wide within-model cost
  spread (4.5: $0.19–$0.84) — reinforces "one run is not enough" across a model bump too.

## Visuals

- **Have / need:** cost-vs-quality scatter (one point per run, all 40) — primary.
- Small experiment-design diagram (2×2×10 grid).
- Optional within-harness range/box chart.
- Regenerate with `node chart.mjs <out.svg>` from the dataset; output into `docs/articles/figures/`.

## Writing ideas / hooks

- Lead with the **port tell** (5173 vs 5137): all 40 runs confidently agreed on a wrong
  detail — a vivid way to show a single confident run can be wrong *and* consistent.
- Frame: "a distribution, not a number." Show the spread before any mean.
- Tie forward to Article 2: variance is one reason, but *configuration* (the harness) is
  the deeper one → natural handoff (already wired via blog3 `readNext`).

## Limitations (must state)

One repository · one task class · one model · CLI only · result cannot establish general
harness superiority.

## Open items / TODO

- [ ] Pick the canonical slug; decide fate of the duplicate blog variants.
- [ ] Publish full distribution stats (mean/median/min/max/SD or IQR) per arm.
- [ ] Confirm the cost-label sentence is explicit in the final draft.
- [ ] Confirm the all-40-runs scatter is the lead figure.
