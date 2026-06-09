# What actually differs between VS Code Copilot, Claude Code in VS Code, and the Claude CLI

> **Status: DRAFT.** Standalone article. The companion piece is
> [*Why coding-agent comparisons keep disagreeing*](./why-n1-benchmarks-mislead.html). The
> **structural** sections are backed by measured captures; the **cost/latency
> comparison** section is marked `[NEEDS CAPTURE]` and is filled in once the IDE
> task runs exist (see the checklist at the end).

## The short version

People argue about "Copilot vs Claude Code" as if the *tool* were the variable.
On the **same model**, it mostly isn't. Three environments —

- **E1 — Copilot in VS Code** (the native Copilot agent),
- **E2 — Claude Code in VS Code** (Anthropic's harness, routed through a Copilot
  proxy),
- **E3 — the Claude CLI** (`claude`, the standalone terminal harness),

— share the same Sonnet weights. What differs is **what each one puts in front of
the model before you type a word**, and **how much of that you control**. Once you
line them up, the gaps stop looking like "which agent is smarter" and start
looking like *configuration*.

This article maps the three on the things that actually move cost and latency:
the initial context window, how skills and MCP are handled, what the harness
decides vs what you decide, and how the bill is denominated. Then it gives a
recipe for getting comparable quality and cost out of all three.

---

## 1. The initial context window: same model, 22k–131k tokens before "hi"

The first thing each environment does is assemble a prompt prefix — a system
prompt, a tool catalog, and (sometimes) skills and memory — and send it on
*every* turn. We captured a **trivial turn** ("hi" / "reply OK") in each, on
Sonnet 4.5, and measured the prompt it actually sent:

| Environment | Trivial-turn prompt tokens | Tool-def share | Skills in prefix | Tool delivery |
|---|---:|---:|---:|---|
| **E1 — Copilot in VS Code** | **22,070** | 8,361 (~38%) | **37 skill blocks** | grouped / deferred |
| **E2 — Claude Code in VS Code** (stable) | **86,085** | 72,425 (**84%**) | 0 | sent flat |
| **E2 — Claude Code in VS Code** (Insiders) | **131,407** | 113,982 (**87%**) | 0 | sent flat |
| **E3 — Claude CLI** (0 MCP configured) | **56,800** | 0 | 0 | n/a (no tools) |

**Read this the right way.** These four captures are **not matched on
configuration** — each reflects how *that* machine was set up (different MCP
servers enabled, different skill sets, the CLI run with none). So the raw numbers
are **not** a "harness efficiency" ranking. They are the opposite lesson:

> With the model held constant, the size of your initial context window is set by
> **what your environment injects**, not by the brand of the agent. The same
> Sonnet sat behind a 22k window and a 131k window.

And the single biggest occupant is almost never the system prompt — it's the
**tool/MCP schemas**. In the Claude-in-VS-Code captures, tool definitions were
**84–87%** of the entire prompt. The "system prompt" debate is a rounding error
next to your MCP load.

*(Caveat on E3: the Claude CLI capture had **zero** MCP servers, so its 56.8k is
system prompt + project memory (`CLAUDE.md`), not tools. Its absolute size depends
on how large your memory files are — another user-controlled input, not a harness
constant.)*

---

## 2. Skills and MCP are two different injection mechanisms — and only one harness has both

The captures show a clean split in *how* each environment loads capability:

- **Skills** are a **Copilot-native** concept. E1 carried **37 `<skill>` blocks**
  in its prefix; E2 and E3 carried **zero** — the Claude harness has no equivalent
  skill catalog in the prompt. Skills are *not virtualized*: every installed skill
  adds text to every call until you uninstall it.
- **MCP tools** exist in all three, but each harness *delivers* them differently
  (next section). MCP is the dominant cost driver wherever it's enabled.

The practical consequence: a fair "E1 vs E2" comparison has to decide what to do
about skills (E1 has them, E2 can't), and has to **match the MCP set**, or it's
really comparing two different capability bundles, not two harnesses.

---

## 3. The one genuinely harness-level difference: tool **delivery strategy**

This is the difference that survives once you control for config.

- **E1 (Copilot in VS Code)** uses **virtual-tool grouping / deferred tools**.
  Above VS Code's tool threshold, most of the catalog is advertised *name-only*
  and loaded on demand via tool search. In the `hi18` capture, the tool schemas
  actually **sent** were ~8,361 tokens — a fraction of the full catalog.
- **E2 (Claude Code in VS Code)** sends the enabled tool set **flat** on every
  call. The digest shows grouping inactive (it saved **0** tokens): the full
  72,425 / 113,982 token catalog rode along on a one-word prompt.
- **E3 (Claude CLI)** sends whatever MCP you've configured, flat, with no VS Code
  grouping layer.

> Hand the **same MCP servers** to E1 and E2 and E2 will carry a **larger** prefix
> per turn — not because Claude is "heavier," but because the **harness around it**
> doesn't defer tool schemas the way VS Code's native agent does.

That's the honest version of "the harness matters": it's not speed or
intelligence, it's **how the harness packages tools onto the wire**. Everything
else on this list, you set yourself.

---

## 4. Who controls what

| Knob | Who actually controls it | Notes |
|---|---|---|
| **Model weights** | Shared | Same Sonnet snapshot if you pin it (see §6). |
| **System prompt** | Harness | Differs in wording; small share of tokens. |
| **Tool delivery (grouped vs flat)** | **Harness** | The real structural difference (§3). |
| **MCP servers enabled** | **You** | Dominant cost driver (84–87% of prefix). |
| **Skills installed** | **You** (E1 only) | Not virtualized; uninstalling cuts every call. |
| **Project memory** (`CLAUDE.md`, instructions) | **You** | Inflates E3's window with no tools at all. |
| **Repo / working set** | **You** | What the agent has to read. |
| **The prompt + round-trips it triggers** | **You** | The biggest *variable* cost ([companion article](./why-n1-benchmarks-mislead.html)). |
| **Billing unit** | Harness / platform | §5. |

The table is the argument: **most of the cost-moving knobs are on your side of the
line.** Two of the three environments will converge if you set those knobs the
same way.

---

## 5. The bill is denominated differently — so "$ cost" comparisons are apples-to-oranges

- **E1 (Copilot)** bills in **GitHub AI credits** — a real, metered number with
  model multipliers built in. (The Copilot **CLI**, a sibling harness, even prints
  the exact credits it spent.)
- **E2 / E3 (Claude)** have **no native credit meter** in their logs. The credit
  and USD figures we show for them are **token-normalized estimates** — the same
  price table applied to the tokens we can see, so they're *comparable in
  token-cost terms*. They are **not** GitHub AI credits, and they're not
  necessarily what you pay (Claude may bill Anthropic API rates or a flat
  subscription).

> When a slide shows "$X vs $Y," check whether both sides are the **same kind of
> number**. Usually one is a billed meter and the other is a modelled estimate.
> The only fully comparable axis across all three is **tokens**.

That's why the tables above lead with **prompt tokens**: it's the one quantity
every harness reports the same way.

---

## 6. The parity recipe — getting comparable quality and cost from all three

If you want a comparison (or a migration) that isn't dominated by accidental
configuration, match these before you read a single number:

1. **Pin the model snapshot**, not the alias. "Sonnet" can resolve to different
   dated snapshots across environments; pin the exact one (e.g.
   `claude-sonnet-4-5-20250929`).
2. **Match the MCP set.** Same servers, same versions — or disable MCP everywhere
   (`chat.mcp.enabled: false` in VS Code) for a clean floor. This alone closes
   most of the 22k↔131k gap.
3. **Match skills/memory.** Minimize or equalize installed skills (E1) and project
   memory files (`CLAUDE.md`, instructions) so no environment carries extra prefix.
4. **Use the same repo at the same commit** and the **verbatim** prompt.
5. **Normalize the billing unit** to tokens under one price table; report native
   credits separately where they exist, and label them as such.
6. **Repeat and report spread**, not a single run (see the
   [companion article](./why-n1-benchmarks-mislead.html) on why N=1 can't rank stochastic agents).
7. **Score the outcome.** "Cheaper/faster" is meaningless unless the task was
   actually completed to the same bar.

Do steps 1–4 and the three environments stop looking like three products. They
look like one model behind three context-assembly strategies — two of which you
control.

---

## 7. Cost & latency under a real task `[NEEDS CAPTURE]`

The structural story above is measured. The *working-session* comparison — does
the parity recipe actually produce comparable cost/latency on a real task across
all three — needs matched task runs that don't exist yet for the two IDE arms.

What we have so far:

- **E3 (Claude CLI), T1 "explain this repo," 6 reps:** token-normalized credits
  ranged **~4.7 → 84.3** (≈18×), driven by exploration round-trips — see the
  [companion article](./why-n1-benchmarks-mislead.html). This is our variance anchor.
- **E1 / E2 task runs:** not yet captured. They are **IDE-only** and can't be
  scripted headlessly.

Once the captures below land, this section gets: a per-environment cost/latency
table (token-normalized), the spread per cell, and an outcome score — then a
verdict on whether the parity recipe holds.

---

## Appendix — IDE capture checklist (to finish §7)

These are the runs only a human in the IDE can produce. Keep everything else
fixed; vary only the environment.

**Fixed across all captures**
- Repo: `<pick one small repo>` at a **pinned commit SHA**: `<SHA>`.
- Prompt, verbatim: `Explain what this repository does and how it is structured.`
- Model: pin **Sonnet 4.5** to the same snapshot in both IDEs.
- Reasoning/temperature defaults left as-is, but recorded.
- Export each session with the Copilot Chat exporter ("All prompts") right after
  the turn completes.

**Captures needed**

| # | Environment | MCP | Reps | Export name suggestion |
|---|---|---|---:|---|
| 1 | **E1 — Copilot in VS Code** | off (`chat.mcp.enabled:false`) | 3 | `e1-copilot-vscode-explain-r{1,2,3}.json` |
| 2 | **E2 — Claude in VS Code** | off | 3 | `e2-claude-vscode-explain-r{1,2,3}.json` |
| 3 | *(optional)* **E2 — Claude in VS Code** | on (your MCP set) | 3 | `e2-claude-vscode-explain-mcp-r{1,2,3}.json` |

> Optional row 3 isolates the MCP tax inside E2 (off vs on), which directly
> demonstrates §1/§3 on a real task rather than a "hi."

**After capturing**, drop the files in `~/CopilotLogExports/` and I'll digest them
with `copilot-chat-export` and fill in §7 (cost, spread, outcome) — the numbers
trace straight from the digest, same as the structural tables above.

---

## What we measured vs. what we're claiming (honesty box)

- **Measured `[HAVE]`:** every number in §1–§5 — prompt tokens, tool-def share,
  skill counts, tool-delivery strategy — from real captures (`hi18`, `Claudeok`,
  `hi_VSCInsider_claude`, `matched-pair-2.1.112`), digested with the repo's own
  scripts.
- **Not matched:** the four §1 captures use different MCP/skill configs. They
  demonstrate *that configuration dominates the window*; they are **not** a
  harness-efficiency ranking.
- **Not yet measured `[NEEDS CAPTURE]`:** the real-task cost/latency comparison
  (§7) — pending the IDE captures above.
- **Single-environment:** the 18× variance is from E3 only; treat it as an
  existence proof of wide run-to-run variance, corroborated by a smaller
  Copilot-CLI spread, not as a bound on any specific pair.
