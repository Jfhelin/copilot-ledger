# Experiment: Does a good `AGENTS.md` pay for itself?

Supporting experiment for **Article 4** of the Copilot Ledger series
(`docs/series/article-04-agents-md.md`).

> **Central question.** Does the fixed context cost of a concise, general-purpose
> `AGENTS.md` pay for itself by reducing exploration, mistakes, and model round-trips on
> **previously unseen** tasks?

This is **not** a test of whether instructions help on the tasks they were written for.
The credibility of the result rests on one rule: **the tasks used to build the file
(discovery) are different from the tasks used to test it (evaluation).**

## Where things live

| Layer | Path | In git? |
|---|---|---|
| Scaffolding / pre-registration / task specs / analysis | `docs/content-lab/experiments/agents-md/` (here) | ✅ yes |
| Runner + normalizer scripts | `…/agents-md/runner/` | ✅ yes |
| Raw run captures (answer, debug log, digest, metrics row) | `~/copilot-ledger-data/captures/agents-md/` | ❌ external, not git |
| Appended normalized rows | `docs/content-lab/data/db/runs.jsonl` (after curation) | ✅ yes |

Small text and the pre-registration are versioned. Bulky raw captures stay external,
matching the repo convention used by the 40-run grid.

## Folder map

```
agents-md/
├── README.md                 ← this file
├── manifest.md               ← PRE-REGISTRATION (commit before evaluation)
├── environment.md            ← Phase 0 environment lock
├── runner/
│   ├── run.sh                ← one orchestrator; resets repo, sets condition, runs, digests
│   └── extract.mjs           ← digest → one normalized metrics row
├── discovery/
│   ├── tasks/                ← 5 discovery task specs (+ prompt.txt each)
│   ├── analysis/             ← per-run notes + repeated-gap findings
│   └── candidate-instructions.md   ← Phase 3 output (built from discovery only)
├── intervention/             ← Phase 4: frozen AGENTS.md + provenance + token-count.json
├── evaluation/
│   ├── tasks/                ← 5 UNSEEN eval task specs
│   ├── rubrics/              ← per-task quality rubrics (defined before eval)
│   ├── schedule.json         ← randomized run order
│   └── exclusions.md
├── data/                     ← normalized + scored data snapshots
└── analysis/                 ← statistics, results, charts, limitations
```

## How to run

```sh
# Discovery (no AGENTS.md): 5 tasks × 3 reps, condition BARE
runner/run.sh BARE T1-nav 1            # single run
runner/run.sh --phase discovery        # full discovery sweep (15 runs)

# Evaluation (later): condition BARE | AGENTS, randomized schedule
runner/run.sh --phase evaluation --schedule evaluation/schedule.json
```

Every run: reset repo to the pinned SHA → set condition → fresh conversation →
`copilot -p "<task prompt>"` (MCP off, fixed model) → capture answer + debug log →
digest → append one normalized JSON row. See `runner/run.sh` for the exact invocation.

## Status

- [x] Phase 0 — environment locked (`environment.md`)
- [x] Phase 0 — pre-registration manifest (`manifest.md`)
- [x] Phase 1 — discovery tasks selected + specced (`discovery/tasks/`)
- [x] Phase 1 — runner + normalizer built and smoke-tested (`runner/`)
- [ ] Phase 1 — 15 discovery runs collected
- [ ] Phase 2 — discovery analysis
- [ ] Phase 3 — `candidate-instructions.md`
- [ ] Phase 4 — draft + freeze `AGENTS.md`
- [ ] Phase 5 — pre-register evaluation (5 unseen tasks, rubrics, schedule)
- [ ] Phase 6 — 100 evaluation runs

See `../../../series/article-04-agents-md.md` for the article-side working notes.
