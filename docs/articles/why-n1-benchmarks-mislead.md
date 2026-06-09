# Why coding-agent comparisons keep disagreeing

There's a wave of them right now — internal decks and external posts lining up
GitHub Copilot against Claude Code against the next tool, stopwatch in hand,
reporting time, cost, and cache hit-rate. They keep reaching **different
conclusions.**

They disagree because a single timed run measures the wrong things. It captures
**run-to-run variance and local configuration** — and says almost nothing about
whether the harness is actually *effective*. The companion piece —
[What actually differs between the environments](./what-actually-differs.html) —
covers the differences that are real.

## The same task, six runs, 18× the cost

I ran "explain this repository" on one agent — **same repo at a pinned commit,
same prompt, same model family** — six times. Token-normalized cost per run:

| Model snapshot | Requests | Tool calls | Credits |
|---|---:|---:|---:|
| Sonnet 4.5 | 18 | 10 | **84.3** |
| Sonnet 4.5 | 11 | 5 | 19.3 |
| Sonnet 4.5 | 17 | 10 | 39.5 |
| Sonnet 4.6 | 9 | 6 | 41.5 |
| Sonnet 4.6 | 3 | 1 | 4.8 |
| Sonnet 4.6 | 3 | 1 | **4.7** |

Cheapest to most expensive: **~18×.** Nothing changed but the agent's own choice
of how much to look around — the cheap runs answered in 3 requests, the expensive
ones fanned out to 18. A separate tool showed ~1.9× spread in just two reps.

> If one run of a task can cost 18× another, running each tool **once** isn't
> measuring the tools. It's comparing one dice roll to another.

## What these comparisons actually measure

When two writeups disagree, it's almost always one of these — none of which is
harness quality:

- **Exploration variance.** How many round-trips the agent takes is stochastic
  and dominates cost.
- **Configuration.** The same model sits behind a 22k- or 131k-token context
  window depending on the MCP servers and skills the environment injects.
- **Cache state.** A cold turn pays to *write* the cache; a warm one reads it
  cheaply. Where you are in a session swings cost and latency, not which tool
  you hold.

And the cost axis is shifting under all of it: the tools bill in different units
(GitHub credits, token pricing, a flat subscription), and as **Copilot moves
toward user-based billing**, "cost per run" decouples further from what you're
actually charged.

## What none of it measures: effectiveness

A harness is *effective* if it finishes the task **correctly**, does so
**reliably across runs**, and **recovers** when it's wrong. A single timed run
scores none of these. "Faster" can mean "gave up sooner"; "cheaper" can mean
"missed the bug."

That viral "1.97× more expensive, 2.8× faster" slide is the genre in miniature:
two tasks, one run each, no outcome check, mixed billing units. The numbers may be
real — the conclusion that one harness is *better* simply isn't in the data.

## What an honest comparison takes

- **Repeat each cell ≥10–20×** and report the **spread**, not a median.
- **Score the outcome** — did the task actually get done, to the same bar?
- **Hold config constant** — same model snapshot, matched MCP/skills, same repo
  and commit, verbatim prompt.
- **Separate the clocks** — model speed vs. wall-clock (mostly tools + network).
- **Normalize the unit** — one price table; report native billing separately.

Do less and you haven't compared two harnesses — you've compared two dice rolls
under two setups. Which is why the writeups keep disagreeing.

The useful question isn't "which tool won my one run?" It's **what actually
differs, and how much of it do I control?** That's next →
[**What actually differs between the environments**](./what-actually-differs.html).

---

*Credit figures are token-normalized (one price table applied to each session's
tokens) — comparable in token-cost terms, not necessarily what any vendor bills.*
