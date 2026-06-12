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

## Reuse existing measured data — the data catalog (read before capturing)

Before running or asking the user to run a new capture, **check what we already
measured.** The durable catalog of every dataset collected for this content series
lives at:

> **`docs/content-lab/data/INDEX.md`**

It maps each dataset (the 40-run repeatability experiment, the per-harness prefix
digests, the Copilot-in-VS-Code exports, the Claude Code extension transcripts, the
four extracted system prompts, the 6-deliverable harness dossier) to its canonical
location, records the key measured numbers, and lists known gaps and pending
captures. Bulky/raw captures it references live in the external dir
`~/copilot-ledger-data/` (not committed); the distilled analysis sits next to the
index in `docs/content-lab/data/`.

Use it to avoid re-running sessions: if the number you need is already cataloged,
cite it from there. The **queryable spine** of the catalog is the run ledger
`docs/content-lab/data/db/runs.jsonl` (one row per run ever captured); load it with
`sqlite3 session.db < docs/content-lab/data/db/runs.sql` to filter/aggregate.

**You are responsible for keeping the catalog current.** A markdown index does not
update itself — so whenever you produce a page or finding that involves data, in the
same change:

- If you generated a **new capture/dataset**, (a) append a row to the run ledger
  `docs/content-lab/data/db/runs.jsonl` — or add it to `build-runs.mjs` and regenerate
  both `runs.jsonl` and `runs.sql` — and (b) add a row/section to `INDEX.md` (what
  it measures, harness, model, MCP on/off, canonical path) and stage the raw file
  into `~/copilot-ledger-data/captures/`.
- If you built a **new long-lived `sql` table**, dump it to `docs/content-lab/data/db/`
  (the session DB is per-session and is lost on cleanup — see the INDEX DB note).
- If you **closed a gap** listed under "Known gaps / open captures," update or remove
  that entry.
- If a headline number changed or a dataset was retired, fix it in `INDEX.md` and bump
  its "Last updated" date.

Treat updating `INDEX.md` as part of "done," the same way the article isn't done until
it's registered in `articles.config.mjs`.

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

### 6. Publish the evidence export as a fixed report

The experiment page links to its session so readers can inspect it in the
Copilot Ledger viewer. Publish it as a **fixed report** — a read-only, pinned
view — never as a bare uploader link. A fixed report deliberately:

- **Strips the loader.** No file picker, no recents dropdown, no "switch /
  new file" affordance. The reader cannot navigate to a different run; they see
  exactly the evidence the page is about. (This is the `fixed` viewer mode.)
- **Shows a descriptive name, not a filename.** The header reads e.g.
  *"Round Trips — lazy arm (search → read → answer)"*, not
  `t2-maprows-lazy.json`.
- **Opens with the summary populated.** The two top boxes — *what the user
  wanted* and *how the agent approached it* — are authored at publish time, so
  the page never opens with empty "Not generated yet" boxes. (A fixed report has
  no canvas bridge to generate them live.)

#### Before you copy: scrub the export (it becomes public)

A published export is **world-readable** — committed to a public repo and served
on GitHub Pages as raw JSON. Every `request` snapshot carries the full system
prompt, which embeds the live **skills/agents catalog**, tool definitions,
`mcpServers` blocks, and **absolute file paths**. That is exactly where internal
data leaks. **Never copy an export into `public/sessions/` without reviewing it
first.** This applies to any log file or export you push, not just fixed reports.

Scan for, at minimum:

- **Internal system / product codenames** in skill/agent descriptions (CRM,
  data-warehouse, analytics, admin-tool names; internal acronyms/metrics).
- **Internal skill marketplaces / plugin names** in the `<skill>`/`<agent>`
  catalog and in `<file>` paths.
- **Usernames / machine identifiers** — `/Users/<handle>/…` absolute paths
  (often hundreds of hits; the handle is PII).
- **Hostnames / endpoints / connection strings** in `mcpServers` (internal URLs,
  non-public clusters).
- **Secrets** — tokens, keys, passwords (distinguish a real value from a mere
  env-var *name* or safety boilerplate).
- **Customer / PII / revenue data** — names, emails, $ figures, account data.

Quick first pass (tune the alternation to the run's own tooling):

```sh
f=packages/cost-view/public/sessions/<name>.json
grep -ohE "/Users/[A-Za-z0-9._-]+|<your-internal-terms-here>" "$f" \
  | sort | uniq -c | sort -rn
```

If you find internal data, **replace it with fake data using EXACTLY
length-preserving substitutions** (same character count per token). The parser
char-counts the `<skill>`/system blocks and scales them to the real
`prompt_tokens`, so equal-length swaps keep every displayed number identical and
the scrub is invisible to the cost math. Then verify, before committing:

- **byte size unchanged** vs the original (`wc -c` — proves only intended
  substrings changed),
- **JSON still parses**,
- a **residual scan returns zero** internal markers,
- `npm test --workspace=@copilot-ledger/cost-view` and `npm run build` are green.

Caveat: scrubbing the working copy does **not** purge git history — if a real
export was already committed publicly, the old blob persists in prior commits and
full removal needs a history rewrite. Best to scrub **before** the first push.

To publish one (all in `packages/cost-view/`):

1. Copy the export into `public/sessions/` with a descriptive, kebab-case name
   (e.g. `t2-maprows-lazy.json`), not the raw capture name. **Scrub it per the
   checklist above before this copy** — the moment it lands in `public/` it is
   publishable.
2. Add an entry to `FIXED_REPORTS` in `src/content/site.js` with:
   - `id` — stable `#/reports/<id>` route segment,
   - `title` — the descriptive name shown in the header,
   - `file` — the `sessions/<name>.json` you just copied,
   - `summaries: { userGoal, agentApproach }` — 2–4 sentences each, pulled from
     your analysis. **Always populate this.**
   - `backTo` / `backLabel` — link back to the owning experiment.
3. Link the experiment page to `/reports/<id>` in its Evidence section.
4. `npm run build` (or `npm run canvas:sync` if the canvas should serve it too)
   and verify the report opens with the summary shown and no uploader chrome.

Every number in the `summaries` must trace back to the digest — same rule as the
page body. Do not invent figures to fill the boxes.

## Pages articles (the `packages/articles` bubble)

Long-form articles live in `docs/articles/*.md` and publish through the
`packages/articles` bubble — each entry in `articles.config.mjs` renders one
standalone `<slug>.html`, and GitHub Pages deploys **only** `packages/articles/dist`.
To add/move a page you MUST edit `articles.config.mjs` (it won't build otherwise);
verify with `npm run build --workspace=@copilot-ledger/articles`.

There are two layouts: the default "lab" layout and the blog layout
(`theme: "github-blog"`, with a hero title + category label). **Both** carry an
author byline (avatar + name + "<authorTitle> at <authorOrg>" + optional date) and a
personal-views disclaimer in the footer.

The byline and disclaimer are **author identity, not per-article copy** — they come
from `SITE` defaults in `articles.config.mjs`, so *every* page (current and future,
either layout) inherits them automatically:

- `SITE.author`, `SITE.authorTitle`, `SITE.avatar` — the byline identity.
- `SITE.authorOrg` (e.g. `"GitHub"`) — appended as `"<authorTitle> at <authorOrg>"`,
  keeping the employer affiliation honest and upfront.
- `SITE.disclaimer` — the italic personal-views footer line ("I work at GitHub. This
  is my personal blog — views are my own, not company-sponsored.").

Do not re-add these to individual entries or hand-write them into a page body. When
publishing a new article you normally set only `slug`, `src`, `title`,
`description`, `order` (plus `theme: "github-blog"` + `category` + `date` for the
blog layout) — the byline and disclaimer come for free. Per-article `author` /
`authorTitle` / `avatar` / `authorOrg` / `disclaimer` override the default for guest
posts; `hideByline: true` / `hideDisclaimer: true` suppress them entirely.

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

Consolidated to **8 strong articles** in three clusters (see
`docs/content-lab/publishing-plan.md` for the authoritative launch order). File
numbers are stable IDs, not the article count or order.

**A · The Fixed Floor — before you type**

1. Cache Behavior (`08`) — *Your "cold" session isn't cold — and it's your tool
   defs, not your system prompt, that anchor the warm block.* (The
   prompt-ordering / global-cache finding lives here, not in a separate page.)
2. Tool & Skill Overhead (`07`) — *I added a 100-tool MCP server. The wire barely
   moved.* Churn is the tax, not count.
3. Installed Skill Overhead (`09`) — *Skills aren't virtualized; uninstalling cuts
   every call.*

**B · The Session Tax — as you work**

4. Context Growth (`05`) — *Re-reading the grown context was 40% of the session.*
5. Agent Planning (`06`) — *Sub-agents are a context loan, not a discount.*

**C · What you control per task**

6. Round Trips Are the Lever (`01`, merges former `03` Prompt Precision) — *The
   README was cheap. Finding it wasn't.* Context quality and prompt precision are
   one mechanism.
7. Model Choice — Pick It, or Let Auto Pick (`02`) — *Same task. Half the credits.
   More of it done. I changed the model.* Combines GitHub's top two levers (right
   model + Auto Mode) into one piece. Measured: same JSDoc task on Sonnet 4.5
   (20.7 cr, 16/24 symbols) vs Haiku 4.5 (10.5 cr, 24/24) — ~49% cheaper and more
   complete; plus two-model-per-session routing and Auto's 0.9× multiplier.
   (Published — measured, N=1 per arm.)
8. Caveman Prompting (`04`) — *Caveman Prompting saved less than 3%.* Contrarian
   closer. (Stub — needs a with/without capture.)

Optional 9–10 (only once measured): Compaction break-even; Image input.

## Video guidance

LinkedIn-first videos: 60–120s, screen-record the **Copilot Ledger canvas** for
the session being discussed, focus on one surprising observation, end with one
practical recommendation. GitHub Pages embedded videos: 5–8 min showing the full
session flow and evidence.

## Final reminder

The strongest content is not "how to save credits." It is:

> Here is what the agent actually did, why it mattered, and what developers can
> learn from it.
