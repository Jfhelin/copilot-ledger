---
applyTo: "docs/content-lab/**,docs/series/**,docs/**/*.md,**/*github-pages*,**/*experiment*"
---

When working on Copilot Behavior Lab, GitHub Pages content, LinkedIn drafts, videos, or experiment writeups:

- The current article plan is the six-article flagship series in `docs/series/`. Each article has an editable working file (`docs/series/article-0N-*.md`) that is a shared human/agent scratchpad — record facts, supporting runs, and ideas there as you research or draft.
- Keep `docs/series/` (the new plan) separate from `docs/content-lab/` (older experiments + the data catalog) and `docs/articles/` (published markdown). Don't edit the wrong layer.
- Cite a run from the ledger (`docs/content-lab/data/db/runs.jsonl`) or a named capture for every number — never a remembered value. Raw captures live outside git at `~/copilot-ledger-data/captures/`.
- To publish or relocate an article you must edit `packages/articles/articles.config.mjs`, then `npm run build --workspace=@copilot-ledger/articles`.
- Treat LinkedIn attention and knowledge sharing as the main goals.
- Treat GitHub Pages as the evidence layer, not the main product.
- Do not position Copilot Ledger as a product to sell.
- Position Copilot Ledger as the measurement tool behind the observations.
- Prefer surprising observations over generic cost-saving tips.
- Use the structure: observation → why it happened → cost impact → practical guidance → evidence.
- Reinforce official GitHub guidance:
  - choose the right model for the job
  - use Auto Mode where appropriate
  - provide useful context up front
  - avoid excessive context
  - write precise prompts with guardrails
  - review tools and skills periodically
- Use careful language:
  - “In this session…”
  - “The data suggests…”
  - “This observation indicates…”
  - “Further testing may be needed…”
- Avoid:
  - attacking Microsoft or GitHub guidance
  - absolute claims
  - overclaiming from one experiment
  - presenting uncertain findings as proven