# Copilot Ledger — Article Series Index

**What this is.** The working index for the six-article flagship series. Each article
has its own editable working file in this folder (`article-0N-<slug>.md`) where we collect
the facts, supporting runs, writing ideas, and open data needs we will draw on when the
article is actually written. Both the human and the agent edit these files freely — they
are a shared scratchpad, not the published article.

_Last updated: 2026-06-13._

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
| 2 | A coding agent is more than a model | Explain the harness | 🟡 dossier complete, article drafted (in polish) | GitHub Blog | [`article-02-more-than-a-model.md`](./article-02-more-than-a-model.md) |
| 3 | What your IDE sends before you type | Make invisible context visible | 🔵 buildable from existing captures (no new runs) | Personal blog → maybe GitHub Blog | [`article-03-what-your-ide-sends.md`](./article-03-what-your-ide-sends.md) |
| 4 | Can a good AGENTS.md improve quality and reduce cost? | Test a practical developer lever | ⚪ needs new pre-registered experiment (~100 runs) | GitHub Blog (+ MS Learn follow-up) | [`article-04-agents-md.md`](./article-04-agents-md.md) |
| 5 | When is a more expensive model worth it? | Map the cost-quality frontier | ⚪ needs new experiment (~250 runs); some e3 data exists | Personal blog → maybe GitHub Blog | [`article-05-model-cost-quality.md`](./article-05-model-cost-quality.md) |
| 6 | Same model, different harness | Synthesis / competitive capstone | ⚪ depends on Articles 1–5 | Personal blog → possible field adaptation | [`article-06-same-model-different-harness.md`](./article-06-same-model-different-harness.md) |

Status legend: ✅ done/near-done · 🟡 drafted, in polish · 🔵 ready to write from existing data · ⚪ needs new work.

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
`sqlite3 session.db < docs/content-lab/data/db/runs.sql`.

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
