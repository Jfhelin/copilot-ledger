// Publish-time sanitizer for CLI session digests.
//
// The raw Copilot CLI / Claude CLI logs are NEVER published. We bundle only the
// compact digest the skills produce -- but even the digest carries a few things
// that should not go onto a public page:
//
//   * local-machine identifiers (filesystem paths, workspace/session ids, branch);
//   * the verbatim user prompt (`prompts[].promptText`);
//   * for Claude, content reconstructed from the local relay capture that goes
//     beyond the approved call FLOW -- specifically the system prompt, the
//     advertised tool-DEFINITION catalog (names + sizing), installed skill /
//     MCP names, the raw capture filenames, and the prompt/assistant TEXT
//     previews.
//
// What survives in BOTH profiles: the headline rollups, the representative-prefix
// composition PROPORTIONS, and the per-call `timeline` (LLM calls + the tool
// NAMES they issued + per-call cost). The timeline carries no prompt/assistant
// text and no tool inputs, so the called-tool names + flow are the only
// transcript-derived detail it exposes -- which is the disclosure the user
// explicitly approved ("Option B").
//
// The redaction is asymmetric and keyed on `session.kind`:
//
//   * copilot-cli / vscode  -- the harness emits this log TO the user, so tool
//     names, previews, and the advertised catalog are kept; cost is real.
//   * claude-code           -- the system prompt / tool schemas were observed via
//     a local relay the user set up, so we keep the call flow + composition
//     proportions but drop the catalog, skill/MCP names, capture filenames, and
//     every text preview. Cost is modelled.

const ALWAYS_STRIP_SESSION = [
  "sourceFile",
  "sourceSizeBytes",
  "sourceMtimeMs",
  "cwd",
  "workspaceId",
  "sessionId",
  "gitBranch",
  "captureSignature",
];

// Replace absolute home/temp paths so a stray warning string can't leak a layout.
function scrubPath(value) {
  if (typeof value !== "string") return value;
  return value.replace(/(?:\/Users\/|\/home\/|\/private\/|\/tmp\/|[A-Za-z]:\\\\)[^\s"']*/g, "<path>");
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function isCliDigest(obj) {
  return Boolean(
    obj &&
      typeof obj === "object" &&
      obj.session &&
      typeof obj.session === "object" &&
      typeof obj.session.digestVersion === "number" &&
      typeof obj.session.kind === "string" &&
      obj.rollups &&
      typeof obj.rollups === "object",
  );
}

// Sources where the harness itself hands the log to the user. Everything else
// (currently only "claude-code") is treated as relay/proxy-captured and gets the
// stricter profile (no catalog / names / text, modelled cost).
const SELF_EMITTED_KINDS = new Set(["copilot-cli", "vscode", "copilot-chat-export"]);

// Rebuild each timeline entry from a fixed key whitelist so no future text/input
// field can ride along. LLM entries carry model + token counts + per-call cost;
// tool entries carry only the tool NAME.
function sanitizeTimeline(timeline) {
  if (!Array.isArray(timeline)) return undefined;
  return timeline
    .map(function (e) {
      if (!e || typeof e !== "object") return null;
      if (e.kind === "tool") {
        const out = { kind: "tool", name: typeof e.name === "string" ? e.name : "" };
        if (typeof e.contextTokens === "number") out.contextTokens = e.contextTokens;
        return out;
      }
      if (e.kind === "llm") {
        const out = { kind: "llm", model: e.model == null ? null : String(e.model) };
        if (e.tokens && typeof e.tokens === "object") {
          out.tokens = {};
          for (const k of ["fresh", "cached", "cacheWrite", "output", "reasoning"]) {
            if (typeof e.tokens[k] === "number") out.tokens[k] = e.tokens[k];
          }
        }
        if (e.cost && typeof e.cost === "object") {
          out.cost = {};
          if (typeof e.cost.unit === "string") out.cost.unit = e.cost.unit;
          for (const k of ["total", "fresh", "cached", "cacheWrite", "output"]) {
            if (typeof e.cost[k] === "number") out.cost[k] = e.cost[k];
          }
        }
        return out;
      }
      return null;
    })
    .filter(Boolean);
}

export function sanitizeDigest(input) {
  if (!isCliDigest(input)) {
    throw new Error("sanitizeDigest: input is not a recognized CLI session digest");
  }
  const d = deepClone(input);
  const kind = d.session.kind;
  const selfEmitted = SELF_EMITTED_KINDS.has(kind);

  // --- Always: strip local identifiers and the verbatim prompt -------------
  for (const key of ALWAYS_STRIP_SESSION) delete d.session[key];
  if (Array.isArray(d.session.warnings)) {
    d.session.warnings = d.session.warnings.map(scrubPath);
  }
  // The view never uses the touched-files list; drop it entirely.
  delete d.files;

  if (d.prefix && d.prefix.representative) {
    // `file` is the local relay-capture filename (Claude only).
    delete d.prefix.representative.file;
  }
  // The per-request capture list carries raw capture FILENAMES + timestamps; the
  // renderer only ever uses `prefix.representative`, so drop the list entirely.
  if (d.prefix && Array.isArray(d.prefix.captures)) {
    d.prefix.captureCount = d.prefix.captures.length;
    delete d.prefix.captures;
  }
  if (d.prefix && typeof d.prefix.source === "string") {
    d.prefix.source = scrubPath(d.prefix.source);
  }

  // --- Always: keep the per-call timeline (key-whitelisted, no text) --------
  if (Array.isArray(d.prompts)) {
    for (const p of d.prompts) {
      delete p.promptText;
      const t = sanitizeTimeline(p.timeline);
      if (t) p.timeline = t;
      else delete p.timeline;
    }
  }

  if (selfEmitted) {
    d.session.redactionProfile = "self-emitted-full";
    d.session.textRedacted = false;
    d.session.toolDefinitionsRedacted = false;
  } else {
    // --- Proxy/relay-captured (Claude): flow + proportions, modelled cost --
    d.session.redactionProfile = "proxy-modelled";
    d.session.textRedacted = true;
    d.session.toolDefinitionsRedacted = true;

    // Keep the composition proportions, drop the advertised tool NAMES.
    if (d.prefix && d.prefix.representative) {
      d.prefix.representative.topTools = [];
    }
    if (d.toolCatalog && typeof d.toolCatalog === "object") {
      d.toolCatalog = { count: d.toolCatalog.count ?? 0 };
    }
    // Per-name usage breakdowns -> drop names, keep the aggregate call count.
    delete d.tools;
    delete d.toolsUsed;
    // Installed skill / MCP names are local environment surface -> counts only.
    if (d.skills && typeof d.skills === "object") {
      d.skills = {
        skillCount: d.skills.skillCount ?? 0,
        approxCatalogTokens: d.skills.approxCatalogTokens ?? 0,
      };
    }
    if (d.mcpInstructions && typeof d.mcpInstructions === "object") {
      d.mcpInstructions = {
        count: Array.isArray(d.mcpInstructions.names) ? d.mcpInstructions.names.length : 0,
        approxTokens: d.mcpInstructions.approxTokens ?? 0,
      };
    }

    if (Array.isArray(d.prompts)) {
      for (const p of d.prompts) {
        delete p.promptPreview;
        delete p.finalAssistantPreview;
        // The per-prompt distinct-tool list is redundant with the timeline's
        // tool rows; drop it to keep a single source of called-tool names.
        delete p.tools;
      }
    }
  }

  d.session.callFlowVisible = true;
  d.session.redacted = true;
  return d;
}
