# Article 4 research — index (data for the writing agent)

> Supporting research for [`article-04-agents-md.md`](../../article-04-agents-md.md).
> This is a shared human/agent scratchpad, **not** published copy. The writing agent
> selects what is interesting; nothing here is pre-edited for the article.

**What this is.** A pre-registered experiment asking one practical question: *does adding a
concise, general-purpose `AGENTS.md` to a repo improve quality or reduce cost on tasks the
file's author never saw?* Two add-on arms test the same question for other files: **ORIG** (the
repo's own verbose, hand-written instruction file) and **INIT** (the file `copilot init`
auto-generates). All raw measurements, tables, provenance, and the honest caveats live in the
dossiers below.

**The one-paragraph result (for orientation, not a mandated framing).** A ~129-token,
observation-justified `AGENTS.md` **never lowered quality** on five unseen tasks and made the
*typical* (median) run cheaper, but it *raised* cost on the two heavy code-writing tasks —
so the overall mean went up while the median went down. The repo's own ~650-token original
instructions (**ORIG**), relocated verbatim to `AGENTS.md`, were the **most expensive arm on
both mean and median**, bought no quality over the concise file, and *hurt* the review task
(hallucinated a "SQL injection" defect in all three runs). The auto-generated **INIT** file
(~641 tok, repo-accurate) was the sharpest surprise: nearly the same *size* as ORIG yet among
the **cheapest** arms — proving file size doesn't drive cost, prose density does — but it
**never beat BARE on any task** and was the only arm to **fail mechanical gates** (E4 7/10).
Headline tension: **more instructions are not free, "does guidance pay for itself?" is
task-dependent, and even correct, detailed, auto-generated context is not the same as a few
well-observed rules.**

## Dossiers

| File | What it holds |
|---|---|
| [`experiment-design.md`](./experiment-design.md) | Pre-registration, conditions, the 5 unseen eval tasks, scoring rubrics, controls, what was registered before any result. Read first for credibility framing. |
| [`the-three-files.md`](./the-three-files.md) | The actual content of all four arms (BARE = nothing, concise AGENTS.md, verbose ORIG, auto-generated INIT), token sizes, the per-request "tax". |
| [`discovery-friction.md`](./discovery-friction.md) | Where the concise file came from: 15 no-context discovery runs → observed friction → candidate lines → frozen file. Every line traces to an observed stumble. |
| [`cost-findings.md`](./cost-findings.md) | H1. Full per-cell cost tables (mean/median/min/max/spread), the mean↑/median↓ split, ORIG priciest, INIT cheap-despite-large (size≠cost), totals + dollar cost. |
| [`quality-findings.md`](./quality-findings.md) | H2. Per-task quality (non-inferiority), the blind-scoring method, the ORIG E5 review regression, and INIT as the arm that helped least despite being accurate. |

## Provenance (applies to every dossier)

- **Harness.** GitHub Copilot CLI, headless (non-interactive). **Model.** Claude Sonnet 4.5
  (`claude-sonnet-4-5-20250929`).
- **Repo under test.** `octodemo/octocat_supply` @ `e1516cf` (two-project npm repo:
  `api/` Express+TS+vitest+SQLite, `frontend/` Vite+React).
- **Cost metric.** `native_credits` = exact billed GitHub AI credits (`total_nano_aiu`).
  Dollar figures are `credits / 100` (the repo's standing convention; cross-check only).
- **Source data (NOT in git).** `~/copilot-ledger-data/captures/agents-md/` — 165 rows in
  `evaluation/captures.jsonl` {BARE 50, AGENTS 50, ORIG 15, INIT 50} plus per-run raw logs.
- **Reproducible pipeline (in git).** `docs/content-lab/experiments/agents-md/` — runner
  (`runner/run.sh`, `runner/phase5.sh`, `runner/phase7-orig.sh`, `runner/phase8-init.sh`),
  frozen interventions (`intervention/`, incl. `AGENTS.init-generated.md` + `FREEZE.init.md`),
  scorers + frozen scores (`evaluation/scoring/`), and the canonical results summary
  (`evaluation/scoring/results/SUMMARY.md`).

## Honest caveats to carry into any writing

1. **ORIG is n=3/cell ⇒ directional only.** BARE/AGENTS/INIT are n=10/cell. Per-task ORIG
   deltas are not significant without bootstrap CIs.
2. **One repo, one harness, one model.** Generalization is unproven; state it.
3. **The clean-slate harness amplifies the install-before-test friction** (`git clean -fdx`
   wipes `node_modules` each run). This is realistic for "first contact" but must be named.
4. **INIT's E4 gate failures (3/10)** mean its E4 quality is scored including build-broken runs;
   for INIT, "cost per *successful* E4" is understated.
5. **The INIT file cost 33.1 cr (one-time) to auto-generate** — small but non-zero against
   "just generate it for free."
