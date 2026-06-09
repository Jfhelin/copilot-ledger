#  One run can't tell two coding agents apart

There's a familiar slide doing the rounds: GitHub Copilot CLI in one column, the
Claude CLI in the other, a single run each, and a verdict — *"Agent A is 2× cheaper"*
or *"Agent B is faster."* It feels like evidence. It mostly isn't.

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
- **Repo:** [`octocat_supply`](https://github.com/octodemo/octocat_supply) pinned at
  one commit (`e1516cf`).
- **Model:** one pinned Sonnet snapshot (`claude-sonnet-4-5-20250929`), verified
  identical in both CLIs.
- **Environment held flat:** MCP servers off on both sides; the repo's
  auto-loaded instruction files removed (more on why below). Two conditions —
  **BARE** (no memory file) and **TRIM** (one short, identical `CLAUDE.md` both
  harnesses load once).
- **10 repetitions** per harness per condition = **40 runs**, each digested for
  exact tokens, cost, cache, requests, and wall-clock, then **blind-scored for
  factual coverage** (facts present, out of 27) for answer quality.

This was [pre-registered before the results were read](../content-lab/experiments/12-cli-repeatability-envelope.html).

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

![Cost vs quality across 40 runs: Copilot clusters near $0.11–0.19, Claude near $0.22–0.53, both at the same quality height](./figures/cost-vs-quality-40-runs.svg)

[*Open the interactive version*](./figures/cost-vs-quality-interactive.html) *to filter by harness and condition and hover any dot for its run.*

Two things jump out:

- **Cost does separate.** In this sample the two clusters don't overlap: Copilot
  CLI averaged **$0.13** token-normalized per run, the Claude CLI **$0.36** — about
  **2.8×**. But look at *why*: per-request prefix size was nearly identical (\~22k
  tokens). The gap is **round-trips** — Claude averaged **16.4** model requests to
  Copilot's **4.5**. It's the *same exploration knob* that drives the within-harness
  swing in Finding 1, just turned further by default for this task.
- **Quality does not.** The dots form a flat band near the top of the scale (the
  y-axis is zoomed to 10–27, where every real score lands). Copilot averaged
  **21.0/27**, Claude **20.4/27** — and the difference's 95% confidence interval
  (**[−0.4, +1.7]**) **spans zero** (it's a statistical tie). Across all 40 runs, the
  correlation between **cost and quality was ≈ 0** (r = −0.05). More requests, more
  tokens, more spend bought *no measurable quality*. And neither side was punished by
  the rubric for making things up — yet **every one of the 40 answers still repeated
  the same wrong fact** (more on that below). Similar coverage, very different prices.

To be explicit: **this is not "Copilot is better."** Copilot's quality edge here is
inside the noise, and Claude's higher cost is *exploration verbosity on one task*,
not a defect. The point is the opposite of a ranking — it's that **one task, one
run, cannot support a ranking at all.**

## The N=1 trap, quantified

Pick one Copilot run and one Claude run at random — a typical "bake-off." Depending
purely on *which two runs you happen to draw* from this very dataset:

- the **cost ratio** could read anywhere from **1.18× to 5.04×**, and
- the **quality "winner"** could be **Copilot by up to 7 points** *or* **Claude
  by up to 5 points** (on the 27-point coverage scale).

Same two tools, same task, same data — and a single-run comparison can hand the
"win" to either side. The headline is an artifact of the draw.

## So why *did* the two runs differ? Four reasons, in order

When a single A-vs-B comparison shows a gap, there are only four things it can be —
and they're easy to confuse:

1. **Randomness.** The repeatability envelope above. Here it alone moved cost up to
   \~1.6×, time \~1.8×, cache work \~2×, *with every input identical*. This is the
   default explanation for any single-run gap, and usually the largest.
2. **Your environment — the part you control.** Skills, MCP servers, and
   auto-loaded memory files change what the model sees before you type a word — and
   they're *yours*, not the harness's. They move cost, too: the tool definitions a
   harness loads can be **half the prefix it re-sends on every request**, so every MCP
   server or skill you switch on taxes every round-trip. And the two CLIs don't ship
   the same tools — different counts, different schemas, different auto-loaded files —
   so an unmatched environment can swamp the harness difference you're trying to measure.
3. **The harness may suit *this* prompt or repo.** A default disposition to explore
   more (or less) can help on one task and hurt on another. That's a
   *prompt×harness* interaction, not a general verdict.
4. **One harness may genuinely be better — in general.** Possible. But **a single
   run cannot show it**, and in this controlled sample we saw **no evidence of it**:
   quality tied, cost differences traced entirely to exploration volume.

The trap is reading a #1/#2/#3 result as if it were #4.

And note which direction the small edge here points: on raw averages **Copilot
"won" this round** — slightly higher mean quality at lower cost. It doesn't matter.
The quality gap (≈0.65 of 27) is tiny next to the run-to-run spread (pooled SD ≈ 1.7),
an effect size of *d* ≈ 0.4 whose 95% CI comfortably spans zero. To confirm even
*that* fraction of a point as real — for this one prompt, repo, and model snapshot —
you'd
need on the order of **\~100 runs per harness**, not ten; and to call one harness
better *in general* you'd then have to repeat the whole thing across many prompts and
repositories. Picking a winning harness from this — or from any N=1 race — is exactly
the mistake the data warns against.

> **The wrong fact, in all 40.** Here's the tell: **every single answer — both CLIs,
> all 40 runs — reported the frontend port as `5173`**, the framework default the
> README repeats. The actual configured port is **`5137`** (every config file says
> so). Not one run read it. No rubric would flag this as a hallucination — it's a
> plausible, confidently-wrong number both agents inherited from the same stale
> README. That's not a harness difference; it's what happens when agents trust a
> README over the code — a reason #2 effect you fix with *context*, not by switching
> tools.

## What to do instead

- **Hold the controllable variables fixed** before you compare: same model
  snapshot, same repo at a commit, same verbatim prompt, MCP/skills/memory files in
  a known state on both sides.
- **Repeat, then look at the distribution.** One run is a dice roll; the spread is
  the signal. Compare **cost-per-quality across many reps**, not a single timed run.
- **Separate the axes.** Cost, wall-clock, and quality move independently — the
  cheapest run here was often *not* the fastest, and never reliably the best.
- **Audit your own environment first.** Before blaming a tool, check what your
  skills, MCP servers, and instruction files are injecting. That's reason #2, and
  it's yours to fix.

**The chart matters. The port matters more.** The chart says cost can separate two
agents even when quality doesn't. The port says two agents can agree, sound
confident, and still be wrong in the same boring way — which is the failure your
developers would actually feel.

None of this contradicts the standard advice — [choose the right model, give useful
context up front, avoid excessive context, write precise prompts, and review your
skills and tools periodically](https://docs.github.com/en/copilot). It just adds
one rule: **don't rank two harnesses on a number that swings 2× when you change
nothing at all.**

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
[pre-registration #12](../content-lab/experiments/12-cli-repeatability-envelope.html).

*Companion pieces: [Why an N=1 run can't rank two agents](./why-n1-benchmarks-mislead.html)
· [What actually differs between the environments](./what-actually-differs.html).*