// postMessage bridge between this iframe and a parent canvas extension.
//
// Protocol (parent -> iframe):
//   { type: "loadExport",   content: string, label?: string }
//   { type: "setSelection", promptId: string | null }
//
// Protocol (iframe -> parent):
//   { type: "ready" }
//   { type: "loaded",       label?: string, prompts: number }
//   { type: "selection",    promptId: string | null, summary?: object }
//
// All messages are origin-agnostic but only forwarded to `window.parent`.
// The bridge is a no-op when the page is opened standalone (no parent).

export function initBridge({ onLoadExport, onSetSelection } = {}) {
  if (window.parent === window) {
    return {
      dispose() {},
      notifyLoaded() {},
      notifySelection() {},
    };
  }

  function onMessage(event) {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "loadExport" && typeof data.content === "string") {
      onLoadExport?.(data.content, data.label);
    } else if (data.type === "setSelection") {
      onSetSelection?.(data.promptId ?? null);
    }
  }

  window.addEventListener("message", onMessage);
  window.parent.postMessage({ type: "ready" }, "*");

  return {
    dispose() { window.removeEventListener("message", onMessage); },
    notifyLoaded(payload) {
      window.parent.postMessage({ type: "loaded", ...payload }, "*");
    },
    notifySelection(promptId, summary) {
      window.parent.postMessage({ type: "selection", promptId, summary }, "*");
    },
  };
}
