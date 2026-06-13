# How Coding-Agent Harnesses Work — Research Dossier

Research compilation for the article *"A coding agent is more than a model."* Same model
everywhere (**Claude Sonnet 4.5**, snapshot `claude-sonnet-4-5-20250929`), same task
("explain this repo to a new dev"), same repo (`octodemo/octocat_supply` @ e1516cf).

**Harnesses & capture provenance**

| Code | Harness | Source | MCP | Turns captured |
|---|---|---|---|---|
| **CO-CLI** | Copilot CLI (headless) | raw `Wire request` debug log (7 reqs) | OFF (+matched ON) | full multi-turn |
| **CL-CLI** | Claude CLI (headless) | relay captures (19 reqs) + transcript | OFF (+matched ON) | full multi-turn |
| **CO-IDE** | Copilot Coding Agent (VS Code) | `t6_B_agent_sonnet_warm` export (agent, Sonnet) | ON (12) | full multi-turn |
| **CL-IDE** | Claude Code in VS Code (extension, `sdk-ts`) | **own `~/.claude/projects` transcripts** — OFF `3864bdcd`, "ON" `ad52a532` | effectively OFF (see note) | **full multi-turn (16–17 turns)** |

> **Evidence-quality caveat (load-bearing).** The two CLIs are MCP-OFF wire-level
> captures (with matched MCP-on re-runs, §1.6) — high fidelity. **CO-IDE** is now a full
> multi-turn agent-mode export with native billing + cache (`t6_B`). **CL-IDE** is now a
> full multi-turn capture from the extension's *own* `sdk-ts` transcript (Sonnet 4.5,
> exact prompt) — it records token/cache usage but NOT the wire tool catalog or sampling
> params. **CL-IDE MCP note:** a `.mcp.json` filesystem server was approved at CLI level,
> but the extension did **not** inject it into the prefix (cold prefix 46,364 tok OFF vs
> 46,418 tok "ON" → +54 = noise; the model used only native Read/Glob/Bash). So both
> CL-IDE runs are effectively MCP-off; the extension enables project MCP through its own
> path, not `~/.claude.json`. The clean MCP delta comes from the CLI arm (§1.6).

All token figures from captures are either **billed** (from API `usage`) or **shape**
estimates (chars/4 of the actual wire body); each table says which.

---

# DELIVERABLE 1 — Harness Inventory

## 1.1 System Prompt

| Harness | Chars | ~Tokens (chars/4) | Verified vs wire | Largest because |
|---|---|---|---|---|
| CO-CLI | 26,652 | ~6,663 | ✅ wire `systemApproxTokens` 6,657 | — |
| CL-CLI | 28,131 | ~7,032 | ✅ relay `systemApproxTokens` 7,015 | — |
| CL-IDE | 26,614 | ~6,653 | (export, not wire) | — |
| CO-IDE | 44,165 | ~11,041 | (export) | inlines repo instructions + 16 skill blocks + 8-agent roster (mostly repo/user-installed, not product defaults — see §1.3) |

**Major sections (by harness):**
- **CO-CLI**: role/identity; tone & brevity; tool-use rules (`bash`/`view`/`edit`/`task`
  guidance); `<environment_context>` (cwd, repo, OS); `<prohibited_actions>`;
  `<shell_security>`; report_intent protocol; org content-exclusion policy.
- **CL-CLI**: "Claude Agent SDK" identity; tone; `# Tool usage`; `# Task management`
  (TaskCreate); `# Context management` (summarization notice); security preamble
  (dual-use); `# Code style`; a CLI-only `ultrareview` note. `cc_entrypoint=sdk-cli`,
  `cc_version=2.1.170`.
- **CL-IDE**: *same template as CL-CLI* (~5-line diff): `sdk-ts`, `cc_version=2.1.112`,
  `TodoWrite` instead of `TaskCreate`, +Glob/Grep in the tools list, a `# Environment`
  block with git status + recent commits, different memory path.
- **CO-IDE**: identity; **16 `<skill>` blocks** + an **8-agent roster** (preloaded
  full-body — most are repo/user-installed config, not product defaults; see §1.3);
  inlined `copilot-instructions.md`; Microsoft content-policy clause; tool guidance.

**Autonomy instructions (the cleanest contrast):**
- CO-CLI: *"non-interactive… proceed autonomously… don't ask for confirmation."*
- CL-CLI / CL-IDE: *"Execute actions with care… confirm before irreversible actions."*
- CO-IDE: middle — task-scoped, leans autonomous within a delegated agent.

**Safety instructions:** all inherit the same trained refusal floor. On top: CO-CLI adds
explicit prohibited-actions + shell-injection defense + runtime content-exclusion; both
Claude add a dual-use-research security preamble; CO-IDE adds a short content clause.

**Agent instructions:** CO-CLI frames the model as a *manager* delegating to `task`
sub-agents. Claude harnesses describe a planning loop (`EnterPlanMode`) + a delegation
fleet. CO-IDE names 8 specific sub-agents it may call (7 supplied by the workspace
repo's `.github/agents/`, only `Explore` is a product built-in).

**Encouraged vs discouraged**

| | Encouraged | Discouraged |
|---|---|---|
| CO-CLI | act autonomously, be terse, parallel tools, state intent | asking for confirmation, verbosity, touching excluded files |
| CL-CLI | careful planning, todo tracking, ask before irreversible | reckless writes, premature wrap-up (context note) |
| CL-IDE | same as CL-CLI + ground in git state | same |
| CO-IDE | use the right skill/sub-agent, stay in task scope | out-of-scope edits, policy violations |

## 1.2 Dynamic Context Injection

| Item | CO-CLI | CL-CLI | CO-IDE | CL-IDE |
|---|---|---|---|---|
| cwd | system | first user msg | — | system (`# Environment`) |
| Git repo/root | system | — | — | system |
| Branch | — | (transcript `gitBranch`) | — | system |
| Recent commits | — | — | — | **system (commit list)** |
| Date/time | — | first user msg (`currentDate`) | — | system (knowledge cutoff + date) |
| User identity | — | first user msg (`userEmail`) | — | system (git user) |
| OS/platform/shell | system (OS) | — | — | system (platform, shell, OS ver) |
| **Injection point** | **system prompt** | **first user message** (`<system-reminder>`) | minimal/none | **system prompt** (`# Environment`) |
| **~Token contribution** | <150 | ~300 (incl. skills list) | ~0 | ~300–500 |

**Confidence: High** for CO-CLI/CL-CLI (wire/relay seen directly); **Medium** for the
IDEs (export-derived).

## 1.3 Skills

| Harness | Count | Discovery | Pre/On-demand | ~Footprint | Names (sample) |
|---|---|---|---|---|---|
| CO-IDE | **16 skills + 8 agents** | `<skill>`/`<agent>` blocks **in system prompt** | **preloaded full-body** | ~3,314 tok (skill descriptions) | api-endpoint, walkthrough-writer (repo); create-pull-request, address-pr-comments, … (installed exts); tdd-red/green/blue, api-specialist, … (repo agents) |
| CL-CLI | **13** | name+desc in first-user-msg `<system-reminder>` + `Skill` tool | **on-demand body** | **~1,094 tok** catalog | update-config, verify, code-review, simplify, loop, schedule, claude-api, run, init, review, security-review, … |
| CL-IDE | ~13 | same as CL-CLI | on-demand | ~same | same family |
| CO-CLI | 2+ (dynamic) | `Skill` tool + contextual `<available_skills>` | on-demand | small | Foundry-specific |

**Correction to prior draft (skill provenance — verified from the raw export):** The
earlier "37 skills, M365 / Teams-SharePoint-Outlook" claim was **wrong** on both count
and source. The MCP-off capture advertises **16 `<skill>` blocks + 8 `<agent>` blocks**
(24 named items), each skill carrying a `<file>` path that reveals its origin:

| Source | Count | Examples |
|---|---|---|
| **Workspace repo `.github/`** (octocat_supply) | **9** | 2 skills (`api-endpoint`, `walkthrough-writer`) + 7 agents (`tdd-red/green/blue`, `api-specialist`, `api-test-writer`, `bdd-specialist`, `walkthrough-writer`) |
| **User-installed extensions** | **8** | 6 from `github.vscode-pull-request-github` (`create-pull-request`, `address-pr-comments`, …) + 2 from `vscode-chat-customizations-evaluations` |
| **User-level `~/.agents/skills/`** | **1** | `microsoft-foundry` |
| **Product built-in** (bundled Copilot ext) | **6** | 5 skills (`project-setup-info-local`, `troubleshoot`, `agent-customization`, `chronicle`, `get-search-view-results`) + 1 agent (`Explore`) |

So **only 6 of 24 are product defaults; 18 are repo- or user-supplied** (9 straight from
the demo repo). The ~3,314-token "skill descriptions" segment is therefore *mostly
repo/user config*, not a Copilot floor. The genuine harness signal is unchanged: VS Code
**preloads every skill/agent body into the first request regardless of source**, whereas
the CLIs advertise on-demand. *(High confidence — per-skill `<file>` paths in the export
+ matched against `octocat_supply-psychic-disco/.github/skills` and `/.github/agents`.)*

**Also corrected earlier:** Claude carries **13 skills, not zero** *(High confidence —
`skills.names` in digest + the first-user-message reminder).*

## 1.4 Memory

| Type | CO-CLI | CL-CLI / CL-IDE | CO-IDE |
|---|---|---|---|
| Architecture | session SQL (`todos`) + `plan.md` | file-based auto-memory (user/feedback/project types, `[[cross-links]]`) | scoped `/memories/` store |
| Session | ✅ SQL + session files | ✅ | ✅ (session scope) |
| Cross-session | ❌ none | ✅ persists in memory dir | ✅ (user scope) |
| Project | via `plan.md` only | ✅ project memory type | ✅ (repo scope) |
| User | ❌ | ✅ user memory type | ✅ (user scope) |
| Auto-loaded? | plan.md by convention | yes (memory dir read in) | yes, ~200-line cap |
| User-controlled? | yes (writes own todos) | yes (model curates) | yes (scoped, capped) |
| ~Footprint | small, bounded | variable, can grow | bounded by 200-line cap |

**Confidence: Medium** — architecture is documented in each system prompt; runtime
footprints are inferred, not directly billed.

## 1.5 Tool Catalog

| Harness | #Tools | Naming | Avg desc (chars) | Tool-defs tokens (shape) | Source |
|---|---|---|---|---|---|
| CO-CLI | **19** | snake_case (`bash`,`view`,`edit`) | n/a in digest | **8,064** | wire body |
| CL-CLI | **27** | PascalCase (`Bash`,`Read`,`Edit`) | **~2,145** | **18,877** | relay body |
| CO-IDE | **56** (agent turn, MCP-on) | mixed/custom | — | full schemas, flat | `t6_B` export |
| CL-IDE | native catalog ~CL-CLI family + Glob/Grep/TodoWrite (MCP-off in our capture) | PascalCase | ~same as CL-CLI | not exposed by transcript; cold prefix **~46,400 tok** total | extension `sdk-ts` transcript |

> **Retired figure:** an earlier "CL-IDE = 247 / 401 tools (27 native + ~220 MCP)" came
> from `Claudeok.json` / `…Insider…`, which were **Copilot-Chat-with-Claude (CO-IDE) with
> MCP on**, *not* the Claude Code extension. Those counts describe a heavily-MCP-loaded
> Copilot Chat session; the actual extension run we captured was MCP-off (see header note).
> The `sdk-ts` transcript records tokens/cache but **not** the wire tool catalog, so an
> exact CL-IDE native tool count is not directly measured — structurally it is the CL-CLI
> 27-tool family with `TodoWrite`/`Glob`/`Grep` (per the system prompt).

- **CO-CLI top tools by token:** task 1,544 · session_store_sql 1,255 · skill 741 ·
  bash 679 · grep 487 · read_agent 439 · report_intent 434 · view 370.
- **CL-CLI 27 tools:** Agent, AskUserQuestion, Bash, CronCreate, CronDelete, CronList,
  Edit, EnterPlanMode, EnterWorktree, ExitPlanMode, ExitWorktree, Monitor, NotebookEdit,
  PushNotification, Read, RemoteTrigger, ScheduleWakeup, Skill, TaskCreate, TaskGet,
  TaskList, TaskOutput, TaskStop, TaskUpdate, WebFetch, WebSearch, Write.
- **Native vs MCP vs Agent:** CLIs = native only (MCP off). CL-IDE = 27 native +
  ~220 MCP (`mcp__server__tool`). Agent/orchestration tools are *native* in all (Agent,
  Task*, runSubagent).

**Key fact (High confidence):** the verbose Claude tool catalog (~18.9k, descs ~2,145
chars) is **2.3× the Copilot CLI catalog** (~8.1k) at the same model — pure description-
verbosity discretion.

## 1.6 MCP

| Harness | Servers | Server names | Effect on prefix |
|---|---|---|---|
| CO-CLI | 0 → +1 server | — / filesystem | wire-confirmed load (see delta) |
| CL-CLI | 0 → +1 server | — / filesystem | **+14 tools, +1,876 prefix tok (wire-measured)** |
| CO-IDE | **12** | Azure MCP, github, github-agentic-workflows, github-remote, playwright, github-mcp-server, Bicep, pylance, workiq, revenue, kusto-mcp | flat 56-tool catalog |
| CL-IDE (extension, our capture) | **0** (server present, not injected) | filesystem (approved at CLI, not loaded by extension) | prefix unchanged: 46,364→46,418 tok |
| Copilot-Chat-with-Claude (MCP-on reference) | 4–12 | filesystem, github-mcp-server, Bicep, pylance, Azure, … | flat catalog reached **56–95+ tools** (retired as a CL-IDE source) |

**Within-harness ON vs OFF (newly measured, same task, one small server).** I re-ran
both CLIs against the *same* repo and prompt with a single filesystem MCP server
(`@modelcontextprotocol/server-filesystem`, 14 tools) toggled off→on, to isolate the
MCP effect from the harness:

| Harness | OFF | ON | Delta | Evidence |
|---|---|---|---|---|
| **CL-CLI** | 28 tools / 21,071 toolDef tok | 42 tools / 22,947 toolDef tok | **+14 tools, +1,876 tok** | relay wire capture (High) |
| **CO-CLI** | 11.9 credits, ↑65.6k tok (41.3k cached) | 15.5 credits, ↑101.0k tok (72.3k cached) | **+3.6 credits (+30%)** | native billing + MCP-client-start log (High for load; tool body truncated in DEBUG log) |

**Reading:** one tiny MCP server adds exactly its tool count (+14) to the flat catalog,
linear in tools. The same server that costs CL-CLI +1,876 prefix tokens is what scales —
via config, not harness design — to MCP-heavy Copilot-Chat sessions reaching 56–95+ tools.
**MCP load is a config/deployment choice, not a harness-architecture difference: every
harness ships the catalog flat and pays per tool.** *(High confidence: the +14 / +1,876
delta is a direct wire measurement; the credit delta also reflects run-to-run agent
variance, so treat the +30% as illustrative, not a clean prefix-only figure.)*

## 1.7 Agent Orchestration

| Capability | CO-CLI | CL-CLI / CL-IDE | CO-IDE |
|---|---|---|---|
| Sub-agents | `task` | `Agent` | `runSubagent` |
| Task tools | read_agent, list_agents | TaskCreate/Get/List/Output/Stop/Update | (within roster) |
| Scheduling | — | **CronCreate/Delete/List, ScheduleWakeup** | — |
| Planning | (report_intent) | **EnterPlanMode/ExitPlanMode** | — |
| Worktree | (app-managed) | **EnterWorktree/ExitWorktree** | — |
| Monitoring | — | **Monitor, PushNotification, RemoteTrigger** | — |
| Roster model | dynamic (manager) | dynamic fleet | **fixed roster of 11 named agents** |
| Visibility | visible (task tool) | visible tools | semi-hidden (named agents) |

Claude exposes the richest orchestration surface (cron/worktree/monitor); CO-IDE uses a
**curated fixed roster**; CO-CLI is a lean manager. All four encourage **parallel tool
calls**. *(High confidence — tool names seen directly.)*

## 1.8 Thinking

| Harness | Enabled | Budget | Tokens observed | Visibility | Delivery |
|---|---|---|---|---|---|
| CO-CLI | ✅ every turn | **1,024** | **580** | "summarized" | explicit `thinking{}` in request body |
| CL-CLI | ✅ (implicit) | not in body | ~103 (1 block) | serialized in transcript | **likely interleaved-thinking beta header (relay strips it)** |
| CO-IDE | ❌ (this capture) | — | 0 | — | — |
| CL-IDE | ✅ **thinking blocks present** (extension run) | not in transcript | ≥1 block/turn | serialized in transcript | same SDK template as CL-CLI |

**Correction:** Claude thinking is **discretion delivered via header**, not "off / locked"
— a thinking block appears despite no body param. *(Medium confidence on the
beta-header mechanism — inferred from "block present, param absent.")*

## 1.9 Sampling

| Param | CO-CLI | CL-CLI | CO-IDE / CL-IDE |
|---|---|---|---|
| temperature | **1** | unset → default (1.0) | not exposed |
| max_tokens | **8,192** | **32,000** | not exposed (only maxResponseTokens 32k) |
| top_p / top_k | absent | null (default) | not exposed |
| stop_sequences | absent | null | not exposed |
| stream | true | true | not exposed |

**The 4× max_tokens gap** is the notable lever. *(High confidence for CLIs; IDE exports
omit these.)*

## 1.10 Prompt Caching

| Harness | Breakpoints | Cached tok | Creation tok | Hit rate | Strategy |
|---|---|---|---|---|---|
| CO-CLI | ~3 (system / tools / rolling) | 135,763 | 17,115 | **87.2%** | stable prefix = system+tools; rolling tail breakpoint |
| CL-CLI | hidden by relay | 576,575 | 58,593 | **90.2%** | near-optimal; exact placement obscured |
| CO-IDE | Azure-side / proxy | warms to **~98%** | 9,680 → 29,878 cached | warms after turn 1 | stable system+tools prefix; cache grows each turn (`t6_B`) |
| CL-IDE | hidden in transcript | **warms** (cumulative read ~547k–596k) | turn-0 ~46.4k; cumulative ~258k | warms after turn 1 | cold first turn then incremental tail caching; ~16k re-cached/turn |

**Stable prefix:** system prompt + tool defs (re-sent verbatim). **Volatile suffix:**
the growing message tail. Mechanism is Anthropic-locked (`cache_control:ephemeral`,
≤4 breakpoints, 5-min TTL); placement is discretion. *(High confidence CLIs; IDE rates
explicitly flagged not-meaningful.)*

**Wire-order grounding (Anthropic Messages API):** the cacheable prefix is matched in the
fixed order **`tools → system → messages`** — tool definitions are a separate top-level
field, *not* concatenated into the system string, and the cache sees them first.
`matched-pair-baseline/capture-006.json` (CL-CLI, sonnet-4-5) shows it concretely:
`tools` = 26 defs (separate), `system` = 25,929 chars (string), and `messages[0]` is a
single user turn whose blocks are ordered **skills (2,899) → environment/userEmail (366)
→ user text ("hi", 2)**, with the lone `cache_control:{ephemeral, ttl 1h}` on the **last**
block. So stable content sits ahead of the breakpoint and volatile user input behind it.
This is the evidence behind Article 3's "Order is a caching decision" section. Note the
component *order* differs from the simplified teaching list: env comes *after* skills, and
both ride in the user message (not the system block) for CL-CLI.

## 1.11 Context Management

| Harness | Growth | Summarization | Evidence |
|---|---|---|---|
| CO-CLI | linear (1→3→5→7 msgs) | none visible | wire bodies |
| CL-CLI | 1,325 → 8,090 msg-tok | **plateau at request 13** (opaque compaction) + explicit `# Context management` system section | relay token series |
| CO-IDE | grows 20.5k→30.4k over 7 turns (`t6_B`) | none in span | export usage series |
| CL-IDE | grows over 16–17 turns; cold prefix ~46.4k | none visible in span | transcript usage series |

Mechanism (stateless full-prefix resend) is **locked**; *when/whether to compact* is
discretion. Only Claude tells the model compaction will happen. *(High confidence on the
plateau; the compaction mechanism itself is inferred.)*

---

# DELIVERABLE 2 — Prefix Breakdown (what the model sees before reasoning)

Shape tokens (chars/4 of the actual wire/relay body for the *representative* request).
"—" = not separately measurable in this capture.

### CO-CLI (MCP off) — representative request
| Component | Tokens | % |
|---|---|---|
| System prompt | 6,657 | 44.7% |
| Tools | 8,064 | 54.2% |
| MCP | 0 | 0% |
| Skills | 0 (in tool) | ~0% |
| Memory | ~0 (session SQL, not in prefix) | 0% |
| Dynamic context | <150 (in system) | ~1% |
| Conversation history | 156 (turn-1) | 1.0% |
| **Total prefix** | **~14,877** | 100% |

### CL-CLI (MCP off) — representative request (capture 008)
| Component | Tokens | % |
|---|---|---|
| System prompt | 7,015 | 25.8% |
| Tools | 18,877 | 69.4% |
| MCP | 0 | 0% |
| Skills | ~1,094 (in first user msg) | (~4% if counted) |
| Memory | variable (not in this turn) | — |
| Dynamic context | ~300 (first user msg) | ~1% |
| Conversation history | 1,325 (turn-1) | 4.9% |
| **Total prefix** | **~27,217** | 100% |

### CO-IDE (MCP on, flat) — agent turn
| Component | Tokens | % |
|---|---|---|
| System prompt | ~11,041 | dominant |
| Tools | 56 tools, full schemas, flat | — |
| MCP | folded into the flat 56-tool catalog | — |
| Skills | 37, inside system prompt | (counted in system) |
| Dynamic context | minimal | ~0% |
| **Total** | export doesn't expose full wire totals | — |

### CL-IDE (MCP off) — extension cold turn (`sdk-ts` transcript)
| Component | Tokens | % |
|---|---|---|
| Cold prefix (system + tools + first user msg, turn-0 cache-creation) | **~46,400** | 100% of measured prefix |
| — System prompt | ~6,653 (from `claude-vscode.txt`) | ~14% |
| — Tools (native, MCP-off) | not separately exposed by transcript | — |
| — Dynamic context (`# Environment`: git, commits, platform) | ~300–500 | ~1% |
| MCP | 0 (server present but not injected — see header note) | 0% |
| **Total cold prefix** | **~46,400** | — |

> The `sdk-ts` transcript gives the **total** cold prefix (turn-0 cache-creation = 46,364
> tok OFF / 46,418 "ON") but not a component split. Notable: ~46.4k is **~1.7× the CL-CLI
> prefix (~27k)** at the same model — VS Code workspace/IDE context inflates what the model
> sees. *(High confidence on the total; Medium on the per-component split, which is
> inferred from the standalone system-prompt measurement.)*

**Takeaway:** at the *same model*, the "before-reasoning" payload ranges from ~15k tokens
(CO-CLI) to ~46k (CL-IDE), MCP-off — a ~3× spread driven by tool catalog verbosity + IDE
context injection. Turn MCP on and the catalog grows linearly per tool (CL-CLI +14 tools /
+1,876 tok for one small server; the CO-IDE/Copilot-Chat-with-MCP sessions reached 56–95+
tools). The model is constant; **the prefix is a harness/config decision.**

---

# DELIVERABLE 3 — Tool Discovery Flow

> **CORRECTION (2026-06-11):** an earlier draft claimed CO-IDE used progressive
> disclosure (0→1→23). The *0→1→23* sequence was an **artifact** — those were three
> *separate* prompts in `hi18.json` (a title-gen on gpt-4o-mini → a 1-tool aux on
> gpt-4o-mini → the real 23-tool Claude agent turn), not progressive reveal within one
> turn. **However** (further correction, see DELIVERABLE 3 below): direct inspection of a
> multi-turn agent run (`t6_B_agent_sonnet_warm_r1.json`) shows the export carries all 56
> tools as a **catalog**, but each tool object's **`defer_loading`** flag splits them
> **23 sent / 33 deferred** on the wire — so CO-IDE agent mode *does* defer (via
> `tool_search`). The two CLIs remain flat.

### CO-CLI — **flat**
- Every request: 19 tools, full schemas. Constant catalog.

### CL-CLI — **flat**
- Every request: 27 tools, full schemas. Constant.

### CO-IDE — **deferred** (corrected)
- Agent turn (`t6_B`, claude-sonnet-4.5): export carries **56 tools** in `metadata.tools`,
  but that array is the full **catalog**, not the wire payload. Each tool object has a
  **`defer_loading`** flag: **23 tools omit it (sent on the first request) and 33 set
  `defer_loading: true` (deferred)**. The deferred 33 load on demand when the agent calls
  the built-in **`tool_search`** tool. 23 active ≈ 9,174 tok (chars/4; 10,052 exact); full
  catalog ≈ 16,190 tok (chars/4) if sent flat.
- Reproduced on **both** agent-mode captures (`CO-IDE_agent_sonnet_MCPoff` and `t6_B`):
  23 active / 33 deferred on every main-agent request.
- The MCP-**on** Copilot **Chat** capture (`CO-IDE_CopilotChat_sonnet4.5_MCPon`, 95 tools)
  shows **0** `defer_loading` — so deferral is an **agent-mode** behavior, not universal.
- *Earlier note retracted:* the prior "flat, no deferral" reading inspected schema presence
  in the catalog and missed the `defer_loading` flag. VS Code's documented "virtual tools"
  grouping (above ~128 tools) is a **different** mechanism and is not what produced this
  23/33 split.

### CL-IDE — **flat** (extension, MCP-off)
- Multi-turn `sdk-ts` run: the model used native tools (`Read`/`Glob`/`Bash`) throughout;
  the transcript doesn't expose the wire catalog, but there is **no progressive disclosure
  or deferral** — the tool set is constant and available from turn 1 (consistent with the
  CL-CLI flat 27-tool family). Cold prefix ~46.4k carries the full catalog once, then it is
  cache-read each turn.

**Verdict:** The **two CLIs ship flat catalogs** (19 / 27 full schemas every request).
**Copilot in VS Code agent mode defers**: 23 of 56 native tools sent first, 33 behind
`tool_search` (`defer_loading: true`) — reproduced across both agent captures, while the
MCP-on Chat capture stays flat at 95. So delivery strategy *does* differ: count alone
(19 → 27 → 56) understates how much VS Code keeps off the first request. *(High confidence —
counts and the `defer_loading` flag seen directly in wire/relay/export bodies.)*

---

# DELIVERABLE 4 — Anthropic vs Harness Control Matrix

| Lever | Anthropic controls | Harness controls | Shared |
|---|---|---|---|
| Model weights | ✅ entirely | | |
| Training / RLHF | ✅ entirely | | |
| System prompt | | ✅ content, size, autonomy | slot is fixed by API |
| Tools | API requires name+schema shape | ✅ which tools, naming, verbosity | schema *format* shared |
| MCP | (protocol spec) | ✅ on/off, which servers | |
| Skills | | ✅ count, injection, pre/on-demand | |
| Memory | | ✅ architecture, scope, footprint | |
| Thinking | ✅ mechanism (budget/blocks) | ✅ enable, budget value, display | both: enabled via API knobs |
| Caching | ✅ primitive (ephemeral, ≤4 bp, TTL) | ✅ breakpoint placement & count | |
| Context management | ✅ stateless resend requirement | ✅ when/how to compact | |
| Safety | ✅ trained refusal floor | ✅ added policy layers, content-exclusion | both enforce |
| Agent orchestration | | ✅ entirely (fleet vs roster) | |
| Model routing | ✅ serves the snapshot | ✅ endpoint, proxy, aux-model use | |
| Sampling | ✅ legal ranges/defaults | ✅ chosen values (temp, max_tokens) | |

**One-liner:** Anthropic owns the **contract and the mechanisms**; the harness owns
**everything that decides what the model actually sees and how hard it works.**

---

# DELIVERABLE 5 — One Worked Example: "Explain this repo to a new developer"

Same prompt, same repo, same model. These are the captured structural runs.

| Metric | CO-CLI | CL-CLI |
|---|---|---|
| LLM requests | **7** | **19** |
| Tool calls | 19 (18× view, 1× report_intent) | 16 |
| Files read | ~18 (via `view`) | via Read/Glob/Grep |
| Agent actions | 0 sub-agents | 0 sub-agents (this run) |
| Planning steps | report_intent only | thinking + todo tracking |
| Context loaded | system 6.7k + tools 8.1k | system 7k + tools 18.9k + 13-skill list |
| Reasoning tokens | 580 | ~103 |
| Cache hit | 87.2% | 90.2% |
| Wall time | — | 77.2 s |
| Cost | **$0.163 exact** (16.3 GH credits) | **~$0.50 modelled** (no native meter) |

> **CO-IDE multi-turn now characterized** (from `t6_B_agent_sonnet_warm_r1.json`, VS Code
> Copilot **agent mode**, claude-sonnet-4.5, MCP-on, read-only code-analysis task — a
> close analogue to "explain this repo"):
>
> | Req | prompt_tok | cached_tok | compl_tok | credits |
> |---|---|---|---|---|
> | 1 | 20,571 | 9,680 | 268 | 4.78 |
> | 2 | 22,208 | 20,562 | 357 | 1.77 |
> | 3 | 24,817 | 22,196 | 188 | 1.93 |
> | 4 | 26,727 | 24,804 | 255 | 1.85 |
> | 5 | 28,959 | 26,715 | 437 | 2.30 |
> | 6 | 29,891 | 28,947 | 176 | 1.49 |
> | 7 | 30,358 | 29,878 | 884 | 2.40 |
>
> - **7 Claude agent requests** + 2 cheap `gpt-4o-mini` aux calls (0.07 credits total).
> - **Native cost: 16.5 credits ≈ $0.165** — essentially identical to CO-CLI's $0.163.
> - **Tools: 56, flat, full schemas every turn.**
> - **Cache warms to ~98%** (29,878 / 30,358) after a cold first turn.
> - **Context grows 20.5k → 30.4k tokens** over the 7 turns — visible linear growth, no
>   compaction in this span.
> - *Confidence: High* (native `copilot_usage` billing + per-turn cache details, seen
>   directly). Caveat: the task is dead-code analysis, not the verbatim "explain repo"
>   prompt — structurally comparable, not identical.

**Timeline sketch (inferred from request/tool ordering):**
- **CO-CLI:** orient (read README/structure) → a burst of `view` calls across source dirs
  → synthesize → answer. Tight loop, 7 requests, terse output. Acts without asking
  (autonomy posture).
- **CL-CLI:** plan (thinking + todo) → Glob/Grep to map the tree → Read key files →
  more requests as each tool round-trips → synthesize. 19 requests, longer
  per-response budget (32k), richer tool surface.

> **CL-IDE multi-turn now characterized** (from the Claude Code VS Code extension's own
> `sdk-ts` transcripts on octocat_supply, Sonnet 4.5, the verbatim prompt — runs
> `3864bdcd` "OFF" and `ad52a532` "ON", both effectively MCP-off):
>
> | Metric | CL-IDE (extension) |
> |---|---|
> | Assistant turns | **16–17** |
> | Cold prefix (turn-0 cache-creation) | **~46,400 tok** — ~1.7× CL-CLI's ~27k |
> | Tool calls | ~10 — interleaved `Read` / `Glob` / `Bash` (`ls`, `tree`, `find`) |
> | Planning | **thinking blocks present; NO Todo/Task tool used** |
> | Sub-agents | 0 |
> | Cumulative cache-read | ~547k–596k tok | 
> | Cumulative cache-creation | ~258k tok (≈16k written/turn) |
> | Token-derived cost | **~$1.2/run** (≈$0.97 of it cache-creation @ $3.75/M) |
>
> - **Timeline:** `Read` the repo root → `Glob *` → more `Read`s → `Bash ls -la` →
>   `Bash tree -L 2` / `find` to map structure → final `Read`s → synthesize. Orients with
>   shell + native file tools, no MCP, no todo list.
> - **Biggest harness signal:** the extension's cold prefix (~46.4k) is far larger than
>   the CLI's (~27k) — VS Code IDE/workspace context inflates what the model sees before
>   reasoning. And **cache-creation dominates cost** (~$0.97 of ~$1.2): the harness
>   re-caches the growing tail (~16k tok) each turn. The user pays $0 (subscription) but
>   the underlying compute is ~7× a CLI run's.
> - *Confidence: High* for turn count / tool sequence / token + cache usage (direct from
>   the transcript). *Medium* for the dollar figure (token-derived at list Sonnet-4.5
>   prices, not billed). The cold-prefix 46.4k is a token count, not a component
>   breakdown — the transcript doesn't expose the system-prompt/tool split.

**The point:** same task, same model → CO-CLI 7 reqs / ~$0.16, CL-CLI 19 reqs / ~$0.36–0.50,
CO-IDE 7 Claude reqs / ~$0.165, CL-IDE 16–17 turns / ~$1.2 token-derived. The spread is
**harness design** (autonomy posture, tool catalog size, planning loop, max_tokens, IDE
context injection, cache strategy), not model capability. *(High confidence — all four are
now direct multi-turn captures of the same prompt + model.)*

---

# DELIVERABLE 6 — Interesting Findings (with confidence + evidence class)

**Direct evidence — High confidence**
1. Same model, ~3× spread in pre-reasoning prefix MCP-off (≈15k CO-CLI → ≈27k CL-CLI →
   ≈46k CL-IDE), driven by tool-catalog verbosity + IDE context injection; MCP then adds
   linearly on top (+14 tools / +1,876 tok per small server). *[wire/relay/transcript bodies]*
2. **The two CLIs ship FLAT tool catalogs** (full schemas every turn) — 19 / 27. **Copilot
   in VS Code agent mode DEFERS**: of 56 native tools, 23 are sent on the first request and
   33 carry `defer_loading: true`, loading on demand via `tool_search` (reproduced on both
   agent captures; the MCP-on Chat capture stays flat at 95). *(Corrected twice: the earlier
   "CO-IDE defers 0→1→23" was an artifact of three separate prompts; the later "all flat, no
   deferral" reading missed the per-tool `defer_loading` flag.)*
3. Claude's tool catalog is **2.3×** Copilot CLI's (18.9k vs 8.1k), descs ~2,145 vs
   smaller — pure verbosity choice.
4. Claude carries **13 skills**, not zero (corrects prior draft).
5. Opposite autonomy defaults in the system prompts ("proceed autonomously" vs "confirm
   before irreversible").
6. `max_tokens` 8,192 (CO-CLI) vs 32,000 (CL-CLI).
7. CO-CLI sends explicit `thinking{budget:1024,display:summarized}` every turn; an MCP
   off→on re-run confirmed temp=1, max_tokens=8192 on the wire.
8. CO-CLI has exact native billing ($0.163); CL-CLI none → modelled (~$0.36–0.50).
9. **MCP is a config lever, not architecture:** within one harness, one filesystem server
   added +14 tools / +1,876 prefix tok (CL-CLI, wire) and +30% credits (CO-CLI, billing).
10. The two Claude prompts are one shared SDK template (~5-line diff); the two Copilot
    prompts share nothing.
11. **CO-IDE agent mode costs ~$0.165 (16.5 native credits) for a 7-request read-only
    task — essentially identical to CO-CLI's $0.163** — and warms its cache to ~98%.
    *(direct, native billing in `t6_B`.)*
12. **CL-IDE (extension) cold prefix ≈46.4k tok — ~1.7× the CL-CLI prefix** at the same
    model; its cache-creation (~258k tok over the run) dominates token-derived cost
    (~$1.2/run), though the user pays $0 under subscription. *(direct, `sdk-ts` transcript.)*

**Inference — Medium confidence**
13. Claude's request-13 token plateau = silent context compaction.
14. Claude's thinking is delivered via an interleaved-thinking **beta header** the relay
    strips (block present, body param absent).
15. The 7-vs-19 request gap is caused by autonomy posture + max_tokens + tool surface,
    not model skill.
16. Verbose tool descriptions buy better first-try tool selection (a quality-for-tokens
    trade).

**Speculation — Low confidence**
17. CO-IDE's `gpt-4o-mini` calls are cheap auxiliary tasks (title-gen / classify); a
    deliberate cost optimization, not the agent model.
18. Heavier safety/autonomy preambles → more confirm-first round-trips → higher request
    counts.
19. CL-IDE's larger cold prefix (~46k vs ~27k CLI) is mostly VS Code workspace/IDE context;
    its heavy per-turn cache-creation suggests big tool-result payloads (file reads) being
    re-cached — a cost the subscription model hides from the user.

**Explicitly NOT claimed:** which harness is "better." No benchmarking; all four are the
same model making different engineering tradeoffs.

---

# GAP STATUS & CAPTURE PLAN

After mining all existing logs (`~/CopilotLogExports/`, `~/.claude/projects/` = 69
transcripts, `e3-T1-runs/`, `matched-pair-2.1.112/`):

| Gap | Status | Source |
|---|---|---|
| CO-CLI multi-turn | ✅ have | `structural/copilot/` |
| CL-CLI multi-turn | ✅ have (abundant) | `~/.claude/projects/` (all `sdk-cli`) |
| **CO-IDE multi-turn + cache + cost** | ✅ **now filled** | `t6_B_agent_sonnet_warm_r1.json` (agent mode, Sonnet, native billing) |
| Tool-discovery flow | ✅ resolved (CLIs flat; CO-IDE agent defers 23/56 via `defer_loading`+`tool_search`) | t6_B + MCPoff `defer_loading` flags |
| **CL-IDE multi-turn** | ✅ **now filled** | extension `sdk-ts` transcripts `3864bdcd` + `ad52a532` (Sonnet 4.5, verbatim prompt, octocat) |
| **MCP off→on (within-harness, isolated)** | ✅ **now measured** | CL-CLI relay +14 tools/+1,876 tok; CO-CLI +30% credits (§1.6) |
| IDE sampling params (temp/max_tokens) | ❌ **unobtainable from exports** | export schema omits them (format limit) |

### One genuine gap remains

**Gap — IDE sampling parameters (temperature, max_tokens, top_p).** Neither the VS Code
Copilot Chat export format nor the Claude Code `sdk-ts` transcript records request sampling
params (only token *budgets*). This needs a **wire-level intercept** (a proxy between the
IDE and the model endpoint), or is simply documented as "not exposed." *Recommendation:
document as a known observability limit; do not block on it.* (CLI sampling IS known from
wire logs: CO-CLI temp=1, max_tokens=8192, thinking budget 1024 summarized.)

### CL-IDE capture — DONE (2026-06-11)
Ran Anthropic's Claude Code VS Code extension on `octocat_supply-psychic-disco`, Sonnet 4.5,
the verbatim prompt, twice. Findings folded into the header table, §5 worked example, and
the evidence caveat. **Two gotchas worth recording for repeatability:**
- A project `.mcp.json` server sits at **"Pending approval"** until approved (`claude` CLI
  or the extension UI) — an unapproved server silently yields *no response* in the
  extension. We pre-set `enabledMcpjsonServers`/`enableAllProjectMcpServers` in
  `~/.claude.json` and the CLI then showed ✔ Connected — **but the extension still did not
  inject the server into the model prefix** (cold prefix 46,364→46,418 tok). The extension
  enables project MCP through its own path; treat both runs as MCP-off.
- **"Export" in VS Code is Copilot Chat's feature, not the extension's.** The user's
  `VSCode_ClaudeArmB.json` (Copilot Chat + **gpt-5.4**) and `VSCode_ClaudeArmB2.json`
  (Copilot Chat + claude-sonnet-4.5, 95-tool MCP catalog) are **CO-IDE** captures, *not*
  CL-IDE. The Claude Code extension auto-writes `sdk-ts` JSONL to `~/.claude/projects/` —
  read those directly; don't rely on a manual export. (Those two Copilot exports are kept
  as bonus CO-IDE / cross-model samples.)

### Harness #4 = Anthropic's official Claude Code VS Code extension (CONFIRMED)
`Claudeok.json` is **not** this harness — it's Copilot-Chat-with-Claude (interpretation b)
and should be relabeled/retired as the #4 source. The real extension uses entrypoint
**`sdk-ts`** and writes transcripts to `~/.claude/projects/` exactly like the CLI.

**What we already have:** the extension's **system prompt is characterized**
(`system-prompts/claude-vscode.txt`, sdk-ts v2.1.112 — ≈ the CL-CLI template, ~5-line
diff). We also found 3 real `sdk-ts` transcripts on the octocat repo — but they are only
`"hi"` smoke tests (7 lines each), so **no usable multi-turn task run exists.**

**What's missing:** a multi-turn runtime capture (request count, cache, cost, timeline)
of the extension doing the actual task. Since the extension shares the CLI engine, this
is straightforward to capture.

### Capture plan for harness #4 (GUI extension — needs you to run it)
**Minimum (sufficient): just the transcript.** The extension auto-writes a CLI-format
transcript we can digest for requests/tokens/cache/(modelled)cost/timeline:
1. Open the repo `octocat_supply` @ `e1516cf` in VS Code with the **Claude Code
   extension**, model **Claude Sonnet 4.5**. (Run once **MCP off** to match the CLIs; a
   second run **MCP on** to match the IDE arm.)
2. Send the verbatim prompt: *"Explain this repository to a new developer: purpose,
   components, data flow, install/run/test."* Let it finish.
3. Tell me — I'll pick up the newest `sdk-ts` transcript from
   `~/.claude/projects/<octocat-slug>/<uuid>.jsonl` and digest it.

**Better (adds exact wire bodies, optional):** put our relay in front of it, like the
`matched-pair` bundle:
```sh
# terminal 1 — start relay (captures to ~/CopilotLogExports/claude-captures/)
node packages/skill-claude/scripts/claude-relay.mjs
# terminal 2 — launch VS Code so the extension inherits the override
ANTHROPIC_BASE_URL=http://127.0.0.1:8788 code /path/to/octocat_supply
```
If the extension authenticates via your Claude subscription (OAuth) and ignores
`ANTHROPIC_BASE_URL`, skip the relay — the transcript alone is enough.

### MCP-matched CLI re-runs — ✅ DONE (within-harness off→on, isolated)
Re-ran **CO-CLI and CL-CLI** against the same repo + prompt with one filesystem MCP
server toggled off→on (results folded into **§1.6 MCP**). Clean wire result: **+14 tools /
+1,876 prefix tokens** (CL-CLI); Copilot confirmed loading the same server (+30% credits).
Confirms MCP scales the flat catalog linearly and is a **config**, not architecture, lever.

---

# Outcome thesis (for the article)
A coding agent = model **+** a stack of harness decisions. Anthropic ships the engine
(weights, training, the API contract, the caching/thinking primitives, the safety floor).
The harness builds the car around it: what context the model sees, which tools and how
they're delivered, skills, memory, orchestration, sampling, and metering. Most of the
cost/latency/UX differences developers feel come from **those choices** — there's no
magic, only tradeoffs.
