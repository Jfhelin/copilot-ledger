# The repeatability envelope: 10 identical CLI runs, twice, and why an N=1 harness comparison can't rank

> **Status: PRE-REGISTERED.** Capture in progress; this document is committed
> *before* the results are read, to fix the design and avoid hindsight bias.
> Cluster **D · Harness & Environment**, stable ID `12`. This experiment pays off
> the open `[TODO]` from experiment `11`: *"≥10 reps on one pinned snapshot to
> report the within-snapshot band on its own."* Numbers are filled in only after
> capture completes; nothing here is a result yet.

## LinkedIn Hook (draft)

I ran the **same prompt, same repo, same pinned model, same headless harness** ten
times — and the cost still swung several-fold, run to run, with nothing changed
but the agent's own path through the code. Then I did it again in a second CLI.
Before you trust a slide that ranks two agents on **one run each**, look at how
far a single agent swings against *itself*.

---

## Why this experiment

Earlier work (experiment `11`) measured a ~18× same-task cost spread across six
Claude CLI runs, but those six pooled *two* model snapshots, so the headline was
"snapshot + exploration" variance, not single-snapshot noise. The honest follow-up
we owed was a clean within-snapshot, within-harness repeatability measurement —
and, because both Copilot CLI and Claude CLI run headless, we can now do it in
*both* and compare the spreads on equal footing.

The goal is **not** to crown a faster or cheaper harness. It is to measure the
**repeatability envelope** — how much one harness varies against itself when
everything controllable is held fixed — and then ask whether a single
cross-harness gap is even distinguishable from that within-harness noise.

## Hypotheses (stated before reading results)

- **H1 (primary).** Within a single harness, holding repo, SHA, prompt, model
  snapshot, and MCP/skill configuration fixed, token-normalized cost varies
  substantially run-to-run (we expect a multi-fold min→max spread in 10 reps).
- **H2.** Wall-clock, cache-hit rate, request count, and tool-call count likewise
  vary run-to-run and do **not** move in lockstep with cost.
- **H3.** Rubric-scored answer quality distributions across reps **overlap** and do
  **not** rise reliably with cost (more spend ≠ better answer).
- **H4 (framing, not a test).** A single N=1 cross-harness difference is expected
  to fall *inside* the within-harness envelope, so it cannot, on its own, be
  attributed to harness quality. This is an argument the data illustrates, not a
  hypothesis this design can prove.

## What this design can and cannot establish

- **Can:** show the *existence and rough size* of within-harness variability under
  controlled headless conditions; show whether cost and quality are decoupled in
  this sample; show whether the cross-harness gap is comparable to same-harness
  run-pair gaps.
- **Cannot:** rank the two harnesses in general; generalize beyond this one
  prompt, repo, and snapshot; produce a stable bound on variance (N=10 tails are
  unstable — treat min/max as existence proofs, not limits).

## Locked design

- **Target repo:** `octodemo/octocat_supply`, pinned at `main` HEAD
  `e1516cf9095b83f25adabf5fe66036f133bddfa6`.
  - *Deviation recorded:* the SHA preregistered in experiment `11`
    (`890c7ae…`) no longer exists upstream; re-pinned to current HEAD and
    re-validated the answer key against an actual checkout.
- **Prompt (verbatim, single user turn, no follow-ups):**
  > You are helping a new developer get productive in this repository. Explain
  > what it is and its purpose, the main components and how they fit together, the
  > data flow between them, and exactly how to install, run, and test it locally.
  > Be specific and accurate.
- **Model:** one shared Sonnet snapshot pinned in both CLIs
  (`--model claude-sonnet-4.5` for Copilot CLI, `--model claude-sonnet-4-5` for
  Claude CLI). Both are verified to resolve to the same dated snapshot
  (`claude-sonnet-4-5-20250929`); any rep that drifts to a different snapshot is
  excluded and re-run.
- **Reps & conditions:** 40 runs total = 2 conditions × 2 harnesses × 10 reps.
  - **BARE:** no repository memory file present.
  - **TRIM:** a single shared, deliberately light `CLAUDE.md` present (identical
    bytes for both harnesses), giving only orientation, not the answer:
    > # OctoCAT Supply
    > A full-stack TypeScript sample application. It has two main parts: a backend
    > in `api/` and a web frontend in `frontend/`, with a top-level `Makefile`
    > that builds and runs them. See the README and `make help` for details.
- **MCP:** off on both sides (Copilot via `--disable-builtin-mcps` plus
  `--disable-mcp-server` for each user server; Claude has none by default).

## Harness-parity controls (so installed config can't decide cost)

The target repo ships `.github/copilot-instructions.md` and `.github/instructions/`,
which **Copilot CLI auto-loads but Claude CLI ignores** — an asymmetric context
injection that would hand Copilot the architecture for free. We **remove** those
files from the checkout so both harnesses start from bare harness core (system
prompt + native tools + raw code). Because `git reset --hard` restores them, the
orchestrator re-removes them before **every** rep.

We also verified the memory-file load matrix empirically (probe markers in each
file, inspected on the wire): `AGENTS.md` → loaded by **neither** CLI;
`.github/copilot-instructions.md` → **Copilot only**; `CLAUDE.md` → **both** (once
each). A single shared `CLAUDE.md` is therefore the only memory file both harnesses
load exactly once — which is why the TRIM condition uses exactly that.

## Metrics captured per rep (all from existing digests)

token-normalized USD (the single cross-harness cost axis, modelled from one shared
pricing table for both); native AI credits (Copilot only — real billed spend,
reported as a sidebar, no Claude equivalent); wall-clock (measured by the
orchestrator identically for both); requests / round-trips; tool calls; cache-hit
rate; cached + cache-creation tokens; fresh input tokens; output tokens; model
snapshot; run start timestamp (for cold/warm reclassification); quality score.

## Quality instrument (blind, itemized → raw 0–27 coverage count)

- **Primary:** 30–40 **atomic** checklist items (each 0/1, deterministic sum)
  rescaled to 20, scored against a frozen answer key validated at `e1516cf`.
  Discriminators include: api = Express + TypeScript + SQLite (better-sqlite3) +
  OpenAPI/Swagger + vitest; frontend = React 18 + Vite + Tailwind + Playwright,
  port **5137** (the repo's own `README.md` mis-states this as `5173`, the Vite
  default; every actual config — `vite.config.ts`, `playwright.config.ts`, the api
  CORS allow-list, `docs/build.md`, `.devcontainer` — uses `5137`, so `5173` is a
  parroted default, not a read value); api port 3000; SQLite at `api/data/app.db`,
  in-memory for tests; **no
  root `package.json`** (independent npm projects wired by `Makefile` +
  `docker-compose`); run path `make install` → `make dev`; the domain entity graph;
  and clarity/actionability (concrete commands, not generic prose).
- **Hallucination penalties (severity-capped):** a major false architecture claim
  (e.g. "npm-workspaces monorepo", Azure/Bicep infra that is not present at this
  SHA, wrong database) caps the score at 16; dangerously misleading setup caps at
  14; minor imprecision −0.5; a misleading port/db/command −1.
- **Static command accuracy:** install/run/test commands are credited only if they
  actually exist in the repo's `Makefile`/package scripts; invented root
  `npm install`/`npm test` are penalized.
- **Blinding protocol:** strip harness fingerprints (tool names, "I'll use…",
  harness identifiers), assign randomized IDs, then score with a fresh judge given
  only the answer key + checklist. The **judge model differs** from the contestant
  snapshot to avoid self-preference. Three passes, report the **median** and
  inter-rater agreement; human spot-check on a subset. A separate **"guess the
  harness"** audit checks that blinding holds (near-chance ⇒ credible). We will
  disclose "labels removed and randomized," never "fully blinded."
- **Secondary:** blind **pairwise** preference ("which better onboards a new dev to
  THIS repo?", forced A/B/tie) across runs; rubric is primary, pairwise secondary.
- **Reporting-scale note (post-hoc, presentation only):** the deterministic checklist
  yields a **raw coverage count out of 27** (25 fact items + a domain-entity point + a
  port-discrepancy bonus). The pre-declared ×20 projection compressed an already-narrow
  observed band (all 40 answers landed in raw 17–24) into 12.6–17.8, so the article and
  charts report the **raw 0–27 count** — the finer native grain — and zoom the chart
  y-axis to **10–27** (clearly labeled). This is an affine relabel: every effect size,
  correlation, and confidence interval is identical to the 0–20 scale (Cohen's
  *d* ≈ 0.39; the cost−quality *r* ≈ 0; the harness quality difference's 95% CI still
  spans zero). No run triggered a penalty, so raw count = final score for all 40.

## Analysis plan (pre-declared)

- Report per-metric **median, IQR, min/max, and a bootstrap CI**; phrase spreads as
  "observed up to X× in 10 runs," never "the noise floor."
- **Decompose cost** into fresh input / cached / cache-creation / output / requests
  / tool calls to show *where* the variance comes from.
- **Comparison rule:** compare the single cross-harness gap to the empirical
  distribution of **within-harness run-pair ratios**; report whether it is
  "indistinguishable from a same-harness pair."
- **Money chart:** cost-vs-quality scatter, quality-vs-output-tokens, and
  length-residual quality; report cost-per-quality-point.

## Scoped headline claim (will not be exceeded)

> In this controlled single-prompt, single-repo, single-snapshot sample, cost,
> time, and cache varied substantially **within** each harness, while
> rubric-scored answer quality showed **overlapping** distributions and did not
> increase reliably with cost.

N=10 is an existence proof of wide within-harness variability and overlap — not a
stable bound and not a general ranking of either CLI.

## Caveats baked in (honesty)

- Cache-hit ratios can be degenerate (÷0); report a hit-rate **range**, not a
  blown-up ratio.
- Sequential `-p` runs share the provider's prompt cache (~5 min TTL), so observed
  variance mixes agent randomness with cache timing — **both are non-harness**.
  Reps are grouped per harness to keep cache state consistent within a harness, and
  each run records a start timestamp + cold/warm tag so this can be inspected.
- The two cost numbers differ in kind: Copilot native AI credits are real billed
  spend; the Claude figure is token-normalized/modelled. Cross-harness comparison
  is on the **token-normalized** axis for both; credits appear only as a sidebar.
- Wall-clock reflects provider/proxy latency at capture time, not a pure harness
  efficiency measure; treat it as observed, not intrinsic.

## Status checklist

- [x] Design locked; SHA re-pinned; answer key re-validated at `e1516cf`.
- [x] Both CLIs verified to resolve the same dated snapshot.
- [x] MCP-off and instruction-file removal verified; memory-file load matrix mapped.
- [x] Orchestrator validated on a 2-run smoke (one per harness).
- [x] 40-run capture complete (clean: 0 errors, no snapshot drift, 10/cell).
- [x] Blind coverage judging + analysis (deterministic 0–27 coverage rubric).
- [x] Article drafted from results: [`one-run-cant-rank-two-agents`](../../articles/one-run-cant-rank-two-agents.html).
