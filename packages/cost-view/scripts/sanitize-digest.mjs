// Thin CLI wrapper around sanitizeDigest(). Reads a CLI session digest, applies
// the publish-time redaction profile, and writes the sanitized copy.
//
//   node scripts/sanitize-digest.mjs <in-digest.json> <out.json>
//   node scripts/sanitize-digest.mjs <in-digest.json> --stdout
//
// Never run this on a raw `process-*.log` / transcript -- it expects the digest
// the skills produce (the raw logs are intentionally never published).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { sanitizeDigest, isCliDigest } from "../src/lib/sanitizeDigest.js";

const [, , inPath, outArg] = process.argv;

if (!inPath || !outArg) {
  console.error("usage: node scripts/sanitize-digest.mjs <in-digest.json> <out.json|--stdout>");
  process.exit(2);
}

let parsed;
try {
  parsed = JSON.parse(readFileSync(inPath, "utf8"));
} catch (err) {
  console.error(`failed to read/parse ${inPath}: ${err.message}`);
  process.exit(1);
}

if (!isCliDigest(parsed)) {
  console.error(`${inPath} is not a recognized CLI session digest (need session.digestVersion + session.kind + rollups)`);
  process.exit(1);
}

const sanitized = sanitizeDigest(parsed);
const json = JSON.stringify(sanitized, null, 2);

if (outArg === "--stdout") {
  process.stdout.write(json + "\n");
} else {
  mkdirSync(dirname(outArg), { recursive: true });
  writeFileSync(outArg, json + "\n");
  console.error(
    `wrote ${outArg} (kind=${sanitized.session.kind}, profile=${sanitized.session.redactionProfile})`,
  );
}
