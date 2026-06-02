import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { theme } from "./lib/theme.js";
import { parseSession } from "./lib/parseSession.ts";
import CostView from "./components/CostView.jsx";
import { initBridge } from "./lib/bridge.js";

// Minimal app shell for copilot-ledger.
//
// Three load paths:
//   1. ?export=<url>          -- fetch JSON from that URL (must be same-origin or CORS-friendly)
//   2. postMessage from parent {type:"loadExport", content:<string>}  -- canvas hand-off
//   3. drag-and-drop / file picker fallback for standalone use
//
// In embed mode (?embed=1) we hide the file-picker chrome.

const RECENTS_KEY = "copilot-ledger:recents";
const RECENTS_MAX = 8;
const RECENTS_MAX_BYTES = 8 * 1024 * 1024;
const SUMMARIES_KEY = "copilot-ledger:summaries";

function readRecents() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function (entry) { return entry && typeof entry.label === "string"; });
  } catch (_err) {
    return [];
  }
}

function writeRecents(entries) {
  if (typeof window === "undefined") return;
  let trimmed = entries.slice(0, RECENTS_MAX);
  // Drop oldest entries until under storage budget.
  for (;;) {
    try {
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(trimmed));
      return;
    } catch (_err) {
      if (trimmed.length <= 1) return;
      trimmed = trimmed.slice(0, trimmed.length - 1);
    }
  }
}

function readSummariesMap() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SUMMARIES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_err) {
    return {};
  }
}

function writeSummariesMap(map) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(SUMMARIES_KEY, JSON.stringify(map)); } catch {}
}

function readQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    exportUrl: params.get("export"),
    embed: params.get("embed") === "1",
  };
}

export default function App() {
  const { exportUrl, embed } = useMemo(readQueryParams, []);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [sourceLabel, setSourceLabel] = useState(null);
  const [selectedPromptId, setSelectedPromptId] = useState(null);
  const [recents, setRecents] = useState(readRecents);
  const [summariesMap, setSummariesMap] = useState(readSummariesMap);
  const [summariesPending, setSummariesPending] = useState(false);
  const bridgeRef = useRef(null);

  const currentSummaries = useMemo(function () {
    if (!sourceLabel) return null;
    return summariesMap[sourceLabel] || null;
  }, [summariesMap, sourceLabel]);

  const storeSummaries = useCallback(function (label, summaries) {
    if (!label) return;
    setSummariesMap(function (prev) {
      const next = Object.assign({}, prev);
      if (summaries == null) {
        delete next[label];
      } else {
        next[label] = summaries;
      }
      writeSummariesMap(next);
      return next;
    });
  }, []);

  const pushRecent = useCallback(function (label, content) {
    if (!label || typeof content !== "string") return;
    if (content.length > RECENTS_MAX_BYTES) return;
    setRecents(function (prev) {
      const without = prev.filter(function (entry) { return entry.label !== label; });
      const next = [{ label: label, content: content, ts: Date.now() }].concat(without).slice(0, RECENTS_MAX);
      writeRecents(next);
      return next;
    });
  }, []);

  const loadFromText = useCallback(function (text, label, options) {
    try {
      const parsed = parseSession(text);
      if (!parsed) {
        setError("Unrecognised export shape. Expected a VS Code Copilot Chat prompts export.");
        return;
      }
      setSession(parsed);
      setSourceLabel(label || null);
      setSelectedPromptId(null);
      setError(null);
      if (!(options && options.skipRecent)) pushRecent(label, text);
      bridgeRef.current?.notifyLoaded({ label, prompts: parsed.metadata?.costAnalysis?.prompts?.length || 0 });
    } catch (err) {
      setError(String(err?.message || err));
    }
  }, [pushRecent]);

  useEffect(function loadFromUrlEffect() {
    if (!exportUrl) return;
    fetch(exportUrl)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status + " loading " + exportUrl);
        return r.text();
      })
      .then(function (text) { loadFromText(text, exportUrl); })
      .catch(function (err) { setError(String(err?.message || err)); });
  }, [exportUrl, loadFromText]);

  useEffect(function bridgeEffect() {
    bridgeRef.current = initBridge({
      onLoadExport: function (content, label) { loadFromText(content, label || "(from canvas)"); },
      onSetSelection: function (promptId) { setSelectedPromptId(promptId); },
      onSetSummaries: function (summaries) {
        setSummariesPending(false);
        // The extension echoes the canvas's loaded-export label, so this is
        // reliably keyable. If somehow missing, fall back to sourceLabel.
        if (!summaries) return;
        const label = summaries.label || sourceLabel;
        if (!label) return;
        storeSummaries(label, summaries);
      },
      onSummariesPending: function (pending) { setSummariesPending(pending); },
    });
    return function () { bridgeRef.current?.dispose(); };
  }, [loadFromText, storeSummaries, sourceLabel]);

  const onSelectPrompt = useCallback(function (promptId, summary) {
    setSelectedPromptId(promptId);
    bridgeRef.current?.notifySelection(promptId, summary);
  }, []);

  const onRequestSummaries = useCallback(function () {
    setSummariesPending(true);
    bridgeRef.current?.requestSummaries();
  }, []);

  const onPickRecent = useCallback(function (label) {
    const entry = recents.find(function (r) { return r.label === label; });
    if (!entry) return;
    loadFromText(entry.content, entry.label, { skipRecent: true });
  }, [recents, loadFromText]);

  function onFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(function (text) { loadFromText(text, file.name); });
  }

  function onDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    file.text().then(function (text) { loadFromText(text, file.name); });
  }

  function onDragOver(event) { event.preventDefault(); }

  function renderRecentsDropdown(currentLabel) {
    // Merge currentLabel so it always appears as the selected option, even if
    // it's not yet been pushed to recents (canvas-loaded first time, etc.).
    const labels = [];
    if (currentLabel) labels.push(currentLabel);
    recents.forEach(function (entry) {
      if (entry.label !== currentLabel) labels.push(entry.label);
    });
    if (labels.length === 0) return null;
    return (
      <select
        value={currentLabel || ""}
        onChange={function (e) { if (e.target.value && e.target.value !== currentLabel) onPickRecent(e.target.value); }}
        style={{
          background: theme.bg.elevated,
          color: theme.text.primary,
          border: "1px solid " + theme.border.default,
          borderRadius: theme.radius.md,
          padding: theme.space.sm + "px " + theme.space.md + "px",
          font: "inherit",
          fontSize: theme.fontSize.sm,
          cursor: "pointer",
          maxWidth: 360,
        }}
        title="Switch to a recent export"
      >
        {!currentLabel && <option value="" disabled>Recent exports…</option>}
        {labels.map(function (label) {
          return (
            <option key={label} value={label}>
              {label}
            </option>
          );
        })}
      </select>
    );
  }

  function renderRecentsList() {
    if (recents.length === 0) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: theme.space.sm, width: "100%", maxWidth: 560 }}>
        <div style={{ color: theme.text.dim, fontSize: theme.fontSize.sm, textAlign: "left" }}>Recent exports</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid " + theme.border.default,
            borderRadius: theme.radius.md,
            background: theme.bg.elevated,
            overflow: "hidden",
          }}
        >
          {recents.map(function (entry, idx) {
            const when = entry.ts ? new Date(entry.ts).toLocaleString() : "";
            return (
              <button
                key={entry.label}
                onClick={function () { onPickRecent(entry.label); }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: theme.space.md,
                  padding: theme.space.sm + "px " + theme.space.md + "px",
                  background: "transparent",
                  border: "none",
                  borderTop: idx === 0 ? "none" : "1px solid " + theme.border.default,
                  color: theme.text.primary,
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: theme.fontSize.sm,
                  textAlign: "left",
                }}
                title={entry.label}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {entry.label}
                </span>
                {when && (
                  <span style={{ color: theme.text.dim, fontSize: theme.fontSize.xs, flexShrink: 0 }}>{when}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: theme.bg.canvas,
          color: theme.text.primary,
        }}
      >
        {!embed && (
          <div
            style={{
              padding: theme.space.md + "px " + theme.space.xl + "px",
              borderBottom: "1px solid " + theme.border.default,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: theme.space.lg,
            }}
          >
            <div style={{ fontWeight: 800, letterSpacing: "0.06em" }}>
              COPILOT LEDGER
              {sourceLabel && (
                <span style={{ color: theme.text.dim, marginLeft: theme.space.md, fontWeight: 500 }}>
                  · {sourceLabel}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: theme.space.md, alignItems: "center" }}>
              {renderRecentsDropdown(sourceLabel)}
              <button
                onClick={function () { setSession(null); setSourceLabel(null); }}
                style={{
                  background: "transparent",
                  color: theme.text.muted,
                  border: "1px solid " + theme.border.default,
                  padding: theme.space.sm + "px " + theme.space.md + "px",
                  borderRadius: theme.radius.md,
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
        {embed && (
          <div
            style={{
              padding: theme.space.sm + "px " + theme.space.lg + "px",
              borderBottom: "1px solid " + theme.border.default,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: theme.space.md,
              background: theme.bg.elevated,
            }}
          >
            <div style={{ color: theme.text.muted, fontSize: theme.fontSize.xs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {sourceLabel || ""}
            </div>
            {renderRecentsDropdown(sourceLabel)}
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: theme.space.lg }}>
          <CostView
            events={session.events}
            metadata={session.metadata}
            selectedPromptId={selectedPromptId}
            onSelectPrompt={onSelectPrompt}
            summaries={currentSummaries}
            summariesPending={summariesPending}
            onRequestSummaries={onRequestSummaries}
            canRequestSummaries={Boolean(bridgeRef.current && sourceLabel)}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.space.lg,
        padding: theme.space.xl,
        textAlign: "center",
        background: theme.bg.canvas,
        color: theme.text.primary,
      }}
    >
      <div style={{ fontSize: theme.fontSize.xxl, fontWeight: 800, letterSpacing: "0.08em" }}>
        COPILOT LEDGER
      </div>
      <div style={{ color: theme.text.muted, maxWidth: 520 }}>
        Drop a VS Code Copilot Chat prompts export here, or pick one below.
      </div>
      <label
        style={{
          padding: theme.space.md + "px " + theme.space.xl + "px",
          border: "1px solid " + theme.border.default,
          borderRadius: theme.radius.lg,
          cursor: "pointer",
          background: theme.bg.elevated,
        }}
      >
        Choose file…
        <input
          type="file"
          accept="application/json,.json"
          onChange={onFileChange}
          style={{ display: "none" }}
        />
      </label>
      {recents.length > 0 ? (
        renderRecentsList()
      ) : (
        <div style={{ color: theme.text.dim, fontSize: theme.fontSize.sm }}>No recent exports yet.</div>
      )}
      {error && (
        <div style={{ color: theme.semantic?.error || "#cf222e", maxWidth: 520 }}>
          {error}
        </div>
      )}
    </div>
  );
}
