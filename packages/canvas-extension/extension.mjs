// Copilot Ledger canvas extension.
//
// Declares one canvas (`copilot-ledger`) that opens an iframe pointed at a
// loopback HTTP server. The server serves the @copilot-ledger/cost-view Vite
// build and exposes a tiny JSON/SSE protocol the iframe uses to talk back to
// us. Agent <-> extension uses canvas actions; iframe <-> extension uses
// loopback HTTP.
//
// Wiring overview:
//
//   Agent ─ loadExport({path|content}) ─► extension fs.read + SSE push ─► iframe parses
//   Agent ─ selectPrompt({promptId})   ─► extension SSE push            ─► iframe highlights
//   Agent ─ selectBox({bucket})        ─► extension SSE push            ─► iframe highlights box
//   Agent ─ selectStat({stat})         ─► extension SSE push            ─► iframe highlights KPI card
//   User click in iframe ─ POST /api/selection ─► extension stores selection
//   User click box ─ POST /api/bucket-selection ─► extension stores box selection
//   User click KPI ─ POST /api/stat-selection ─► extension stores stat selection
//   Agent ─ getSelection() / getBoxSelection() / getStatSelection() ─► returns stored state
//   onUserPromptSubmitted hook         ─► injects current selection + box + stat as additionalContext
//
// State scope: selection + last-loaded export live in memory keyed by
// instanceId. That's fine because both are inherently scoped to "this open
// panel" and the iframe re-asks for state on every reconnect via POST /api/ready.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, CanvasError, joinSession } from "@github/copilot-sdk/extension";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Component buckets the cost view draws. Kept in sync with CTX_KEYS in
// packages/cost-view/src/components/CostViewChatExport.jsx. Used to validate
// agent/iframe-supplied bucket keys before we store or broadcast them.
const CTX_KEYS = ["tool_defs", "system", "history", "tool_results", "current", "images", "output"];
const CTX_LABELS = {
  tool_defs: "Tool defs",
  system: "System",
  history: "History",
  tool_results: "Tool results",
  current: "Current",
  images: "Images",
  output: "Output",
};

// Resolve the cost-view dist directory. We try, in order:
//   1. $COPILOT_LEDGER_DIST           -- explicit override for dev
//   2. <ext-dir>/dist                 -- bundled alongside extension.mjs (packaged install)
//   3. <ext-dir>/../cost-view/dist    -- sibling workspace (repo dev)
async function findDistDir() {
  const candidates = [
    process.env.COPILOT_LEDGER_DIST,
    join(__dirname, "dist"),
    resolve(__dirname, "..", "cost-view", "dist"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await stat(join(candidate, "index.html"));
      return candidate;
    } catch { /* try next */ }
  }
  throw new CanvasError(
    "canvas_dist_missing",
    `cost-view dist not found. Tried: ${candidates.join(", ")}. Set COPILOT_LEDGER_DIST or run \`npm run build\` in the copilot-ledger repo and copy dist/ next to extension.mjs.`,
  );
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map":  "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
};

// instanceId -> { server, url, port, sseClients, loadedExport, selection, summaries, summariesRequested }
const instances = new Map();
// Captured after joinSession; used for session.log() inside request handlers.
let activeSession = null;

function getInstance(instanceId) {
  return instances.get(instanceId) || null;
}

function logSafe(message, opts) {
  try { activeSession?.log(message, opts || {}); } catch { /* ignore */ }
}

function broadcast(instanceId, event, payload) {
  const inst = getInstance(instanceId);
  if (!inst) return;
  const line = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of inst.sseClients) {
    try { res.write(line); } catch { /* drop dead client silently */ }
  }
}

async function readBody(req, limit = 8 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("payload too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function serveStaticFile(req, res, urlPath, distDir) {
  // Normalise; reject path traversal escaping distDir.
  const filePath = normalize(join(distDir, urlPath === "/" ? "index.html" : urlPath));
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403); res.end("forbidden"); return;
  }
  try {
    const data = await readFile(filePath);
    const mime = MIME[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-cache" });
    res.end(data);
  } catch (err) {
    if (err && (err.code === "ENOENT" || err.code === "EISDIR")) {
      // SPA fallback so client-side routing keeps working.
      try {
        const html = await readFile(join(distDir, "index.html"));
        res.writeHead(200, { "Content-Type": MIME[".html"] });
        res.end(html);
      } catch {
        res.writeHead(404); res.end("not found");
      }
    } else {
      res.writeHead(500); res.end(String(err?.message || err));
    }
  }
}

async function startServer(instanceId) {
  const distDir = await findDistDir();

  const state = {
    server: null,
    url: null,
    port: 0,
    distDir,
    sseClients: new Set(),
    loadedExport: null,   // { content, label } | null
    selection: null,      // { promptId, summary } | null
    bucketSelection: null, // { bucket, info } | null  -- selected component box
    statSelection: null,  // { stat, info } | null  -- selected top KPI stat card
    summaries: null,      // { userGoal, agentApproach, label } | null
    summariesRequested: false, // user clicked "Ask Copilot to summarize"; nudged on next chat turn
  };

  const server = createServer(async function onRequest(req, res) {
    const url = new URL(req.url, "http://127.0.0.1");
    const path = url.pathname;

    // --- iframe -> extension API ---
    if (path === "/api/ready" && req.method === "POST") {
      // Iframe came up. Return the current state directly in the response body so
      // the iframe hydrates from its own request rather than an SSE push. The
      // EventSource connection (GET /api/events) is established asynchronously and
      // usually registers AFTER this POST lands, so a pushed replay here would
      // broadcast to zero clients and be lost. Pulling cannot race.
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        loadedExport: state.loadedExport || null,
        selection: state.selection ? { promptId: state.selection.promptId } : null,
        bucketSelection: state.bucketSelection ? { bucket: state.bucketSelection.bucket } : null,
        statSelection: state.statSelection ? { stat: state.statSelection.stat } : null,
        summaries: state.summaries || null,
      }));
      return;
    }
    if (path === "/api/requestSummaries" && req.method === "POST") {
      // Iframe button click. Flip the flag so the next user chat turn carries
      // a nudge asking the agent to call setSummaries.
      try { await readBody(req); } catch {}
      state.summariesRequested = true;
      logSafe("summaries requested by user", { level: "debug", ephemeral: true });
      // Echo back a "pending" state to the iframe so it can show a spinner.
      broadcast(instanceId, "setSummariesPending", { pending: true });
      res.writeHead(204); res.end();
      return;
    }
    if (path === "/api/loaded" && req.method === "POST") {
      // Iframe is acknowledging a load. Nothing to do server-side today;
      // keeping the endpoint so future telemetry/UX can attach here.
      try { await readBody(req); } catch {}
      res.writeHead(204); res.end();
      return;
    }
    if (path === "/api/selection" && req.method === "POST") {
      try {
        const body = await readBody(req);
        const parsed = body ? JSON.parse(body) : {};
        state.selection = parsed.promptId
          ? { promptId: String(parsed.promptId), summary: parsed.summary || null }
          : null;
        logSafe(
          state.selection
            ? `selection -> prompt #${state.selection.summary?.ordinal ?? "?"} (${state.selection.promptId})`
            : "selection cleared",
          { level: "debug", ephemeral: true },
        );
        res.writeHead(204); res.end();
      } catch (err) {
        res.writeHead(400); res.end(String(err?.message || err));
      }
      return;
    }
    if (path === "/api/bucket-selection" && req.method === "POST") {
      try {
        const body = await readBody(req, 256 * 1024);
        const parsed = body ? JSON.parse(body) : {};
        const bucket = parsed.bucket;
        if (bucket != null && CTX_KEYS.indexOf(String(bucket)) === -1) {
          res.writeHead(400); res.end("invalid bucket"); return;
        }
        if (bucket) {
          // Bound the stored info to keep agent context small and predictable.
          let info = (parsed.info && typeof parsed.info === "object") ? parsed.info : null;
          if (info) {
            try {
              const json = JSON.stringify(info);
              if (json.length > 4096) info = null;
            } catch { info = null; }
          }
          state.bucketSelection = { bucket: String(bucket), info };
        } else {
          state.bucketSelection = null;
        }
        logSafe(
          state.bucketSelection
            ? `bucket selection -> ${state.bucketSelection.bucket}`
            : "bucket selection cleared",
          { level: "debug", ephemeral: true },
        );
        // Store only; never re-broadcast (the click already updated the iframe).
        res.writeHead(204); res.end();
      } catch (err) {
        res.writeHead(400); res.end(String(err?.message || err));
      }
      return;
    }
    if (path === "/api/stat-selection" && req.method === "POST") {
      try {
        const body = await readBody(req, 256 * 1024);
        const parsed = body ? JSON.parse(body) : {};
        let stat = parsed.stat;
        if (stat != null) {
          stat = String(stat);
          // Stat card labels are dynamic (some conditional), so we can't enum
          // them; just bound the length to keep agent context predictable.
          if (stat.length === 0 || stat.length > 64) {
            res.writeHead(400); res.end("invalid stat"); return;
          }
        }
        if (stat) {
          let info = (parsed.info && typeof parsed.info === "object") ? parsed.info : null;
          if (info) {
            try {
              const json = JSON.stringify(info);
              if (json.length > 4096) info = null;
            } catch { info = null; }
          }
          state.statSelection = { stat, info };
        } else {
          state.statSelection = null;
        }
        logSafe(
          state.statSelection
            ? `stat selection -> ${state.statSelection.stat}`
            : "stat selection cleared",
          { level: "debug", ephemeral: true },
        );
        res.writeHead(204); res.end();
      } catch (err) {
        res.writeHead(400); res.end(String(err?.message || err));
      }
      return;
    }
    if (path === "/api/events" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write(":ok\n\n");
      state.sseClients.add(res);
      req.on("close", function () { state.sseClients.delete(res); });
      return;
    }

    // --- static SPA ---
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405); res.end("method not allowed");
      return;
    }
    await serveStaticFile(req, res, path, state.distDir);
  });

  await new Promise(function (resolveListen, rejectListen) {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", function () {
      server.off("error", rejectListen);
      resolveListen();
    });
  });

  const port = server.address().port;
  state.server = server;
  state.port = port;
  state.url = `http://127.0.0.1:${port}/?embed=1`;
  return state;
}

function summarizeSelection(selection) {
  if (!selection || !selection.summary) return "(no prompt selected)";
  const s = selection.summary;
  const parts = [
    `prompt #${s.ordinal ?? "?"} ("${(s.label || "").slice(0, 80)}")`,
    typeof s.cost === "number" ? `$${s.cost.toFixed(4)}` : null,
    Number.isFinite(s.promptTokens) ? `${s.promptTokens} in` : null,
    Number.isFinite(s.output) ? `${s.output} out` : null,
    Number.isFinite(s.llmCount) ? `${s.llmCount} LLM` : null,
    Number.isFinite(s.toolCount) ? `${s.toolCount} tools` : null,
    Number.isFinite(s.cacheHitRate) ? `${Math.round(s.cacheHitRate * 100)}% cached` : null,
    s.threadSlot ? (s.threadSlot === "sub" ? `subagent (spawned by prompt #${s.parentOrdinal ?? "?"})` : "main thread") : null,
  ].filter(Boolean);
  return parts.join(", ");
}

function summarizeBucketSelection(bucketSelection) {
  if (!bucketSelection || !bucketSelection.bucket) return null;
  const k = bucketSelection.bucket;
  const label = CTX_LABELS[k] || k;
  const info = bucketSelection.info || null;
  if (!info) return `the "${label}" component box (no per-prompt metrics captured)`;
  const m = info.metrics || {};
  const where = info.promptOrdinal != null ? `prompt #${info.promptOrdinal}` : "a prompt";
  const site = info.source === "context-bar"
    ? `the context-window bar of ${where}`
    : info.source === "prompt-cost"
      ? `the "Cost by component" panel of ${where}`
      : where;
  const metricParts = [];
  if (m.unit === "usd") {
    if (Number.isFinite(m.cost)) metricParts.push(`$${m.cost.toFixed(4)}`);
    if (Number.isFinite(m.tokens)) metricParts.push(`${m.tokens} tok`);
    if (Number.isFinite(m.cachedPct)) metricParts.push(`${m.cachedPct}% cached`);
    if (Number.isFinite(m.savings) && m.savings > 0) metricParts.push(`saved $${m.savings.toFixed(4)}`);
  } else if (m.unit === "tokens") {
    if (Number.isFinite(m.tokens)) metricParts.push(`${m.tokens} tokens`);
  }
  const metricStr = metricParts.length ? ` — last clicked in ${site}: ${metricParts.join(", ")}` : ` — last clicked in ${site}`;
  return `the "${label}" component box (highlighted across all bars)${metricStr}`;
}

function summarizeStatSelection(statSelection) {
  if (!statSelection || !statSelection.stat) return null;
  const label = statSelection.stat;
  const info = statSelection.info || null;
  if (!info) return `the "${label}" summary stat card`;
  const parts = [];
  if (info.value != null) parts.push(String(info.value));
  if (info.sub != null) parts.push(String(info.sub));
  const valStr = parts.length ? `: ${parts.join(" · ")}` : "";
  return `the "${label}" summary stat card${valStr}`;
}

const canvas = createCanvas({
  id: "copilot-ledger",
  displayName: "Copilot Ledger",
  description:
    "Cost and tool-call breakdown for a VS Code Copilot Chat export. Open this canvas to discuss token spend, cache efficiency, and per-prompt outcomes; the user's current selection in the panel is automatically attached to follow-up turns. The user can also click a component box (Tool defs / System / History / Tool results / Current / Images / Output) to highlight it everywhere — that box selection is queryable via `getBoxSelection` — and click a top summary stat card (Total cost, Billed input, Output, LLM calls, Tool calls, …), queryable via `getStatSelection`. Both are attached to follow-up turns. " +
    "IMPORTANT: at the start of every turn while this canvas is open, call `getPendingRequests` once. If it returns any items, act on each (e.g. for kind='summaries', read the export file at `exportLabel` and call `setSummaries` on the matching `instanceId`). A new export is auto-queued as a 'summaries' request on `loadExport`, so the user does not need to click anything.",
  inputSchema: {
    type: "object",
    properties: {
      exportPath: { type: "string", description: "Optional path to a .json export to auto-load on open." },
      label: { type: "string", description: "Optional human-readable label for the panel (defaults to the file path)." },
    },
    additionalProperties: false,
  },
  actions: [
    {
      name: "loadExport",
      description: "Load a VS Code Copilot Chat prompts export into the panel. Provide either an absolute file path or the full JSON content.",
      inputSchema: {
        type: "object",
        oneOf: [
          { required: ["path"] },
          { required: ["content"] },
        ],
        properties: {
          path: { type: "string", description: "Absolute path to a copilot_all_prompts_*.json file." },
          content: { type: "string", description: "Full export JSON as a string." },
          label: { type: "string", description: "Optional human-readable label." },
        },
        additionalProperties: false,
      },
      handler: async (ctx) => {
        const inst = getInstance(ctx.instanceId);
        if (!inst) throw new CanvasError("canvas_not_open", "Canvas instance is not open.");
        let content = ctx.input.content;
        let label = ctx.input.label;
        if (!content && ctx.input.path) {
          content = await readFile(ctx.input.path, "utf8");
          label = label || ctx.input.path;
        }
        if (!content) throw new CanvasError("canvas_input_invalid", "Provide `path` or `content`.");
        inst.loadedExport = { content, label: label || null };
        inst.selection = null;
        inst.bucketSelection = null;
        inst.statSelection = null;
        inst.summaries = null;
        inst.summariesRequested = true;
        broadcast(ctx.instanceId, "loadExport", inst.loadedExport);
        broadcast(ctx.instanceId, "setSelection", { promptId: null });
        broadcast(ctx.instanceId, "setBucketSelection", null);
        broadcast(ctx.instanceId, "setStatSelection", null);
        broadcast(ctx.instanceId, "setSummaries", null);
        broadcast(ctx.instanceId, "setSummariesPending", true);
        return { loaded: true, label: label || null, bytes: content.length };
      },
    },
    {
      name: "getPendingRequests",
      description:
        "Return (and dequeue) any user-initiated requests pending in the panel. Call this at the start of every turn while the canvas is open. Returns { pending: [{ instanceId, kind, exportLabel }] }. Kinds: 'summaries' means the user clicked 'Ask Copilot to summarize' \u2014 read the export file at `exportLabel` and call `setSummaries` on that instanceId.",
      inputSchema: { type: "object", additionalProperties: false },
      handler: async (_ctx) => {
        const pending = [];
        for (const [instanceId, inst] of instances) {
          if (inst.summariesRequested && inst.loadedExport) {
            inst.summariesRequested = false;
            pending.push({
              instanceId,
              kind: "summaries",
              exportLabel: inst.loadedExport.label || null,
            });
          }
        }
        return { pending };
      },
    },
    {
      name: "setSummaries",
      description:
        "Store and display two short paragraphs above the model breakdown: what the user wanted done (userGoal) and how the agent achieved it (agentApproach). Call this in response to the additionalContext nudge that appears after the user clicks 'Ask Copilot to summarize'.",
      inputSchema: {
        type: "object",
        properties: {
          userGoal: { type: "string", description: "2-4 sentences: what the user was trying to accomplish in this session." },
          agentApproach: { type: "string", description: "2-4 sentences: how the agent attempted to accomplish it (tools, files, retries, outcome)." },
        },
        required: ["userGoal", "agentApproach"],
        additionalProperties: false,
      },
      handler: async (ctx) => {
        const inst = getInstance(ctx.instanceId);
        if (!inst) throw new CanvasError("canvas_not_open", "Canvas instance is not open.");
        inst.summaries = {
          userGoal: String(ctx.input.userGoal || "").trim(),
          agentApproach: String(ctx.input.agentApproach || "").trim(),
          label: inst.loadedExport?.label || null,
          ts: Date.now(),
        };
        inst.summariesRequested = false;
        broadcast(ctx.instanceId, "setSummaries", inst.summaries);
        return { stored: true };
      },
    },
    {
      name: "selectPrompt",
      description: "Highlight a specific prompt in the cost view. Pass null to clear the selection.",
      inputSchema: {
        type: "object",
        properties: {
          promptId: { type: ["string", "null"], description: "Prompt ID to highlight (from a prior getSelection or known list). Null clears." },
        },
        required: ["promptId"],
        additionalProperties: false,
      },
      handler: async (ctx) => {
        const inst = getInstance(ctx.instanceId);
        if (!inst) throw new CanvasError("canvas_not_open", "Canvas instance is not open.");
        const id = ctx.input.promptId || null;
        // We only know summaries the iframe has already sent us. Preserve the
        // last summary when the agent re-selects the same prompt; otherwise
        // wait for the iframe to POST /api/selection back with fresh details.
        if (id && inst.selection && inst.selection.promptId === id) {
          // keep summary
        } else {
          inst.selection = id ? { promptId: id, summary: null } : null;
        }
        broadcast(ctx.instanceId, "setSelection", { promptId: id });
        return { promptId: id };
      },
    },
    {
      name: "getSelection",
      description: "Return the currently selected prompt (id + summary fields like cost, tokens, cache hit rate). Returns null if nothing is selected.",
      inputSchema: { type: "object", additionalProperties: false },
      handler: async (ctx) => {
        const inst = getInstance(ctx.instanceId);
        if (!inst || !inst.selection) return null;
        return inst.selection;
      },
    },
    {
      name: "clearSelection",
      description: "Clear any current prompt selection in the cost view.",
      inputSchema: { type: "object", additionalProperties: false },
      handler: async (ctx) => {
        const inst = getInstance(ctx.instanceId);
        if (!inst) return { cleared: true };
        inst.selection = null;
        broadcast(ctx.instanceId, "setSelection", { promptId: null });
        return { cleared: true };
      },
    },
    {
      name: "selectBox",
      description:
        "Highlight a component box (token bucket) across the context-window bars and the 'Cost by component' panels. Pass null to clear. Valid buckets: tool_defs, system, history, tool_results, current, images, output.",
      inputSchema: {
        type: "object",
        properties: {
          bucket: { type: ["string", "null"], enum: [...CTX_KEYS, null], description: "Component bucket key to highlight, or null to clear." },
        },
        required: ["bucket"],
        additionalProperties: false,
      },
      handler: async (ctx) => {
        const inst = getInstance(ctx.instanceId);
        if (!inst) throw new CanvasError("canvas_not_open", "Canvas instance is not open.");
        const bucket = ctx.input.bucket || null;
        if (bucket && CTX_KEYS.indexOf(bucket) === -1) {
          throw new CanvasError("canvas_input_invalid", `Unknown bucket '${bucket}'.`);
        }
        // Agent-driven selection has no click-site metrics; preserve existing
        // info only when re-selecting the same bucket.
        if (bucket && inst.bucketSelection && inst.bucketSelection.bucket === bucket) {
          // keep info
        } else {
          inst.bucketSelection = bucket ? { bucket, info: null } : null;
        }
        broadcast(ctx.instanceId, "setBucketSelection", bucket ? { bucket } : null);
        return { bucket };
      },
    },
    {
      name: "getBoxSelection",
      description: "Return the currently selected component box ({ bucket, info }) with any per-prompt metrics from the user's last click. Returns null if nothing is selected.",
      inputSchema: { type: "object", additionalProperties: false },
      handler: async (ctx) => {
        const inst = getInstance(ctx.instanceId);
        if (!inst || !inst.bucketSelection) return null;
        return inst.bucketSelection;
      },
    },
    {
      name: "selectStat",
      description:
        "Highlight a top summary stat card (e.g. 'Total cost', 'Billed input', 'Output', 'LLM calls', 'Tool calls'). Pass the card's label string, or null to clear. Independent from selectBox.",
      inputSchema: {
        type: "object",
        properties: {
          stat: { type: ["string", "null"], description: "Stat card label to highlight (e.g. 'Total cost'), or null to clear." },
        },
        required: ["stat"],
        additionalProperties: false,
      },
      handler: async (ctx) => {
        const inst = getInstance(ctx.instanceId);
        if (!inst) throw new CanvasError("canvas_not_open", "Canvas instance is not open.");
        let stat = ctx.input.stat || null;
        if (stat != null) {
          stat = String(stat);
          if (stat.length === 0 || stat.length > 64) {
            throw new CanvasError("canvas_input_invalid", "stat label must be 1-64 chars.");
          }
        }
        if (stat && inst.statSelection && inst.statSelection.stat === stat) {
          // keep info
        } else {
          inst.statSelection = stat ? { stat, info: null } : null;
        }
        broadcast(ctx.instanceId, "setStatSelection", stat ? { stat } : null);
        return { stat };
      },
    },
    {
      name: "getStatSelection",
      description: "Return the currently selected top stat card ({ stat, info }) with the displayed value from the user's last click. Returns null if nothing is selected.",
      inputSchema: { type: "object", additionalProperties: false },
      handler: async (ctx) => {
        const inst = getInstance(ctx.instanceId);
        if (!inst || !inst.statSelection) return null;
        return inst.statSelection;
      },
    },
  ],
  open: async (ctx) => {
    let inst = getInstance(ctx.instanceId);
    if (!inst) {
      inst = await startServer(ctx.instanceId);
      instances.set(ctx.instanceId, inst);
    }
    // Auto-load if the caller provided a path on open.
    const exportPath = ctx.input?.exportPath;
    const exportLabel = ctx.input?.label;
    if (exportPath && !inst.loadedExport) {
      try {
        const content = await readFile(exportPath, "utf8");
        inst.loadedExport = { content, label: exportLabel || exportPath };
        broadcast(ctx.instanceId, "loadExport", inst.loadedExport);
      } catch (err) {
        logSafe(`open: failed to auto-load ${exportPath}: ${err?.message || err}`, { level: "warn" });
      }
    }
    return {
      title: "Copilot Ledger",
      url: inst.url,
      status: inst.loadedExport ? "ready" : "waiting for export",
    };
  },
  onClose: async (ctx) => {
    const inst = getInstance(ctx.instanceId);
    if (!inst) return;
    instances.delete(ctx.instanceId);
    try {
      for (const res of inst.sseClients) { try { res.end(); } catch {} }
      inst.sseClients.clear();
      await new Promise(function (r) { inst.server.close(function () { r(); }); });
    } catch (err) {
      logSafe(`close: ${err?.message || err}`, { level: "warn" });
    }
  },
});

const session = await joinSession({
  canvases: [canvas],
  hooks: {
    // When the user types a follow-up message, silently attach the current
    // canvas selection so the agent always has the relevant context without
    // the user having to repeat themselves. Only inject when *some* instance
    // has a selection.
    onUserPromptSubmitted: async () => {
      const lines = [];
      for (const [instanceId, inst] of instances) {
        if (inst.selection) {
          lines.push(
            `Copilot Ledger canvas (${instanceId}) currently has selected: ${summarizeSelection(inst.selection)}`,
          );
        }
        if (inst.bucketSelection) {
          const boxStr = summarizeBucketSelection(inst.bucketSelection);
          if (boxStr) {
            lines.push(
              `Copilot Ledger canvas (${instanceId}) has a component box selected: ${boxStr}`,
            );
          }
        }
        if (inst.statSelection) {
          const statStr = summarizeStatSelection(inst.statSelection);
          if (statStr) {
            lines.push(
              `Copilot Ledger canvas (${instanceId}) has a summary stat card selected: ${statStr}`,
            );
          }
        }
        if (inst.summariesRequested && inst.loadedExport) {
          // Clear the flag eagerly; if the agent forgets to call setSummaries
          // the user can click the button again.
          inst.summariesRequested = false;
          const label = inst.loadedExport.label || "(unlabeled export)";
          lines.push(
            `Copilot Ledger canvas (${instanceId}): the user clicked "Ask Copilot to summarize" for the loaded export \`${label}\`. ` +
            `Read the export file at that path (it is a VS Code Copilot Chat prompts JSON; user turns and model responses are inside), ` +
            `then call the canvas action \`setSummaries\` on instance \`${instanceId}\` with:\n` +
            `  - userGoal: 2-4 sentences describing what the user was trying to accomplish in this Copilot session.\n` +
            `  - agentApproach: 2-4 sentences describing how the agent attempted it (key tools/files used, retries, final outcome).\n` +
            `Keep each paragraph factual and concise. Do this silently as a side task; you do not need to discuss it in chat unless the user asks.`,
          );
        }
      }
      if (!lines.length) return undefined;
      return { additionalContext: lines.join("\n\n") };
    },
  },
});
activeSession = session;

session.log("copilot-ledger canvas extension started", { level: "info" });
