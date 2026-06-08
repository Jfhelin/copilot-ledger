# Cache Behavior

## LinkedIn Hook

> Your "cold" Copilot session isn't cold. ~9,700 tokens are already cached
> before you type a word — and your sub-agents start ~98% warm.

## Executive Summary

> **Scope note:** Mixed evidence strength. The headline shared-cache number
> reproduced across **four** independent sessions (N=4). The per-call curve, the
> sub-agent finding, and the mode-switch finding are each **single-session
> observations (N=1)** — directional, not benchmarks. Cross-*user* cache sharing
> is **not** established (all runs: same machine + account).

GitHub Copilot's prompt cache is doing more than most people assume. The very
first model call of a brand-new session already reported **9,680 tokens cached**
— the *exact same* figure across four unrelated fresh sessions. Within a single
session, the cache hit climbs from **40% to 99%** as the conversation extends, so
you only ever pay full price for the *new* bytes a call introduces. And a
same-model **sub-agent starts at ~98% cache hit**, reusing the parent's already
-warm system prompt and tool definitions instead of paying a cold start. The one
thing that *re-freezes* the cache mid-session is a tool-def change — a Plan→Agent
mode switch cost a full **15.7-credit** cold re-write here.

## Hypothesis

The first call of a brand-new session should be fully cold (0 cached tokens). If
it is not — and the cached amount is identical across unrelated sessions — then
part of the prefix is cached *outside* the user's own session. And if caching is
prefix-based, then anything that reuses an identical prefix (later calls,
sub-agents) should ride the cache, while anything that changes the prefix (mode
switches, compaction) should bust it.

## Why This Matters

"Cold start" cost intuition is wrong if the system prefix is already warm. It
changes how you read the first call, how you estimate cache savings, what "the
agent paid full price for X" means, and why keeping related work in one session
(and letting sub-agents do heavy exploration) is cheap. It also raises a
measurement caution for anyone benchmarking Copilot cost.

## Session Summary

- **Task:** Cross-session cache comparison (four runs) + a single agentic run
  with sub-agents (`mapDatabaseRows` lookup `t2.json`; plan→implement cart
  `04-plan-implement-cart.json`).
- **Model:** claude-sonnet-4.5 / claude-sonnet-4.6 (the worker model in each).
- **Total credits:** 12.8 (t2) and 106.6 (cart run).
- **Key cost driver:** the one-time cache-*creation* write on each cold first
  call; everything after rides cache reads at ~10% of input price.
- **Tool calls:** 5 (t2), 60 (cart run).
- **Cache behavior:** shared 9,680-token first-call hit (N=4); per-call climb
  40%→99% (t2); sub-agents enter ~98% warm (cart); mode switch re-froze the
  prefix (cart).

## Key Findings

1. **Your cold session isn't cold (N=4).** Across `t1`, `t2`, `t2_2`, and
   `readme-cold-nocontext` — different prompts, same first-call figure:
   `p2.l0` `cachedTokens = 9680`, hit ≈ 37–40%. A truly cold prefix caches zero.
2. **Cache hit climbs toward 100% within a session (N=1, t2).** The worker model
   went 40.3% → 93.4% → 98.7% → 98.3% → 99.1% → 98.9% across six calls. Only the
   *new* tool result each call (229–442 tokens) is uncached.
3. **The first call's cost is mostly a one-time write, not the task.** In t2,
   `p2.l0` cost 5.9 credits, of which **5.4 was cache-creation** (writing the
   ~14K-token prefix: tool defs + history). You pay that once regardless of the
   question.
4. **Sub-agents start warm, not cold (N=1, cart, 2 sub-agents).** Each same-model
   sub-agent's first call entered at **~98% cache hit**, reusing ~18K of the
   parent's already-warm prefix and writing only **~350–455 new tokens** (its
   task brief) — under 2 credits to spin up. A genuine cold start in the same
   session cost **15.7 credits**.
5. **Mode switches bust the cache (N=1, cart).** The implementation turn
   re-entered **cold at 19%** only ~1.5 min after the planning turn — too soon
   for the idle TTL. The cause was a tool-def change (Plan→Agent mode switch),
   forcing a ~40K-token re-write worth 15.7 credits. See the
   [Tool and Skill Overhead experiment](07-tool-skill-overhead.md) for the deep
   dive on why a tool-def change is so expensive.
6. **The warm block is your *tool definitions*, not your system prompt (N=1,
   `hi2_18.json`).** This is the part that surprised me. On the Anthropic wire a
   request serializes as `tools → system → messages`, so the *first* bytes the
   prefix cache sees are the **tool schemas** — which is also why a tool-def
   change re-freezes everything after it (finding 5). In a cold sonnet-4.5 call
   the 24 tool schemas were **~8,526 tokens** and the system prompt **~11,026**,
   but only the first **~3,700** tokens of that system prompt are the stable,
   every-user base instructions. The rest is **user-specific** — your working
   directory (`/Users/<you>/…`), workspace name, your repo's
   `copilot-instructions.md` (a ~2,900-token attachment here), and template
   variables with absolute paths. A prefix cache dies at the first byte that
   differs between users, so the system prompt is mostly *un*-shareable.
   Tools-first is exactly what puts ~8.5K of guaranteed-identical bytes *ahead*
   of any per-user contamination — and tools (~8.5K) plus the invariant head of
   the system preamble line up, in magnitude, with the ~9,680-token shared hit
   above.

## What Happened

### The per-call curve (t2.json — six worker calls)

| Call | Doing | Prompt tok | Cached | New write | Hit % | Credits |
|---|---|---|---|---|---|---|
| `p2.l0` | first call (emits grep) | 24,044 | 9,680 | 14,355 | 40.3% | 5.9 |
| `p2.l2` | reads grep result | 25,731 | 24,035 | 1,684 | 93.4% | 1.6 |
| `p2.l4` | read_file | 26,062 | 25,719 | 331 | 98.7% | 1.1 |
| `p2.l6` | read_file | 26,503 | 26,050 | 442 | 98.3% | 1.2 |
| `p2.l8` | read_file | 26,731 | 26,492 | 229 | 99.1% | 1.1 |
| `p2.l10` | final answer | 27,027 | 26,721 | 296 | 98.9% | 1.8 |

The prefix stabilizes after the first call; every later call only writes the
bytes that just arrived.

### Sub-agents reuse the parent's warm prefix (04-plan-implement-cart.json)

| First call | Role | Prompt tok | Cached | New write | Hit % | Cost |
|---|---|---|---|---|---|---|
| `p1.l0` | sub-agent | 19,551 | 19,193 | 357 | **98.2%** | 0.9 cr |
| `p0.l2` | sub-agent | 20,132 | 19,676 | 455 | **97.7%** | 1.7 cr |
| `p3.l0` | main agent, **cold** | 49,401 | 9,447 | 39,952 | **19.1%** | **15.7 cr** |

**What the sub-agent reused** (its ~19.5K-token first-call prefix, by measured
size):

- **System prompt** — the base agent instructions — ~9,500 tokens. Identical to
  the parent → cached.
- **Tool definitions** — 28 tool schemas, ~6,300 tokens. The shared subset of the
  parent's 29 tools → cached.
- **Environment/context scaffolding** — `<environment_info>`, date, reminders —
  ~1,700 tokens → cached.
- **Newly written (~350–455 tokens):** only the sub-agent's specific task brief.

What it did **not** reuse: the parent's accumulated conversation (its file reads,
plan text, history). The sub-agent starts lean and isolated — which is *why* its
prefix is mostly the cacheable standard block. No distinct "skill" payload was
visible in this run; an active skill would ride the same system/user prefix and
cache the same way.

### Anatomy of the warm prefix (hi2_18.json — one cold sonnet-4.5 call)

What is *in* that shared block, in the order the model receives it:

| Prefix block (wire order) | ≈Tokens | Identical across users? |
|---|---|---|
| **Tool definitions** (24 schemas) | ~8,526 | **Yes** — depend on the toolset/mode/version, not your repo |
| **System prompt — base instructions** | ~3,700 | **Yes** — the "expert AI programming assistant" preamble |
| **System prompt — your custom instructions** | ~7,300 | **No** — cwd, workspace name, `copilot-instructions.md`, template vars |
| **User messages** — environment / date / editor context | varies | **No** — OS, current date, open file |

The globally-shareable prefix ends at the **first per-user byte** — here, partway
into the system prompt. That is why the cross-session shared hit (~9,680 tokens)
is roughly *tools + the invariant system preamble*, and why your own custom
instructions never ride the cross-user cache — only your per-session cache. It
also explains the ordering that surprises people: the system prompt feels like it
should come "first," but it is too user-specific to anchor a shared cache, so the
**invariant tool block is serialized ahead of it**.

## Interpretation

There are three cache layers to keep separate:

1. **A shared standard prefix** — your **tool definitions plus the invariant head
   of the system prompt** — warm before you start, ~9,680 tokens, identical
   across sessions on the same toolset. It is tools-*first* on the wire, so the
   tool schemas anchor it; the user-specific tail of the system prompt (your
   custom instructions, cwd, template vars) falls *outside* this shared block.
   You don't control it and shouldn't credit yourself for "saving" it.
2. **A per-session prompt cache** that grows as the conversation extends. This is
   why hit rate climbs to ~99%: each call's prefix is last call's prefix plus a
   little. Staying in one session amortizes the single cold write across many
   cheap reads.
3. **Eviction / invalidation** — a tool-def change (mode switch) or a 5+ minute
   idle gap (TTL) drops the warm prefix and forces a fresh cold write.

Sub-agents are a special case of layer 1+2: because their opening tokens (system
+ tools + environment) are byte-identical to the parent's, they hit cache
immediately — they reuse the *shared prefix the parent already warmed*, not the
parent's task context. The cache is **per-model**, so a sub-agent dropped to a
different model would land in a different namespace and start cold.

### How to think about staying vs. starting fresh (mechanism, not separately measured)

- **Stay in-session for related work:** the expensive part is the first-call
  *write*; later calls ride the warm prefix at ~10%. Fragmenting re-pays the
  write each time.
- **Start fresh when the old prefix is dead weight:** a large stale prefix costs
  ~10% on *every* future read, so a smaller fresh prefix can be cheaper for an
  unrelated task — at the cost of one new cold write and re-establishing context
  (which can trigger extra search/read hops; see Round Trips Are the Lever).
- **Compacting context** shrinks the prefix, but the summarization is itself a
  model call *and* it changes the prefix — so it invalidates the cache and the
  next call pays a fresh write. Worth it once history is large and stale; wasteful
  on a short session.

## Practical Guidance

- **Keep related work in one session.** You pay the cold-start write once;
  everything after is ~10% cache reads.
- **Front-load context.** Even cached, every extra round trip still pays for
  output plus a new write of whatever it fetched. Fewer hops = fewer writes.
- **Keep the prefix lean.** Cache reads are ~10% of input price, but 10% of a
  bloated prefix is still real, and the one-time write scales with prefix size.
  Trim unused tools and skills.
- **Let sub-agents do heavy exploration.** They ride the warm shared prefix
  (~98% hit, <2 cr to start) and keep their fan-out *out* of the parent's window
  — cheap and isolating, as long as they stay on the same model.
- **Avoid needless mode switches mid-task.** Changing the toolset re-freezes the
  prefix and re-pays the cold write (15.7 cr here).
- **Compact deliberately — it costs before it saves.** Compaction replaces a long
  history with a summary, which changes the prefix and *invalidates the cache*, so
  the next call is a fresh cold write — plus the summarization is itself a model
  call. You pay that re-warm up front to buy a smaller, cheaper prefix going
  forward.
  - **It pays** when the session is long and most of the history is stale: the
    one-time re-write is amortized by many cheaper future reads (10% of a much
    smaller prefix), and you avoid hitting the context-window ceiling.
  - **It loses money** when you compact early or often, on a short session, or
    right before ending the task: you eat the re-warm write and the summarization
    call but never run enough subsequent calls to recover them. Compacting in a
    tight back-and-forth loop is the worst case — you re-pay the cold write each
    time. Let the prefix grow and ride the cache until history is genuinely large
    and largely irrelevant, then compact once.

These reinforce GitHub's official guidance: provide useful context up front,
avoid excessive context, review tools and skills periodically, and choose the
right model for the job.

## Confidence Level

**Medium.** The 9,680-token shared-cache figure reproduced across four
independent sessions — stronger than a single observation — but all four ran on
the same machine and account, so **cross-user** sharing is *not* established. The
per-call curve, the sub-agent reuse, and the mode-switch cold start are each
**single-session (N=1)** observations; the mechanism is clear and consistent, but
the exact figures should not be treated as benchmarks. The **prefix anatomy**
(tools-first; ~8,526-token tool block; ~3,700-token invariant system head; the
user-specific custom-instruction tail) is a **single-export breakdown
(`hi2_18.json`, N=1)** — the *ordering* is structural (it's the Anthropic wire
format), but the exact token splits are one measurement. t2 used extended
thinking, so its per-call credits are a slight lower bound. The compaction and
stay-vs-fresh guidance is **reasoned from the cache mechanism, not separately
measured** — we have no captured compaction event yet; it is a candidate for a
follow-up run.

## Evidence

- **Embedded report:** the t2 run, framed for cache —
  [open the cache curve in Copilot Ledger](/reports/cache-curve). Select the
  first call to see the 9,680-token shared hit on the context-window bar, then
  step through calls 2–6 to watch the hit climb to ~99%.
- **Shared-cache reproduction (N=4):** `p2.l0` `cachedTokens = 9680` in
  `t1.json`, `t2.json`, `t2_2.json`, `readme-cold-nocontext.json`.
- **Prefix anatomy (N=1):** `hi2_18.json` `p2.l0` (claude-sonnet-4.5, cold first
  call) — `metadata.tools` = 24 schemas ≈ 8,526 tok; system message
  (`messages[0]`) ≈ 11,026 tok, of which the first ~3,700 are the invariant base
  preamble and the user-specific tail begins where the absolute cwd / workspace
  name / embedded `copilot-instructions.md` appear. Wire order `tools → system →
  messages` is the Anthropic request shape.
- **Sub-agent + mode-switch evidence:** `04-plan-implement-cart.json` — sub-agent
  first calls `p1.l0` / `p0.l2` at ~98% hit; cold main start `p3.l0` at 19% /
  15.7 cr. (Large 7.5 MB export; numbers reproduced in the tables above.)
- Regenerate any figure with
  `node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout`.

## LinkedIn Post

I thought a brand-new Copilot session started cold.

Then I measured the first model call across four unrelated fresh sessions.

Every one of them opened with the *exact same* 9,680 tokens already cached —
before I typed anything. A truly cold prefix should cache zero.

Three more things surprised me, all in real sessions:

- Within a session, the cache hit climbed 40% → 99%. You only pay full price for
  the *new* bytes each call adds.
- The first call's cost is mostly a one-time *write* of the prefix — not the work
  you asked for.
- Sub-agents started ~98% warm. They reuse the parent's already-cached system
  prompt and tool definitions, and only write their own ~400-token task brief.

And the detail I least expected: the thing anchoring that warm block isn't the
system prompt — it's the **tool definitions**. On the wire the request is ordered
`tools → system → messages`, so the tool schemas are the very first bytes the
cache sees. It has to be that way: your system prompt is half *yours* — it carries
your working directory, your workspace name, and your repo's custom instructions —
so it can't be shared across users. The tool block is identical for everyone on
the same toolset, so it goes first and does the cross-user caching.

The one thing that re-froze the cache mid-session: a Plan→Agent mode switch
changed the toolset and forced a full cold re-write — 15.7 credits.

The takeaway: keep related work in one session, keep your prefix lean, and let
sub-agents do the heavy exploration — they're cheap because they ride a cache
you already paid for.

(N=4 for the shared cache; the rest are single-session observations, not
benchmarks.)

Full breakdown with measurements:
[GitHub Pages link]

## Video Outline

**0–10s** — "Your cold Copilot session isn't cold." Show the first-call cache
figure.

**10–30s** — Open the t2 run in Copilot Ledger; explain it's a fresh session,
first worker call.

**30–75s** — Select the first call (9,680 cached), then step through calls 2–6
and watch the hit climb to ~99%. Cut to the sub-agent table: 98% warm entry vs a
15.7-credit cold start.

**75–105s** — Explain the three layers: shared prefix you didn't warm, per-session
cache that grows, and eviction from mode switches / idle.

**105–120s** — Takeaway: stay in one session, keep the prefix lean, let
sub-agents explore. End on "you're not saving tokens — you're saving cold
writes."
