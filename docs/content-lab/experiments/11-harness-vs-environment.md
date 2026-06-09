# You can't trust an N=1 agent benchmark — and what actually differs between Copilot and Claude environments

> **Status: PLANNING.** Two-act article. **Act 1** (the lead) is the *N=1 is not
> trustworthy* argument, anchored on a **same-task cost spread we measured at ~18×
> across six Claude CLI runs** `[HAVE]`. **Act 2** decomposes what genuinely
> differs between the environments once you stop ranking and start controlling.
> Numbers marked `[HAVE]` are captured; everything else is `TODO`. Cluster **D ·
> Harness & Environment**, stable ID `11`.

## LinkedIn Hook

I ran the **same task, same repo, same prompt, same model family** six times in
one agent. The cost ranged from **4.7 to 84.3 credits — an ~18× spread.**
So when a slide tells you one agent is "1.97× more expensive" than another on a
**single run each**… that ratio is a hypothesis, not a ranking — it's well inside
the band a stochastic agent can swing on its own.

---

# Act 1 — Why an N=1 run can't rank two agents

## The finding that starts the article `[HAVE]`

We ran "explain this repository" on the Claude CLI — one fixed repo at a pinned
SHA, the identical prompt — **six times**, nothing else changed but the model
snapshot (3× Sonnet 4.5, 3× Sonnet 4.6). Result:

- **Cost varied ~18×** (≈**4.7 → 84.3** token-normalized credits).
- **Honest caveat up front:** those six pool *two* adjacent Sonnet snapshots, so
  the 18× is "default-snapshot + agent-exploration" spread, not pure single-snapshot
  noise. Even so, the swing is dominated by exploration, not the version bump —
  and it dwarfs the slide's 1.97×. The cleaner test we still owe is **≥10 reps on
  one pinned snapshot** to report the within-snapshot band on its own `[TODO]`.
- The driver was pure **exploration round-trips**: the cheap runs answered after
  **3 requests / 1 tool call**; the expensive ones fanned out to **18 requests /
  10 tool calls** before answering. Same question — different amount of *looking
  around*.
- **Wall-clock did not track cost:** some of the *cheapest* runs were the
  *slowest*. "Faster" and "cheaper" are not the same axis.

A second, independent corroboration: the new Copilot-CLI runner showed a **1.9×
credit spread in just two reps** of an equivalent task `[HAVE]`. Run-to-run
variance is not a Claude quirk — it shows up in a different tool too.

> **The point:** agent runs are *stochastic search*. The number of round-trips an
> agent takes is a random variable with a wide distribution. Sampling it **once
> per tool** generates an anecdote and a hypothesis — it cannot support a stable
> cost/speed *ranking* between two tools.

## The slide, as Exhibit A (not a strawman)

The viral example: "Copilot CLI vs Claude Code on Sonnet 4.6" — Copilot CLI
**$0.1904 / 10m21s** vs Claude Code **$0.3758 / 3m42s** over two tasks
("explain this repo", "find and fix the bug"), one run each. Conclusion on the
slide: *Claude Code is 1.97× more expensive, 2.8× faster.*

We are **not** saying its numbers are fabricated. We're saying a **1.97× ratio
built from N=1** is **underdetermined**. Be precise about what our evidence does
and doesn't show: our ~18× is from the **Claude CLI**, not the slide's exact
Copilot-CLI-vs-Claude-Code pairing. It is therefore not a variance *bound* on
those two specific tools — it's an **existence proof** that same-task agent cost
can swing by multiples under nearly matched conditions, plus early Copilot-CLI
evidence (1.9× in 2 reps) that the effect isn't Claude-only. Given that, a
single run per tool **can't tell you** whether the observed 1.97× is a stable
tool effect or one draw from a broad run-to-run distribution. **Treat the slide's
ranking as a hypothesis, not a result** — until someone reports repeated runs and
spread on its exact cells.

## What it would actually take to make the claim

To say "Tool A costs more than Tool B" with a straight face you need: **≥10–20
reps per cell**, the **spread reported** (not just a median), **outcome quality
scored** (did the bug task actually pass?), **TTFT/tokens-per-sec separated from
wall-clock** (which is mostly tool execution + network, not model speed), and a
**single normalized billing unit**. The slide has none of these. Most "X vs Y"
agent benchmarks have none of these.

This is the bridge into Act 2. N=1 runs are still useful for **finding
mechanisms** — prompt size, MCP injection, billing units, request counts — they
just can't *rank* tools. So once you stop ranking, the useful question becomes
**"what genuinely differs between these environments, and how much of it can you
control?"** Act 2 uses small-N runs as **diagnostics**, and reserves
ranking/equivalence claims for repeated, preregistered cells.

---

# Act 2 — What actually differs between the environments

> Subjects: **Copilot in VS Code (E1)**, **Claude Code in VS Code (E2)**, and the
> **Claude CLI (E3)**. (The Copilot CLI from the slide is its *own* fourth harness;
> we use it in Act 1 for variance, and note where it belongs, but the IDE story is
> E1–E3.) The job here is to **decompose** cost/latency deltas into harness vs
> environment instead of collapsing them into one label.

## Hypothesis (testable — split into two claims of different strength)

The byte-identical-prompt evidence only covers the two **Claude** environments. So
the thesis is deliberately split — do not let the strong claim's evidence leak
onto the weak one:

> **Strong claim (E2 ↔ E3, well-supported).** Claude Code in VS Code (`sdk-ts`)
> and the Claude CLI (`sdk-cli`) expose the *same* SDK substrate when version and
> model are pinned — we measured a byte-identical system prompt bar the
> billing-header label, the cwd-derived memory path, and a git-status block.
> `[HAVE]` Therefore any cost/latency gap between these two is **environmental**
> (MCP/context size, billing unit, router hop, version pin), not a harness
> difference.
>
> **Weak claim (E1 vs the Claude pair, exploratory).** Copilot's native VS Code
> agent runs the *same model weights* but a **different product harness** (its own
> prompt family, skills/agents catalog, tool orchestration). Differences here may
> be genuine prompt/tool/orchestration effects — *not* merely "environment." We
> describe what we see; we do not claim parity.

**Operational hypothesis to test:** *If model, version, prompt, repo state, and
tool/MCP context are held constant, then most measured cost differences should be
explained by token volume + billing policy, and remaining latency differences by
routing/tool-execution rather than model reasoning.*

**Predeclared falsifiers (write these down before capturing).** The hypothesis is
**wrong** if, after matching model/version/MCP/tool-context/prompt:
- E2 vs E3 still shows a consistent **>25–30% token-normalized** cost gap; or
- E2's billed usage diverges from its visible context by tokens we can't account
  for (hidden router/system tokens); or
- one environment **repeatedly** succeeds/fails T2 despite matched capability; or
- the pinned model alias resolves to a **different effective snapshot** across
  environments.

The article must answer three questions concretely (sections below):
**(1) what actually differs** between the three, **(2) what the speed and cost
deltas are attributable to**, and **(3) how to configure each so you get similar
quality and cost.**

## Why benchmarks like this mislead — the 6 confounds

This list is the spine of the article **and** the "fair comparison checklist" for
the SE-colleagues summary.

1. **Mismatched billing units.** "USD total" hides that Copilot bills **GitHub AI
   credits** (model multipliers, Auto's 0.9×) while Claude Code bills **Anthropic
   token pricing or a flat subscription**. A ~2× "cost" gap can be pure pricing
   policy. *Fix:* normalize to **tokens under one price table** (our digests
   already do this — `rollups.cost.credits` vs a shared `PRICING_TABLE`), and
   report native-billed and token-normalized side by side.
2. **Uncontrolled context size.** Same model ⇒ same weights; the only thing that
   changes prefill cost/latency is **how many tokens you push**. MCP load
   dominates: we measured Claude-in-VS-Code at **86k–131k** prompt tokens (223–377
   MCP tools) vs a pinned CLI at **26k–57k** with 0 MCP. `[HAVE]` That alone can
   produce a 2–5× cost/TTFT swing with zero harness difference.
3. **N=1, no variance — the one we already proved (Act 1).** Two tasks, one run
   each. Agent runs are stochastic (search luck, round trips, retries). We
   measured a **~18× cost spread** re-running one task in one tool `[HAVE]`, so a
   1.97× / 2.8× single-run ratio sits **inside** the run-to-run band. *Fix:*
   ≥10–20 reps per cell, report spread, not a median.
4. **No outcome quality.** The slide measures cost and wall-time but **not whether
   the bug was actually fixed**. "Faster" can mean "less thorough." *Fix:* score
   task completion (objective pass/fail for the bug task).
5. **Wall-clock is the wrong latency metric.** It includes tool execution (e.g.
   spinning a Docker MCP server), router hops, approval gates, and rate-limit
   backoff — none of which is "the harness being faster." *Fix:* report **TTFT and
   tokens/sec** from the API (relay timestamps) separately from tool/host time.
6. **Everything labeled "the harness."** Model version, MCP set, skills/tools
   catalog, repo state, and the verbatim prompt are all collapsed into one label.
   *Fix:* hold them constant; vary **one knob at a time**.

## Why This Matters

SEs and customers make platform decisions off slides like this. If the real
levers are *configuration* (MCP, model, Auto Mode, context hygiene) and *billing
unit*, then "switch harness" is the wrong takeaway — "configure your harness and
price it correctly" is the right one. This directly reinforces official guidance:
choose the right model, use Auto Mode, provide useful context, avoid excessive
context, review tools/skills periodically.

---

## (1) What actually differs between the three environments

On the same chosen model the **model weights are identical** — so reasoning
quality starts from the same place. Everything that differs is around the model:

| Dimension | Copilot in VS Code | Claude Code in VS Code | Claude CLI |
|---|---|---|---|
| Model weights | identical (when you pick the same model) | identical | identical |
| System prompt | Copilot agent prompt **+ skills/agents catalog** (env-sized) | Claude Agent SDK prompt | Claude Agent SDK prompt |
| Prompt vs the others | different *family* (Copilot) | **byte-identical to Claude CLI** bar cwd/git block `[HAVE]` | — |
| Built-in tools | Copilot tool set + installed skills | 22-core SDK tools + host tools | 22-core SDK tools + 4 host tools |
| MCP injection | **opt-out**, machine + workspace (heavy by default) | **opt-out**, same VS Code config (heavy) | **opt-in** (0 by default) |
| Version control | **pinned** by the Copilot stack (e.g. 2.1.112) | pinned by the Copilot stack | **user-controlled** via npm |
| Billing unit | GitHub **AI credits** (model multiplier, Auto 0.9×) | GitHub **AI credits** (`copilotUsageAic`) | Anthropic **token price** or flat subscription |
| Network path | via GitHub / MS router | via GitHub / MS router | **direct** to Anthropic |

The key reductions:

- **Claude-in-VS-Code vs Claude-CLI is the *same harness* (same SDK).** Their only
  real differences are **environmental**: MCP load, billing unit, the router hop,
  and the pinned-vs-user version. There is *no* intrinsic harness difference to
  find here — we proved the system prompt is byte-identical. `[HAVE]`
- **Copilot-in-VS-Code vs the Claude pair** is the only place a genuine
  *prompt/tool-family* difference exists — but on the same model that shapes
  *behavior/verbosity*, not raw capability, and it's swamped by the MCP/billing
  factors below.

## (2) What the speed and cost differences are attributable to

Decompose every headline number into its cause before attributing it to "the
harness." Ranked by how much they move the result:

**Cost** (`cost ≈ tokens × price-per-token`):
1. **Billing unit / multiplier (often the biggest).** GitHub credits vs Anthropic
   tokens vs a flat subscription are different *prices for the same tokens*. This
   alone can explain a ~2× gap. *Always normalize to tokens under one price table
   before comparing.*
2. **Context size = token count.** MCP tool defs dominate: **26k vs 131k** prompt
   tokens on the same model. `[HAVE]` More tokens every turn → more cost.
3. **Round trips & model defaults.** Extra discovery/tool round trips, and an
   unpinned model defaulting differently (the CLI defaulted to **4.6**, VS Code to
   **4.5**) `[HAVE]` — different price tier and behavior.
4. **Harness prompt size.** Copilot's skills/agents catalog vs the leaner Claude
   prompt — real but the smallest lever.

**Speed** (wall-clock is mostly *not* the model):
1. **Prefill / TTFT — scales with context size.** The MCP-heavy environment pays
   2–5× more prefill *before the first token*.
2. **Tool execution time.** Spinning a Docker MCP server, browser launch, etc. —
   host time, not model time.
3. **Network / router hop.** VS Code → GitHub/MS router adds fixed latency +
   throttling risk; the CLI talks to Anthropic directly. Small vs prefill, but real.
4. **Round trips.** Each search→read→answer cycle is another full request.

Same-model reasoning speed (tokens/sec at the API) is roughly equal — so a "2.8×
faster" wall-clock is almost entirely items 1–4, i.e. **environment**, not harness.

## (3) How to get similar quality and cost across the three

A per-lever parity recipe — do these and the three converge:

**For similar quality**
- **Pin the same model explicitly** in all three — never trust defaults (4.6 vs
  4.5 drift). Same weights ⇒ same reasoning floor.
- **Give the same context and the same verbatim prompt.** Precise prompts cut
  discovery round trips equally everywhere.
- **Match the *capability* set:** give each agent the same tools/MCP it needs for
  the task — but only those. Over-stuffed tool context *hurts* selection quality.
- **Minimize irrelevant skills/tools** so the model isn't distracted (review
  tools/skills periodically — official guidance).

**For similar cost**
- **Normalize the billing unit** when you compare (token-normalized USD), and
  state native-billed separately. Don't compare credits to tokens to dollars.
- **Match the MCP set:** `chat.mcp.enabled: false` (or a trimmed `.vscode/mcp.json`)
  in VS Code to mirror the CLI's 0-MCP default — or add the same servers to the CLI.
- **Account for multipliers** (Auto's 0.9×, per-model credit weight) before
  declaring a winner.

**For similar speed**
- **Equalize context size** (the MCP step above) — this is the dominant TTFT lever.
- **Treat the router hop as fixed VS Code overhead**; don't attribute it to the
  model.
- **Reduce round trips** with precise prompts and up-front context.

**For version parity**
- **Pin the CLI to VS Code's SDK version** (`npx -y @anthropic-ai/claude-code@<ver>`)
  — we matched `2.1.112.b02`. `[HAVE]` Use `-p` (`sdk-cli`) to match the SDK
  identity VS Code uses (`sdk-ts`); residual difference is just that label.

Net: once model, MCP set, skills, prompt, version, and **billing unit** are
matched, the three environments produce comparable quality and comparable
token-normalized cost — the remaining gap is the **router hop** (a fixed VS Code
tax) plus run-to-run noise.

---

### Environments (3)
| ID | Environment | Identity / entrypoint | Billing unit | Capture method |
|----|---------|----------------------|--------------|----------------|
| E1 | Copilot in VS Code | Copilot native agent / sdk | GitHub AIC | chat export JSON → `digest.mjs` |
| E2 | Claude Code in VS Code | Claude SDK / `sdk-ts` (proxy) | GitHub AIC | chat export JSON → `digest.mjs` |
| E3 | Claude CLI (Anthropic) | Claude SDK / `cli` (interactive) & `sdk-cli` (`-p`) | Anthropic tokens/sub | relay + transcript → `claude-digest.mjs` |

> Note the entrypoint subtlety we found: `claude -p` routes through **`sdk-cli`**
> (SDK identity), interactive `claude` through **`cli`** ("Claude Code" identity).
> Pick one and state it; don't mix.

### Tasks (fixed, verbatim prompts, mirror the slide + a floor)
- **T0 `hi`** — context-window floor, no work. Isolates *initial* overhead.
- **T1 "explain this repo"** — read/discovery-heavy.
- **T2 "find and fix the bug"** — multi-step, tool-using. **Seed a known bug with
  a failing test** so completion is objective and repeatable.

### Control conditions (the normalized baseline)
- **Same repo + git state** for all three (the octocat demo repo); **reset to a
  clean fixture commit before every run** (esp. T2).
- **Pin the model AND record the resolved snapshot**: Sonnet **4.5** primary; a
  second sweep on **4.6** to match the slide. Don't trust the alias — log the exact
  `…-YYYYMMDD` snapshot each environment reports.
- **MCP OFF everywhere** (`chat.mcp.enabled: false` in VS Code; 0 servers in the
  CLI) for the clean baseline, **plus an MCP-ON sweep** to quantify the knob.
- **Skills/agents minimized** for the Copilot side (the cleaned-skills repo).
- **Randomize run order**; tag cold vs warm cache.
- **≥3 reps** per cell for a smell-test; **10–20+ reps** on the cells where you
  want to claim equivalence (E2↔E3 cost). At N=3 you may only say a ratio is *not
  robust*, never that environments are *equivalent*.

### Knob-sensitivity sweep (proves deltas are config-driven)
Hold harness + task fixed; flip one knob; measure Δ:
- MCP off → on (Δ prompt tokens, Δ cost, Δ TTFT)
- skills full → minimized (Δ system tokens)
- model 4.5 → 4.6 (Δ default behavior, Δ cost)
- version pinned → drifted (Δ tool roster)

---

## Data-gathering protocol

For every run, record into the `captures` table (session DB) and produce a digest.

**Capture:**
- E3 Claude CLI — start relay (`packages/skill-claude/scripts/claude-relay.mjs`),
  `ANTHROPIC_BASE_URL=…` then `npx -y @anthropic-ai/claude-code@<ver> --model <m> -p "<task>"`.
- E1/E2 VS Code — run, then **export chat** → JSON in `~/CopilotLogExports/`.

**Digest (single source of truth for cost/cache — never recompute by hand):**
```sh
# VS Code (Copilot or Claude-proxy) exports:
node .github/skills/copilot-chat-export/scripts/digest.mjs <export.json> --stdout
# Claude CLI transcript + paired relay capture:
node packages/skill-claude/scripts/claude-digest.mjs <transcript.jsonl> --capture <capture.json> --stdout
```

**Metrics to pull per run:**
- *Initial context:* system tok / built-in-tool tok / MCP-tool tok / history tok /
  `prompt_tokens`.
- *Work:* total in/out tokens, `cacheCreationTokens`, `cachedTokens`,
  `cacheHitRate`, `requests` (round trips), `toolCalls`.
- *Cost — report **three** distinct things, never collapse them:*
  1. **Native billed** — what the platform actually charges (GitHub credits incl.
     model multiplier + Auto 0.9× for E1/E2; Anthropic USD or flat subscription for
     E3). This is real money and is **not** equalizable.
  2. **Token-normalized counterfactual USD** — `cost.totalUsd` under the shared
     `PRICING_TABLE`: "what this usage *would* cost at one common token price." Valid
     for comparing **token efficiency**, explicitly **not** actual customer spend.
  3. **Raw resource usage** — input / output / cache-write / cache-read / tool /
     context tokens. The ground truth both costs derive from.
- *Latency — tiered by what each capture path can actually see (see Limitations):*
  - **Comparable across E1/E2/E3:** externally timed wall-clock, request count,
    tool-call count, total tokens.
  - **E3 only (relay):** TTFT, stream duration, tokens/sec. Do **not** assert
    cross-environment tokens/sec parity unless equivalent stream timing exists for
    all three.
- *Model identity:* record the **most specific model snapshot** each environment
  reports (e.g. `claude-sonnet-4-5-20250929`), to catch alias→snapshot drift.
- *Cache state:* tag each run **cold vs warm**; randomize run order; keep first-run
  cache-creation separate from later cache-hit runs.
- *Outcome:* T2 pass/fail (does the seeded test go green?) + "only expected files
  changed?" + "tests not deleted/weakened?"; T1 blind-rubric score.

---

## Measurement equivalence & limitations (write this section in the article)

The three capture paths do **not** observe the same surface. Be explicit or the
token/cost comparison is built on sand:

- **E3 (relay)** sees raw Anthropic request/response traffic.
- **E1/E2 (VS Code chat export)** may omit hidden/system messages, router-injected
  content, retries, or billing adjustments. State whether reported tokens are
  **model-reported usage** vs locally estimated, and whether cache read/write are
  present equally.
- **E2 is a black box.** The GitHub/MS router can alter routing, model alias, cache
  behavior, rate-limit/retry policy, headers, or schema serialization. Byte-identical
  *exposed* prompts (E2≈E3) prove **exposed-prompt parity, not transport/request
  parity.** Phrase conclusions as "observable exported usage," and flag any
  unexplained gap between E2's visible context and its billed usage as a falsifier.

## Analysis & figures
- **Fig A** — initial context-window decomposition, 3 environments (stacked bar).
  *Expected:* MCP tool defs dominate the spread. `[partial HAVE]`
- **Fig B** — same task: **native-billed vs token-normalized vs raw tokens**.
  *Expected:* much of the slide's "1.97×" is the billing unit, not tokens.
- **Fig C** — knob-sensitivity table (Δcost / Δtokens per knob). *Expected:* MCP
  and model dwarf "harness".
- **Fig D** — latency: **wall-clock + request/tool counts across all three**; TTFT /
  tokens-per-sec **for E3 only**, clearly labeled as not cross-comparable.
- **Fig E** — cost vs **outcome quality** scatter (the axis the slide omits).
- **Raw-points rule:** every cell shows all reps (median + min/max/IQR), not just a
  ratio — request count, prompt tokens, cache R/W, output tokens, native billed,
  token-normalized, outcome score.

## What we already have `[HAVE]`
- **The 18× variance run (Act 1 evidence):** 6× "explain repo" on Claude CLI,
  pinned repo/prompt, Sonnet 4.5 ×3 + 4.6 ×3 → ≈**4.7–84.3** token-normalized
  credits; cheap = 3 req/1 tool, expensive = 18 req/10 tools; wall-clock did not
  track cost. Digests under `~/.copilot/session-state/.../files/` E3 reps.
- **Copilot-CLI variance corroboration:** runner showed **~1.9×** credit spread in
  2 reps (native AI-credit billing, exact-match to the CLI's own printout).
- Matched-pair baseline `~/CopilotLogExports/matched-pair-2.1.112/` (Claude CLI
  `sdk-cli`, 2.1.112.b02, Sonnet 4.5, 0 MCP) + digest.
- VS Code Claude refs: `Claudeok.json` (sdk-ts, 223 MCP, pt 86,085),
  `hi_VSCInsider_claude.json` (sdk-ts, 377 MCP, pt 131,407).
- Copilot native VS Code: `hi18.json` p2.l0 (37 skills) and `t6_*` (15 skills).
- The byte-identical-system-prompt result (sdk-cli vs sdk-ts) — supports the
  **strong claim only**.
- **Missing:** ≥10–20-rep variance bands on *every* environment (not just E3);
  T1/T2 task runs on each environment; objective T2 bug fixture; per-environment
  model-snapshot capture; equivalence audit.

## Confidence & honesty guardrails
- **Two claims, two confidence levels.** E2↔E3 substrate parity = **measured**
  (exposed-prompt only). E1-vs-Claude = **exploratory**, single product harness.
- Label cost/latency ratios **single-machine, small-N**. At **N=3** only say "the
  observed spread was comparable to / larger than the gap → the headline ratio is
  not robust." Claiming **equivalence** needs a predefined margin and ~10–20+ reps
  on the cells that matter.
- A subscription price is **real money** even though it isn't "intrinsic" — say so;
  token-normalized USD is a token-efficiency yardstick, not customer spend.
- T1 needs a **blind rubric** (factual-coverage checklist + hallucination penalty),
  evaluator blind to environment labels; T2 needs a clean-fixture reset + objective
  test.
- If a cell can't be controlled (e.g. can't disable a VS Code-injected MCP), report
  it as a limitation, not a hidden assumption.

## Preregistration (fill/lock BEFORE any capture — strongest anti-bias guard)

Commit this block to git before the first run. Do not edit it after capturing;
record deviations separately.

### Target repo (one, fixed)
- Repo: **`octodemo/octocat_supply`** (the demo repo the VS Code environments are
  already configured for).
- **Pin the commit:** SHA = **`890c7ae23e1a39022bf00a5ee08595f352d6155d`** (branch `main`,
  `octodemo/octocat_supply-psychic-disco`).
- **Clean-fixture reset before every run:** `git -C <repo> reset --hard <SHA> && git clean -fdx`
  (T1 is read-only so this mainly guards against drift; mandatory for T2 later).

### Fixed prompts (verbatim — copy/paste identically into all three)
- **T0 (floor, already have):** `hi`
- **T1 (the run):**
  `Explain this repository: its purpose, the main components/packages, and how they fit together.`
- Single user turn, no follow-ups. End the session after the first complete answer.

### Per-environment configuration
| | E1 Copilot in VS Code | E2 Claude Code in VS Code | E3 Claude CLI |
|---|---|---|---|
| Model | pick **Claude Sonnet 4.5** | pick **Claude Sonnet 4.5** | `--model claude-sonnet-4-5` |
| Version | (pinned by stack — record it) | (pinned by stack — record it) | `npx -y @anthropic-ai/claude-code@<match-E2-version>` |
| MCP off | `"chat.mcp.enabled": false` in user settings | same setting (shared VS Code) | `claude mcp list` shows none (default) |
| Entry | native agent | sdk-ts (proxy) | `-p` non-interactive (**sdk-cli**) |
| Capture | run → **export chat** to `~/CopilotLogExports/` | run → **export chat** | relay running → run via `ANTHROPIC_BASE_URL` |
| Skills | **minimize** (cleaned-skills repo) | n/a | n/a |

- **Record the resolved model snapshot** each environment reports (e.g.
  `claude-sonnet-4-5-20250929`) — verify all three match before trusting the cell.
- **Verify MCP-off took:** the digest must show **0 MCP tools** in the prefix.
  If VS Code still injects an MCP server you can't disable, log it as a limitation.

### Arms (each = 3 reps, randomized order, cold/warm tagged)
1. **core** — T1 × {E1, E2, E3}, 4.5, MCP off. *(9 cells)*
2. **mcp-arm** — T1 × E2, 4.5, **MCP on** (the workspace's normal server set).
   Isolates the MCP lever within one environment. *(3 cells)*
3. **model-arm** — T1 × E3, **4.6**, MCP off. Isolates the model-default confound. *(3 cells)*

### Capture → digest (single source of truth; never hand-compute cost)
```sh
# E1/E2 VS Code exports:
node .github/skills/copilot-chat-export/scripts/digest.mjs <export.json> --stdout
# E3 Claude CLI transcript + paired relay capture:
node packages/skill-claude/scripts/claude-digest.mjs <transcript.jsonl> --capture <capture.json> --stdout
```

### Primary metrics (record per rep; report all reps, not just the median)
prompt_tokens · system/built-in-tool/MCP-tool/history split · output tokens ·
cacheCreationTokens / cachedTokens / cacheHitRate · requests (round trips) ·
toolCalls · native-billed (credits / Anthropic USD) · token-normalized USD ·
wall-clock · (E3 only) TTFT + tokens/sec · model snapshot · T1 rubric score.

### T1 quality rubric (blind — answer key pre-filled from the repo @ pinned SHA)
Score each item 0 / 0.5 / 1; evaluator blind to which environment produced the
answer. Ground truth for **OctoCAT Supply** (a full-stack TypeScript demo app):
- [ ] **Purpose** — identifies it as the *OctoCAT Supply* demo web app (a
  supply-chain / ordering app used to showcase Copilot), not a library/CLI.
- [ ] **Components** — names the main folders and what each is:
  `api` (Express + TypeScript + SQLite + OpenAPI/Swagger backend),
  `frontend` (React 18 + Vite + Tailwind), `infra` (Bicep / Azure Container Apps),
  `demo` (walkthroughs), orchestrated by a top-level **Makefile**.
- [ ] **Not a workspaces monorepo** — credit if it correctly notes there is **no
  root `package.json`**; `api` and `frontend` are independent npm projects wired by
  the Makefile + `docker-compose.yml`. *(Calling it an npm-workspaces monorepo is a
  hallucination — penalize.)*
- [ ] **How they fit / data flow** — frontend (port **5137**) ↔ api REST/OpenAPI
  (port **3000**) ↔ SQLite (`api/data/app.db`); Docker/compose for deploy.
- [ ] **Build/run/test entry points** — `make install` / `make dev`; api scripts
  (`build`/`dev`/`test`/`db:seed`/`swagger:generate`); frontend Playwright `test:e2e`.
- [ ] *(bonus)* domain model — Headquarters→Branch→Order→OrderDetail→Delivery→
  Supplier/Product.
- [ ] **Hallucination penalty:** −1 per confidently-stated false claim (wrong
  framework, invented services, "monorepo with workspaces", etc.).
- [ ] **Actionability** (could a new dev get oriented from it?) 0–1.
- [ ] **Concision/readability** 0–1.

### Exclusion criteria
Drop a rep if: model snapshot differs from the cell's target; the agent errored/
rate-limited mid-run; MCP-off didn't take (unintended servers present); or the
session was accidentally multi-turn. Log every exclusion.

### Falsification thresholds
As in **Hypothesis** above: a consistent **>25–30% token-normalized** E2↔E3 cost
gap after matching, unexplained E2 billed-vs-visible token deltas, repeated
T-task win/loss despite matched capability, or model-snapshot drift each falsify
(or scope down) the strong claim.

---

## Deliverable 1 — Deep-dive article (this page, finished)
Fill the experiment-template sections following the **two-act spine**: Act 1
(N=1-can't-rank, anchored on the 18× finding) → Act 2 (what actually differs).
Within Act 2, **structure the evidence as two comparison classes** so the strong
evidence doesn't leak onto the weak claim:
- **Class 1 — E2 ↔ E3 (same Claude SDK substrate):** environment/billing/router
  comparison; this is where the strong, measured claims live.
- **Class 2 — E1 vs the Claude pair (different product harness):** same model
  weights, different prompt/tooling; describe what we see, don't claim parity.

Overall flow: **the 18× variance hook** → the slide as *underdetermined Exhibit A*
→ what an honest claim would require → the 6 confounds → **(1) what actually
differs**, **(2) what the speed/cost deltas attribute to**, **(3) the parity
recipe** → **Measurement equivalence & limitations** (incl. the E2 black box) →
Figs A–E with raw points (lead with the variance scatter) → fair-comparison
checklist + official-guidance reinforcement. The variance hook and the three
answer sections are the payoff. Publish a **fixed report** of one clean matched
pair as evidence (scrub paths/usernames first).

## Deliverable 2 — LinkedIn post (draft skeleton)
> I ran the **same task, same repo, same prompt, same model family** six times in
> one coding agent.
>
> The cost ranged from **4.7 to 84.3 credits. An ~18× spread.** Nothing changed
> between runs but the agent's luck in how much it explored (and an adjacent model
> snapshot).
>
> So when a slide tells me one agent is **"1.97× more expensive, 2.8× faster"**
> than another — **one run each** — I read it as a **hypothesis, not a ranking.**
> That ratio is well inside the band a stochastic, tool-using agent swings on its
> own.
>
> Once you stop ranking and start **decomposing**, the real differences show up —
> and they're mostly things **you** configure:
> - **Billing unit** — GitHub credits vs Anthropic tokens vs a flat subscription.
> - **Context size** — I measured **26k vs 131k** prompt tokens for the same model,
>   driven by MCP load, not "harness quality."
> - **Wall-clock ≠ model speed** — it's mostly tool execution + network.
>
> Takeaway: don't benchmark "Copilot vs Claude Code." **Pin the model, match the
> MCP/tool set, normalize the billing unit, repeat for variance, and score whether
> the task was actually done.**
>
> Full breakdown + the 18× data: [GitHub Pages link]

## Deliverable 3 — GitHub SE-colleagues summary (draft skeleton)
Audience: internal SEs who demo/compare these tools. More technical, less hooky.
- **TL;DR:** an N=1 agent benchmark measures **run-to-run variance**, not the
  tools — we saw an **18× spread** re-running one task. Same-model harness
  comparisons then mostly reduce to *config + billing unit*.
- **Lead with the variance result** (the 18× finding + the Copilot-CLI 1.9×
  corroboration): why single-run "X vs Y" slides are underdetermined.
- **The fair-comparison checklist** (the 6 confounds → 6 controls above).
- **How to configure each harness for a clean comparison** (pin version+model,
  `chat.mcp.enabled:false` or matched MCP, minimize skills, same repo, verbatim
  prompt, **≥10–20 reps**, report spread).
- **How to price it honestly** (token-normalized vs native-billed; Auto's 0.9×).
- **What we measured so far** (the `[HAVE]` evidence) and what's still open.
- **Talking point for the slide:** "Those numbers are plausible — but they're a
  single sample of a random variable. We measured ~18× same-task spread in one
  tool, so a single-run 1.97× should be read as a hypothesis, not a ranking. To
  turn it into a result you'd need repeated runs and spread on those exact cells —
  then most of what's left is configuration and billing policy, not which harness
  is smarter on Sonnet."

## Evidence
Matched-pair bundle + the four reference exports above; digests via the two skill
scripts. Pin one scrubbed matched pair as a fixed report once T1/T2 cells exist.
