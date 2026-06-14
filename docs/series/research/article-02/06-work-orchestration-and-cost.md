# Work orchestration & the cost gap

> Supporting research for [`article-02-more-than-a-model.md`](../../article-02-more-than-a-model.md).
> This is a shared human/agent scratchpad, not published copy.

**Capture.** 40-run repeatability batch (n=20 per harness) + structural tool catalogs, 2026-06.
**Model.** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`), temperature 1.
**Repo / prompt.** `octodemo/octocat_supply`; repo-explainer task; BARE+TRIM conditions, MCP off.
**Source captures.** `repeatability-40run/captures.jsonl`; in-git aggregates
`docs/content-lab/data/db/runs.jsonl`; orchestration tools from `harness-data-FINAL.md` §1.7.

---

## One-line thesis

Same model, same task, **near-identical work and quality** — but Claude CLI makes **3.6× the
requests** and costs **2.8× as much** as Copilot CLI. The cost gap lives in the **loop the
harness runs**, not in the model and not in the amount of useful work done.

## The headline batch (Direct evidence, n=20 each)

Clean BARE+TRIM runs, MCP off, recomputed from `runs.jsonl`:

| Metric | CO-CLI | CL-CLI | Ratio CL / CO |
|---|---:|---:|---:|
| Requests per task (model calls) | **4.50** | **16.40** | **3.64×** |
| Tool calls per task | 13.90 | 12.90 | 0.93× |
| Quality score (rubric) | 15.57 | 15.09 | 0.97× |
| **Cost per task (token-normalized USD)** | **$0.1299** | **$0.3595** | **2.77×** |

The two numbers that *don't* move are the telling ones: **tool calls (13.9 vs 12.9) and
quality (15.6 vs 15.1) are within ~7%.** Both agents do roughly the same amount of real
work and produce roughly equal output. What differs is how many model round-trips each
harness spends to get there.

> Cost label: these dollars are **token-normalized** (modelled from a pricing table) for
> like-for-like efficiency comparison. They are **not** actual spend. The one place we have
> real billing is Copilot CLI's native credits (dossier 01: 16.296 credits / $0.163 for the
> structural run). Claude exposes no native billing.

## Reading the gap

- **3.64× requests, ~1× tool calls** ⇒ Claude CLI does **more model turns per unit of tool
  work** — a chattier loop (plan/observe/decide steps between actions), not more actions.
- **2.77× cost despite equal output** ⇒ the spend is **loop overhead**, paid on the
  standing prefix (dossier 01) every extra turn. A heavier prefix × more turns compounds.
- This is the article's strongest "more than a model" exhibit: hold the weights and the task
  fixed, and the **harness's control loop** alone nearly triples the bill.

## Orchestration surfaces — why the loops differ (Direct evidence)

Tool names seen directly in captures (§1.7):

| Capability | CO-CLI | CL-CLI | CO-IDE |
|---|---|---|---|
| Sub-agents | `task` | `Agent` | `runSubagent` |
| Task mgmt | `read_agent`, `list_agents` | `TaskCreate/Get/List/Output/Stop/Update` | (within roster) |
| Scheduling | — | `CronCreate/Delete/List`, `ScheduleWakeup` | — |
| Planning | `report_intent` | `EnterPlanMode/ExitPlanMode` | — |
| Worktree | app-managed | `EnterWorktree/ExitWorktree` | — |
| Monitoring | — | `Monitor`, `PushNotification`, `RemoteTrigger` | — |
| Roster model | dynamic manager | dynamic fleet | **fixed roster of named agents** |

- **Claude CLI exposes the richest orchestration surface** (cron, worktree, monitor, explicit
  plan-mode) — consistent with a chattier, more deliberate loop.
- **Copilot CLI is a lean manager**: a single `task` tool + `report_intent`.
- **VS Code uses a curated fixed roster** of named agents (semi-hidden delegation).
- All four **encourage parallel tool calls** — so the request-count gap isn't about
  batching, it's about turn structure.

## UX consequences (Inference)

1. Claude CLI's extra turns likely buy **more visible deliberation / planning steps**; the
   rubric says the *end product* is about equal here, so on this task the extra turns are
   largely overhead.
2. On harder, more open-ended tasks the richer orchestration could pay off — this batch is
   one task type and shouldn't be over-generalized to "Copilot is cheaper, full stop."
3. For cost-sensitive, well-scoped tasks, the lean-loop harness is the efficiency pick;
   for sprawling autonomous work, the richer loop may justify its turns.

## Notable quirks / tells

- Tool-call count being *lower* for the pricier harness rules out "it just did more work."
  The driver is request count × prefix size.
- Quality scores are close enough (15.57 vs 15.09) that the article should **not** claim a
  quality winner — only an efficiency difference.

## Open data gaps

- One task type (repo-explainer). Cost ratios on coding/refactor tasks are unmeasured and
  could differ.
- Token-normalized cost relies on a fixed pricing table; a Claude native-billing capture
  would remove the modelling caveat.
- "Why" Claude takes 3.6× turns (plan steps? re-reads? self-checks?) is inferred from the
  orchestration surface, not from a per-turn classification of the transcripts.
