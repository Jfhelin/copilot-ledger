#!/usr/bin/env node
// Minimal Anthropic API logging relay for Claude Code (CLI *and* the VS Code
// extension).
//
// Claude Code -> this relay (ANTHROPIC_BASE_URL) -> https://api.anthropic.com
// It streams responses through untouched and tees each request body for the
// messages endpoints, writing a readable JSON capture of
// { system, tools, messages, ... } per call.
//
// Usage:
//   node claude-relay.mjs                 # listens on 127.0.0.1:8788
//   PORT=9000 node claude-relay.mjs       # custom port
//
// Then point a CLI run at it:
//   export ANTHROPIC_BASE_URL=http://127.0.0.1:8788
//   claude
//
// ...or capture the VS Code extension (sdk-ts) — on macOS the extension host
// only inherits env when VS Code is launched from a shell, so fully quit it
// first, then:
//   ANTHROPIC_BASE_URL=http://127.0.0.1:8788 code /path/to/repo
//
// Every incoming request is logged (method + path + Host) to index.log so you
// can VERIFY the harness actually honors ANTHROPIC_BASE_URL and see exactly
// where it routes. /v1/messages and /v1/messages/count_tokens bodies are teed
// to per-call JSON files. API keys / auth headers are NEVER written to disk.
//
// Env:
//   PORT               listen port (default 8788)
//   ANTHROPIC_UPSTREAM upstream host to forward to (default api.anthropic.com).
//                      Override if the harness targets a non-default endpoint.
//   CAPTURE_DIR        output dir (default ~/CopilotLogExports/claude-captures)

import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8788);
const HOST = "127.0.0.1";
const UPSTREAM = process.env.ANTHROPIC_UPSTREAM || "api.anthropic.com";
const OUT_DIR =
  process.env.CAPTURE_DIR ||
  path.join(os.homedir(), "CopilotLogExports", "claude-captures");

let counter = 0;
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

// rough token estimate so the file is useful for context-window sizing
const approxTokens = (s) => (s ? Math.round(s.length / 4) : 0);

function summarize(body, endpoint) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null; // not JSON (e.g. malformed or empty body)
  }

  const systemText = Array.isArray(parsed.system)
    ? parsed.system.map((b) => (typeof b === "string" ? b : b.text || "")).join("\n")
    : typeof parsed.system === "string"
      ? parsed.system
      : "";

  const tools = Array.isArray(parsed.tools) ? parsed.tools : [];
  const messages = Array.isArray(parsed.messages) ? parsed.messages : [];

  const toolsSized = tools.map((t) => {
    const schema = JSON.stringify(t.input_schema || {});
    return {
      name: t.name,
      description: t.description || "",
      input_schema: t.input_schema || {},
      approxTokens: approxTokens((t.name || "") + (t.description || "") + schema),
    };
  });

  const messagesSized = messages.map((m) => {
    const text =
      typeof m.content === "string"
        ? m.content
        : JSON.stringify(m.content || "");
    return {
      role: m.role,
      contentTypes: Array.isArray(m.content)
        ? m.content.map((b) => (b && b.type) || typeof b)
        : "string",
      approxTokens: approxTokens(text),
      content: m.content,
    };
  });

  const sizing = {
    systemTokens: approxTokens(systemText),
    toolsTokens: toolsSized.reduce((a, t) => a + t.approxTokens, 0),
    messagesTokens: messagesSized.reduce((a, m) => a + m.approxTokens, 0),
    toolCount: tools.length,
    messageCount: messages.length,
  };

  return {
    capturedAt: new Date().toISOString(),
    endpoint: endpoint || "/v1/messages",
    model: parsed.model,
    stream: parsed.stream,
    max_tokens: parsed.max_tokens,
    tool_choice: parsed.tool_choice,
    metadata: parsed.metadata,
    sizing,
    system: systemText,
    tools: toolsSized,
    messages: messagesSized,
  };
}

export { summarize, approxTokens };

const server = http.createServer((clientReq, clientRes) => {
  const chunks = [];
  clientReq.on("data", (c) => chunks.push(c));
  clientReq.on("end", () => {
    const body = Buffer.concat(chunks);
    const url = clientReq.url || "";

    // Visibility: log EVERY request (method + path + Host) so you can confirm
    // the harness honors ANTHROPIC_BASE_URL and see exactly where it routes.
    const reqLine =
      `${new Date().toISOString()}  REQ ${clientReq.method} ${url} ` +
      `Host=${clientReq.headers.host || "?"}`;
    fs.appendFileSync(path.join(OUT_DIR, "index.log"), reqLine + "\n");
    process.stdout.write(reqLine + "\n");

    // Tee the request body for the messages endpoints (real calls AND the
    // count_tokens pings, which expose the SDK's own prefix sizing).
    const isMessages =
      clientReq.method === "POST" && url.includes("/v1/messages");
    if (isMessages) {
      const endpoint = url.includes("count_tokens")
        ? "/v1/messages/count_tokens"
        : "/v1/messages";
      const summary = summarize(body.toString("utf8"), endpoint);
      if (summary) {
        const n = ++counter;
        const file = path.join(OUT_DIR, `${stamp()}-${String(n).padStart(3, "0")}.json`);
        fs.writeFileSync(file, JSON.stringify(summary, null, 2));
        const s = summary.sizing;
        const line =
          `${summary.capturedAt}  ${summary.model}  ${summary.endpoint}  ` +
          `system=${s.systemTokens}t tools=${s.toolsTokens}t(${s.toolCount}) ` +
          `messages=${s.messagesTokens}t(${s.messageCount})  -> ${path.basename(file)}`;
        fs.appendFileSync(path.join(OUT_DIR, "index.log"), line + "\n");
        process.stdout.write("captured  " + line + "\n");
      }
    }

    // Forward everything upstream, untouched (headers incl. auth pass through).
    const headers = { ...clientReq.headers, host: UPSTREAM };
    const upstream = https.request(
      {
        hostname: UPSTREAM,
        port: 443,
        path: clientReq.url,
        method: clientReq.method,
        headers,
      },
      (upRes) => {
        clientRes.writeHead(upRes.statusCode || 502, upRes.headers);
        upRes.pipe(clientRes); // stream SSE / body straight back, no buffering
      },
    );
    upstream.on("error", (err) => {
      process.stderr.write("upstream error: " + err.message + "\n");
      if (!clientRes.headersSent) clientRes.writeHead(502);
      clientRes.end("relay upstream error");
    });
    if (body.length) upstream.write(body);
    upstream.end();
  });
});

function start() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  server.listen(PORT, HOST, () => {
    process.stdout.write(
      `Claude relay listening on http://${HOST}:${PORT}\n` +
        `Forwarding -> https://${UPSTREAM}\n` +
        `Captures   -> ${OUT_DIR}\n\n` +
        `CLI:      export ANTHROPIC_BASE_URL=http://${HOST}:${PORT} && claude\n` +
        `VS Code:  quit VS Code, then  ANTHROPIC_BASE_URL=http://${HOST}:${PORT} code <repo>\n`,
    );
  });
}

// Only bind the port when run directly (so the module can be imported in tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  start();
}

