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
    title: "The README was cheap. Finding it wasn't.",
    hook: "The README was cheap. Finding it wasn't.",
    status: "Published",
    confidence: "One measured session, not a universal benchmark.",
    // This experiment has a bespoke, fully-written page component
    // (pages/ContextQualityReadme.jsx) rather than the generic Field layout.
    // App.jsx routes /experiments/context-quality-readme to it directly.
    custom: true,
    reportRoute: "/reports/02-one-tool",
  }),
  emptyExperiment({
    id: "model-selection",
    title: "Model Selection",
    hook: "The biggest cost lever is often model selection.",
    status: "Draft",
    confidence: "Placeholder.",
  }),
  emptyExperiment({
    id: "prompt-precision",
    title: "Prompt Precision",
    hook: "Vague prompts cost more than precise prompts.",
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
    title: "Context Growth",
    hook: "What 23,000 tokens of context actually looks like.",
    status: "Planned",
    confidence: "Placeholder.",
  }),
  emptyExperiment({
    id: "agent-planning",
    title: "Agent Planning",
    hook: "I thought the answer was expensive. The plan was.",
    status: "Planned",
    confidence: "Placeholder.",
  }),
  emptyExperiment({
    id: "tool-skill-overhead",
    title: "Tool and Skill Overhead",
    hook: "Unused tools and skills may create setup overhead.",
    status: "Under investigation",
    confidence: "Placeholder.",
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
// To add the next one: copy the export into public/sessions/, add an entry
// here, and link to "/reports/<id>" from the experiment page.
export var FIXED_REPORTS = [
  {
    id: "02-one-tool",
    title: "One-tool session — read the README",
    file: "sessions/02-one-tool.json",
    backTo: "/experiments/context-quality-readme",
    backLabel: "Back to experiment",
  },
];

export function findFixedReport(id) {
  return FIXED_REPORTS.find(function (r) { return r.id === id; }) || null;
}
