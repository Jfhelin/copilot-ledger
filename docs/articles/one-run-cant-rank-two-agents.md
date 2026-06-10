#  One run can't tell two coding agents apart

There's a wave of them right now — decks and posts lining up GitHub Copilot against
the Claude CLI against the next tool, stopwatch in hand, reporting time, cost, and
cache hit-rate. They keep reaching different conclusions. They disagree because a
single timed run measures the wrong things: it captures run-to-run variance and local
configuration, and says almost nothing about whether the harness is actually
effective. It feels like evidence. It mostly isn't.

Here's the result this experiment *could* have been posted as:

> *Same model. Same repo. Same prompt. Copilot CLI delivered similar quality at about
> one-third the token-normalized cost of Claude CLI.*

That sentence is true for this run. It's also **not the conclusion** — because I
didn't run it once. I ran the **same task, same repo at a pinned commit, same pinned
model, same headless harness — ten times each, in both CLIs.** Forty runs. Nothing
changed between repetitions but the agent's own path through the code. Here's what
that one tempting slide hides.

## The setup (so the only variable is the agent)

- **Task:** one prompt, sent verbatim to both, no follow-ups — *"You are helping a
  new developer get productive in this repository. Explain what it is and its
  purpose, the main components and how they fit together, the data flow between them,
  and exactly how to install, run, and test it locally. Be specific and accurate."*
- **Repo:** [`octocat_supply`](https://github.com/octodemo/octocat_supply), a
  medium-sized full-stack TypeScript app we often use for demos — a React/Vite
  frontend and an Express + SQLite API — pinned to a single commit so every run
  saw exactly the same code.
- **Model:** Claude Sonnet 4.5 (the same API version on both sides).
- **Environment held flat:** MCP servers off on both sides; the repo's
  auto-loaded instruction files removed (more on why below). Two conditions —
  **BARE** (no memory file) and **TRIM** (one short, identical `CLAUDE.md` both
  harnesses load once).
- **10 repetitions** per harness per condition = **40 runs**, each digested for
  exact tokens, cost, cache, requests, and wall-clock, then **blind-scored for
  factual coverage** (facts present, out of 27) for answer quality.

This was [pre-registered before the results were read](https://github.com/Jfhelin/copilot-ledger/blob/main/docs/content-lab/experiments/12-cli-repeatability-envelope.md).

## Finding 1 — Hold *everything* fixed and the numbers still swing \~2×

Within a single harness, with identical inputs and one model snapshot, run-to-run
variation alone produced:

| Axis (same harness, 10 identical runs) | Spread, min→max |
| --- | --- |
| Token cost | up to **1.6×** |
| Wall-clock time | up to **1.8×** |
| Tool calls | up to **1.9×** |
| Output tokens | up to **1.9×** |
| Cache writes | up to **2.0×** |
| Model round-trips (requests) | up to **1.8×** |

Nothing changed but how much the agent *chose to look around*. The cheap runs
answered after 4 requests; the expensive ones fanned out to 7 (Copilot) or from 17
to 26 (Claude). This is the **repeatability envelope** — the band a single agent
swings through on its own. Any one number you quote is a sample from this band, not
a fixed property of the tool. (Loosen any control — pool two model snapshots, say —
and the band widens fast: an [earlier test](./why-n1-benchmarks-mislead.html) hit
\~18× that way.)

## Finding 2 — Cost separates the two harnesses; quality doesn't

Now both harnesses on one chart — **cost on the x-axis, blind quality on the
y-axis, one dot per run.**

<iframe src="./figures/cost-vs-quality-interactive.html" loading="lazy" scrolling="no" title="Cost vs quality across 40 headless runs — interactive: filter by harness and condition, hover any dot for its run" style="width:100%;height:720px;border:0;display:block;margin:0 0 12px"></iframe>

<noscript>

![Cost vs quality across 40 runs: Copilot clusters near $0.11–0.19, Claude near $0.22–0.53, both at the same quality height](./figures/cost-vs-quality-40-runs.svg)

</noscript>

*Filter by harness and condition above, and hover any dot for its run.*

Two things jump out:

- **Cost does separate.** In this sample the two clusters don't overlap: Copilot
  CLI averaged **$0.13** token-normalized per run, the Claude CLI **$0.36** — about
  **2.8×**. But look at *why*: per-request prefix size was nearly identical (\~22k
  tokens), and both harnesses reused it from cache at similar rates (\~0.82 vs
  \~0.89 hit — Claude isn't materially better at using a hot cache). The gap is
  **round-trips** — Claude averaged **16.4** model requests to
  Copilot's **4.5**. But Claude wasn't *looking harder*: both made about the same
  number of tool calls (\~13 per run). What differs is how those calls were
  **packaged** into requests — the explainer just below unpacks it.
- **Quality does not.** The dots sit in a flat band near the top — both harnesses
  scored about the same. Copilot averaged **21.0 of 27** facts covered, Claude
  **20.4** — close enough to be a tie, and well inside the run-to-run noise.
  Spending more — more requests, more tokens, more dollars — bought **no better
  answer**. And both sides got the *same* thing wrong: **every one of the 40
  answers repeated a stale port number** straight from the README instead of
  checking the config. Same coverage, very different prices.

To be explicit: **this is not "Copilot is better."** Copilot's quality edge here is
inside the noise, and Claude's higher cost is a *packaging choice on one task*
(sequential vs parallel tool calls), not a defect. The point is the opposite of a
ranking — it's that **one task, one run, cannot support a ranking at all.**

### Why Copilot reached the same answer for less

The round-trip gap looks like Claude *worked harder*. It didn't. Both harnesses ran
about the **same number of tool calls** — \~13 file and directory reads per run. They
looked at the same things. What differed is how those reads were **packaged**. Copilot
grouped them, firing **\~3 tool calls in one turn** (README, `package.json`, and the
directory tree together). Claude sent them **one at a time** — across all 20 of its
runs it never once batched two. So the same \~13 reads became **\~4.5 round-trips for
Copilot but \~16 for Claude**. And since every request re-sends the full \~22k-token
prefix, those extra round-trips *are* the cost gap.

It isn't the model, either — both sides ran the **same Claude Sonnet 4.5**. The
difference is the **harness's system prompt**: Copilot's tells the model to fire
independent tool calls in parallel; Claude's headless loop ran them one at a time. For
this task — twenty files you can read in any order — batching was simply the better
fit: a real efficiency win at no cost to quality. But it's a strategy that *suited this
prompt*, not proof one harness is better (that's reason #3 below, not #4). On work
where each step depends on the last, there's nothing to batch, and the same eager
instinct can over-read. The edge is structural and real — but still shaped by the task.

## The N=1 trap, quantified

Pick one Copilot run and one Claude run at random — a typical "bake-off." Depending
purely on *which two runs you happen to draw* from this very dataset:

- the **cost ratio** could read anywhere from **1.18× to 5.04×**, and
- the **quality "winner"** could be **Copilot by up to 7 points** *or* **Claude
  by up to 5 points** (on the 27-point coverage scale).

Same two tools, same task, same data — and a single-run comparison can hand the
"win" to either side. The headline is an artifact of the draw.

## So why *do* two similar runs differ? Four reasons, in order

When a single A-vs-B comparison shows a gap, there are only four things it can be —
and they're easy to confuse:

1. **Randomness.** The repeatability envelope above. Here it alone moved cost up to
   \~1.6×, time \~1.8×, cache work \~2×, *with every input identical*. This is the
   default explanation for any single-run gap, and usually the largest. And remember
   this band comes from a *tightly* controlled setup — loosen the controls and it
   blows open: a less precise [earlier run](./why-n1-benchmarks-mislead.html) saw
   what looked like the same runs diverge \~18×.
2. **Your environment — the part you control.** Skills, MCP servers, and
   auto-loaded memory files change what the model sees before you type a word — and
   they're *yours*, not the harness's. They move cost, too: the tool definitions a
   harness loads can be **half the prefix it re-sends on every request**, so every MCP
   server or skill you switch on taxes every round-trip. And the two CLIs don't ship
   the same tools — different counts, different schemas, different auto-loaded files —
   so an unmatched environment can swamp the harness difference you're trying to measure.
3. **The harnesses really are built differently.** They've made different design
   choices — how much to explore, when to plan, which tools to reach for — and those
   strategies suit different kinds of work. That's real, but it's not secret sauce:
   any provider can run this same forensic analysis, so a genuinely good idea gets
   copied fast. So a single run might just mean this harness's strategy fit *this*
   prompt. **Article 2 digs into those actual differences** and what they do to the
   agent's behavior.
4. **One harness may genuinely be better — in general.** Possible. But **a single
   run cannot show it**, and in this controlled sample we saw **no evidence of it**:
   quality tied, cost differences traced entirely to exploration volume.

The trap is reading a #1/#2/#3 result as if it were #4.

And notice which way the small edge here points: on the raw averages, **Copilot
"won" this round** — a touch higher quality at lower cost. It doesn't matter. That
quality gap is well under a single point out of 27 — smaller than the swing you get
from just running the same harness twice. To trust even that sliver as real, you'd
need something like **\~100 runs per harness**, not ten; and to claim one harness is
better *in general*, you'd have to repeat the whole thing across many prompts and
repos. Crowning a winner from this — or from any single race — is exactly the mistake
the data warns against.

## What to trust instead

So what do you actually do? Hold the obvious things fixed — same model, same repo,
same prompt — then **run it more than once and look at the spread, not the dot.** And
before you blame a tool, check what your own skills, MCP servers, and instruction
files are quietly injecting. That's the part you control, and usually the part that
moved.

This chart shows **cost can separate two agents even when quality can't.** And the one
fact both got wrong, they got wrong identically — a failure that owes nothing to which
harness you picked and everything to the context you gave it.

None of this contradicts the [standard
advice](https://docs.github.com/en/copilot) — pick the right model, give good context,
write precise prompts, review your skills and tools. It just adds one rule: **don't
rank two harnesses on a number that swings 2× when you change nothing at all.** And
that 2× is the *floor*, measured under tight control — loosen the setup and one run can
cost **18× another.** When a single run can swing that far, running each tool once
isn't measuring the tools. **It's comparing one dice roll to another.** So next time
that bake-off slide crosses your feed, ask the only question that matters: **did they
run it twice?**

## Coming next: where the harnesses *actually* differ

This article is the control. It measures how far two harnesses can drift apart on
cost and quality when **nothing the user controls differs between them** — which tells you how big
a gap has to be before it means anything at all. The [next piece in this
series](./what-actually-differs.html) turns to the differences that *are* real and
structural. Across the **four harnesses** we track — Copilot CLI, Claude CLI, and
their two VS Code IDE counterparts — it looks at what each one loads into the model's
context before you type a word: the initial context window, how skills, MCP servers,
and tools are delivered, and what the **harness** decides versus what **you** control.
With this article's repeatability envelope as the yardstick, we can start to reason
about which of those structural choices could *plausibly* move answer quality — and
which are just more of the noise measured here.

---

### Evidence & method

- **40 runs**, 2 harnesses × 2 conditions × 10 reps; one pinned snapshot
  (`claude-sonnet-4-5-20250929`); MCP off; repo at `e1516cf`.
- **Cost** is token-normalized (one price table applied to each run's tokens) so the
  two CLIs are comparable in token-cost terms — *not* necessarily what either vendor
  bills. Copilot's exact billed credits were also captured separately (\~11–19
  credits/run); the Claude CLI exposes no native meter.
- **Quality** is a blind factual-coverage score: how many of **27** ground-truth
  facts (verified at the pinned commit) each answer contains. Harness fingerprints
  (tool-trace lines) were stripped, and scoring is a deterministic checklist sum — so
  harness identity cannot influence a score. (Charts zoom the y-axis to 10–27, the
  band every real score falls in.)

| Harness | Cost avg (min–max) | Quality avg (min–max) | Avg requests | $/quality-pt |
| --- | --- | --- | --- | --- |
| Copilot CLI | $0.13 ($0.11–0.19) | 21.0 (18–24) | 4.5 | $0.0062 |
| Claude CLI | $0.36 ($0.22–0.53) | 20.4 (17–23) | 16.4 | $0.0177 |

**Caveats:** one prompt, one repo, one snapshot, N=10 per cell — an existence proof
of wide within-harness variability and overlapping quality, **not** a general
ranking or a stable bound. The coverage rubric rewards breadth (the short `TRIM`
answers scored slightly lower for being terser, not wronger). Sequential runs share
the provider's prompt cache, so some variance is cache-timing, not the agent —
both, notably, are *non-harness* effects. Full design and data:
[pre-registration #12](https://github.com/Jfhelin/copilot-ledger/blob/main/docs/content-lab/experiments/12-cli-repeatability-envelope.md).

*Companion pieces: [Why an N=1 run can't rank two agents](./why-n1-benchmarks-mislead.html)
· [What actually differs between the environments](./what-actually-differs.html).*