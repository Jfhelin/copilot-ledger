import { useState } from "react";
import { theme } from "../lib/theme.js";
import { formatTokens } from "../lib/costAnalysis.js";
import { formatCost } from "../lib/pricing.js";

// Honest, digest-native view for a Copilot CLI / Claude CLI run (Path A / R2).
//
// It renders ONLY what the digest measured: rollup stat cards, the single
// representative-prefix composition (system / tool-defs / messages), and -- when
// the digest carries a per-call `timeline` (digestVersion >= 2) -- an ordered
// list of LLM calls and the tool calls they issued, with a cumulative run cost.
// Older digests (no timeline) fall back to per-prompt aggregate sections.
//
// Cost is labelled honestly per harness: Copilot CLI rows carry REAL native
// GitHub AI-credit cost (split by token type via copilot_usage.token_details);
// Claude rows carry a token-normalized MODELLED cost (the transcript reports
// exact tokens but no billed amount).
//
// Redaction has already happened at publish time (see lib/sanitizeDigest.js):
// for Claude (`redactionProfile: "proxy-modelled"`) the digest arrives with the
// system prompt, tool definitions, skill/MCP names, and all text previews
// removed -- only the call flow (tool NAMES + per-call tokens/cost) survives --
// so this component never has to know which fields are sensitive; it just
// renders whatever the sanitizer left behind.

function panelStyle() {
  return {
    background: theme.bg.surface,
    border: "1px solid " + theme.border.default,
    borderRadius: theme.radius.xl,
    overflow: "hidden",
    minWidth: 0,
  };
}

function labelStyle() {
  return {
    fontSize: theme.fontSize.xs,
    color: theme.text.dim,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontWeight: 700,
  };
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={Object.assign({}, panelStyle(), { padding: theme.space.lg + "px " + theme.space.xl + "px" })}>
      <div style={labelStyle()}>{label}</div>
      <div style={{ fontSize: theme.fontSize.xxl, color: color || theme.text.primary, fontWeight: 800, marginTop: theme.space.md, whiteSpace: "nowrap" }}>{value}</div>
      {sub && <div style={{ color: theme.text.muted, fontSize: theme.fontSize.sm, marginTop: theme.space.sm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
    </div>
  );
}

const HARNESS_LABEL = {
  "copilot-cli": "Copilot CLI",
  "claude-code": "Claude CLI",
  vscode: "VS Code Copilot",
};

function harnessVersion(session) {
  if (session.copilotVersion) return "copilot " + session.copilotVersion;
  if (session.claudeVersion) return "claude " + session.claudeVersion;
  return null;
}

// Pick the headline cost figure, labelled honestly: Copilot CLI bills real
// GitHub AI credits; Claude is a token-normalized model estimate.
function costDisplay(cost) {
  if (!cost || typeof cost !== "object") return null;
  const native = cost.native;
  if (native && native.authoritative && typeof native.credits === "number") {
    return {
      label: "GitHub AI credits",
      value: native.credits.toFixed(2),
      sub: (typeof native.impliedUsd === "number" ? "\u2248 " + formatCost(native.impliedUsd) + " \u00b7 " : "") + "real billed spend",
    };
  }
  if (typeof cost.totalUsd === "number") {
    return {
      label: "Modelled cost",
      value: formatCost(cost.totalUsd),
      sub: "token-normalized estimate \u00b7 not billed",
    };
  }
  return null;
}

function CompositionBar({ rep }) {
  const system = rep.systemApproxTokens || 0;
  const tools = rep.toolDefsApproxTokens || 0;
  const messages = rep.messagesApproxTokens || 0;
  const total = system + tools + messages;
  if (total <= 0) return null;
  const segs = [
    { key: "system", label: "System", value: system, color: theme.track.context },
    { key: "tools", label: "Tool defs", value: tools, color: theme.track.tool_call },
    { key: "messages", label: "Messages", value: messages, color: theme.accent.primary },
  ];
  return (
    <div>
      <div style={{ height: 40, border: "1px solid " + theme.border.default, borderRadius: theme.radius.lg, background: theme.bg.base, overflow: "hidden", display: "flex" }}>
        {segs.map(function (s) {
          const pct = (s.value / total) * 100;
          if (pct <= 0) return null;
          return <div key={s.key} title={s.label + ": " + formatTokens(s.value) + " (" + pct.toFixed(0) + "%)"} style={{ width: pct + "%", background: s.color, minWidth: 2 }} />;
        })}
      </div>
      <div style={{ display: "flex", gap: theme.space.lg, flexWrap: "wrap", marginTop: theme.space.md, color: theme.text.muted, fontSize: theme.fontSize.xs }}>
        {segs.map(function (s) {
          return (
            <span key={s.key}>
              <span style={{ display: "inline-block", width: theme.space.md, height: theme.space.md, borderRadius: "50%", background: s.color, marginRight: theme.space.sm, verticalAlign: "middle" }} />
              {s.label} {formatTokens(s.value)} ({total > 0 ? ((s.value / total) * 100).toFixed(0) : 0}%)
            </span>
          );
        })}
      </div>
    </div>
  );
}

function CompositionPanel({ prefix }) {
  const rep = prefix && prefix.representative;
  if (!rep || !(rep.prefixApproxTokens > 0)) return null;
  const sharePct = typeof rep.toolDefsShareOfPrefix === "number" ? Math.round(rep.toolDefsShareOfPrefix * 100) : null;
  const topTools = Array.isArray(rep.topTools) ? rep.topTools : [];
  return (
    <div style={Object.assign({}, panelStyle(), { padding: theme.space.xl })}>
      <div style={labelStyle()}>Context window — representative request</div>
      <div style={{ color: theme.text.muted, fontSize: theme.fontSize.sm, margin: theme.space.sm + "px 0 " + theme.space.lg + "px" }}>
        Largest re-sent prefix observed (chars/4 shape estimate). {sharePct != null ? "Tool definitions are " + sharePct + "% of the prefix." : null}
        {rep.skillBlockCount ? " " + rep.skillBlockCount + " skill block" + (rep.skillBlockCount === 1 ? "" : "s") + "." : null}
      </div>
      <CompositionBar rep={rep} />
      {topTools.length > 0 && (
        <div style={{ marginTop: theme.space.lg }}>
          <div style={labelStyle()}>Largest tool definitions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: theme.space.sm, marginTop: theme.space.md }}>
            {topTools.slice(0, 8).map(function (t) {
              return (
                <div key={t.name} style={{ display: "flex", justifyContent: "space-between", fontSize: theme.fontSize.sm, color: theme.text.secondary, fontFamily: theme.font.mono }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                  <span style={{ color: theme.text.muted }}>{formatTokens(t.approxTokens || 0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Per-token-type cost colors for the cumulative bar (mirrors the VS Code view's
// fresh / cached-read / cache-write / output decomposition, at prompt grain).
const COST_COLORS = {
  fresh: theme.track.tool_call,
  cached: theme.accent.primary,
  cwrite: theme.semantic.warning,
  output: theme.semantic.success,
};
const COST_LEGEND = [
  { key: "fresh", label: "Fresh input" },
  { key: "cached", label: "Cached read" },
  { key: "cwrite", label: "Cache write" },
  { key: "output", label: "Output" },
];

function promptCostValue(p, unit) {
  if (unit === "credits") return typeof p.nativeCredits === "number" ? p.nativeCredits : 0;
  if (typeof p.costUsd === "number") return p.costUsd;
  if (typeof p.tokenNormalizedUsd === "number") return p.tokenNormalizedUsd;
  return 0;
}

function formatCostValue(v, unit) {
  if (unit === "credits") return v.toFixed(2) + " cr";
  return formatCost(v);
}

function promptComponents(p) {
  const cached = p.cachedTokens || 0;
  const cwrite = p.cacheCreationTokens || 0;
  const fresh =
    typeof p.freshInputTokens === "number"
      ? p.freshInputTokens
      : Math.max(0, (p.promptTokens || 0) - cached - cwrite);
  const output = p.completionTokens || 0;
  return { fresh, cached, cwrite, output };
}

// Cumulative cost decomposed into the 4 token-type components, one running state
// per prompt. Each prompt's cost is split across components by the same crude
// per-token weights the VS Code view uses, then accumulated.
function buildCumStates(prompts, unit) {
  let fresh = 0, cached = 0, cwrite = 0, output = 0;
  return prompts.map(function (p) {
    const c = promptComponents(p);
    const cost = promptCostValue(p, unit);
    const w = { fresh: c.fresh * 1.0, cached: c.cached * 0.1, cwrite: c.cwrite * 1.25, output: c.output * 5.0 };
    const wSum = w.fresh + w.cached + w.cwrite + w.output || 1;
    if (cost > 0) {
      fresh += cost * (w.fresh / wSum);
      cached += cost * (w.cached / wSum);
      cwrite += cost * (w.cwrite / wSum);
      output += cost * (w.output / wSum);
    }
    return { fresh, cached, cwrite, output, total: fresh + cached + cwrite + output };
  });
}

function CumCostBar({ state, maxTotal, unit }) {
  const widthPct = maxTotal > 0 ? Math.max(3, (state.total / maxTotal) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: theme.space.md, minWidth: 0 }}>
      <div style={{ flex: 1, height: 26, border: "1px solid " + theme.border.default, borderRadius: theme.radius.lg, background: theme.bg.base, overflow: "hidden", display: "flex", minWidth: 60 }}>
        <div style={{ width: widthPct + "%", display: "flex", minWidth: 2 }}>
          {COST_LEGEND.map(function (seg) {
            const pct = state.total > 0 ? (state[seg.key] / state.total) * 100 : 0;
            if (pct <= 0) return null;
            return <div key={seg.key} title={seg.label} style={{ width: pct + "%", background: COST_COLORS[seg.key], minWidth: pct > 0 ? 1 : 0 }} />;
          })}
        </div>
      </div>
      <div style={{ width: 72, textAlign: "right", color: theme.text.primary, fontFamily: theme.font.mono, fontSize: theme.fontSize.sm, flexShrink: 0 }}>
        {formatCostValue(state.total, unit)}
      </div>
    </div>
  );
}

function SubHeader({ label, count, open, onToggle, children }) {
  return (
    <div style={{ borderTop: "1px solid " + theme.border.subtle }}>
      <div
        onClick={onToggle}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: theme.space.sm, padding: theme.space.md + "px " + theme.space.lg + "px", color: theme.text.secondary, fontSize: theme.fontSize.sm, fontFamily: theme.font.mono }}
      >
        <span style={{ width: 10, color: theme.text.dim }}>{open ? "\u25be" : "\u25b8"}</span>
        <span style={{ fontWeight: 700 }}>{count}</span>
        <span style={{ color: theme.text.muted }}>{label}</span>
      </div>
      {open && <div style={{ padding: "0 " + theme.space.lg + "px " + theme.space.lg + "px " + (theme.space.lg + 18) + "px" }}>{children}</div>}
    </div>
  );
}

function TokenLine({ label, value }) {
  if (value == null) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: theme.fontSize.sm, color: theme.text.secondary, fontFamily: theme.font.mono, padding: "2px 0" }}>
      <span style={{ color: theme.text.muted }}>{label}</span>
      <span>{typeof value === "number" ? formatTokens(value) : value}</span>
    </div>
  );
}

function PromptSection({ prompt, index, state, maxTotal, unit, proxy }) {
  const [llmOpen, setLlmOpen] = useState(false);
  const [toolOpen, setToolOpen] = useState(false);
  const p = prompt;
  const title = p.promptPreview || (p.isOrphan ? "(orphan request group)" : "Prompt " + (index + 1));
  const tools = Array.isArray(p.tools) ? p.tools : [];
  const models = Array.isArray(p.models) ? p.models : [];
  const tags = [p.isOrphan ? "orphan" : null, p.isSubagent ? "subagent" : null].filter(Boolean);

  return (
    <div style={Object.assign({}, panelStyle())}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: theme.space.lg, padding: theme.space.lg }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: theme.space.sm }}>
            <span style={{ color: theme.text.primary, fontWeight: 800, fontFamily: theme.font.mono }}>#{String(index + 1).padStart(2, "0")}</span>
            {tags.map(function (tag) {
              return <span key={tag} style={{ fontSize: theme.fontSize.xs, color: theme.text.muted, border: "1px solid " + theme.border.default, borderRadius: theme.radius.md, padding: "1px 6px" }}>{tag}</span>;
            })}
          </div>
          <div style={{ color: theme.text.muted, fontSize: theme.fontSize.sm, marginTop: theme.space.xs, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{title}</div>
        </div>
        <div style={{ width: "44%", maxWidth: 320, minWidth: 140, flexShrink: 0 }}>
          <CumCostBar state={state} maxTotal={maxTotal} unit={unit} />
          <div style={{ textAlign: "right", color: theme.text.dim, fontSize: theme.fontSize.xs, marginTop: theme.space.xs }}>cumulative</div>
        </div>
      </div>

      <SubHeader label="LLM calls" count={p.requestCount ?? 0} open={llmOpen} onToggle={function () { setLlmOpen(!llmOpen); }}>
        <TokenLine label="Input (total)" value={p.promptTokens} />
        <TokenLine label="\u2514 fresh" value={typeof p.freshInputTokens === "number" ? p.freshInputTokens : null} />
        <TokenLine label="\u2514 cached read" value={p.cachedTokens} />
        <TokenLine label="\u2514 cache write" value={p.cacheCreationTokens} />
        <TokenLine label="Output" value={p.completionTokens} />
        <TokenLine label="\u2514 reasoning" value={typeof p.reasoningTokens === "number" && p.reasoningTokens > 0 ? p.reasoningTokens : null} />
        {models.length > 0 && <TokenLine label="Model" value={models.join(", ")} />}
      </SubHeader>

      <SubHeader label="Tool calls" count={p.toolCallCount ?? 0} open={toolOpen} onToggle={function () { setToolOpen(!toolOpen); }}>
        {tools.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: theme.space.sm }}>
            {tools.map(function (name) {
              return <span key={name} style={{ fontSize: theme.fontSize.sm, color: theme.text.secondary, fontFamily: theme.font.mono, border: "1px solid " + theme.border.subtle, borderRadius: theme.radius.md, padding: "1px 8px" }}>{name}</span>;
            })}
          </div>
        ) : (
          <div style={{ fontSize: theme.fontSize.sm, color: theme.text.muted }}>
            {proxy ? "Tool names withheld (relay-captured \u2014 aggregates only)." : "No distinct tool names recorded."}
          </div>
        )}
      </SubHeader>

      {p.finalAssistantPreview && (
        <div style={{ borderTop: "1px solid " + theme.border.subtle, padding: theme.space.md + "px " + theme.space.lg + "px", color: theme.text.muted, fontSize: theme.fontSize.sm }}>
          <span style={{ color: theme.text.dim }}>final \u2192 </span>{p.finalAssistantPreview.slice(0, 160)}
        </div>
      )}
    </div>
  );
}

function PromptSections({ prompts, unit, proxy }) {
  if (!Array.isArray(prompts) || prompts.length === 0) return null;
  const states = buildCumStates(prompts, unit);
  const maxTotal = states.length ? states[states.length - 1].total : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: theme.space.md }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={labelStyle()}>Prompts \u00b7 calls & cumulative cost</div>
        <div style={{ display: "flex", gap: theme.space.md, flexWrap: "wrap", color: theme.text.muted, fontSize: theme.fontSize.xs }}>
          {COST_LEGEND.map(function (seg) {
            return (
              <span key={seg.key}>
                <span style={{ display: "inline-block", width: theme.space.md, height: theme.space.md, borderRadius: "50%", background: COST_COLORS[seg.key], marginRight: theme.space.sm, verticalAlign: "middle" }} />
                {seg.label}
              </span>
            );
          })}
        </div>
      </div>
      {prompts.map(function (p, i) {
        return <PromptSection key={p.ref || i} prompt={p} index={i} state={states[i]} maxTotal={maxTotal} unit={unit} proxy={proxy} />;
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-call timeline (digestVersion >= 2): one row per LLM call + per tool call,
// in the order the model emitted them, with a RUN-cumulative cost on the right.
// ---------------------------------------------------------------------------

// Flatten every prompt's `timeline` into one ordered row list, carrying a running
// cumulative cost split by token type. LLM rows advance the total by the call's
// exact cost; tool rows leave it unchanged (tool execution isn't separately
// billed -- the result tokens are paid for on the NEXT LLM call).
function buildCallRows(prompts, unit) {
  const cum = { fresh: 0, cached: 0, cwrite: 0, output: 0, total: 0 };
  const groups = [];
  (prompts || []).forEach(function (p, pi) {
    const timeline = Array.isArray(p.timeline) ? p.timeline : [];
    const rows = [];
    let lastLlmIdx = -1;
    timeline.forEach(function (e) {
      if (e.kind === "llm" && e.cost) {
        cum.fresh += e.cost.fresh || 0;
        cum.cached += e.cost.cached || 0;
        cum.cwrite += e.cost.cacheWrite || 0;
        cum.output += e.cost.output || 0;
        cum.total += e.cost.total || 0;
        lastLlmIdx += 1;
      }
      rows.push({ entry: e, state: { fresh: cum.fresh, cached: cum.cached, cwrite: cum.cwrite, output: cum.output, total: cum.total }, llmOrdinal: e.kind === "llm" ? lastLlmIdx : null });
    });
    groups.push({ prompt: p, promptIndex: pi, rows });
  });
  return { groups, maxTotal: cum.total };
}

function tokenSummary(tk) {
  if (!tk) return null;
  const input = (tk.fresh || 0) + (tk.cached || 0) + (tk.cacheWrite || 0);
  const parts = [];
  if (input > 0) parts.push(formatTokens(input) + " in");
  if (tk.output) parts.push(formatTokens(tk.output) + " out");
  return parts.join(" \u2192 ") || null;
}

function LlmRow({ entry, state, maxTotal, unit, ordinal }) {
  const tk = entry.tokens || {};
  return (
    <div style={{ borderTop: "1px solid " + theme.border.subtle, display: "flex", alignItems: "center", gap: theme.space.md, padding: theme.space.md + "px " + theme.space.lg + "px" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: theme.space.sm, fontSize: theme.fontSize.sm, fontFamily: theme.font.mono }}>
          <span style={{ color: theme.accent.primary, fontWeight: 700 }}>LLM call{typeof ordinal === "number" ? " #" + (ordinal + 1) : ""}</span>
          {entry.model && <span style={{ color: theme.text.dim, fontSize: theme.fontSize.xs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.model}</span>}
        </div>
        {tokenSummary(tk) && <div style={{ color: theme.text.muted, fontSize: theme.fontSize.xs, marginTop: 2, fontFamily: theme.font.mono }}>{tokenSummary(tk)}</div>}
      </div>
      <div style={{ width: "42%", maxWidth: 300, minWidth: 130, flexShrink: 0 }}>
        <CumCostBar state={state} maxTotal={maxTotal} unit={unit} />
      </div>
    </div>
  );
}

function ToolRow({ entry }) {
  const added = typeof entry.contextTokens === "number" && entry.contextTokens > 0 ? entry.contextTokens : 0;
  return (
    <div style={{ borderTop: "1px solid " + theme.border.subtle, display: "flex", alignItems: "center", gap: theme.space.sm, padding: theme.space.sm + "px " + theme.space.lg + "px" }}>
      <span style={{ color: theme.text.dim, fontFamily: theme.font.mono, fontSize: theme.fontSize.sm }}>{"\u2514 tool"}</span>
      <span style={{ fontSize: theme.fontSize.sm, color: theme.text.secondary, fontFamily: theme.font.mono, border: "1px solid " + theme.border.subtle, borderRadius: theme.radius.md, padding: "1px 8px" }}>{entry.name || "(unnamed)"}</span>
      <span style={{ marginLeft: "auto", color: theme.text.muted, fontFamily: theme.font.mono, fontSize: theme.fontSize.xs }} title="Approx. tokens this tool result added to the context window (chars/4)">
        {added > 0 ? "+" + formatTokens(added) + " ctx" : "+0 ctx"}
      </span>
    </div>
  );
}

function TimelinePrompt({ group, maxTotal, unit }) {
  const p = group.prompt;
  const title = p.promptPreview || (p.isOrphan ? "(orphan request group)" : "Prompt " + (group.promptIndex + 1));
  const tags = [p.isOrphan ? "orphan" : null, p.isSubagent ? "subagent" : null].filter(Boolean);
  return (
    <div style={panelStyle()}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: theme.space.lg, padding: theme.space.lg }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: theme.space.sm }}>
            <span style={{ color: theme.text.primary, fontWeight: 800, fontFamily: theme.font.mono }}>#{String(group.promptIndex + 1).padStart(2, "0")}</span>
            <span style={{ color: theme.text.muted, fontSize: theme.fontSize.xs }}>{p.requestCount ?? 0} LLM \u00b7 {p.toolCallCount ?? 0} tool</span>
            {tags.map(function (tag) {
              return <span key={tag} style={{ fontSize: theme.fontSize.xs, color: theme.text.muted, border: "1px solid " + theme.border.default, borderRadius: theme.radius.md, padding: "1px 6px" }}>{tag}</span>;
            })}
          </div>
          <div style={{ color: theme.text.muted, fontSize: theme.fontSize.sm, marginTop: theme.space.xs, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{title}</div>
        </div>
      </div>
      {group.rows.map(function (row, i) {
        return row.entry.kind === "tool"
          ? <ToolRow key={i} entry={row.entry} />
          : <LlmRow key={i} entry={row.entry} state={row.state} maxTotal={maxTotal} unit={unit} ordinal={row.llmOrdinal} />;
      })}
      {p.finalAssistantPreview && (
        <div style={{ borderTop: "1px solid " + theme.border.subtle, padding: theme.space.md + "px " + theme.space.lg + "px", color: theme.text.muted, fontSize: theme.fontSize.sm }}>
          <span style={{ color: theme.text.dim }}>final \u2192 </span>{p.finalAssistantPreview.slice(0, 160)}
        </div>
      )}
    </div>
  );
}

function TimelineView({ prompts, unit }) {
  if (!Array.isArray(prompts) || prompts.length === 0) return null;
  const { groups, maxTotal } = buildCallRows(prompts, unit);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: theme.space.md }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: theme.space.md }}>
        <div style={labelStyle()}>Call timeline \u00b7 cumulative run cost</div>
        <div style={{ display: "flex", gap: theme.space.md, flexWrap: "wrap", color: theme.text.muted, fontSize: theme.fontSize.xs }}>
          {COST_LEGEND.map(function (seg) {
            return (
              <span key={seg.key}>
                <span style={{ display: "inline-block", width: theme.space.md, height: theme.space.md, borderRadius: "50%", background: COST_COLORS[seg.key], marginRight: theme.space.sm, verticalAlign: "middle" }} />
                {seg.label}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ color: theme.text.dim, fontSize: theme.fontSize.xs, marginTop: "-" + theme.space.xs + "px" }}>
        Each LLM call advances the running cost total (bar on the right). Each tool call shows the new content its result added to the context window (approx. tokens) \u2014 paid for on the next LLM call.
      </div>
      {groups.map(function (g) {
        return <TimelinePrompt key={g.prompt.ref || g.promptIndex} group={g} maxTotal={maxTotal} unit={unit} />;
      })}
    </div>
  );
}

export default function CliRunView({ digest, onSelectPrompt, selectedPromptId }) {
  const session = digest.session || {};
  const r = digest.rollups || {};
  const kind = session.kind;
  const harness = HARNESS_LABEL[kind] || kind || "CLI session";
  const version = harnessVersion(session);
  const cost = costDisplay(r.cost);
  const cachePct = typeof r.cacheHitRate === "number" ? Math.round(r.cacheHitRate * 100) : null;
  const fresh = typeof r.freshInputTokens === "number" ? r.freshInputTokens : null;
  const cached = typeof r.cachedTokens === "number" ? r.cachedTokens : null;
  const proxy = session.textRedacted === true || session.redactionProfile === "proxy-modelled" || session.redactionProfile === "proxy-aggregates";
  const native = r.cost && r.cost.native && r.cost.native.authoritative;
  const unit = native ? "credits" : "usd";
  const prompts = Array.isArray(digest.prompts) ? digest.prompts : [];
  const hasTimeline = prompts.some(function (p) { return Array.isArray(p.timeline) && p.timeline.length > 0; });

  return (
    <div style={{ padding: theme.space.xl, display: "flex", flexDirection: "column", gap: theme.space.lg, fontFamily: theme.font.mono, fontSize: theme.fontSize.base, height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: theme.space.md, flexWrap: "wrap" }}>
        <div style={{ fontSize: theme.fontSize.xl, fontWeight: 800, color: theme.text.primary }}>{harness} run</div>
        {r.primaryModel && <span style={{ color: theme.text.muted, fontSize: theme.fontSize.sm }}>{r.primaryModel}</span>}
        {version && <span style={{ color: theme.text.dim, fontSize: theme.fontSize.xs }}>{version}</span>}
        {proxy && (
          <span title="Reconstructed from a local relay capture: per-call flow and tool names are shown, but the system prompt, tool definitions, and message text are withheld. Cost is a token-normalized model estimate, not billed." style={{ marginLeft: "auto", fontSize: theme.fontSize.xs, color: theme.text.muted, border: "1px solid " + theme.border.default, borderRadius: theme.radius.md, padding: "2px 8px" }}>
            modelled cost \u00b7 text & tool-defs withheld
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: theme.space.lg }}>
        {cost && <StatCard label={cost.label} value={cost.value} sub={cost.sub} />}
        <StatCard
          label="Billed input"
          value={typeof r.promptTokens === "number" ? formatTokens(r.promptTokens) : "\u2014"}
          sub={[fresh != null ? formatTokens(fresh) + " fresh" : null, cached != null ? formatTokens(cached) + " cached" : null].filter(Boolean).join(" \u00b7 ") || null}
        />
        <StatCard label="Output" value={typeof r.completionTokens === "number" ? formatTokens(r.completionTokens) : "\u2014"} sub={typeof r.reasoningTokens === "number" && r.reasoningTokens > 0 ? formatTokens(r.reasoningTokens) + " reasoning" : null} />
        <StatCard label="LLM calls" value={typeof r.requests === "number" ? r.requests : "\u2014"} sub={typeof r.prompts === "number" ? r.prompts + " prompt" + (r.prompts === 1 ? "" : "s") : null} />
        <StatCard label="Tool calls" value={typeof r.toolCalls === "number" ? r.toolCalls : "\u2014"} />
        {cachePct != null && <StatCard label="Cache hit rate" value={cachePct + "%"} sub="of input tokens" color={cachePct >= 50 ? theme.semantic.success : theme.text.primary} />}
      </div>

      <CompositionPanel prefix={digest.prefix} />
      {hasTimeline ? <TimelineView prompts={prompts} unit={unit} /> : <PromptSections prompts={prompts} unit={unit} proxy={proxy} />}
    </div>
  );
}
