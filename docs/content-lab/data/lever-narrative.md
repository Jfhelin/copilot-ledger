# The 15 Harness Levers — Narrative

Per lever: **what it is**, **why it matters / why the setting matters**, **how the four
harnesses set it**, and **speculated effects** of the different choices. All four run the
same model (Claude Sonnet 4.5) on the same repo. Harnesses: **CO-CLI** (Copilot CLI),
**CL-CLI** (Claude CLI), **CO-IDE** (VS Code Copilot), **CL-IDE** (Claude in VS Code).

> Caveat carried throughout: the IDE captures were taken **MCP-ON** and as single
> cold-start turns; the CLIs were MCP-OFF multi-turn runs. So IDE tool-counts, prefix
> sizes, and cache rates partly reflect *configuration*, not pure harness design.

---

## A — System prompt content & shape  🎛️

**What it is.** The standing instruction block the harness sends as the `system` field on
every request: the agent's identity, its operating rules, formatting demands, and — most
consequentially — its **autonomy posture** (how eagerly it acts vs. asks). Anthropic locks
the *slot* (there is a system field) but nothing about its contents.

**How it differs & why it matters.** This is the harness's single largest behavioral
control surface. CO-CLI tells the model it is "non-interactive… proceed autonomously,
don't ask"; both Claude harnesses say the opposite — "confirm before irreversible." The
two Claude prompts are nearly the same file (one Anthropic "Agent SDK" template, ~5 lines
of diff); the two Copilot prompts share nothing. CO-IDE's prompt is the largest (~44k
chars) because it inlines repo instructions, 37 skills, and an agent roster.
*Speculated effects:* the autonomy line alone can flip a run from "one-shot, four
requests" to "cautious, asks twice, sixteen requests" — i.e. it drives both cost and the
felt personality of the agent far more than the model choice does. A bigger prompt also
means a bigger fixed prefix re-sent every turn, so verbose system prompts quietly tax
every request.

---

## B — Dynamic / runtime context injection  🎛️

**What it is.** The freshly-computed facts the harness staples on at request time: working
directory, OS, git branch, recent commits, user email, today's date. Distinct from the
static prompt because it changes per run/turn.

**How it differs & why it matters.** All four inject *something*, but the **attachment
point** varies: CO-CLI puts a small `<environment_context>` in the system prompt; CL-CLI
puts userEmail/date/skills in the **first user message** (as a `<system-reminder>`);
CL-IDE puts a rich `# Environment` block (incl. git status + recent commits) in the
system prompt; CO-IDE injects little. *Speculated effects:* richer context (CL-IDE's git
log) lets the model ground answers in the actual repo state and reduces "what branch am I
on?" round-trips — but costs tokens and can leak environment detail. Putting it in a user
message vs. system changes cacheability (user-turn content is less stable across turns)
and how strongly the model weights it.

---

## C — Tool catalog & schema shape  🎛️

**What it is.** The names, descriptions, and JSON-Schemas of the tools advertised to the
model. Anthropic only constrains the *shape* (a name matching `^[a-zA-Z0-9_-]{1,64}$`, a
description, an input schema) — everything else is style.

**How it differs & why it matters.** CO-CLI uses terse **snake_case** (`bash`, `view`,
`edit`), 19 tools, ~8.1k tokens. CL-CLI uses **PascalCase** (`Bash`, `Read`, `Edit`), 27
tools, ~18.9k tokens, with very long descriptions (~2,145 chars each). CL-IDE mixes
PascalCase native tools with **dotted MCP** names (`mcp__azure_mcp_server__…`) and
terser ~483-char descriptions. (PascalCase is the Claude SDK's convention, *not* an
Anthropic requirement — a common misread.) *Speculated effects:* verbose descriptions buy
better first-try tool selection (fewer malformed calls) at a steep token cost — Claude
CLI's catalog alone is 2.3× Copilot CLI's. Naming style may have subtle effects on the
model's tool-choice priors, but the dominant lever here is description verbosity vs.
prefix budget.

---

## D — Tool delivery / virtualization  🎛️  *(headline lever)*

**What it is.** *Whether* the full tool catalog is shipped on every request (flat) or
revealed progressively (virtualized) — names first, schemas on demand.

**How it differs & why it matters.** CO-CLI and CL-CLI are **flat**: every request carries
all schemas (54% and ~70% of the prefix). **CO-IDE alone virtualizes**, via a
`deferred_tools_delta` protocol that activated tools 0 → 1 → 23 across the run. CL-IDE is
flat *and huge* — 247 tools (89% of prefix), 401 on Insider — because MCP is on.
*Speculated effects:* virtualization is the biggest structural divergence we found. Flat
delivery is simple and maximally cacheable (a stable tool block caches beautifully), but
sets a high fixed floor and can distract the model with dozens of irrelevant tools.
Virtualization slashes the floor and reduces tool-confusion, but risks the model not
knowing a capability exists until too late, and it perturbs the cache prefix as the tool
set changes. This single lever explains a ~10k–100k token swing in prefix size at
identical model and task.

---

## E — Skills  🎛️

**What it is.** Reusable instruction packs ("how to do X") the harness can expose. The
design choice is *count*, *injection point*, and *whether the body is preloaded or fetched
on demand*.

**How it differs & why it matters.** CO-IDE bakes **37 skills full-body into the system
prompt** — a fixed tax on every call. Both Claude harnesses advertise **13 skills** by
name+description in the first-user-message reminder and load the body only when a `Skill`
tool is invoked. CO-CLI is contextual (`<available_skills>` + a skill tool). *Speculated
effects:* preloading (CO-IDE) means the agent always "knows" its skills and never needs a
lookup round-trip, but pays for 37 of them whether or not they're used. On-demand (Claude)
keeps the prefix lean and scales to large skill libraries, at the cost of an extra turn to
fetch a skill body and the risk the model forgets a skill is available. *(This also
corrects the old draft's claim that Claude carries zero skills — it carries 13.)*

---

## F — MCP exposure  🎛️

**What it is.** Whether Model Context Protocol servers (external tool providers — Azure,
GitHub, Playwright, etc.) are connected, and how many.

**How it differs & why it matters.** Both CLIs ran **MCP-OFF** (0 servers). Both IDE
captures were **MCP-ON**: CO-IDE 12 servers, CL-IDE 8, Insider 9. This is the root cause of
the IDE prefix blow-up and is as much a *user-config* difference as a harness one.
*Speculated effects:* every connected server dumps its tool schemas into the prefix, so
MCP is the fastest way to balloon per-request cost and to crowd the model's attention with
tools it will never call this turn. The upside is real capability (cloud queries, browser
control). The lesson for benchmarking: comparing an MCP-on IDE against an MCP-off CLI
measures configuration, not harness quality — they must be matched.

---

## G — Memory subsystem  🎛️

**What it is.** How the harness persists knowledge *across* turns and sessions — files,
a database, scoped stores — and how much it auto-loads back in.

**How it differs & why it matters.** Both Claude harnesses ship an elaborate **file-based
auto-memory** (user/feedback/project memory types, `[[cross-links]]`, a memory directory).
CO-CLI uses **session-scoped SQL todos + a plan.md** with no cross-session memory. CO-IDE
has a scoped **`/memories/`** store (user/session/repo) that auto-loads up to ~200 lines.
*Speculated effects:* persistent cross-session memory (Claude) makes the agent feel
continuous and learn your preferences, but can carry stale or wrong facts forward and adds
prefix weight. Session-only memory (CO-CLI) is predictable and clean each run but forgets
everything between runs. Auto-load caps (CO-IDE's 200 lines) are a deliberate
brevity-vs-recall trade.

---

## H — Conversation-history management  🎛️ *(mechanism 🔒)*

**What it is.** How the growing transcript is carried forward. The *mechanism* is locked —
Anthropic's API is stateless, so the **entire prefix is re-sent every turn**. The
*management* (when/whether to summarize or compact) is discretion.

**How it differs & why it matters.** CO-CLI shows plain linear growth (1→3→5→7 messages),
no visible compaction, no guidance to the model about it. CL-CLI grows 1,325→8,090 tokens
but **plateaus at request 13** — evidence of opaque summarization — and uniquely includes
a `# Context management` section telling the model its context may be summarized so it
shouldn't wrap up early. IDE exports lack wire bodies, so we can't see their trajectory.
*Speculated effects:* compaction lets long sessions continue without blowing the context
window, but a silent summarizer can drop a detail the agent needed. Telling the model
compaction will happen (Claude) plausibly reduces premature "handing off" behavior. Since
the whole prefix re-sends each turn, history growth is the main thing the harness can
actually economize on after tools.

---

## I — Prompt-caching strategy  🎛️ *(mechanism 🔒)*

**What it is.** Where the harness places cache breakpoints in the prefix. The *primitive*
is locked (`cache_control:{type:ephemeral}`, ≤4 breakpoints, 5-minute TTL); placement is
discretion.

**How it differs & why it matters.** CO-CLI uses ~3 breakpoints (system / tools / a
rolling message boundary) for an **87.2%** hit rate; CL-CLI hits **90.2%** (the relay hides
its exact breakpoints). The IDE captures show 0–12% — *not meaningful*, because they're
cold single turns with no prefix to reuse. *Speculated effects:* good breakpoint placement
is nearly free money — it's why both CLIs reclaim ~70%+ of input cost. The art is putting
breakpoints after stable content (system, tools) and before the volatile tail; place them
wrong (or let the tool set churn, see lever D) and the cache misses, doubling effective
input cost for the same conversation.

---

## J — Sampling parameters  🎛️ *(ranges 🔒)*

**What it is.** `max_tokens`, `temperature`, `top_p`, etc. Anthropic locks the legal
*ranges*; the harness picks the *values*.

**How it differs & why it matters.** CO-CLI sets `max_tokens` **8192** and `temperature`
**1**. CL-CLI sets `max_tokens` **32000** and leaves temperature **unset** (Anthropic's
default). IDE exports don't expose these (only token budgets). *Speculated effects:* the
4× `max_tokens` gap means Claude CLI can emit far longer single responses (whole files,
long explanations) where Copilot CLI must chunk or stop — a plausible contributor to
Claude's higher request count and output volume. Temperature at 1 vs. default affects
run-to-run variance; a harness that wanted reproducibility would lower it, and none here
does.

---

## K — Reasoning / extended thinking  🎛️

**What it is.** Whether the model is told to "think" before answering, and with what token
budget and visibility.

**How it differs & why it matters.** CO-CLI **explicitly** requests thinking every turn —
`{type:enabled, budget_tokens:1024, display:summarized}` (~580 reasoning tokens observed).
CL-CLI sends **no `thinking` field** in the relay body yet still produces a thinking block
(~103 tokens) — almost certainly **interleaved thinking via a beta header the relay
strips**, i.e. delivered differently, not absent. The IDE captures show zero reasoning
tokens (off in those runs). *Speculated effects:* a fixed small budget (CO-CLI) gives
consistent, cheap deliberation on every step; implicit/adaptive thinking (Claude) can
spend more when a step is hard and nothing when it isn't, but is harder to predict or
bill. Turning thinking off entirely trades answer quality on tricky steps for latency and
cost.

---

## L — Agent loop & sub-agent orchestration  🎛️

**What it is.** The tools that let the agent spawn or schedule *other* agents and run a
multi-step loop — delegation, planning, parallelism, background work.

**How it differs & why it matters.** CO-CLI offers a manager-style `task` +
`read_agent`/`list_agents`. Both Claude harnesses carry a large fleet — `Agent`, `Task*`,
`EnterPlanMode`, **`Cron*`**, **`Worktree`/`EnterWorktree`**, `Monitor`, and
schedule/push/remote triggers. CO-IDE exposes a **locked roster of 11 named agents** via
`runSubagent`. All four encourage **parallel tool calls**. *Speculated effects:* a rich
orchestration surface (Claude) enables genuinely autonomous, long-horizon and scheduled
work, but adds many tools to the prefix and more ways to go off the rails. A curated
fixed roster (CO-IDE) is safer and more legible but less flexible. Parallel tool-calling
across all four is the cheapest big win for wall-clock time.

---

## M — Safety / policy layering  🎛️ *(trained floor 🔒)*

**What it is.** Guardrails *on top of* the model's trained refusal behavior — extra
prohibited-action lists, shell-injection defenses, org content-exclusion rules.

**How it differs & why it matters.** The trained floor is identical (same weights). On top,
CO-CLI adds explicit `<prohibited_actions>` + `<shell_security>` + **org content-exclusion**
that blocks files like `secrets.json` at runtime. Both Claude harnesses add a dual-use
security preamble and "act with care, confirm before irreversible" gating. CO-IDE adds a
short Microsoft content-policy clause. *Speculated effects:* runtime content-exclusion
(Copilot) is a real enterprise differentiator — it can stop secret exfiltration the model
itself wouldn't catch — but can also block legitimate files and frustrate the agent.
Heavier safety preambles nudge the agent toward caution (and more confirm-first
round-trips), tying back to the autonomy posture in lever A.

---

## N — Model routing / endpoint  🎛️

**What it is.** Which physical endpoint serves the request and whether *auxiliary* tasks
get routed to a cheaper model.

**How it differs & why it matters.** All four resolve to the same
`claude-sonnet-4-5-20250929`, but via different paths: CO-CLI through the GitHub proxy
(labels it `claude-sonnet-4.5`), CL-CLI direct (`sdk-cli`), CL-IDE through the Copilot
proxy (`sdk-ts`). Importantly, **CO-IDE's agent turn ran on Claude**, while its
`gpt-4o-mini` calls were **auxiliary** (e.g. chat-title generation) — not the agent.
*Speculated effects:* routing through a proxy lets a vendor meter, log, apply policy, and
swap models centrally, at the cost of transparency (and possible header stripping).
Offloading cheap side-tasks (titles, classification) to a mini model is a quiet cost
optimization that's easy to mistake for "the harness uses GPT" if you read the wrong
request.

---

## O — Usage metering / telemetry  🎛️

**What it is.** What billing and identity data the harness attaches, and what it exposes
back to the user.

**How it differs & why it matters.** CO-CLI reports **exact native GitHub AI credits**
(16.3 cr / $0.163) — ground-truth billing. CL-CLI has no native meter, so cost must be
**token-normalized estimate** (~$0.50); it also sends `metadata.user_id`
(device/account/session) and a billing header embedded in the system string. IDE exports
**strip** billing/usage (null). *Speculated effects:* native metering (Copilot) makes cost
analysis trustworthy and per-run; estimated metering (Claude) means any cost comparison
inherits estimation error — important when *we* publish cost numbers. The identity
metadata Claude sends is a privacy/telemetry surface worth flagging. For our own
benchmarking, this lever determines how much we can trust each harness's reported spend.
