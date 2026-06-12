#!/usr/bin/env node
// Verify a relay capture really contains the wire data for a Claude Code run —
// used to confirm we successfully captured an IDE/extension session over the
// wire (not just its usage transcript).
//
// Usage:
//   node verify-capture.mjs [captureDir] [--transcript <path.jsonl>] [--expect <tokens>] [--json]
//
// captureDir defaults to ~/CopilotLogExports/claude-captures.
// Exits 0 on PASS, 1 on FAIL.
//
// PASS criteria (all must hold):
//   1. index.log records at least one `REQ POST /v1/messages` line
//      -> proves the harness honored ANTHROPIC_BASE_URL and routed through us.
//   2. At least one captured /v1/messages body has tools + system + a user
//      message -> proves we teed the real wire payload, not an empty ping.
//   3. If --transcript is given: the largest captured prefix reconciles with
//      the transcript's turn-0 cache_creation within 10% (independent check).
//   4. If --expect <tokens> is given: the largest prefix is within 10% of it.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

function readTurn0CacheCreation(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, "utf8").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d.type === "assistant") {
      const u = (d.message && d.message.usage) || {};
      return u.cache_creation_input_tokens ?? null;
    }
  }
  return null;
}

function verify(captureDir, opts = {}) {
  const reasons = [];
  const checks = {};

  if (!fs.existsSync(captureDir)) {
    return { pass: false, checks, reasons: [`capture dir not found: ${captureDir}`] };
  }

  // Check 1: index.log shows a real messages request routed through the relay.
  const indexPath = path.join(captureDir, "index.log");
  let reqMessages = 0;
  const hosts = new Set();
  if (fs.existsSync(indexPath)) {
    for (const line of fs.readFileSync(indexPath, "utf8").split("\n")) {
      if (/\bREQ POST \/v1\/messages(\s|$)/.test(line)) reqMessages++;
      const m = line.match(/Host=([^\s]+)/);
      if (m) hosts.add(m[1]);
    }
  }
  checks.routedRequests = reqMessages;
  checks.hostsSeen = [...hosts];
  if (reqMessages > 0) {
    reasons.push(`✓ ${reqMessages} POST /v1/messages routed through the relay`);
  } else {
    reasons.push(
      "✗ no `REQ POST /v1/messages` in index.log — the harness never routed " +
        "through the relay (did not honor ANTHROPIC_BASE_URL)",
    );
  }

  // Check 2: a real /v1/messages body with tools + system + a user message.
  const files = fs
    .readdirSync(captureDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(captureDir, f));
  let best = null;
  for (const f of files) {
    let cap;
    try {
      cap = JSON.parse(fs.readFileSync(f, "utf8"));
    } catch {
      continue;
    }
    if (cap.endpoint && cap.endpoint.includes("count_tokens")) continue;
    const s = cap.sizing || {};
    const total = (s.systemTokens || 0) + (s.toolsTokens || 0) + (s.messagesTokens || 0);
    const hasUser = Array.isArray(cap.messages) && cap.messages.some((m) => m.role === "user");
    if ((s.toolCount || 0) > 0 && (s.systemTokens || 0) > 0 && hasUser) {
      if (!best || total > best.total) best = { file: path.basename(f), sizing: s, total };
    }
  }
  checks.bestCapture = best;
  if (best) {
    reasons.push(
      `✓ wire body captured: ${best.file} — system=${best.sizing.systemTokens}t ` +
        `tools=${best.sizing.toolsTokens}t(${best.sizing.toolCount}) ` +
        `messages=${best.sizing.messagesTokens}t -> total≈${best.total}t`,
    );
  } else {
    reasons.push("✗ no /v1/messages capture with tools + system + user message found");
  }

  let pass = reqMessages > 0 && !!best;

  // Check 3: reconcile with the transcript's turn-0 cache_creation.
  if (opts.transcript) {
    const cc = readTurn0CacheCreation(opts.transcript);
    checks.transcriptCacheCreation = cc;
    if (cc != null && best) {
      const delta = Math.abs(best.total - cc) / cc;
      checks.transcriptDelta = Number(delta.toFixed(3));
      if (delta <= 0.1) {
        reasons.push(`✓ reconciles with transcript turn-0 cache_creation=${cc} (Δ${(delta * 100).toFixed(1)}%)`);
      } else {
        reasons.push(`✗ prefix ${best.total} vs transcript cache_creation ${cc} (Δ${(delta * 100).toFixed(1)}% > 10%)`);
        pass = false;
      }
    } else {
      reasons.push("✗ could not read turn-0 cache_creation from transcript");
      pass = false;
    }
  }

  // Check 4: match an explicitly expected prefix size.
  if (opts.expect != null && best) {
    const delta = Math.abs(best.total - opts.expect) / opts.expect;
    checks.expectDelta = Number(delta.toFixed(3));
    if (delta <= 0.1) {
      reasons.push(`✓ matches expected ~${opts.expect}t (Δ${(delta * 100).toFixed(1)}%)`);
    } else {
      reasons.push(`✗ prefix ${best.total} vs expected ${opts.expect} (Δ${(delta * 100).toFixed(1)}% > 10%)`);
      pass = false;
    }
  }

  return { pass, checks, reasons };
}

function parseArgs(argv) {
  const opts = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--transcript") opts.transcript = argv[++i];
    else if (a === "--expect") opts.expect = Number(argv[++i]);
    else if (a === "--json") opts.json = true;
    else positional.push(a);
  }
  opts.captureDir =
    positional[0] || path.join(os.homedir(), "CopilotLogExports", "claude-captures");
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const result = verify(opts.captureDir, opts);
  if (opts.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(`\nVerifying capture: ${opts.captureDir}\n`);
    for (const r of result.reasons) process.stdout.write("  " + r + "\n");
    process.stdout.write(`\n${result.pass ? "PASS" : "FAIL"} — wire data ${result.pass ? "captured" : "NOT captured"}.\n`);
  }
  process.exit(result.pass ? 0 : 1);
}

export { verify, readTurn0CacheCreation, parseArgs };

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
