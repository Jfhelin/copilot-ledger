# A coding agent is more than a model

Two coding agents can use the same model and still behave very differently.

One may inspect a repository in a few large steps. Another may work sequentially, reading one file at a time. One may proceed autonomously. Another may stop before an action and ask for confirmation. They may expose different tools, load different project context, remember different things, and carry very different amounts of information into each model call.

It is tempting to explain these differences by saying that one model is better than another.

But the model is only one part of a coding agent.

Around the model sits another system: the **harness**.

The harness decides what the model sees, what it can do, and how the work is organized. It assembles the prompt, exposes tools, manages memory, connects MCP servers, executes tool calls, maintains the conversation, and decides how much autonomy the agent should have.

That means the same underlying model can produce a different experience depending on the system built around it.

To understand how much the harness matters, I examined three coding-agent environments using the same Claude Sonnet 4.5 model:

- GitHub Copilot CLI
- Claude CLI
- GitHub Copilot coding agent in Visual Studio Code

The goal was not to rank them. It was to look below the interface and answer a more useful question:

> What decisions does the harness make before and while the model works?

The answer helps explain why coding-agent comparisons can produce very different results—even when the model is held constant.

---

## The model is only one part of the system

A language model can generate text and request tool calls. By itself, however, it does not know which repository it is working in, which commands it may run, which files it may edit, or how cautiously it should proceed.

The harness supplies that operating environment.

A simplified coding-agent request might contain:

```text
System instructions
+ tool definitions
+ environment information
+ repository instructions
+ memory and skills
+ the user’s request
+ conversation history
```

The harness then takes the model’s response, executes any requested tools, returns the results, and starts the next model call.

This loop continues until the task is complete—or until the harness, the user, or a limit stops it.

<figure>
  <img
    src="./figures/harnesses/agent-is-more-than-model.svg"
    alt="Diagram showing a model combined with system prompts, tools, MCP, memory, skills, context, caching, planning, orchestration, and user experience choices to produce coding-agent behavior."
  >
  <figcaption>
    A coding agent combines a model with the prompts, tools, context, memory, and orchestration supplied by its harness.
  </figcaption>
</figure>

This is the first useful distinction:

> The model provides capabilities. The harness turns those capabilities into a product.

---

## The user prompt is only part of what the model sees

When a developer enters a short request, it can look as though the model receives only those few words.

It does not.

Before reading the request, the model may already have received thousands of tokens describing:

- its role and behavioral rules
- the tools it can use
- how those tools should be called
- the current operating environment
- repository and workspace information
- permissions and safety constraints
- memory from earlier work
- available skills
- previous messages in the session

I call the amount loaded on the first model request the **first-call context footprint**.

This is not the same as the model’s **context window**, which describes its maximum capacity. The first-call footprint is how much of that capacity the harness has already populated before meaningful task work begins.

For a cleaner baseline, I captured each harness with:

- the same Claude Sonnet 4.5 model snapshot
- the same repository and pinned commit
- the same minimal task
- a fresh conversation
- MCP disabled
- no optional user skills
- no repository memory or instruction file

Even under those conditions, the harnesses did not start from the same place.

| Harness | First-call context footprint |
|---|---:|
| Copilot CLI | **~16.2k tokens** |
| Claude CLI | **~29.5k tokens** |
| Copilot coding agent in VS Code | **~20.6k tokens** |

The footprint is the total context the model reads on the first request, measured the same way for all three. It reflects size, not cost — caching changes the price, not how much the model has to read.

<!--
METRIC DEFINITION (resolved — keep for provenance, safe to leave as a comment)

metric_name: first-call context footprint
definition: total logical input on the first model request = uncached input + cache-read + cache-creation tokens (API-reported), same Anthropic tokenizer (claude-sonnet-4.5 snapshot)
conditions: MCP off, fresh session, no user skills, no repo memory/instruction file, same repo + pinned commit, same minimal task
measurement: direct (API-reported usage), not tokenizer-estimated. Component splits: Copilot CLI and VS Code from captured payloads (sum to the exact total); Claude CLI split is its chars/4 structural proportions scaled to the exact total.

Copilot CLI = 16,200  (uncached 10 + cache-read 9,071 + cache-creation 7,119)
  source: structural-prefix/copilot/logs/process-1781029040975-75037.log (first response input_tokens), 19 native tools
Copilot coding agent in VS Code = 20,598  (uncached 9 + cache-read 9,745 + cache-creation 10,844)
  source: co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json, prompt#0 first ChatMLSuccess usage.prompt_tokens, 56 native tools
Claude CLI = 29,453  (uncached 10 + cache-creation 8,179 + cache-read 21,264)
  source: ~/.claude/projects/-private-tmp-octocat-supply-ak/137badef-…​.jsonl, first assistant message.usage, 27 native tools

Caveat: all three "first" calls had cache-read > 0 (warm from prior identical runs). The
footprint total is invariant to warm/cold; only billing differs.
-->


<figure>
  <img
    src="./figures/harnesses/prefix-size-comparison.svg"
    alt="Horizontal bar chart comparing the first-call context footprint of Copilot CLI, Claude CLI, and Copilot coding agent in Visual Studio Code using the same Claude Sonnet model and a minimal configuration."
  >
  <figcaption>
    The same model begins with a different amount and composition of context depending on the harness. The segments show each component’s size, not the order it appears on the wire.
  </figcaption>
</figure>

The precise totals matter, but the more important finding is structural: the developer’s prompt was only a small part of each request.

System instructions and tool definitions accounted for much of the initial context. The IDE also supplied environment and workspace information that was not present in the same form in the CLI environments.

Part of the VS Code footprint came from a source worth naming: the IDE preloaded skill and sub-agent definitions that mostly originated from the workspace repository’s own `.github` configuration and from extensions installed on the machine — not from a Copilot product default. Of the roughly 3.3k-token skill block, only ~1.2k tokens were genuine Copilot built-ins — five bundled skills plus the Explore sub-agent — and the remaining ~2.0k came from the repository and from installed extensions. The two CLI baselines carried no equivalent. That is itself a harness decision: VS Code loads every available skill and agent body into the first request regardless of where it came from, while the CLIs advertise them on demand. The footprint difference is partly the harness choosing to preload configuration the other harnesses left out.

A smaller footprint is not automatically better. It can mean less fixed overhead and more room for the task, but it can also mean less guidance and less environment awareness.

A larger footprint is not automatically better either. It can provide richer instructions and more capabilities, but it also consumes context and may include information irrelevant to the current task.

The right question is not simply:

> Which harness sends fewer tokens?

It is:

> What information is being sent, what value does it provide, and what does it cost?

That deeper decomposition is the subject of the next article in this series.

---

## System instructions shape the agent’s behavior

The system prompt tells the model what kind of agent it is expected to be.

It can define:

- the agent’s role
- how it should explore a repository
- when it should make edits
- when it should ask for permission
- whether independent work should be parallelized
- how concise or detailed its responses should be
- how it should use tools
- what safety boundaries it must observe

In the captured prompts, Copilot CLI and Claude CLI gave the same model different behavioral guidance.

Copilot CLI used instructions that favored autonomous, non-interactive progress. Claude CLI included more explicit guidance around confirming irreversible operations.

<!--
VERIFIED — autonomy wording (gap: VERIFY AUTONOMY WORDING, RESOLVED)

Source: docs/content-lab/data/system-prompt-comparison.md (captured system
prompts in docs/content-lab/data/system-prompts/{copilot-cli,claude-cli}.txt),
same repo (octocat_supply) and Sonnet snapshot; system-prompt structure is a
harness choice, model-agnostic.
- Copilot CLI: autonomy posture = "running in non-interactive mode... Do not
  stop to ask... proceed autonomously."
- Claude CLI: "# Executing actions with care... check with the user before
  proceeding... authorization stands for the scope specified."
The article PARAPHRASES (no proprietary text quoted), which the source supports.
Instruction category: autonomy / confirmation posture. Applies to the captured
default CLI mode. Do not quote more than a short phrase from proprietary prompts.
-->

Neither choice is universally correct.

For a read-only repository explanation, a more autonomous posture may avoid unnecessary interruptions. For a task that can delete data, change infrastructure, or publish code, a more cautious posture may be preferable.

What can look like a difference in model confidence may therefore be a difference in product policy.

> Autonomy is not only a model trait. It is also a harness setting.

The same applies to planning, verbosity, persistence, and tool-use style. The model has learned broad capabilities, but the harness tells it how those capabilities should be used in this product.

---

## Tools are part of the prompt

Coding agents do not only generate code. They inspect files, search repositories, run commands, edit documents, create plans, and call external systems.

To use a tool, the model needs a description of it. A typical definition includes:

- a tool name
- an explanation of its purpose
- its accepted parameters
- a JSON schema
- usage guidance and restrictions

Those definitions are part of the model’s input.

In the measured CLI captures, tool definitions occupied a substantial portion of the first-call context.

| Harness | Available tools | Tool-definition footprint |
|---|---:|---:|
| Copilot CLI | **19** | **~8.1k tokens** |
| Claude CLI | **27** | **~18.9k tokens** |
| Copilot coding agent in VS Code | **56** (23 sent first call) | **~9.2k tokens** |

The harnesses expose different numbers of tools, and they describe them at different lengths. Copilot CLI advertises 19 tools whose schemas occupy roughly 8.1k tokens; Claude CLI advertises 27 tools occupying roughly 18.9k tokens — more than twice the catalog, and about 69% of that harness's entire first-call context. Copilot in VS Code has the largest catalog — 56 native tools — but ships only 23 of them on the first request (~9.2k tokens) and defers the other 33, loading their schemas on demand. So the harness with the most tools carries one of the *smallest* first-call tool blocks. These figures count only the tool definitions, separate from the system prompt and conversation. How each harness delivers those definitions on the wire — including VS Code's deferral — is examined in Article 3; here we only measure how much room they take.

<!--
METRIC DEFINITION — tool-definition footprint (gap #2, RESOLVED)

Tool-definition footprint = the approximate token size of the full tool-schema
array advertised to the model on the first main-agent request (MCP off, fresh
session, no optional tools/skills), measured by the structural chars/4 estimate.
This is a structural SIZE estimate, distinct from the exact API-reported
first-call totals in the prefix table above; chars/4 underestimates the exact
Anthropic count by ~8-9%, so treat these as floors and report with "≈".

Direct, from the structural-prefix digests:
- Copilot CLI: toolCount 19, toolDefsApproxTokens 8,064 (54.2% of the 14,877
  chars/4 prefix). Source: structural-prefix/copilot/digest.json
  (prefix.representative; tool schemas present in the CLI log).
- Claude CLI: toolCount 27, toolDefsApproxTokens 18,877 (69.4% of the 27,217
  chars/4 prefix). Source: structural-prefix/claude/digest.json
  (prefix.representative, file 2026-06-09T18-18-47-402Z-008.json; schema weight
  from the relay capture — the Claude transcript omits tool schemas).
- Copilot in VS Code: toolCount 56 (full catalog), but only **23 are sent on the
  first request** (`defer_loading` flag absent) ≈ 9,174 chars/4; the other 33 carry
  `defer_loading: true` and are pulled in on demand via the `tool_search` tool
  (≈ 7,000 chars/4, not on the wire at turn 1). Source:
  co-ide-exports/CO-IDE_agent_sonnet_MCPoff.json (tools array; reproduced in
  t6_B_agent_sonnet_warm_r1.json — both agent-mode runs show 23 active / 33 deferred).
  The exact-token count of those 23 active tools is 10,052 (see prefix figure); the
  full 56-tool catalog would be ≈16,600 chars/4 if sent flat. The export folds
  system+skills+context into one block, so only the tools array is separable here.
Model: claude-sonnet-4.5 both. Main-agent request, auxiliary calls excluded.

Article 2 states the on-wire numbers only (23 of 56 sent ≈ 9,200; 33 deferred). The
deferral mechanism (`defer_loading` + `tool_search`) is explained in Article 3.
-->

<figure>
  <img
    src="./figures/harnesses/tool-catalog-size.svg"
    alt="Horizontal bar chart comparing the token footprint of tool definitions in Copilot CLI, Claude CLI, and Copilot in VS Code."
  >
  <figcaption>
    Tools are not outside the prompt. Their names, descriptions, and schemas consume context before the model calls any of them.
  </figcaption>
</figure>

A larger or more detailed catalog may help the model select tools accurately. It may also increase the fixed context carried into a request.

A smaller catalog may reduce overhead and make selection simpler. It may provide less guidance or fewer capabilities.

The harness can choose:

- which tools to expose
- how narrowly each tool is scoped
- how verbose its description should be
- whether several operations share one tool or use separate tools
- how and when tool definitions are delivered
- what result format is returned to the model

These are product and engineering decisions.

They can affect cost and behavior even when the model itself does not change.

---

## MCP adds capability—and context

The Model Context Protocol, or MCP, allows coding agents to connect to additional tools and data sources.

An MCP server might provide access to:

- GitHub
- a filesystem
- cloud resources
- databases
- browsers
- internal enterprise systems
- documentation or search services

This can make an agent much more capable.

It also changes the environment being measured.

In one controlled Claude CLI capture, enabling a single filesystem MCP server added:

```text
+14 tools
+1,876 prefix tokens
```

<!--
VERIFIED — MCP delta (gap: VERIFY THE MCP DELTA, RESOLVED)

Source: docs/content-lab/data/harness-data-FINAL.md section 1.6 (within-harness
ON vs OFF, newly measured). Claude CLI (CL-CLI), same repo and prompt, one small
filesystem MCP server toggled off->on to isolate the MCP effect:
- Server: @modelcontextprotocol/server-filesystem (14 tools).
- OFF: 28 tools / 21,071 tool-definition tokens.
- ON:  42 tools / 22,947 tool-definition tokens.
- Delta: +14 tools, +1,876 tokens. Evidence: relay wire capture (High confidence).
The +1,876 is the tool-DEFINITION (schema) token delta from the wire capture
(22,947 - 21,071), i.e. logical schema tokens, NOT API-reported input tokens.
Reading: a flat catalog grows linearly — one server adds exactly its tool count.
MCP load is a config/deployment choice, not a harness-architecture difference.
(The absolute OFF count here, 28, is a separate on/off re-run, distinct from the
27-tool structural-digest session used for the tool-catalog table; the article
reports only the DELTA in this section, so the two do not conflict.)
-->

<figure>
  <img
    src="./figures/harnesses/mcp-delta-callout.svg"
    alt="Callout showing that enabling one filesystem MCP server added 14 tools and approximately 1,876 prefix tokens in the captured configuration."
  >
  <figcaption>
    MCP is capability, but it is also context. An MCP-on run and an MCP-off run are different experimental configurations.
  </figcaption>
</figure>

That does not make MCP inefficient. It means capability has a context cost.

An agent with several MCP servers enabled is not directly comparable with one running only its built-in tools. The first agent may be able to perform much more work, but it also starts with a larger capability surface.

This gives us a simple rule for experiments:

> An MCP-on run and an MCP-off run are different configurations, even when the harness and model are the same.

MCP is an important feature of the system, but it is not an exclusive structural advantage belonging to one model or one product. It is a capability the harness chooses to expose and the user or administrator chooses to configure.

---

## Memory and skills change what “the same task” means

A coding agent may also load information from outside the immediate conversation.

That information can take several forms:

- repository instruction files
- project memory
- user preferences
- session state
- reusable skills
- prior summaries
- generated plans

These mechanisms can save time. An agent that already knows the project’s build command, architecture, and conventions may need less exploration before acting.

But memory introduces tradeoffs.

It can be:

- useful
- stale
- incomplete
- contradictory
- too broad for the current task
- expensive to include repeatedly

Skills have similar tradeoffs. A harness might preload their full instructions, advertise them briefly and load details later, or make them available through another retrieval mechanism.

The exact implementation differs by product. The design choice is the important point:

> The harness decides what prior knowledge is carried into the task and when it becomes available.

That is why a repository with an instruction file and a repository without one are not identical benchmark conditions.

It is also why a later article in this series will test whether a carefully designed `AGENTS.md` file can reduce exploration enough to justify its added context.

---

## The harness organizes the work

The harness does more than assemble the first prompt. It also controls the loop that follows.

Suppose an agent needs to inspect six unrelated files.

It could:

1. request all six files in one model turn; or
2. request one file, inspect the result, and then decide what to request next.

The first approach uses fewer model round-trips. The second allows every step to react to the previous result.

Neither is always best.

Batching can be efficient when operations are independent. It may also read files that turn out not to be necessary.

Sequential work can be precise when each step depends on the last. It can become expensive if the same large prefix is processed for every small decision.

In the experiment behind the first article in this series, Copilot CLI and Claude CLI used the same model to investigate the same repository. They performed a broadly similar amount of tool work, but they organized that work into different numbers of model requests.

| Harness | Mean model requests | Mean tool calls |
|---|---:|---:|
| Copilot CLI | **4.5** | **13.9** |
| Claude CLI | **16.4** | **12.9** |

Both harnesses did a comparable amount of tool work — about 13 to 14 tool calls on average — yet Claude CLI spread that work across roughly 16 model requests while Copilot CLI used about 4 or 5. More round-trips means the large stable prefix is processed more often, which is one reason the same task cost about 2.8× more on Claude CLI ($0.36 vs $0.13 token-normalized per run) even though the model was identical.

<!--
METRIC DEFINITION — Article-1 40-run aggregates (gap #3, RESOLVED)

Source: docs/content-lab/data/db/runs.jsonl (the run ledger), task=explain-repo,
conditions BARE + TRIM, harnesses CO-CLI and CL-CLI, MCP off,
claude-sonnet-4-5-20250929. n = 40 runs total (20 per harness, 10 BARE + 10 TRIM).
Arithmetic means:

- Copilot CLI: requests 4.50, tool_calls 13.90, cost_usd $0.1299.
- Claude CLI:  requests 16.40, tool_calls 12.90, cost_usd $0.3594.
- Cost ratio CL/CO = 2.77x (~2.8x).

requests 4.5 / 16.4 match Article 1's published "Avg requests" column exactly
(one-run-cant-rank-two-agents.md). Tool-call counts are normalized identically
across harnesses in the ledger (main-agent tool calls; same task and rubric).
This was observed for THIS read-heavy task, repository, model, and configuration
— not presented as universal behavior. Do not repeat the full Article 1 benchmark.
-->

That difference did not come from the model weights. The model snapshot was held constant.

It came from the surrounding system: instructions, tool design, execution strategy, and the path each harness encouraged the model to take.

The same principle applies to:

- planning modes
- subagents
- background tasks
- confirmation prompts
- retry behavior
- maximum output length
- thinking configuration
- context compaction

These mechanisms change how the agent works without changing the underlying model.

---

## Caching changes cost, not what the model knows

Coding-agent requests often contain a large stable prefix: system instructions, tool definitions, and other information that changes infrequently.

Prompt caching allows a model provider to reuse parts of that prefix more cheaply on later calls.

The model provider supplies the caching mechanism. The harness influences how effectively it is used by deciding:

- where cache breakpoints are placed
- which parts of the prompt remain stable
- which information is inserted before or after those breakpoints
- how often tools, memory, or instructions change

How each harness orders that prefix for cache reuse—what stays stable up front and what is pushed past the breakpoint—is examined in Article 3.

In the CLI captures, both harnesses achieved substantial cache reuse.

| Harness | Cache-read rate |
|---|---:|
| Copilot CLI | **80.9%** |
| Claude CLI | **86.4%** |

Here, cache-read rate is the share of all logical prompt tokens that were served from cache rather than processed fresh — `cache-read ÷ (uncached input + cache-read + cache-creation)` — summed across every request in the 40 runs behind the table above. Both harnesses reused most of their prompt tokens; Claude CLI reused a slightly larger share. That high reuse is exactly why caching matters, but it is a statement about price, not about what the model knew.

<!--
METRIC DEFINITION — cache-read rate (gap #4, RESOLVED)

Formula (one formula, applied consistently to both harnesses):
  cache_read_tokens / (uncached_input + cache_read + cache_creation)
i.e. cached reads over ALL logical prompt tokens. Token-weighted (sum the token
fields across requests, then divide) — NOT a mean of per-request percentages.

Source: ~/copilot-ledger-data/captures/repeatability-40run/captures.jsonl, the
same n=40 dataset as the requests/cost table (explain-repo, BARE+TRIM, 20 per
harness, MCP off, claude-sonnet-4-5-20250929). Fields: cached_tokens (read),
cache_creation_tokens, fresh_input_tokens.
- Copilot CLI: 1,542,212 / (1,542,212 + 338,513 + 25,813) = 0.8089 -> 80.9%.
- Claude CLI:  6,296,982 / (6,296,982 +  965,582 + 22,178) = 0.8644 -> 86.4%.
(Per-run mean is close: 80.2% / 85.0%.)

Corroboration: the single dedicated structural-prefix session reports a slightly
higher cacheHitRate via the same formula (CO 0.8722, CL 0.9022, from
structural-prefix/{copilot,claude}/digest.json rollups) — same ballpark, same
ordering. We publish the 40-run figure because it is the larger sample and is
the dataset the cost ratio above is computed from.

This is NOT a provider-reported "cache-hit rate" label; it is our token-weighted
ratio from captured usage fields, equivalent categories across both APIs.
-->

A high cache percentage is useful, but it is not a complete efficiency score.

A harness can have excellent cache reuse and still:

- carry a large initial prefix
- create an expensive cache on the first call
- use many model round-trips
- grow a large uncached conversation tail
- consume substantial context capacity

Caching reduces the price of reprocessing stable information. It does not remove that information from the model’s context, and it does not make the overall system automatically efficient.

---

## Long sessions create another harness decision

Model APIs are generally stateless between requests. The harness must therefore send the relevant conversation state again when it calls the model.

As the session grows, the harness has several options:

- keep sending the complete history
- summarize older messages
- compact tool results
- drop information judged no longer relevant
- move selected facts into memory
- start a new subagent with a smaller context

Each approach trades continuity against context size and information loss.

Keeping everything preserves detail, but the session becomes larger.

Compaction keeps the session manageable, but a summary can omit something that later matters.

Persistent memory can carry useful facts forward, but it can also preserve stale assumptions.

These are not simply model capabilities. They are system-design choices built around the model.

---

## Who controls what?

Some parts of the system belong clearly to the model provider. Others are primarily controlled by the harness.

| Decision | Model provider | Harness or product |
|---|---|---|
| Model weights and training | Primary control | Selects the model |
| API contract and supported primitives | Primary control | Uses and configures them |
| System instructions | Provides instruction-following capability | Writes the instructions |
| Tools | Defines the tool-calling interface | Selects and describes tools |
| MCP | Supports compatible interactions | Selects servers and exposes tools |
| Skills and memory | Provides context capacity | Designs loading and persistence |
| Prompt caching | Provides the mechanism | Structures the cacheable prefix |
| Context management | Defines context limits | Manages history and compaction |
| Sampling and output limits | Defines allowed ranges | Chooses values |
| Planning and subagents | Provides model capability | Builds orchestration |
| Permissions and confirmations | Provides base safety behavior | Adds product policy and UX |
| Model routing | Serves available models | Selects a model or routing strategy |

<figure>
  <img
    src="./figures/harnesses/model-provider-vs-harness-control.svg"
    alt="Matrix showing model-provider responsibilities such as model weights and API mechanisms alongside harness responsibilities such as system prompts, tool selection, MCP configuration, memory, caching structure, context management, orchestration, and routing."
  >
  <figcaption>
    The model provider supplies the model and its mechanisms. The harness assembles those mechanisms into a developer product.
  </figcaption>
</figure>

The boundary is not perfectly sharp. A model is trained to use tools, follow instructions, and reason in certain ways. The harness cannot make the model capable of something it fundamentally cannot do.

But within those capabilities, the harness has substantial influence over the experience.

---

## Different does not mean fundamentally better

This distinction matters when people compare coding agents.

One agent may appear more capable because it exposes more tools.

One may appear more efficient because it batches independent operations.

One may appear more cautious because its instructions require confirmation.

One may appear to understand the project better because it loads persistent memory.

One may appear less expensive because it starts with a smaller tool catalog.

All of those differences can be real.

But they are not necessarily evidence that one product has access to a fundamentally better kind of agent architecture.

They may instead represent different choices along several tradeoff curves:

| Design choice | Possible benefit | Possible cost |
|---|---|---|
| Larger tool catalog | More immediate capability | Larger prompt and harder selection |
| More detailed tool descriptions | Better guidance | More repeated context |
| Persistent memory | Better continuity | Stale or irrelevant information |
| More autonomy | Fewer interruptions | Greater need for guardrails |
| Sequential exploration | Adapts after every result | More model round-trips |
| Parallel exploration | Fewer round-trips | Possible unnecessary work |
| Rich IDE context | Better workspace awareness | Larger first-call footprint |
| Aggressive compaction | Longer sessions | Potential information loss |

The best choice depends on the task.

A read-heavy repository explanation rewards different behavior than a risky production deployment. A small code transformation has different needs from a multi-hour migration. A developer working interactively may prefer different controls from an unattended automation.

So the conclusion is not that every harness is equivalent.

It is:

> Harnesses make different engineering choices, and no single combination is optimal for every task.

---

## What to ask when comparing coding agents

The model name still matters. But it is not enough to explain a result.

When evaluating a coding-agent comparison, ask:

- Which exact model and snapshot were used?
- Which harness and version were used?
- What did the system instructions tell the model?
- Which built-in tools were available?
- Which MCP servers were enabled?
- Were repository instructions, memory, or skills loaded?
- Was the task run in a CLI or an IDE?
- What context was present on the first call?
- How many model requests and tool calls occurred?
- Was the agent working sequentially or in parallel?
- How was prompt caching measured?
- Was cost billed by the product or estimated from tokens?
- Was the test repeated?
- Was the result scored for quality?

Those questions turn an unexplained winner into an understandable system.

---

## The model matters. The system around it matters too.

A coding agent is not simply a model with a text box.

It is:

```text
Model
+ instructions
+ tools
+ MCP
+ memory
+ skills
+ context
+ caching
+ orchestration
+ product policy
= coding-agent behavior
```

The model supplies the underlying capability.

The harness decides what the model sees, what it can do, and how the work moves forward.

That is why the same model can feel so different across products.

And it is why the most useful question is not only:

> Which model ran the task?

It is:

> What system did we build around it?
