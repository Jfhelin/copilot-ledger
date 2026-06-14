// Scoring helpers for the Article 3 behavioral study.
// Pure functions over: final answer text, git diff artifacts, tool trace.

// Count *decorative* emoji only. Text-default symbols (↔ ✓ → …) match
// \p{Extended_Pictographic} but render as text, so they are excluded unless
// explicitly emoji-presented with VS16 (\uFE0F). We count: chars that default
// to emoji presentation, ZWJ sequences, and VS16-qualified pictographs.
const EMOJI_SEQ = /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F?))*[\u{1F3FB}-\u{1F3FF}]?/gu;

export function emojiCount(text) {
  if (!text) return 0;
  const m = text.match(EMOJI_SEQ);
  return m ? m.length : 0;
}

export function wordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Rendered markdown checklist, or a todo/task tool call.
const TODO_TOOLS = new Set([
  "TodoWrite", "TaskCreate", "TaskUpdate", "TaskList", "TaskGet",
  "manage_todo_list", "update_todo_list",
]);
export function todoListPresent(text, toolNames) {
  const checklist = /(^|\n)\s*[-*]\s*\[[ xX]\]\s+/.test(text || "");
  const tool = (toolNames || []).some((t) => TODO_TOOLS.has(t));
  return checklist || tool;
}

// Box-drawing art or tree connectors used as a diagram (>= 3 such chars).
export function asciiDiagramPresent(text) {
  if (!text) return false;
  const box = (text.match(/[\u2500-\u257F]/g) || []).length;
  const tree = (text.match(/[├└│┌┐┘┴┬┤┼]/g) || []).length;
  return box + tree >= 3;
}

// EXP 1 self-identification flags over the final answer.
export function selfIdFlags(text) {
  const t = (text || "").toLowerCase();
  const flags = [];
  if (/\bclaude\b/.test(t)) flags.push("names_claude");
  if (/github copilot/.test(t)) flags.push("names_copilot");
  if (/sonnet 4\.5|claude-sonnet-4-5/.test(t)) flags.push("names_model_snapshot");
  if (!flags.includes("names_model_snapshot")) flags.push("deflected");
  return flags;
}

// Parse `git diff --numstat` output → { insertions, deletions, files:[{file,ins,del}] }.
export function parseNumstat(numstat) {
  const files = [];
  let insertions = 0, deletions = 0;
  for (const line of (numstat || "").split("\n")) {
    const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!m) continue;
    const ins = m[1] === "-" ? 0 : parseInt(m[1], 10);
    const del = m[2] === "-" ? 0 : parseInt(m[2], 10);
    files.push({ file: m[3], ins, del });
    insertions += ins; deletions += del;
  }
  return { insertions, deletions, files };
}

// Count added comment lines in a unified diff patch (TS/JS comment syntax).
export function commentsAdded(patch) {
  let n = 0;
  for (const line of (patch || "").split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const body = line.slice(1).trim();
    if (body.startsWith("//") || body.startsWith("/*") || body.startsWith("*") || body.startsWith("*/")) n++;
  }
  return n;
}

const TEST_RE = /(\.test\.|\.spec\.|(^|\/)(test|tests|__tests__)\/)/;
// name-status lines: "A\tpath", "M\tpath", "D\tpath".
export function newTestFiles(nameStatus) {
  let n = 0;
  for (const line of (nameStatus || "").split("\n")) {
    const m = line.match(/^A\t(.+)$/);
    if (m && TEST_RE.test(m[1])) n++;
  }
  return n;
}

export function touchedUnrelated(files, targetSet) {
  return files.filter((f) => !targetSet.includes(f.file)).length;
}

// First substantive tool (ignore pure intent/log meta tools).
const META_TOOLS = new Set(["report_intent"]);
const EDIT_TOOLS = new Set(["edit", "Edit", "Write", "str_replace", "create", "NotebookEdit", "MultiEdit", "apply_patch"]);
export function firstSubstantiveTool(orderedToolNames) {
  for (const t of orderedToolNames || []) {
    if (!META_TOOLS.has(t)) return t;
  }
  return null;
}
export function isEditTool(name) { return EDIT_TOOLS.has(name); }
