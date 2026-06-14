# Tooling profile — Claude CLI / Claude Agent SDK (headless)

> Supporting research for [`article-03-what-your-ide-sends.md`](../../article-03-what-your-ide-sends.md).
> This is a shared human/agent scratchpad, not published copy.
> Companion to [`harness-profile-claude-cli.md`](./harness-profile-claude-cli.md):
> that file profiles the **system prompt**; this one profiles the **tool / skill /
> sub-agent surface** sent over the wire.

**Capture.** Same baseline run as the system-prompt profile, captured via relay on 2026-06-09.
**Model.** Claude Sonnet 4.5 (`claude-sonnet-4-5`). SDK version v2.1.170 (`sdk-cli`),
cross-checked against v2.1.173 relay (`…-073.json`) and the v2.1.112 baseline (`capture-006.json`).
**Repo / prompt.** `octodemo/octocat_supply`; fixed task *"Explain this repository to a
new developer: purpose, components, data flow, install/run/test."*
**Source capture.** `structural-prefix/claude/digest.json` (`prefix.representative.topTools`,
`skills`) reconciled with relay body `…-073.json` (27 full tool schemas read verbatim) and
`matched-pair-baseline/capture-006.json` (v2.1.112, schema-level reads). Raw captures live
outside git at `~/copilot-ledger-data/captures/`.
**Tool surface size.** 27 native tools; tool definitions ≈18,877 shape tokens =
**69.4%** of the ~27,217-token request prefix — the heaviest tool budget in the corpus.
**Token divisor.** Shape-token counts use **chars/4** (dossier convention); the published
Article 3 uses **chars/3.7**, so figures here run ~7% low — normalize before quoting.
*(Convention note, not a measurement.)*

All quotes below are **direct evidence** from the captured tool schemas. Predicted
behaviors are labelled **Inference** and would need N=10/condition runs before any
ranking claim.

---

## One-line thesis

A **heavyweight workstation that ships its playbooks inside the tools**: schemas aren't
just parameter specs, they're embedded prose manuals (git protocol, cache economics,
planning gates) — and the surface is built for ambitious, multi-agent, schedulable work,
paid for with the biggest tool-def budget of the three.

## Top design decisions

- **Tools carry manuals, not just parameters.** `Bash` is **3,010 tok** — the single
  heaviest schema anywhere — because it embeds a full git-commit/PR workflow (HEREDOC
  template + a 10-point Git Safety Protocol). The schema *is* a playbook.
- **Pay for breadth up front.** 27 flat, always-on schemas, no deferral. The bet runs
  opposite to Copilot CLI: load everything, every turn, and accept a 69.4% tool budget.
- **Skills preloaded, not lazy.** A **13-skill catalog (~1,094 tok)** is injected
  unconditionally into the first user message as a `<system-reminder>` — the model knows
  every slash-command before it reads the request. The `Skill` tool is only a dispatcher
  (*"Never guess or invent a skill name from training data"*).
- **A planning gate baked into a tool.** `EnterPlanMode` (1,041 tok) / `ExitPlanMode`
  (615) turn "think before you build" into an explicit approval checkpoint —
  *"If you would use AskUserQuestion to clarify the approach, use EnterPlanMode instead."*
- **Todo list → task graph.** v2.1.112's single `TodoWrite` became **four** tools
  (`TaskCreate`/`TaskGet`/`TaskList`/`TaskUpdate`) with an `owner` field and
  `blocks`/`blockedBy` edges — a DAG queue built for multi-agent coordination.
- **Ambition beyond coding.** Scheduling (`CronCreate`/`CronList`/`CronDelete`,
  `ScheduleWakeup`), worktree isolation (`EnterWorktree`/`ExitWorktree`), attention
  (`PushNotification`), and remote triggers ship in the baseline set.
- **Search consolidated into the shell.** v2.1.170 **removed** standalone `Glob`/`Grep`;
  search now runs through `Bash` (`find`/`rg`). Schema budget was redirected toward the
  Task graph and Agent tooling. *(Direct evidence, version delta.)*
- **Infra knowledge encoded in a schema.** `ScheduleWakeup` literally teaches the model
  the **5-minute prompt-cache TTL** so it picks wake intervals that stay cache-warm.

## The catalog at a glance (27 tools, top weights)

| Group | Tools | Notable weight |
|---|---|---|
| Shell | `Bash` (**3,010**), `Monitor` (1,525) | embedded git/PR playbook |
| Sub-agents | `Agent` (2,092) | named-type dispatch + `isolation: worktree` |
| Plan gate | `EnterPlanMode` (1,041), `ExitPlanMode` (615) | approval checkpoint |
| Task graph | `TaskUpdate` (837), `TaskCreate` (682), `TaskGet`, `TaskList` | owner + dependency edges |
| Scheduling | `CronCreate` (891), `ScheduleWakeup` (903), `CronDelete`, `CronList` | cache-TTL guidance |
| Worktrees | `EnterWorktree` (915), `ExitWorktree` (604) | fs isolation |
| File ops | `Read` (632), `Edit` (413), `Write` (243), `NotebookEdit` (366) | no standalone Glob/Grep |
| Interaction | `AskUserQuestion` (970), `PushNotification` (374), `RemoteTrigger` (232) | structured Q&A |
| Web | `WebFetch` (451), `WebSearch` (449) | mandatory "Sources:" section |
| Skill / bg tasks | `Skill` (412), `TaskOutput` (373, **deprecated**), `TaskStop` (122) | dispatcher |

Prefix split: system 7,015 (25.8%) · tools 18,877 (**69.4%**) · first messages
(skills+context+query) 1,325 (4.9%). *(Direct evidence, `prefix.representative`.)*

## Sub-agent roster (inside the `Agent` schema)

4 named types (Direct evidence, `…-073.json:20`): **Explore** (read-only fast research,
thoroughness levels), **general-purpose** (`*`, the default), **Plan** (architect; no
write tools), **statusline-setup** (Read+Edit only). The schema notes types are *"resolved
from … the same registry as the Agent tool,"* implying user-defined CLAUDE.md subagents
list alongside built-ins. *(Inference.)*

## Skills roster (13, preloaded)

`update-config`, `keybindings-help`, `verify`, `code-review`, `simplify`,
`fewer-permission-prompts`, `loop`, `schedule`, `claude-api`, `run`, `init`, `review`,
`security-review`. v2.1.112 had 10; v2.1.170 added `verify`/`code-review`/`run` and
renamed `less-` → `fewer-permission-prompts`. *(Direct evidence, system-reminder delta.)*

## Memory & state

**No dedicated memory/state tool ships in the 27-tool wire array** *(Direct evidence:
absence — there is no `memory`, `store_memory`, or `session_store_sql` in the captured
schemas).* State is handled three other ways instead:

| Surface | Scope | Mechanism | Cold-prefix cost |
|---|---|---|---|
| Task graph (`TaskCreate`/`TaskGet`/`TaskList`/`TaskUpdate`) | **Per-session** | in-session DAG with `owner` + `blocks`/`blockedBy` edges | `TaskUpdate` 837 + `TaskCreate` 682 (Get/List not separately measured) |
| `CronCreate` jobs | **Per-session** | *"session-only; auto-expires after 7 days"* | 891 tok |
| `CLAUDE.md` project / user files | Cross-session (file-based) | read at startup; **not a wire tool in this capture** | not separately observable |

- **The persistence story is files, not a tool.** Durable cross-session memory in Claude
  Code is `CLAUDE.md` (project) / `~/.claude` (user) markdown the harness reads at launch —
  none of which appears as a callable tool in this request prefix, so its token cost here is
  **not separately observable**. *(Inference from product design; the wire shows only the
  absence of a memory tool.)*
- **Explicit refusals.** None observed in the 27 schemas — the brief's "re-read code
  patterns/architecture" refusal example was **not present** in this capture.
- **UX consequence (Inference).** Within a session the model has a rich, owned task DAG; but
  "what did I do last week?" has no built-in wire answer — it depends on whatever the user
  committed to `CLAUDE.md`.

## Version stability

Second data point: **v2.1.112** (`matched-pair-baseline/capture-006.json`, 26 tools, schemas
read verbatim) vs the **v2.1.170/173 baseline** (27 tools). Same model, flat delivery both
times.

| Dimension | v2.1.112 | v2.1.170/173 |
|---|---|---|
| Tool count | **26** | **27** |
| Delivery | flat, all eager, skills preloaded | flat, all eager, skills preloaded |
| Search | standalone `Glob` + `Grep` | **removed** — folded into `Bash` (`find`/`rg`) |
| Todo / tasks | single `TodoWrite` | **task graph**: `TaskCreate`/`TaskGet`/`TaskList`/`TaskUpdate` |
| Skills | 10 | 13 (+`verify`/`code-review`/`run`; `less-`→`fewer-permission-prompts`) |

- **Philosophy stable, composition actively traded.** Delivery never changed (flat, eager,
  preloaded skills), but the surface was *re-budgeted* between versions: −`Glob`/`Grep`,
  −`TodoWrite`, +4-tool task graph, +3 skills. The engineer is moving schema budget between
  features, not changing the delivery bet. *(Direct evidence, both captures.)*
- v2.1.112's total tool-token budget was **not re-summed** under chars/4 (per-tool
  `approxTokens` are present in the capture); the v2.1.170 total is 18,877.

## UX consequences (Inference)

1. **The agent commits like a senior.** A 3,010-tok `Bash` playbook means git/PR hygiene
   (safety protocol, HEREDOC messages) is enforced by the tool, not left to the model.
2. **Plan-then-build is structural.** A dedicated plan-mode gate makes "show me the plan
   first" the norm on non-trivial work, not a prompt-engineering trick.
3. **Built for fleets.** Owner + dependency edges + worktree isolation + cron + wakeup
   add up to a surface designed for parallel, scheduled, multi-agent runs.
4. **Highest fixed cost per turn.** 69.4% of the prefix is tools before a word is typed —
   the richest surface, but also the heaviest baseline tax.

## Notable quirks / tells

- `TaskOutput` ships **DEPRECATED** in its own schema — surface evolving faster than it's
  pruned.
- `ScheduleWakeup` encoding the Anthropic cache TTL is the clearest case of
  infrastructure economics leaking into a tool description.
- Removing `Glob`/`Grep` while adding a Task graph shows schema budget being actively
  *traded* between features across versions.

## Open data gaps

- v2.1.112 total tool-token budget not re-summed under the chars/4 convention.
- `CLAUDE.md` memory cost is off-wire — **not separately observable** from this prefix.
- `TaskGet`/`TaskList` per-tool weights are estimates, not measured (**unavailable** as
  Direct evidence).
- Sub-agent registry extensibility (user `CLAUDE.md` subagents listed alongside built-ins) is
  Inference from schema wording, not observed.
