---
name: copilot-behavior-lab
description: Produce Copilot Behavior Lab content from a VS Code Copilot Chat session — experiment writeups, LinkedIn post drafts, and short-video outlines, backed by real Copilot Ledger measurements. Use when the user wants to turn a session analysis into a docs/content-lab experiment page or social/video draft, write up an agent-behavior or AI-credit/cost finding, or publish evidence-backed content. This is the PUBLISHING/PRODUCING skill; raw export Q&A belongs to the copilot-chat-export skill.
user-invocable: true
---

# Copilot Behavior Lab Skill

## Purpose

Turn a real GitHub Copilot session into publishable content: a GitHub Pages
experiment writeup, a LinkedIn post draft, and a short-video outline — every
claim backed by a measured number from the session.

The main goal is **LinkedIn attention and accurate knowledge sharing**. The goal
is NOT to promote Copilot Ledger as a product.

## How this skill fits with analysis (read this first)

There are two related activities in this repo, and they are deliberately
**loosely coupled** — neither requires the other:

- **Analysis** — the `copilot-chat-export` skill and the **Copilot Ledger
  canvas** (`copilot-ledger`) are where you *explore a session*: open an export,
  discuss the run, look at per-prompt cost, cache behavior, tool-def overhead,
  cold-start anomalies, and confirm what actually happened.
- **Publishing** — THIS skill is where a confirmed observation becomes content.

The connection between them:

> The insight is usually **found and validated during analysis** (in the canvas
> or via the digest), and this skill **writes it up**. The canvas is also what
> you screen-record for the LinkedIn video. The digest supplies the hard numbers
> and refs that make the page credible.

Practical consequences:

- If the user has **already analyzed** a session (e.g. you just discussed an
  export in the `copilot-ledger` canvas), reuse those findings and the existing
  digest — do not re-derive from scratch.
- If they **have not**, you can produce a page straight from a digest. Opening
  the canvas first is *recommended, never required*.
- Every number on a finished page must trace back to a digest field or a canvas
  view. No invented figures.

## The producing workflow

When the user asks to produce a page / experiment / post / video bundle:

### 1. Identify the source session (required) and the topic

You need an actual session to measure. Do **not** auto-pick a file from
`packages/cost-view/public/sessions/` and start writing — that risks publishing
conclusions about the wrong run. Establish, by asking if unclear:

- **Which export** (path, or a name resolvable by the `copilot-chat-export`
  skill's lookup order), OR an analysis the user just did in the canvas.
- **Which experiment/topic** — an existing stub in
  `docs/content-lab/experiments/` (e.g. `01-context-quality`), or a new one.
  The file numbers are stable IDs, not publishing order (see
  `docs/content-lab/publishing-plan.md`).

If either is missing and you cannot infer it, ask. If the user says "the session
we just looked at," reuse that export and its digest.

### 2. Get the measurements from the digest (don't recompute cost yourself)

The `copilot-chat-export` skill owns all cost/cache math. Reuse it by running its
digest script directly against the export — treat it as the single source of
truth, never duplicate the calculations here:

```sh
node .github/skills/copilot-chat-export/scripts/digest.mjs <abs-export-path> --stdout
```

`--stdout` prints the digest JSON without writing a sidecar. (Omit it to cache a
`<source-dir>/.agentviz/<name>.digest.json` sidecar, which is gitignored — fine
if you'll reuse it.) Pull the fields you need for the page:

- Session summary: `rollups.primaryModel`, `rollups.cost.credits.total`
  (lead with credits, USD in parens), `rollups.toolCalls`, `rollups.cacheHitRate`.
- Cost driver: the dominant line item — often `rollups.cacheAnomalies.items[]`
  (cold-start cache writes), `rollups.toolDefs.approxShareOfPromptTokens`
  (schema overhead), or a single expensive prompt (`prompts[].credits`).
- What happened: walk `timeline[]` / per-prompt `tools`, `requestCount`,
  `finalAssistantPreview`.
- Evidence refs: cite `p<n>` / `p<n>.l<n>` for every concrete claim.

### 3. Read the templates — they are the source of truth for structure

Do not hardcode the section list from memory. Read these and follow them exactly
so the skill and the docs never drift:

- `docs/content-lab/experiment-template.md` — the page structure.
- `docs/content-lab/linkedin-post-template.md` — the post pattern.
- `docs/content-lab/video-template.md` — the 60–120s outline.

### 4. Write the bundle

Write/update `docs/content-lab/experiments/NN-topic.md`, filling the
experiment-template sections with the measured values from step 2. The template
currently keeps the **LinkedIn Post** and **Video Outline** as sections at the
bottom of the same page — keep them there, clearly under their own headings, so
this file is the single editorial workspace for the topic. (If GitHub Pages
publishing is added later and the page becomes public, revisit whether to split
the promo drafts into sibling files.)

Replace every `TODO` you have evidence for. Leave a `TODO` only where you
genuinely lack data — never paper over a gap with an invented number.

### 5. Set confidence honestly, tied to the data

Map digest conditions to confidence — do not eyeball it:

- Only one session analyzed → label **single-session observation**, not a
  benchmark.
- `rollups.cost.allModelsPriced === false` → cost claims are **low confidence**
  (some models were treated as $0); say so.
- `rollups.cost.thinkingUnderCount.applies === true` → the headline credits are a
  **lower bound**; add "+ ~N credits hidden as extended-thinking output."
- `rollups.cacheAnomalies.count > 0` → call the anomaly out specifically instead
  of generalizing about cache.
- Weak/short timeline → avoid strong causal claims ("the plan caused the cost");
  describe what you saw.

If a finding isn't reproducible, mark it **Under investigation / single
observation / needs more testing**. Do not force a conclusion.

## Core positioning

> Copilot Behavior Lab helps developers understand how AI coding agents think,
> work, and spend credits.

Cost matters, but the broader story is **agent behavior**. LinkedIn is the
primary publishing surface; **GitHub Pages is the evidence layer**; Copilot
Ledger is the measurement tool behind the observations — never the product.

## Preferred content pattern

1. Surprising observation
2. What happened in the session
3. Why it happened
4. Cost impact (in AI credits, USD in parens)
5. Practical guidance
6. Evidence link or export

## Strong LinkedIn hooks

Prefer:

- The README was cheap. Finding it wasn't.
- I thought the answer was expensive. The plan was.
- Caveman Prompting saved less than 3% in my Copilot session.
- The most expensive information is often information the agent has to go find.
- What 23,000 tokens of context actually looks like.
- Vague prompts cost more than precise prompts.
- The agent did not just answer. It planned, searched, read files, then answered.

Avoid:

- New article published
- Cost optimization technique number 3
- My tool can analyze Copilot usage

## Tone

Curious, technical, evidence-based. Clear and practical. Never sound like product
marketing. Never attack existing Microsoft or GitHub material. Prefer:

- "This surprised me."
- "The measurement changed how I think about this."
- "This reinforces the recommendation to…"
- "This is a single-session observation, not a universal benchmark."

## Recommendations to reinforce

When ending a writeup, reinforce official guidance with the concrete evidence:

- Choose the right model for the job.
- Use Auto Mode where appropriate.
- Provide useful context up front so the agent doesn't need extra exploration.
- Avoid sending excessive context, such as too much codebase content.
- Use precise prompts with clear guardrails.
- Review tools and skills periodically.
- Avoid optimizing away useful planning or reviewability.

## Currently planned experiments

1. Context Quality — *The README was cheap. Finding it wasn't.*
2. Model Selection — *The biggest cost lever is often model selection.*
3. Prompt Precision — *Vague prompts cost more than precise prompts.*
4. Caveman Prompting — *Caveman Prompting saved less than 3% in my Copilot session.*
5. Context Growth — *What 23,000 tokens of context actually looks like.*
6. Agent Planning — *I thought the answer was expensive. The plan was.*
7. Tool and Skill Overhead — *Under investigation. Do not overclaim.*

## Video guidance

LinkedIn-first videos: 60–120s, screen-record the **Copilot Ledger canvas** for
the session being discussed, focus on one surprising observation, end with one
practical recommendation. GitHub Pages embedded videos: 5–8 min showing the full
session flow and evidence.

## Final reminder

The strongest content is not "how to save credits." It is:

> Here is what the agent actually did, why it mattered, and what developers can
> learn from it.
