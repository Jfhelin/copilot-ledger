#!/usr/bin/env node
// Minimal Anthropic API logging relay for Claude Code.
//
// Claude Code -> this relay (ANTHROPIC_BASE_URL) -> https://api.anthropic.com
// It streams responses through untouched and tees each /v1/messages REQUEST body,
// writing a readable JSON capture of { system, tools, messages, ... } per call.
//
// Usage:
//   node claude-relay.mjs                 # listens on 127.0.0.1:8788
//   PORT=9000 node claude-relay.mjs       # custom port
//
// Then, in another terminal, point Claude Code at it:
//   export ANTHROPIC_BASE_URL=http://127.0.0.1:8788
//   claude
//
// Captures land in ~/CopilotLogExports/claude-captures/ as <timestamp>-<n>.json
// plus a one-line summary appended to index.log. API keys are NEVER written.

import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.PORT || 8788);
const HOST = "127.0.0.1";
const UPSTREAM = "api.anthropic.com";
const OUT_DIR =
  process.env.CAPTURE_DIR ||
  path.join(os.homedir(), "CopilotLogExports", "claude-captures");

fs.mkdirSync(OUT_DIR, { recursive: true });

let counter = 0;
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

// rough token estimate so the file is useful for context-window sizing
const approxTokens = (s) => (s ? Math.round(s.length / 4) : 0);

function summarize(body) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null; // not JSON (e.g. token-count pings we don't care to decode)
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

const server = http.createServer((clientReq, clientRes) => {
  const chunks = [];
  clientReq.on("data", (c) => chunks.push(c));
  clientReq.on("end", () => {
    const body = Buffer.concat(chunks);

    // Tee the request body for /v1/messages POSTs only.
    if (clientReq.method === "POST" && clientReq.url.includes("/v1/messages")) {
      const summary = summarize(body.toString("utf8"));
      if (summary) {
        const n = ++counter;
        const file = path.join(OUT_DIR, `${stamp()}-${String(n).padStart(3, "0")}.json`);
        fs.writeFileSync(file, JSON.stringify(summary, null, 2));
        const s = summary.sizing;
        const line =
          `${summary.capturedAt}  ${summary.model}  ` +
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

server.listen(PORT, HOST, () => {
  process.stdout.write(
    `Claude relay listening on http://${HOST}:${PORT}\n` +
      `Forwarding -> https://${UPSTREAM}\n` +
      `Captures   -> ${OUT_DIR}\n\n` +
      `In another terminal:\n` +
      `  export ANTHROPIC_BASE_URL=http://${HOST}:${PORT}\n` +
      `  claude\n`,
  );
});
