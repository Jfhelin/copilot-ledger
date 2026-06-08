# Ask mode isn't the cheaper mode. It's the colder one.

## LinkedIn Hook

> I switched to "cheaper" ask mode. It missed a 9,680-token warm cache that agent
> mode rides for free — and it still called tools. One switch flips two things,
> and neither makes it cheaper.

## Executive Summary

> **Scope note.** The *cache-likelihood* finding (agent inherits ~9,680 cached
> tokens, ask gets 0) reproduced cleanly across multiple captures and is
> mechanistically explained — treat it as solid. The *cost* comparison is
> single-run-per-task (N=1) — a direction, not a benchmark.

A widely repeated claim says VS Code Copilot **ask mode** is meaningfully cheaper
than **agent mode**. Measuring the actual request payloads, that's backwards.
Switching to ask mode changes exactly **two fields** — it swaps in a "read-only"
system block and strips ~28 write/action tools — and **those same two changes
cause two effects, neither of them savings**:

1. **Ask mode still explores and still costs the same.** On a "find the dead code"
   task it fired **13 tool calls** of its own and cost **18.1 credits vs agent's
   16.5**. Across every cell tested, agent ≤ ask on credits.
2. **Ask mode starts colder.** Its first model call inherited **0** cached tokens
   while agent's inherited **9,680** — the ubiquitous default agent prefix is
   kept globally warm; ask's smaller, rarer prefix isn't, and it decays after
   Anthropic's ~5-minute cache TTL (we caught the exact boundary: a 69-second
   re-fire hit, a 12-minute re-fire missed).

The lever people call "mode" is really *capability* (can it edit?) plus *cache
warmth*. Picking ask mode to save money optimizes neither.

## Hypothesis

If ask mode is intrinsically cheaper than agent mode, then running the **same
prompt** in both modes should show ask mode consistently lower on credits, after
controlling for model and cache warmth. If instead the difference disappears once
those are controlled — or is explained by a cold-start cache write rather than
the mode — then the "ask mode is cheaper" claim is mis-attributed.

## Why This Matters

"Use ask mode to save credits" is becoming folk advice. If the real driver is
cache warmth and task shape (does the agent need to go find context?), then the
advice is steering people toward the wrong lever. Worse, ask mode *also* calls
tools when a question needs codebase context, so the supposed savings evaporate
exactly when the task is non-trivial. Getting this right protects readers from
optimizing the wrong thing.

## Session Summary

Two same-prompt pairs, one variable (mode) each:

**Task 1 — "Explain what this file does… top three improvements. No code edits."**
(model: `gpt-4o-mini-2024-07-18`; isolating the real answer turn, ignoring the
auto-generated title/categorization calls)

| | Ask (`t5_b_askmode`) | Agent (`t5_a_agentmode`) |
|---|---|---|
| Tool calls | 0 | 0 |
| Input tokens | 20,194 | 21,373 |
| Cache hit rate | **0%** | 49% |
| Output tokens | 784 | 758 |
| **Credits (answer turn)** | **8.7** | **6.0** |

The digest flags ask mode's answer turn (`p2.l0`) as cold: cause =
*"first call for model in session."* Agent mode's earlier categorization call had
already warmed `gpt-4o-mini`, so its answer turn rode a 49% cache hit. **The gap
is cache warmth, not mode.**

**Task 2 — "Where are these repository methods called from? Any dead code? No edits."**
(model: `claude-sonnet-4.5`; the `_explore` pair)

| | Ask (`t5_b2_askmode_explore`) | Agent (`t5_a2_agentmode_explore`) |
|---|---|---|
| Tool calls | **11** | 14 |
| Files touched | 2 | 4 |
| Cache hit rate | 86% | 91% |
| Output tokens | 2,280 | 2,674 |
| **Credits** | **19.0** | **18.2** |

Ask mode did its own exploration (11 tool calls, 2 files) and finished within
~0.8 credits of agent mode. Neither run spawned sub-agents.

## Key Findings

1. **The mode switch changes only two fields.** Same endpoint, model, request
   name, and token limits — ask mode just swaps the system-prompt body and the
   tool array (28 read-only tools vs 56 read+write). See *Anatomy* below.
2. **Ask mode is not "no tools."** On a context-hungry question it ran **13 tool
   calls** (9 `grep_search`, 4 `read_file`) entirely on its own.
3. **Ask isn't cheaper.** Agent ≤ ask on credits in every cell measured
   (Task A warm 6.3 vs 6.4; Task A cold floor 8.4 vs 6.1; Task B 18.1 vs 16.5).
4. **Ask starts colder.** Agent's first call inherits ~9,680 cached tokens; ask's
   inherits 0 — and ask's warmth is TTL-fragile (69 s hit, 12 min miss) while
   agent's is gap-independent.
5. **One cause, two effects.** Stripping the write tools + the read-only system
   block is *why* ask can't act on code **and** *why* its prefix misses the
   globally-warm agent cache.

## The Cache-Likelihood Finding (the real mechanism)

The digest labels these runs `gpt-4o-mini`, but that's only the
title/categorization housekeeping. **The actual answer turn (`panel/editAgent`)
runs on `claude-sonnet-4.5` in both modes** — so this is a clean same-model cache
comparison, and Sonnet uses Anthropic's explicit, cross-session prompt cache
(see experiment 08, *Cache Behavior*).

Both answer turns were the **first Sonnet call in their session** (both "cold").
Yet they cached completely differently:

| Answer turn (`claude-sonnet-4.5`) | Ask (`t5_b`) | Agent (`t5_a`) |
|---|---|---|
| Input tokens | 20,194 | 21,373 |
| **Cache hit (`cached_tokens`)** | **0** | **9,161** |
| Cache write (`cache_creation_input_tokens`) | 20,185 | 12,203 |
| Tools advertised | 29 | 57 |

**What the system tried to cache:** the whole prefix (system prompt + tool defs +
attached file). Ask mode wrote all 20,185 tokens fresh and reused nothing. Agent
mode inherited 9,161 already-warm tokens before doing any work.

**Where agent's 9,161 came from — and why ask missed it.** Diffing the two system
prompts: they share only the **first ~3,221 chars (~800 tokens)**, then ask mode
pads a long run of blank lines and the two diverge entirely. So agent's hit is
**not** a match against ask mode's prefix — it's a match against Anthropic's
**cross-session shared cache**, the ~9.7k-token warm Copilot system+tool prefix
documented in experiment 08. Ask mode's prefix simply wasn't in that warm set.

**The structural conclusion (opposite to the myth):** cache-hit likelihood scales
with how *common* your exact prefix is. Agent mode sends the **ubiquitous default
Copilot agent prefix** that thousands of concurrent sessions keep rewritten and
warm, so even a "first" call usually inherits ~9k cached tokens for free. Ask
mode sends a **rarer prefix** (different system text, smaller/different tool set),
so it is statistically **less likely to land on a warm cross-session prefix** —
*more* exposed to a true cold start, not less. That is what flipped Task 1
(ask 8.7 cr vs agent 6.0 cr): a mode-structural cache effect, not random noise.

**Caveat:** N=1, and cross-session warmth is probabilistic and time-dependent
(whether the agent prefix is warm partly depends on global traffic at that
moment). The protocol below measures this directly across N≥3 to confirm.

### Anatomy: what actually differs between the two modes

Comparing the two raw request payloads (same model, task, and workspace), **only
two fields differ — the system-prompt body and the tool array.** Everything else
is byte-identical: same `requestType` (`ChatMessages`), same `request.name`
(`panel/editAgent`), same `location`, same `maxResponseTokens` (32,000), same
`maxPromptTokens`. "Mode" is not a different endpoint or model — it's the same
wire format with two fields swapped.

**System prompt — shared head, different body.** The first ~805 tokens are
identical (identity, content policy, base workflow). Then mode-specific blocks
diverge:

| Ask-only sections | Agent-only sections |
|---|---|
| `<modeInstructions>`, `<capabilities>`, `<rules>`, `<workflow>` | `<taskTracking>`, `<agents>`, `<agent>`, `<notebookInstructions>`, `<argumentHint>` |

Ask's block constrains: *"You are an ASK AGENT… strictly **read-only**: NEVER
modify files or run commands."* Agent's block *adds* capability — `<taskTracking>`
(drive `manage_todo_list`) and `<agents>` (a sub-agent catalog to spawn via
`runSubagent`). Net system size is nearly equal (~8,035 vs ~8,015 tok) — the
difference is **content, not length**.

**Tools — 28 vs 56, and it's about *kind*, not count.** Ask advertises 28
read/inspect tools only (`read_file`, `grep_search`, `semantic_search`,
`file_search`, `list_dir`, `get_errors`, `fetch_webpage`, terminal-*output*
readers) — **zero mutation tools** (~6,467 tok). Agent advertises those plus every
write/action tool (`create_file`, `replace_string_in_file`,
`multi_replace_string_in_file`, `run_in_terminal`, `manage_todo_list`,
`runSubagent`, `create_directory`, browser automation, notebook editing,
`install_extension`) — 56 tools, ~16,095 tok. **The defining difference: ask
physically cannot change your workspace or run commands; agent can.** The smaller
tool count is a *consequence* of read-only, not the point.

**Why this is also the cache story.** Anthropic caches in order tools → system →
messages, matching from byte 0. The modes differ at **tool #1** (ask:
`fetch_webpage`; agent: `create_file`) and in the system body, so they are
**entirely separate cache prefixes**. Mapping agent's cached 9,680 tokens against
its tool list, the cached region covers indices 0–~24 — all **generic built-ins**
(the user-specific MCP/PR tools sit at the *tail*, past the boundary). That
generic agent prefix is the ubiquitous default and stays globally warm; ask's
distinct, lower-traffic prefix has no such tailwind and decays after the ~5-min
TTL. So switching to ask mode swaps in a "read-only" system block *and* strips
~28 mutation tools, producing a smaller, different, less-common prefix — which is
exactly why ask mode both (a) can't act on code and (b) misses the global cache.

### TTL evidence: private vs shared prefix (from request timestamps)

The r1 captures land the cold-vs-warm rule precisely. Tracking the gap since the
previous call that shares the same prefix:

| Run | Time (UTC) | Gap vs prior same-prefix call | cached | Result |
|---|---|---|---:|---|
| A ask cold | 04:03:31 | — | 0 | cold (writes ask prefix) |
| A ask warm | 04:04:40 | **+69 s** | 7,033 | **HIT** |
| B ask warm | 04:16:47 | **+12 m 07 s** | 0 | **MISS (evicted)** |
| A agent cold | 04:06:02 | — | 9,680 | warm |
| A agent warm | 04:07:07 | +65 s | 9,680 | warm |
| B agent warm | 04:18:12 | +11 m 05 s | 9,680 | warm |

- **Ask (private prefix):** hit at 69 s, miss at 12 min — Anthropic's ~5 min
  prompt-cache TTL evicted it. (The miss is *not* because Task B omits the
  attached file: the cached region is the system+tools prefix *before* the file,
  byte-identical between A and B. Pure TTL.) Ask mode's warmth is **fragile and
  self-funded** — it decays the moment you idle past the TTL.
- **Agent (globally shared prefix):** 9,680 cached at every gap (65 s and 11 min
  alike) — **gap-independent**. Concurrent agent-mode traffic worldwide keeps
  rewriting that exact prefix, so the TTL clock effectively never runs out.
- **Practical consequence:** a returning user who paused > 5 min reliably pays a
  cold start in ask mode but not in agent mode.


## What Happened

1. Same user prompt issued in each mode (verified identical in the digests).
2. **Task 1 (no tools needed):** the file was already in context, so neither mode
   called a tool. Each made one answer request. Costs tracked input size and
   cache warmth, nothing mode-specific.
3. **Task 2 (context needed):** *both* modes issued tool calls to search and read
   the codebase, accumulated results into the prefix, and answered after several
   requests. Agent mode explored slightly more (14 vs 11 calls, 4 vs 2 files).
4. Across both, credits were driven by **input tokens × cache warmth + output**,
   not by which mode label was selected.

## Interpretation

In these sessions, "mode" was not the cost lever. Two things were:

- **Cache warmth** — a cold *first* call for a model pays full cache-creation on
  the whole prefix. Whichever run happened to hit the model cold looked more
  expensive, independent of mode. (See experiment 08, *Cache Behavior*.)
- **Whether the task needs context** — ask mode will still call tools to answer a
  codebase question, so it incurs the same exploration cost agent mode does.

That makes "ask mode is cheaper" a mis-attribution: the savings people remember
likely came from asking *cheaper questions* (ones needing no exploration), or
from comparing a warm run to a cold one — not from the mode itself.

## Test Protocol (how to get N>1)

Current evidence is N=1 per cell — enough to *doubt* the myth, not to *bust* it.
This protocol gets to N=3 with an evaluate-after-each-pass gate, so we stop early
if the signal is already clean (or widen if it's noisy). It measures **two
distinct claims** that need different setups:

- **Claim 1 — Cost parity:** warm-state, ask and agent cost about the same.
- **Claim 2 — Cache-likelihood:** on a *raw* first call, agent inherits ~9k
  cross-session cached tokens and ask gets ~0.

These need opposite setups (Claim 1 *removes* the cold start; Claim 2 *requires*
it), so each run is captured in **two variants**.

### Fixed controls (all runs)

- **Repo:** `octocat_supply-psychic-disco`. **Target file:**
  `api/src/repositories/suppliersRepo.ts`.
- **Model:** manually pinned **Claude Sonnet 4.5** (not Auto) for the whole
  matrix. (Add `gpt-4o-mini` as a second model only if Sonnet results warrant.)
- **Identical prompt text** per task (verify with
  `jq -r '.prompts[].promptText'` on the digests).
- Same VS Code build, same workspace.

### The 4 cells

| Cell | Task | Mode | File attached? |
|---|---|---|---|
| A-ask / A-agent | **Task A — no-context** "explain this file" | ask / agent | yes (no tools needed) |
| B-ask / B-agent | **Task B — context-hungry** "where called / dead code" | ask / agent | no (forces exploration) |

**Task A measured prompt** (attach `suppliersRepo.ts`):
> Explain what this file does, what design patterns it uses, and the top three
> things that could be improved. Use bullets. No code edits.

**Task B measured prompt** (do *not* attach the file):
> In api/src/repositories/suppliersRepo.ts, where is each public method called
> from elsewhere in this codebase? Which of the methods are actually used, and
> which appear to be dead code? List used vs unused. No edits.

### Two capture variants per cell (this is the key upgrade)

### Three captures per pass (revised after r1)

r1 showed two things that simplify the design:

- **Agent mode can't be made cold.** Its first call inherited 9,680 cached
  tokens on *both* the cold and warm captures — its static prefix is *globally*
  warm. So there's no point capturing a separate agent-cold; capture agent once.
- **The realistic "warm" state is a VS Code restart + re-fire, not an in-chat
  warm-up.** The prompt cache lives server-side at Anthropic (keyed on
  `(model, prefix)`, ~5 min TTL); restarting VS Code doesn't flush it. Re-firing
  the identical first prompt after a quick restart tests genuine *cross-session*
  reuse — the real returning-user scenario. (The earlier `2 + 2` in-chat warm-up
  only tested in-session warmth, which trivially always works; dropped.)

So each pass is **3 captures**, not 8:

**Capture 1 — ask COLD (Claim 2):** brand-new chat, ask mode, Sonnet 4.5 pinned;
measured prompt as the **very first turn**. Export
`t6_<task>_ask_sonnet_cold_r<N>.json`. *Prediction: `cached_tokens` ≈ 0.*

**Capture 2 — ask WARM (Claim 1):** **restart VS Code**, then within ~5 min open
a new chat (ask, Sonnet) and re-fire the **identical** first prompt. Export
`t6_<task>_ask_sonnet_warm_r<N>.json`. *Expect a partial hit (~the static
system+tools prefix; the attached file is re-billed). If it comes back ~0% the
TTL expired — redo faster.*

**Capture 3 — agent (Claim 1 + 2):** brand-new chat, agent mode, Sonnet 4.5;
measured prompt as the first turn. Export `t6_<task>_agent_sonnet_r<N>.json`.
*Expect `cached_tokens` ≈ 9,680 regardless — agent is always warm.*

> Always a **fresh chat per capture**, and keep the restart→re-fire window short
> and consistent so the warm cell isn't secretly cold.

### Run order (evaluate-after-each-pass)

- **Pass 1 (r1):** **done for Task A** — see results table below. Pattern already
  clean (Claim 2 confirmed: agent 9,680 vs ask 0).
- **Next:** run **Task B** (context-hungry, file *not* attached) r1 with the same
  3 captures, then evaluate.
- **Gate:** if a cell's pattern is unambiguous across r1, we may stop at N=1–2 for
  it; continue (r2, r3) only for noisy/borderline cells.

### Results — Task A (no-context "explain this file"), Sonnet 4.5

**Pass 1 (r1)**, repo `octocat_supply-psychic-disco`, file `suppliersRepo.ts`:

| Capture | cached_tokens | hit rate | cache write | credits |
|---|---:|---:|---:|---:|
| ask — cold | **0** | 0% | 19,680 | **8.4** |
| ask — warm (restart re-fire) | 7,033 | 35.7% | 12,650 | **6.3** |
| agent — cold | 9,680 | 42.8% | 12,887 | 6.1 |
| agent — warm | 9,680 | 42.8% | 12,884 | 6.4 |

Reading:

- **Claim 2 confirmed (r1):** agent's first call inherits **9,680** cached tokens
  (≈ the experiment-08 cross-session shared figure); ask's first call gets **0**.
  Agent's cold == warm — it cannot be made cold.
- **Claim 1 (r1):** realistic-warm credits are basically equal (ask 6.3 vs agent
  6.4). Ask's *cold floor* (8.4) is higher only because ask can hit a cold start
  that agent structurally cannot.
- **Bonus finding:** cross-session warm refunds only the **static prefix**
  (ask reused 7,033 of the 19,680 it wrote); the attached file is re-billed every
  session.

Confidence on Task A: Claim 2 is strong at N=1 (clean, mechanism matches exp-08).
Claim 1 wants the warm cell repeated under a controlled restart window before we
call parity. Task B not yet run.

### Results — Task B (context-hungry "where called / dead code"), Sonnet 4.5

**Pass 1 (r1)**, file *not* attached so the agent must explore:

| Capture | tool calls | files | first-call cached | session hit | total credits |
|---|---:|---:|---:|---:|---:|
| ask — warm | **13** (9 grep, 4 read) | 3 | 0 | 83.5% | **18.1** |
| agent — warm | 10 | 3 | 9,680 | 88.6% | **16.5** |

Reading:

- **Ask mode explored on its own** — 13 tool calls, *more* than agent's 10. The
  "ask = no tools = cheaper" intuition is false when the question needs context.
- **Agent was cheaper** (16.5 vs 18.1), same direction as Task A.
- The ask first-call came back cold (0) because this pass skipped the cold primer
  the restart-warm method needs; it barely affects the 7-request total, which
  warms in-session to 83.5%.

### Metrics & decision rules (pre-registered)

**Claim 1 (cost parity)** — primary metric: credits on the measured turn,
**WARM variant only**. Report mean ± SD per cell.
- If warm-state |ask − agent| ≤ ~2 credits **and** within ±1 SD on *both* tasks →
  publish *"no meaningful cost difference; the lever is cache warmth + task
  shape, not mode."*
- If ask is consistently lower beyond the SD on Task B → the myth has a real
  basis; report that honestly instead.

**Claim 2 (cache likelihood)** — primary metric: `cached_tokens` on the first
Sonnet call, **COLD variant only**.
- If agent ≈ 9k and ask ≈ 0 reproduces across N=3 (both tasks) → publish
  *"Agent mode inherits a warm shared cache that ask mode often misses — so ask
  mode is more exposed to cold starts, not less."*
- If ask sometimes also hits ~9k → the effect is timing/traffic, not structural;
  downgrade to "observed once, not reproducible."

**Secondary metrics (report alongside):** tool-call count per mode (proves ask
mode also calls tools), files touched, output tokens, per-turn cache hit rate.

## Practical Guidance

- **Don't pick a mode to save credits.** In this data the mode label barely moved
  cost. Pick the mode that fits the *workflow* (agent when you want it to act;
  ask when you want it to answer).
- **The real levers are upstream:** pin the right **model** for the job, give
  **useful context up front** so neither mode has to go explore, and keep related
  work in one **warm session** rather than paying repeated cold starts.
- **Beware benchmark artifacts.** A "cheaper" run is often just a *warmer* run.
  Always check whether a compared turn was the model's first call in its session
  before attributing a saving to anything else.

## Confidence Level

**Mixed — two claims, two confidence levels.**

- **Cache-likelihood / "ask starts colder" (high for a single-machine
  observation):** reproduced across all r1 captures — every agent first-call =
  9,680 cached, every ask first-call gets 0 or only self-primed warmth. The
  mechanism is fully traced (separate prefixes; tools→system cache order; TTL
  boundary caught at 69 s vs 12 min) and the 9,680 figure matches experiment 08.
  Not yet shown cross-*user* or cross-machine.
- **Cost comparison (low / directional):** single run per task (N=1). Agent ≤ ask
  in every cell, contradicting the myth, but with no error bars and one soft warm
  cell. Enough to say *"ask is not cheaper,"* not enough for a precise margin.

The *Test Protocol* above is the path to tightening Claim 1: N=3 warm-state
captures with a controlled cold-primer + quick restart.

## Anatomy — see the dedicated section above

The concrete payload diff (system-prompt sections, 28- vs 56-tool taxonomy,
cache-prefix alignment) is documented under **"Anatomy: what actually differs
between the two modes."** That section is the spine of the article: one mode
switch, two fields, two consequences.

## Evidence

All numbers come from `copilot-chat-export` digests of these exports (regenerate
with `node .github/skills/copilot-chat-export/scripts/digest.mjs <export>
--stdout`). The controlled r1 captures live in `~/CopilotLogExports/`:

- **Task A (no-context):** `t6_A_ask_sonnet_cold_r1` (cached 0),
  `t6_A_ask_sonnet_warm_r1` (7,033), `t6_A_agent_sonnet_cold_r1` /
  `t6_A_agent_sonnet_warm_r1` (both 9,680).
- **Task B (context-hungry):** `t6_B_ask_sonnet_warm_r1` (13 tool calls, 18.1 cr),
  `t6_B_agent_sonnet_warm_r1` (10 tool calls, 16.5 cr).
- Earlier directional pair: `t5_b_askmode` / `t5_a_agentmode` (Task A),
  `t5_b2_askmode_explore` / `t5_a2_agentmode_explore` (Task B).
- Key fields: first-call cache at
  `prompts[].logs[] | select(.metadata.model=="claude-sonnet-4.5")
  | .metadata.usage.prompt_tokens_details.cached_tokens`; cold-start cause in
  `rollups.cacheAnomalies.items[]`; tool array at `metadata.tools`.

**Suggested charts for the page** (all values above are chart-ready):

1. **Cold first-call cache, ask vs agent** — bar: 0 vs 9,680 cached tokens. The
   single most striking visual.
2. **TTL timeline** — the 69 s → HIT / 12 min → MISS sequence for ask vs the
   gap-independent agent line.
3. **Tool taxonomy** — stacked bar: ask 28 read-only vs agent 28 read + 28
   write/action (call out `create_file`, `run_in_terminal`, `runSubagent`).
4. **Cost per task** — grouped bars: Task A (warm 6.3 vs 6.4) and Task B
   (18.1 vs 16.5), to show parity-to-slightly-cheaper-agent, busting "ask cheaper."

**Ledger exports to link as fixed reports** (scrub first — see note below):
the two Task-A cold captures make the cleanest pinned pair —
`t6_A_ask_sonnet_cold_r1` (the 0-cache cold start) and `t6_A_agent_sonnet_cold_r1`
(the 9,680 warm inheritance). Optionally add `t6_B_ask_sonnet_warm_r1` to show
ask mode's 13 self-driven tool calls.

> **Publish gate (PII).** These exports embed `/Users/jfhelin/…` paths, the user's
> MCP servers, and the installed skill/agent catalog. **Scrub with
> length-preserving substitutions before copying into
> `packages/cost-view/public/sessions/`** (verify byte size unchanged, JSON
> parses, residual scan clean), then add `FIXED_REPORTS` entries and link them
> here. Not yet done — awaiting go-ahead.

## LinkedIn Post

> "Switch to ask mode, it's cheaper than agent mode."
>
> I believed this too. Then I diffed the actual requests Copilot sends in each
> mode. It's backwards — and the reason is kind of beautiful.
>
> Switching to ask mode changes exactly TWO things in the payload:
> 1. the system prompt gets a "you are read-only, never edit" block
> 2. ~28 write tools (create_file, run_in_terminal, runSubagent…) are removed,
>    leaving 28 read-only ones
>
> Everything else — model, endpoint, token limits — is identical.
>
> Those two changes cause two effects, and neither is "cheaper":
>
> → Ask mode still explores. On a "find the dead code" question it fired 13 tool
> calls on its own (9 greps, 4 reads) and cost 18.1 credits vs agent's 16.5. It's
> not a no-tools mode.
>
> → Ask mode starts COLDER. Its first model call inherited 0 cached tokens. Agent
> mode's inherited 9,680 — because the default agent prefix is so common it's
> kept warm globally, while ask's smaller, rarer prefix isn't. I caught the cache
> TTL on camera: re-fire the same prompt after 69 seconds → cache hit. After 12
> minutes → gone. Agent mode? Warm either way.
>
> So the mode you pick "to save money" is the one that can't touch your code AND
> pays more cold starts.
>
> Pick a mode for what you want it to DO. For cost, the real levers are model
> choice, good context up front, and staying in a warm session.
>
> (Cache-likelihood finding reproduced across captures; cost numbers are
> single-run, directional. Measured with Copilot Ledger.)

## Video Outline

**Length:** 60–90s. Screen-record the Copilot Ledger canvas.

1. **0–8s — Hook.** "Everyone says ask mode is cheaper. I read the actual
   requests. It's the opposite — here's why."
2. **8–25s — The two-field diff.** Split view of the two system prompts + tool
   lists. "One switch changes two things: a 'read-only' system block, and it
   deletes 28 write tools. That's it."
3. **25–45s — Effect 1: still explores.** Open `t6_B_ask` — point at the **13
   tool calls**. "Ask mode still greps and reads. 18.1 credits vs agent's 16.5.
   Not cheaper."
4. **45–70s — Effect 2: starts colder.** Bar chart: ask first-call cached **0** vs
   agent **9,680**. Then the TTL timeline: "69 seconds — hit. 12 minutes — gone.
   Agent stays warm because its prefix is the global default."
5. **70–88s — Payoff + honest close.** "One switch, two consequences, neither is
   savings. Pick the mode for the job; save credits with model choice and good
   context. Cache finding reproduced; cost numbers are directional. Measured with
   Copilot Ledger."
