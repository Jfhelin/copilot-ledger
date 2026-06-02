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
  const bridgeRef = useRef(null);

  const loadFromText = useCallback((text, label) => {
    try {
      const parsed = parseSession(text);
      if (!parsed) {
        setError("Unrecognised export shape. Expected a VS Code Copilot Chat prompts export.");
        return;
      }
      setSession(parsed);
      setSourceLabel(label || null);
      setError(null);
      bridgeRef.current?.notifyLoaded({ label, prompts: parsed.metadata?.costAnalysis?.prompts?.length || 0 });
    } catch (err) {
      setError(String(err?.message || err));
    }
  }, []);

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
    });
    return function () { bridgeRef.current?.dispose(); };
  }, [loadFromText]);

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
        )}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: theme.space.lg }}>
          <CostView events={session.events} metadata={session.metadata} />
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
      {error && (
        <div style={{ color: theme.status?.error || "#f85149", maxWidth: 520 }}>
          {error}
        </div>
      )}
    </div>
  );
}
