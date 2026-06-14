# Copilot Ledger — Article Series Index

**What this is.** The working index for the six-article flagship series. Each article
has its own editable working file in this folder (`article-0N-<slug>.md`) where we collect
the facts, supporting runs, writing ideas, and open data needs we will draw on when the
article is actually written. Both the human and the agent edit these files freely — they
are a shared scratchpad, not the published article.

_Last updated: 2026-06-14._

---

## How this folder relates to the rest of the repo

| Layer | Location | What it is | Edit here? |
|---|---|---|---|
| **Series plan (this folder)** | `docs/series/` | The index + per-article working files (facts, runs, ideas) | ✅ yes — shared scratchpad |
| **Published articles** | `docs/articles/*.md` | The live Pages/Blog markdown that actually ships | only when writing the final piece |
| **Publish manifest** | `packages/articles/articles.config.mjs` | Controls which `.md` becomes which `<slug>.html` | only to publish/relocate |
| **Data catalog + run ledger** | `docs/content-lab/data/INDEX.md`, `db/runs.jsonl` | Canonical record of every captured run (59 rows) | append runs via build scripts |
| **Experiment pre-regs** | `docs/content-lab/experiments/*.md` | Older experiment designs (some feed this series) | as needed |
| **Raw captures** | `~/copilot-ledger-data/captures/` (external, not in git) | Wire logs, transcripts, exports, 40-run metrics | n/a |

> **Why a separate folder.** `docs/content-lab/` holds the earlier article-series idea and
> the raw experiment scratch. This `docs/series/` folder is the clean home for the *new*
> six-article plan so the two do not get mixed up. When a working file here needs a number,
> it should cite the **run ledger** (`docs/content-lab/data/db/runs.jsonl`) or a named
> capture — never a remembered value.

---

## The series at a glance

| # | Working title | Role | Status | Proposed destination | Working file |
|---|---|---|---|---|---|
| 1 | One run can't rank two coding agents | Establish measurement discipline | ✅ research + article largely complete | GitHub Blog | [`article-01-one-run-cant-rank-two-agents.md`](./article-01-one-run-cant-rank-two-agents.md) |
| 2 | A coding agent is more than a model | Explain the harness | 🟡 dossier complete, article drafted (in polish); 9 wire-derived research dossiers committed in `research/article-02/` (PR #80) — see **Article 2 & 4 — data & log locations** below | GitHub Blog | [`article-02-more-than-a-model.md`](./article-02-more-than-a-model.md) |
| 3 | What your IDE sends before you type | Make invisible context visible | 🟡 reframed around **five harness design decisions** (tool surface · delivery · skills · sub-agents · memory & state); research dossiers + 98/100-run behavioral dataset complete (see `research/article-03/`); article not yet drafted. ⚠️ 3 data corrections must land in the draft — see **Article 3 — plan notes** below | Personal blog → maybe GitHub Blog | [`article-03-what-your-ide-sends.md`](./article-03-what-your-ide-sends.md) |
| 4 | Can a good AGENTS.md improve quality and reduce cost? | Test a practical developer lever | 🔵 evaluation data **collected** (discovery 15 + evaluation 165 runs); raw captures external & not yet committed/catalogued — see **Article 2 & 4 — data & log locations** below; needs digest + write-up | GitHub Blog (+ MS Learn follow-up) | [`article-04-agents-md.md`](./article-04-agents-md.md) |
| 5 | When is a more expensive model worth it? | Map the cost-quality frontier | ⚪ needs new experiment (~250 runs); some e3 data exists | Personal blog → maybe GitHub Blog | [`article-05-model-cost-quality.md`](./article-05-model-cost-quality.md) |
| 6 | Same model, different harness | Synthesis / competitive capstone | ⚪ depends on Articles 1–5 | Personal blog → possible field adaptation | [`article-06-same-model-different-harness.md`](./article-06-same-model-different-harness.md) |

Status legend: ✅ done/near-done · 🟡 drafted, in polish · 🔵 ready to write from existing data · ⚪ needs new work.

---

## Article 3 — plan notes (reframe + corrections)

**The reframe.** Article 3 is no longer a token-footprint measurement piece. Holding the model
constant (Claude Sonnet 4.5) across three harnesses — Copilot CLI, Claude CLI, Copilot in VS Code —
it tells **harness design-decision stories**: *what the engineer decided → how it reaches the model →
the UX consequence for the developer (labeled Inference) → the wire evidence.* Thesis: any
behavioral difference is **authored by the harness, not the model, and no single choice is
universally better**. The footprint numbers become the *cost* evidence under each decision; the
behavioral study becomes the *consequence* evidence.

**The five-decision spine** (each backed by `research/article-03/tooling-profile-*.md`):

| # | Design decision | Three-way split observed |
|---|---|---|
| 1 | **Tool surface** — how many tools, at what schema weight | 19 (CO-CLI) · 27 (CL-CLI) · 56 (CO-IDE, incl. 18 from installed extensions) |
| 2 | **Tool delivery** — eager vs gated | flat-slim (CO-CLI) · flat-heavy (CL-CLI) · **gated** (CO-IDE: 23 eager + 33 `defer_loading`) |
| 3 | **Skills** — how surfaced | hidden behind a `skill` tool (CO-CLI) · 13-stub catalog preloaded (CL-CLI) · 16 folded into system (CO-IDE) |
| 4 | **Sub-agents** — roster mechanism | fixed menu via `task` (CO-CLI, 6 built-in + 3 org) · open `subagent_type` enum (CL-CLI) · 8 via `runSubagent` (CO-IDE) |
| 5 | **Memory & state** — what persists / is refused | dual SQL + async-shell detach (CO-CLI) · plan-mode gate + TodoWrite (CL-CLI) · per-session state + 2 gpt-4o-mini overhead calls (CO-IDE) |

Supporting layers: the **structural floor** (first-call footprint, the cost side) and the
**behavioral payoff** (5 prompts × 2 CLIs × N=10, 98/100 valid — `research/article-03/behavioral/`,
read as tendencies not a ranking; VS Code arm is N=1 and not state-matched).

**Three corrections the draft must carry** (correction-log form — preserve old claim, explain why):

1. **Tool delivery is *not* "flat everywhere."** Old draft: all three ship a flat catalog, "none
   used progressive disclosure." Corrected: Copilot in VS Code **gates** its catalog (23 schemas
   eager + 33 flagged `defer_loading:true` behind a `tool_search` step; ~8.8k eager vs ~6.3k
   deferred tok). The flat-catalog claim applies to the **two CLIs only**. Source:
   `tooling-profile-copilot-ide.md`.
2. **VS Code skills = 16, not ~37.** Old draft estimated ~37 skills folded into the system prompt.
   Corrected count is **16** (5 core + 6 GitHub-PR ext + 2 eval ext + 2 repo + 1 user). Source:
   `tooling-profile-copilot-ide.md` / `harness-profile-*.md`.
3. **The 46,428-tok / 95-tool "MCP-on Copilot in VS Code" configured row is a mislabeled Claude
   Code CLI session** (24 native incl. `Agent`/`Bash`/`Cron*`/`EnterPlanMode` + 71 `mcp__` = 95).
   Pull that figure from any VS Code configured-footprint claim; a state-matched VS Code configured
   snapshot is an **open data gap**. (Note: this INDEX's harness table already lists CL-IDE ≈46.4k
   and CO-IDE ≈20.6k correctly — the mislabel lives in the article working file, not here.)

**Figures needing regeneration before publish:** `tool-catalog-delivery.svg` (still draws a flat
56-tool VS Code bar) and `ide-context-breakdown.svg` (still says "~37 skills"); no figure yet for
the sub-agents axis (decision 4).

**Where Article 3 data lives:** dossiers + behavioral results + VS Code N=1 digest all under
`docs/series/research/article-03/`; dataset-grain ledger entry in `docs/content-lab/data/INDEX.md`;
raw captures outside git in `~/copilot-ledger-data/`.

---

## Article 2 & 4 — data & log locations

Same pattern as Article 3: wire-derived digests/dossiers are committed in-repo; the bulky raw
captures they cite stay **outside git** under `~/copilot-ledger-data/` (see the data catalog,
`docs/content-lab/data/INDEX.md`, for the full inventory).

**Article 2 — "A coding agent is more than a model" (committed).**
- In-repo evidence: `docs/series/research/article-02/` — 9 dossiers backing each article section
  (`00-method-and-captures.md` … `08-control-matrix-and-levers.md`). Landed via merged PR #80.
  `00-method-and-captures.md` is the index (method, capture families, pinned env, evidence labels).
- Raw captures cited by those dossiers (outside git): `~/copilot-ledger-data/captures/` —
  `structural-prefix/{copilot,claude}/` (per-request prefix digests), `repeatability-40run/`
  (40-run variance set), `co-ide-exports/` (Copilot-in-VS-Code Chat exports),
  `cl-ide-transcripts/` (Claude Code extension transcripts).
- In-git aggregate mirror: `docs/content-lab/data/db/runs.jsonl`.

**Article 4 — "Can a good AGENTS.md improve quality and reduce cost?" (captured, not yet committed).**
- Raw captures (outside git): `~/copilot-ledger-data/captures/agents-md/` —
  - `discovery/` — 15 runs (5 representative tasks × 3 reps, no AGENTS.md): `captures.jsonl`, `runs/`, `sweep.progress.log`.
  - `evaluation/` — 165 runs across 5 held-back tasks (E1-nav, E2-local, E3-debug, E4-multifile,
    E5-review) × 4 conditions (BARE / AGENTS / INIT ×10 reps each + ORIG ×3): `captures.jsonl`,
    `runs/`, `scoring/packets/`.
- ⚠️ Open gaps: this data is **not yet** committed to the repo, digested into
  `docs/series/research/article-04/`, or added to the data catalog / run ledger
  (`docs/content-lab/data/INDEX.md`, `runs.jsonl`). The external `~/copilot-ledger-data/README.md`
  inventory also does not yet list `agents-md/`.
- ⚠️ Stale working file: `article-04-agents-md.md` still frames this as "needs a new
  pre-registered experiment (~100 runs)" with an unchecked checklist — reconcile against the
  collected data (note the evaluation grew to a 4-condition design, not the planned 2) when digesting.

---

## Editorial position (applies to every article)

- **Explain the cause, do not crown a winner.** "Copilot CLI was more efficient *for this
  task and configuration*" — not "Copilot CLI is the more efficient harness."
- **Publish results that do not favor Copilot** when they happen. Credibility depends on it.
- **Show data before claims; explain mechanisms, not just scores.**
- **State what the experiment does *not* prove.** End with practical guidance.
- **Recurring message:** *Same model does not mean same system. Different results do not
  imply magic — they reflect design choices, configuration, task fit, and tradeoffs.*

## Non-negotiable standards (every working file must respect)

- **Cost labels** — every cost is one of: exact billed cost · exact product credits ·
  token-derived estimate · list-price estimate · user subscription cost · unknown.
  Never mix without saying so. (Only Copilot CLI gives exact billed GitHub credits.)
- **Evidence labels** — every major claim tagged **Direct evidence / Inference /
  Speculation**. Only Direct evidence is written as established fact.
- **Pinned environment** — harness+version, model snapshot, repo+commit, MCP list,
  instruction files, skills, memory state recorded for every run cited.
- **Repetitions** — N=10/condition for automated CLI experiments; N=1–2 only for
  structural IDE inspection, *never* for rankings.
- **Corrections** — keep a correction log; preserve the old claim, explain why it changed.

---

## Shared assets

**The fixed task prompt** (held constant across harness/structural work):
> Explain this repository to a new developer: purpose, components, data flow, install/run/test.

**Canonical experiment repo:** `octodemo/octocat_supply` · model `claude-sonnet-4-5-20250929` · MCP off unless noted.
(40-run grid @ commit `e1516cf`; structural/IDE captures on the `…-psychic-disco` checkout.)

**The four harnesses (all on Claude Sonnet 4.5)** — floors from `figures/harnesses/prefix-size-comparison.svg`:

| Code | Harness | Cold prefix (MCP-off) | Out-of-box floor | Canonical capture |
|---|---|---:|---:|---|
| CO-CLI | Copilot CLI (headless) | ~14.9k | ~15k (exact) | `structural-prefix/copilot/digest.json` |
| CL-CLI | Claude CLI (headless) | ~27.2k | ~27k (exact, incl. 13 built-in skills) | `structural-prefix/claude/digest.json` |
| CO-IDE | Copilot in VS Code | ~20.6k | ~17k (estimate, −18 ext tools) | `co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json` |
| CL-IDE | Claude Code in VS Code | ~46.4k | ~46k (exact) | `cl-ide-transcripts/CL-IDE_extension_OFF.jsonl` |

**Run ledger:** `docs/content-lab/data/db/runs.jsonl` (59 rows). Query via
`sqlite3 session.db < docs/content-lab/data/db/runs.sql`. The Article-3 behavioral study
(100 runs, 98 valid) is logged at **dataset grain** rather than in this spine — its per-run
log is `docs/series/research/article-03/behavioral/results.jsonl` (see the data-catalog INDEX).

**Existing figures:** `docs/articles/figures/harnesses/` — `prefix-size-comparison.svg`,
`tool-catalog-size.svg`, `agent-is-more-than-model.svg`, `model-provider-vs-harness-control.svg`.
⚠️ `mcp-delta-callout.svg` is referenced in the plan but **does not exist yet**.

---

## Publishing pipeline reminder

To publish/relocate any article you MUST edit `packages/articles/articles.config.mjs`
(explicit manifest; `slug` = output filename = stable URL; `home: true` = front page).
Verify locally: `npm run build --workspace=@copilot-ledger/articles`.
Gotcha: the editor canvas auto-escapes `**` → `\*\*`; before committing run
`perl -i -pe 's/\\\*/*/g' <file>` and confirm the built page has zero escaped asterisks.
Always commit with the `Co-authored-by: Copilot` trailer.
