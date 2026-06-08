// Single source of truth for the Copilot Behavior Lab knowledge content.
//
// Everything navigable and editorial lives here so adding an experiment,
// observation, or gallery session is a one-object edit rather than a new
// component. Pages render from these arrays.

// Base-safe URL for a bundled asset in `public/`. With Vite `base: "./"` the
// public dir is copied to the dist root, and BASE_URL resolves correctly both
// locally ("/") and under the GitHub Pages project path ("/copilot-ledger/").
export function assetUrl(relativePath) {
  var base = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) || "./";
  var clean = String(relativePath).replace(/^\//, "");
  if (base.endsWith("/")) return base + clean;
  return base + "/" + clean;
}

// Public GitHub repository for the Copilot Ledger project. Linked wherever the
// tool is mentioned so readers can find the source.
export var REPO_URL = "https://github.com/Jfhelin/copilot-ledger";

// ── Top-level navigation ──────────────────────────────────────────────────
export var NAV_ITEMS = [
  { id: "home", label: "Home", path: "/" },
  { id: "learn", label: "Learn", path: "/learn" },
  { id: "experiments", label: "Experiments", path: "/experiments" },
  { id: "observations", label: "Observations", path: "/observations" },
  { id: "gallery", label: "Session Gallery", path: "/gallery" },
  { id: "analyze", label: "Analyze Session", path: "/analyze" },
  { id: "about", label: "About", path: "/about" },
];

// ── Learn: reference sections ─────────────────────────────────────────────
export var LEARN_SECTIONS = [
  {
    id: "how-copilot-works",
    title: "How Copilot Works",
    body: "A Copilot agent is a loop around a language model. You give it a task; it reads context, calls tools, and writes output until the task is done. Understanding that loop is the key to understanding where time and credits go.",
  },
  {
    id: "model-calls",
    title: "Model calls",
    body: "Every turn the agent sends the conversation so far to a model and gets a response. Each call has an input side (everything the model reads) and an output side (what it writes). Calls are the unit most cost is measured in.",
  },
  {
    id: "tool-calls",
    title: "Tool calls",
    body: "Tools let the agent read files, run commands, or search. A tool call itself is cheap, but its result is fed back into the next model call as context — so tool use indirectly drives input token growth.",
  },
  {
    id: "agent-loops",
    title: "Agent loops",
    body: "The agent repeats: think, act, observe. Long loops accumulate context and repeated model calls. A task that looks like one question can become a dozen calls under the hood.",
  },
  {
    id: "context-windows",
    title: "Context windows",
    body: "The context window is everything the model sees in one call: system prompt, tool definitions, conversation history, tool results, and your current message. It has a size limit, and bigger context means more expensive input.",
  },
  {
    id: "cache",
    title: "Cache reads and writes",
    body: "Providers cache stable prefixes of the context. A cache write pays to store a prefix; later calls that reuse it pay a much lower cache-read rate. Cache behavior can change a session's cost profile dramatically.",
  },
  {
    id: "token-types",
    title: "Input, output, thinking tokens and tool arguments",
    body: "Input tokens are what the model reads, output tokens what it writes, and thinking tokens are internal reasoning some models bill for. Tool arguments and tool results are part of the input side and add up quietly.",
  },
  {
    id: "ai-credits",
    title: "AI Credits",
    body: "Credits (premium request units) are the billing abstraction over raw tokens and model choice. Different models convert tokens to credits at different rates, which is why model selection is often the biggest lever.",
  },
  {
    id: "reading-a-report",
    title: "How to read a Copilot Ledger report",
    body: "A Copilot Ledger report breaks a session into per-prompt cost, context buildup, tool usage, and cache behavior. Start with total spend, find the most expensive prompts, then look at what grew their context. Open any export under Analyze Session to follow along.",
  },
];

// ── Experiments ───────────────────────────────────────────────────────────
// status: "Published" | "Draft" | "Planned" | "Under investigation"
function emptyExperiment(extra) {
  return Object.assign(
    {
      executiveSummary: "",
      hypothesis: "",
      whyThisMatters: "",
      sessionSummary: "",
      keyFindings: "",
      whatHappened: "",
      interpretation: "",
      practicalGuidance: "",
      confidence: "",
      evidence: "",
      linkedInDraft: "",
      videoOutline: "",
    },
    extra,
  );
}

export var EXPERIMENTS = [
  emptyExperiment({
    id: "context-quality-readme",
    title: "Round Trips Are the Lever",
    hook: "The answer lived in one file. Letting the agent find it cost 37% more.",
    status: "Published",
    confidence: "Context arm one run per arm (N=1); the merged prompt-precision arm is reasoned from the same mechanism, capture pending.",
    // Bespoke page: pages/ContextQualityReadme.jsx (route id kept stable as
    // context-quality-readme). Merges the former "Prompt Precision" experiment —
    // context quality and prompt precision are one round-trip mechanism.
    // App.jsx routes /experiments/context-quality-readme to it directly.
    custom: true,
    reportRoute: "/reports/context-quality-maprows",
  }),
  emptyExperiment({
    id: "cache-behavior",
    title: "The first call was already warm. The cheap part was everything after it.",
    hook: "The first call was already warm. The cheap part was everything after it.",
    status: "Published",
    confidence: "Shared-cache hit N=4; per-call curve, sub-agent reuse, and prefix anatomy N=1.",
    // Bespoke page: pages/CacheBehavior.jsx. App.jsx routes
    // /experiments/cache-behavior to it directly.
    custom: true,
    reportRoute: "/reports/cache-curve",
  }),
  emptyExperiment({
    id: "model-selection",
    title: "Model Selection",
    hook: "The biggest cost lever is often model selection.",
    status: "Draft",
    confidence: "Placeholder.",
  }),
  emptyExperiment({
    id: "caveman-prompting",
    title: "Caveman Prompting",
    hook: "Caveman Prompting saved less than 3% in my Copilot session.",
    status: "Draft",
    confidence: "Placeholder.",
  }),
  emptyExperiment({
    id: "context-growth",
    title: "Context only grows. Re-reading it was 40% of my Copilot session.",
    hook: "Context only grows. Re-reading it was 40% of my Copilot session.",
    status: "Published",
    confidence: "Single session (N=1); prefix tripled 19.5K\u219264.2K tokens, and re-reads were 40% of credits \u2014 a direction, not a benchmark.",
    // Bespoke page: pages/ContextGrowth.jsx. App.jsx routes
    // /experiments/context-growth to it directly.
    custom: true,
  }),
  emptyExperiment({
    id: "agent-planning",
    title: "The agent spawned two sub-agents to plan. They both read the same seven files.",
    hook: "The agent spawned two sub-agents to plan. They both read the same seven files.",
    status: "Published",
    confidence: "Single session (N=1) plus a modeled comparison; planning was 38% of spend, the two sub-agents 71% of it, with 94% file overlap \u2014 a direction, not a benchmark.",
    // Bespoke page: pages/AgentPlanning.jsx. App.jsx routes
    // /experiments/agent-planning to it directly.
    custom: true,
  }),
  emptyExperiment({
    id: "tool-skill-overhead",
    title: "Tool and Skill Overhead",
    hook: "I added a 100-tool MCP server to Copilot. The bytes on the wire barely moved.",
    status: "Under investigation",
    confidence: "Decoupling curve across six captures (catalog 23–320); the 15.7-credit churn event is a single session (N=1); skill-instruction overhead not yet isolated.",
  }),
  emptyExperiment({
    id: "installed-skill-overhead",
    title: "Removing a plugin's tool schemas barely moved the wire. Its skills cost every call.",
    hook: "I uninstalled one Copilot plugin. Removing its tool schemas barely moved the wire. Removing its skills cut tokens on every call.",
    status: "Draft",
    confidence: "Measured before/after staircase (N=3 captures, one machine). The clean skill-only step (no tool change) cut the skill catalog ≈1,110 tok and billed prompt 1,197 — a ~1:1 isolation; sent tool schemas held flat at ~9,107 throughout. Catalog tokens are char/4 approximations; prompt_tokens and tool-def counts are exact. The earlier step also removed an MCP server, so its larger drop is not skill-only.",
    // Bespoke page: pages/InstalledSkillOverhead.jsx with inline charts.
    // App.jsx routes /experiments/installed-skill-overhead to it directly.
    custom: true,
    reportRoute: "/reports/skill-overhead-cleaned",
  }),
];

export function findExperiment(id) {
  return EXPERIMENTS.find(function (e) { return e.id === id; }) || null;
}

// ── Observations: short, LinkedIn-friendly insights ───────────────────────
export var OBSERVATIONS = [
  {
    id: "readme-was-cheap",
    title: "The README was cheap. Finding it wasn't.",
    body: "Reading a file is nearly free. The expensive part is the work the agent does to decide which file to read — the searching, listing, and reasoning that precede a single cheap read.",
  },
  {
    id: "visible-output-is-small",
    title: "Only a small part of some sessions is visible output.",
    body: "The text you see streamed back can be a fraction of total token spend. Most of the cost is on the input side: history, tool results, and context the model reads but never reprints.",
  },
  {
    id: "tool-call-implies-model-call",
    title: "Every tool call can imply another model call.",
    body: "A tool result has to be interpreted, which means feeding it back into the next model call. One tool invocation often triggers another round-trip through the model.",
  },
  {
    id: "right-work",
    title: "Most cost optimization is about helping the agent do the right work.",
    body: "Trimming tokens helps at the margin, but the larger savings come from steering the agent toward the correct work sooner — fewer wrong turns, fewer redundant loops.",
  },
  {
    id: "cache-changes-profile",
    title: "Cache can change the cost profile dramatically.",
    body: "When a stable context prefix is cached, later calls pay a fraction of the input rate. The same conversation can be cheap or expensive depending on how well the cache is used.",
  },
  {
    id: "long-vs-short",
    title: "Long conversations behave differently from short ones.",
    body: "Short sessions are dominated by setup. Long sessions are dominated by accumulated history. Optimizations that help one can be irrelevant to the other.",
  },
];

export function findObservation(id) {
  return OBSERVATIONS.find(function (o) { return o.id === id; }) || null;
}

// ── Session Gallery ───────────────────────────────────────────────────────
// `file` is a bundled export under public/ (loaded via assetUrl). When null the
// card renders as "Coming soon".
export var GALLERY_SESSIONS = [
  {
    id: "subagent-example",
    title: "Subagent dispatch session",
    description: "A short session where the agent reads a file and dispatches a sub-agent — a compact example of tool calls implying further model calls.",
    file: "sessions/subagent-example.json",
  },
  {
    id: "readme-summary",
    title: "README summary session",
    description: "Summarizing a repository README — a deceptively cheap-looking task once you account for how the agent finds the file.",
    file: null,
  },
  {
    id: "shopping-cart",
    title: "Shopping cart implementation session",
    description: "A longer feature build showing context growth across many tool calls and model turns.",
    file: null,
  },
  {
    id: "one-tool",
    title: "One-tool example",
    description: "The smallest useful session: a single tool call, to isolate per-call setup overhead.",
    file: "sessions/02-one-tool.json",
  },
  {
    id: "large-context",
    title: "Large context example",
    description: "A session that accumulates tens of thousands of context tokens — useful for seeing cache reads and writes at scale.",
    file: null,
  },
];

export var STATUS_TONE = {
  Published: "success",
  Draft: "warning",
  Planned: "muted",
  "Under investigation": "info",
};

// ── Fixed reports ─────────────────────────────────────────────────────────
// A fixed report pins one bundled export to a stable #/reports/<id> route and
// renders it in the read-only viewer (no file picker, no switching). This is
// how an experiment links to its own evidence without exposing the uploader.
//
// Fields:
//   id        - stable route segment (#/reports/<id>)
//   title     - descriptive name shown in the report header instead of the
//               raw filename (e.g. "Context Quality — lazy lookup").
//   file      - bundled export under public/ (loaded via assetUrl).
//   summaries - OPTIONAL { userGoal, agentApproach } shown at the top of the
//               report. Authored at publish time because a fixed report has no
//               canvas bridge to generate them live. Populate this so the page
//               opens with context instead of empty summary boxes.
//   backTo / backLabel - link back to the owning experiment.
//
// To add the next one: copy the export into public/sessions/, add an entry
// here (with a descriptive title and summaries), and link to "/reports/<id>"
// from the experiment page.
export var FIXED_REPORTS = [
  {
    id: "02-one-tool",
    title: "One-tool session — read the README",
    file: "sessions/02-one-tool.json",
    backTo: "/experiments/context-quality-readme",
    backLabel: "Back to experiment",
  },
  {
    id: "context-quality-maprows",
    title: "Context Quality — lazy lookup (search → read → answer)",
    file: "sessions/t2-maprows-lazy.json",
    summaries: {
      userGoal:
        "The developer asked how the `mapDatabaseRows` helper works — what it does to rows returned from SQLite — without telling the agent which file defines it. This is the lazy arm of an A/B test on whether front-loading the relevant file is cheaper than letting the agent discover it.",
      agentApproach:
        "With no file attached, the agent ran a grep_search for `mapDatabaseRows`, located it in api/src/utils/sql.ts, then read that file across four small overlapping windows (one via a corrupted path, which forced a retry) before answering that it maps snake_case columns to camelCase objects. That came to 6 model calls and 5 tool calls for 12.8 credits — versus 8.0 credits in 1 call when the same file was attached up front.",
    },
    backTo: "/experiments/context-quality-readme",
    backLabel: "Back to experiment",
  },
  {
    id: "cache-curve",
    title: "Cache behavior — the per-call hit-rate curve",
    file: "sessions/t2-maprows-lazy.json",
    summaries: {
      userGoal:
        "The same lazy-lookup run, re-framed to study the prompt cache rather than context quality. The question here is not what the agent answered, but how the cache warmed up call by call: what the first request already found cached, and how quickly later calls reached near-total reuse.",
      agentApproach:
        "Across 6 model calls on claude-sonnet-4.5, the cache hit rate climbs 40.3% → 93.4% → 98.7% → 98.3% → 99.1% → 98.9%. The first call already reuses a shared 9,680-token prefix (tool defs + system) before paying a one-time 5.4-credit cache-creation write; every call after that re-reads the warm prefix and only pays for the new tool result (229–442 tokens). Select call 1 to see the shared hit, then step through 2–6 to watch reuse approach 99%.",
    },
    backTo: "/experiments/cache-behavior",
    backLabel: "Back to experiment",
  },
  {
    id: "tool-overhead-120",
    title: "Tool Overhead — 120 tools enabled, 23 sent",
    file: "sessions/hi-116-tools-deferred.json",
    summaries: {
      userGoal:
        "The developer typed a one-word \"hi\" with 120 tools enabled in VS Code, purely to see what the editor sends to the model along with the message. The question isn't the reply — it's whether the full enabled-tool catalog rides over the wire as schemas, or whether VS Code trims it first.",
      agentApproach:
        "VS Code answered in a single claude-sonnet-4.5 call but sent only 23 of the 120 enabled tools as full schemas; the other 97 were advertised name-only in a deferred index (loaded on demand via tool_search) and never expanded. The 23 sent schemas were ~9,107 tokens — about 33% of the 25,367-token prompt — versus ~35,571 tokens if all 120 had been sent flat, a ~3.9x compression. The turn cost 6.4 credits at a 38% cache hit. Open the tool_defs box to see the sent block, and note the 97 deferred tools that cost almost nothing.",
    },
    backTo: "/experiments/tool-skill-overhead",
    backLabel: "Back to experiment",
  },
  {
    id: "skill-overhead-cleaned",
    title: "Installed Skill Overhead — the cleaned floor (0 global-plugin skills)",
    file: "sessions/skill-overhead-cleaned.json",
    summaries: {
      userGoal:
        "The final step of a three-capture before/after: the same trivial \"hi\" prompt, same model, same repo, captured after relocating every installed plugin's skills out of the global cache and into the one repo that needs them. The question is what the fixed system-prompt floor looks like once no installed-plugin skill rides along globally anymore.",
      agentApproach:
        "VS Code answered in a single claude-sonnet-4.5 call. Of the original 37-skill catalog (~5,146 tokens, the dirty baseline), only 14 skills remain (~1,917 tokens) — and zero of them come from installed plugins; they are 2 workspace project skills plus 12 VS Code built-in/extension skills. The billed prompt fell from 25,367 to 20,167 tokens versus the dirty baseline. The sent full-schema tool block held flat at 23 schemas / ~9,107 tokens across all three captures: the clean final step changed only skills (≈1,110 fewer catalog tokens, 1,197 fewer billed prompt tokens — near 1:1), while the virtualized tool schemas never moved. The turn cost 4.3 credits at a 48% cache hit. Open the system box to see the shrunken skill catalog, and compare the tool_defs box to the 120-tools report — same 23 sent.",
    },
    backTo: "/experiments/installed-skill-overhead",
    backLabel: "Back to experiment (Installed Skill Overhead)",
  },
];

export function findFixedReport(id) {
  return FIXED_REPORTS.find(function (r) { return r.id === id; }) || null;
}
