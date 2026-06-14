# Rubric — E1-nav (repository understanding) · FROZEN

Reuses the **unchanged** scorer from the 40-run grid / Articles 1–3:
`score.mjs` (25 ground-truth facts + entity coverage + port-discrepancy bonus → raw **0–27**,
with a normalized 0–20 secondary view). Ground truth verified at repo `e1516cf`.

## Success gate (binary)
- [ ] A non-empty answer describing the repository is produced.

## Quality (0–27)
- Run `score.mjs` against the agent's final answer; record the raw 0–27 and normalized 0–20.
- **No rubric changes** — identical scoring to prior articles for cross-article comparability.

## Why reuse is safe here
The frozen `AGENTS.md` contains only general repo facts (two-project layout,
install-before-test) and **no** navigation answers, so reusing the prompt/scorer introduces no
task-specific memorization leak. This is the single intentional continuity task; all other
eval tasks (E2–E5) use entities disjoint from discovery.

## Unnecessary-action signal
Read-only task. If the agent edits files, log it as an unnecessary-action signal (reported
separately; does not change the 0–27 quality score).
