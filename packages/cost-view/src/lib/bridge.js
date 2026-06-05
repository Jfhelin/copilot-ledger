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
//   { type: "setBucketSelection", { bucket: string } | null }
//   { type: "setStatSelection", { stat: string } | null }
//
// Protocol (iframe -> extension, via POST):
//   POST /api/ready                         -- iframe boot; response body carries
//                                              the current { loadedExport, selection,
//                                              bucketSelection, statSelection, summaries }
//                                              to hydrate without a race
//   POST /api/selection {promptId, summary} -- user clicked a prompt
//   POST /api/bucket-selection {bucket, info} -- user clicked a component bucket
//   POST /api/stat-selection {stat, info}   -- user clicked a top KPI stat card
//
// The bridge is a no-op when there is no /api/events endpoint (standalone use).

export function initBridge({ onLoadExport, onSetSelection, onSetBucketSelection, onSetStatSelection, onSetSummaries, onSummariesPending } = {}) {
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
    source.addEventListener("setBucketSelection", function (ev) {
      try {
        const data = ev.data === "null" ? null : JSON.parse(ev.data);
        onSetBucketSelection?.(data ? (data.bucket ?? null) : null);
      } catch {}
    });
    source.addEventListener("setStatSelection", function (ev) {
      try {
        const data = ev.data === "null" ? null : JSON.parse(ev.data);
        onSetStatSelection?.(data ? (data.stat ?? null) : null);
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
    // Hydrate from the POST response itself rather than waiting for an SSE push.
    // The EventSource above connects asynchronously and typically registers on
    // the server AFTER this POST is handled, so a pushed replay would be lost.
    // Reading the state straight from our own request can't race.
    fetch(endpoint("/api/ready"), { method: "POST" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || disposed) return;
        if (data.loadedExport) {
          onLoadExport?.(data.loadedExport.content, data.loadedExport.label);
        }
        if (data.selection) {
          onSetSelection?.(data.selection.promptId ?? null);
        }
        if (data.bucketSelection) {
          onSetBucketSelection?.(data.bucketSelection.bucket ?? null);
        }
        if (data.statSelection) {
          onSetStatSelection?.(data.statSelection.stat ?? null);
        }
        if (data.summaries) {
          onSetSummaries?.(data.summaries);
        }
      })
      .catch(function () {});
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
    notifyBucketSelection(bucket, info) {
      if (disposed) return;
      fetch(endpoint("/api/bucket-selection"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: bucket ?? null, info: info ?? null }),
      }).catch(function () {});
    },
    notifyStatSelection(stat, info) {
      if (disposed) return;
      fetch(endpoint("/api/stat-selection"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stat: stat ?? null, info: info ?? null }),
      }).catch(function () {});
    },
    requestSummaries() {
      if (disposed) return;
      fetch(endpoint("/api/requestSummaries"), { method: "POST" }).catch(function () {});
    },
  };
}
