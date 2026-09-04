---
name: publish-session-export
description: Prepare Copilot Chat, Copilot CLI, or Claude Code session exports for publication without blindly deleting all text. Use whenever the user wants to publish, share, bundle, commit, upload, or generate a web page from a session export, digest, process log, transcript, or related JSON/HTML artifact. Inventory text-bearing content, discuss the redaction policy with the user, sanitize a copy, and verify that raw session data is not published.
user-invocable: true
---

# Publish Session Export Safely

Help the user publish useful session evidence without exposing raw prompts, source code,
tool payloads, machine identifiers, secrets, or unrelated private context. Preserve analytical
value when the user explicitly wants it; do not default to removing every text-bearing field.

This is a publishing workflow, not an analysis skill. Use the matching analysis skill to create
the digest first:

- `copilot-chat-export` for VS Code Copilot Chat export JSON.
- `copilot-cli-export` for Copilot CLI `process-*.log` files.
- `claude-code-export` for Claude Code transcripts and relay captures.

## Non-negotiable rules

1. Never edit, overwrite, move, or publish the source export/log/transcript.
2. Work only on a derived digest or a new sanitized copy.
3. Never publish a raw `process-*.log`, Claude transcript/relay capture, or VS Code export.
4. Do not infer consent from the file being present in a repository or staging area.
5. Do not echo sensitive samples into chat while inventorying them. Report categories and counts.
6. Do not classify text as safe merely because it is prose. Prose can contain credentials,
   customer data, private URLs, repository details, or quoted source code.
7. Before writing the sanitized artifact, show the proposed policy and get confirmation through
   the `ask_user` tool.
8. Ask one question at a time. Prefer choices, with the recommended choice first.

## Workflow

### 1. Resolve and classify the artifact

Resolve the absolute path and identify one of:

- raw VS Code Copilot Chat export;
- Copilot CLI debug log;
- Claude Code transcript or relay capture;
- generated digest;
- HTML or site source that embeds or references one of the above.

For HTML, find the source JSON/digest or embedded payload. Sanitize the source data and regenerate
the page; do not rely on string replacement in built HTML.

If the user points at a raw session artifact, invoke the matching analysis skill and generate its
digest before continuing. The raw artifact remains local and is never the publishable output.

### 2. Inventory text-bearing categories

Inspect the digest and report which categories are present, with counts and approximate character
sizes where practical. Do not print their contents.

Inventory at least:

| Category | Typical fields |
|---|---|
| User text | `promptText`, `promptPreview`, user-message previews |
| Assistant text | `finalAssistantPreview`, `assistantTextPreview` |
| Tool inputs | `argsPreview`, command/query/request previews |
| Tool results | `response.preview`, result/error previews |
| Source code | fenced code, patches/diffs, file bodies, stack traces with excerpts |
| File information | absolute paths, repo-relative paths, filenames, touched-file lists |
| Environment identity | workspace/session IDs, branches, usernames, host paths |
| Harness internals | system prompts, tool definitions, skill/MCP names |
| Reasoning | thinking/reasoning summaries or plaintext blocks |

Also state whether the current structural sanitizer covers each category. Treat any retained preview
as potentially containing source code.

### 3. Start with a policy preset

Ask:

> How much session text should the published artifact preserve?

Use these choices:

1. `Balanced: preserve useful narrative, review code separately (Recommended)`
2. `Analytics only: retain metrics and call flow, remove verbatim text`
3. `Narrative: retain prompts and answers, remove tool payloads and sensitive details`
4. `Custom: decide category by category`

The presets mean:

| Category | Balanced | Analytics only | Narrative |
|---|---|---|---|
| User prompts | concise summary | remove | retain after review |
| Assistant answers | concise summary | remove | retain after review |
| Tool inputs/results | remove text; keep tool names, sizes, status | remove text | remove text |
| Source code | ask separately | remove | ask separately |
| Repo-relative filenames | ask separately | remove | retain after review |
| Absolute paths and IDs | remove | remove | remove |
| System/tool definitions/reasoning | remove text; keep counts/sizes | remove text; keep counts/sizes | remove text; keep counts/sizes |

For `Custom`, ask about one category at a time. Choices should normally be:

1. `Summarize (Recommended)`
2. `Remove`
3. `Keep after review`

Do not ask about categories that are absent.

### 4. Discuss source code explicitly

If any retained category may contain code, ask:

> How should source code in retained text be handled?

Use these choices:

1. `Replace code with a short description (Recommended)`
2. `Keep only snippets I approve`
3. `Remove every detected code block or diff`
4. `Keep code after secret and privacy review`

Explain that code detection is imperfect: code can appear without fences, and prose or stack traces
can quote code. Therefore this choice controls a Copilot-assisted review of the retained text; it is
not presented as an infallible regex sanitizer.

When the user chooses approved snippets, review one bounded snippet at a time and ask whether to
keep, summarize, or remove it. Never include a full large file body in the question.

### 5. Confirm filenames when applicable

If repo-relative filenames remain, ask whether to keep them. Always remove absolute paths,
usernames, workspace/session IDs, raw capture filenames, and branch names unless the user gives a
specific publication reason.

### 6. Preview and confirm the policy

Summarize the exact planned treatment as a compact table:

| Category | Treatment |
|---|---|

Then ask:

> Apply this policy to a new sanitized copy?

Use:

1. `Apply to a new copy (Recommended)`
2. `Revise the policy`
3. `Cancel`

Do not write anything before `Apply to a new copy`.

### 7. Run the structural sanitizer

For a recognized digest in this repository, run:

```bash
node packages/cost-view/scripts/sanitize-digest.mjs <digest.json> <sanitized-output.json>
```

Never pass a raw log/transcript/export to that script. If the digest shape is unsupported, stop
rather than publishing the raw artifact.

The existing sanitizer is a baseline, not proof that retained text is safe. Apply the confirmed
policy only to the new sanitized copy. Preserve numeric rollups, call-flow structure, and counts
unless the user chose otherwise.

### 8. Offer Copilot-assisted text and code review

If any text remains after structural sanitization, ask:

> The structural sanitizer cannot reliably distinguish prose from embedded code. Should Copilot
> review the retained text and replace code or sensitive excerpts according to the policy?

Use:

1. `Review and update the sanitized copy (Recommended)`
2. `Show only the remaining risk categories`
3. `Leave the retained text unchanged`

When reviewing:

- operate only on the sanitized copy;
- preserve the intended meaning and analytical evidence;
- replace removed material with short neutral markers or summaries;
- never invent replacement findings, commands, code, or outcomes;
- re-inventory the resulting artifact without printing sensitive content.

### 9. Validate the publishable output

Before saying it is ready:

- confirm the output differs from the source path;
- confirm no raw export/log/transcript is referenced or embedded;
- confirm absolute paths and session/workspace identifiers are absent;
- confirm removed text categories are absent;
- confirm `session.redacted` is true and record the selected policy in
  `session.redactionProfile` or equivalent metadata;
- for HTML, regenerate from the sanitized data and check that the built page does not embed or
  fetch the raw source.

If validation finds retained text outside the confirmed policy, stop and return to the discussion
step. Do not silently broaden deletion or publish anyway.

## Handoff from analysis skills

When another export skill detects publication intent, it should stop short of copying or committing
the artifact and invoke this skill. Analysis may continue in the original skill; publication and
redaction decisions belong here.

