# E1-nav — Repository understanding (evaluation)

- **Class:** Repository navigation / understanding
- **Entity focus:** whole repo (not entity-specific)
- **Fixture:** none (read-only)
- **Timeout:** 8 min

## Prompt
See `prompt.txt` — same whole-repo "explain and get productive" prompt used in Article 1–3
and discovery T1-nav.

## Disjointness note (READ)
This is the one eval task that **reuses** the discovery-class prompt and scorer rather than a
new entity. Rationale: the frozen `AGENTS.md` contains only *general* repo facts (two-project
layout, install-before-test) — no navigation answers — so there is no task-specific
memorization to leak. Reusing the identical `score.mjs` (0–27, ground truth verified at
`e1516cf`) preserves cross-article comparability and directly tests whether stating the layout
up front improves a cold agent's understanding/cost. If we instead want *strict* entity
disjointness here too, swap this for a focused "explain the Supplier→Product subsystem" task
with its own frozen checklist (decision flagged for review).

## Success gate (binary)
- An answer is produced (non-empty), repo described.

## Quality (graded 0–27)
- Identical `score.mjs` from the 40-run grid (25 facts + entities + port-discrepancy bonus),
  unchanged. Scorer also emits the normalized 0–20 secondary view.

## Notes
Read-only — no code edits expected. If the agent edits files, record it as an
unnecessary-action signal (does **not** change the quality score, reported separately).
