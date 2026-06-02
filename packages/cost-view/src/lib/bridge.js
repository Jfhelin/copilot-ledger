// Bridge between this iframe and the parent Copilot CLI canvas extension.
//
// The iframe is loaded from the extension's own loopback HTTP server, so we
// communicate over fetch (iframe -> extension) and SSE (extension -> iframe).
// `window.parent` belongs to the host app, NOT the extension; postMessage is
// the wrong tool here.
//
// Protocol (extension -> iframe, via GET /api/events SSE):
//   { type: "loadExport",   content: string, label?: string }
//   { type: "setSelection", promptId: string | null }
//
// Protocol (iframe -> extension, via POST):
//   POST /api/ready                         -- iframe boot, replays last load
//   POST /api/selection {promptId, summary} -- user clicked a prompt
//
// The bridge is a no-op when there is no /api/events endpoint (standalone use).

export function initBridge({ onLoadExport, onSetSelection, onSetSummaries, onSummariesPending } = {}) {
  let source = null;
  let disposed = false;

  function endpoint(path) {
    return new URL(path, window.location.origin).toString();
  }

  function open() {
    try {
      source = new EventSource(endpoint("/api/events"));
    } catch {
      return;
    }
    source.addEventListener("loadExport", function (ev) {
      try {
        const data = JSON.parse(ev.data);
        onLoadExport?.(data.content, data.label);
      } catch {}
    });
    source.addEventListener("setSelection", function (ev) {
      try {
        const data = JSON.parse(ev.data);
        onSetSelection?.(data.promptId ?? null);
      } catch {}
    });
    source.addEventListener("setSummaries", function (ev) {
      try {
        const data = ev.data === "null" ? null : JSON.parse(ev.data);
        onSetSummaries?.(data);
      } catch {}
    });
    source.addEventListener("setSummariesPending", function (ev) {
      try {
        const data = JSON.parse(ev.data);
        onSummariesPending?.(!!data.pending);
      } catch {}
    });
    source.addEventListener("error", function () {
      // Browser auto-reconnects; nothing to do.
    });
    fetch(endpoint("/api/ready"), { method: "POST" }).catch(function () {});
  }

  open();

  return {
    dispose() {
      disposed = true;
      source?.close();
    },
    notifyLoaded(payload) {
      if (disposed) return;
      fetch(endpoint("/api/loaded"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      }).catch(function () {});
    },
    notifySelection(promptId, summary) {
      if (disposed) return;
      fetch(endpoint("/api/selection"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId: promptId ?? null, summary: summary ?? null }),
      }).catch(function () {});
    },
    requestSummaries() {
      if (disposed) return;
      fetch(endpoint("/api/requestSummaries"), { method: "POST" }).catch(function () {});
    },
  };
}
