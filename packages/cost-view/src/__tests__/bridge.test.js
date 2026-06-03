// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initBridge } from "../lib/bridge.js";

// Minimal EventSource fake: records the URL, exposes addEventListener so the
// test can drive named events, and tracks close().
class FakeEventSource {
  constructor(url) {
    this.url = url;
    this.listeners = {};
    this.closed = false;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }
  emit(type, data) {
    (this.listeners[type] || []).forEach((fn) => fn({ data }));
  }
  close() {
    this.closed = true;
  }
}

let fetchMock;

beforeEach(() => {
  FakeEventSource.instances = [];
  globalThis.EventSource = FakeEventSource;
  fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  delete globalThis.EventSource;
  delete globalThis.fetch;
  vi.restoreAllMocks();
});

function lastSource() {
  return FakeEventSource.instances[FakeEventSource.instances.length - 1];
}

const ORIGIN = window.location.origin;

describe("initBridge", () => {
  it("opens the SSE endpoint and POSTs /api/ready on init", () => {
    initBridge({});
    expect(lastSource().url).toBe(`${ORIGIN}/api/events`);
    expect(fetchMock).toHaveBeenCalledWith(
      `${ORIGIN}/api/ready`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("delivers loadExport content and label", () => {
    const onLoadExport = vi.fn();
    initBridge({ onLoadExport });
    lastSource().emit("loadExport", JSON.stringify({ content: "{}", label: "run-a" }));
    expect(onLoadExport).toHaveBeenCalledWith("{}", "run-a");
  });

  it("ignores malformed JSON without throwing or invoking callbacks", () => {
    const onLoadExport = vi.fn();
    initBridge({ onLoadExport });
    expect(() => lastSource().emit("loadExport", "not json")).not.toThrow();
    expect(onLoadExport).not.toHaveBeenCalled();
  });

  it("delivers setSelection promptId and defaults missing id to null", () => {
    const onSetSelection = vi.fn();
    initBridge({ onSetSelection });
    lastSource().emit("setSelection", JSON.stringify({ promptId: "p3" }));
    lastSource().emit("setSelection", JSON.stringify({}));
    expect(onSetSelection).toHaveBeenNthCalledWith(1, "p3");
    expect(onSetSelection).toHaveBeenNthCalledWith(2, null);
  });

  it("parses setSummaries, treating the literal 'null' as null", () => {
    const onSetSummaries = vi.fn();
    initBridge({ onSetSummaries });
    lastSource().emit("setSummaries", JSON.stringify([{ id: "x" }]));
    lastSource().emit("setSummaries", "null");
    expect(onSetSummaries).toHaveBeenNthCalledWith(1, [{ id: "x" }]);
    expect(onSetSummaries).toHaveBeenNthCalledWith(2, null);
  });

  it("coerces setSummariesPending to a boolean", () => {
    const onSummariesPending = vi.fn();
    initBridge({ onSummariesPending });
    lastSource().emit("setSummariesPending", JSON.stringify({ pending: 1 }));
    expect(onSummariesPending).toHaveBeenCalledWith(true);
  });

  it("posts notifications to their endpoints with JSON bodies", () => {
    const bridge = initBridge({});
    fetchMock.mockClear();

    bridge.notifyLoaded({ ok: true });
    bridge.notifySelection("p1", { title: "t" });
    bridge.requestSummaries();

    const urls = fetchMock.mock.calls.map((c) => c[0]);
    expect(urls).toContain(`${ORIGIN}/api/loaded`);
    expect(urls).toContain(`${ORIGIN}/api/selection`);
    expect(urls).toContain(`${ORIGIN}/api/requestSummaries`);

    const selectionCall = fetchMock.mock.calls.find((c) => c[0].endsWith("/api/selection"));
    expect(JSON.parse(selectionCall[1].body)).toEqual({
      promptId: "p1",
      summary: { title: "t" },
    });
  });

  it("defaults selection payload fields to null", () => {
    const bridge = initBridge({});
    fetchMock.mockClear();
    bridge.notifySelection();
    const call = fetchMock.mock.calls.find((c) => c[0].endsWith("/api/selection"));
    expect(JSON.parse(call[1].body)).toEqual({ promptId: null, summary: null });
  });

  it("closes the source and suppresses notifications after dispose", () => {
    const bridge = initBridge({});
    const source = lastSource();
    fetchMock.mockClear();

    bridge.dispose();
    expect(source.closed).toBe(true);

    bridge.notifyLoaded({});
    bridge.notifySelection("p1");
    bridge.requestSummaries();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is a no-op safe when EventSource construction throws (standalone)", () => {
    globalThis.EventSource = class {
      constructor() {
        throw new Error("no SSE here");
      }
    };
    let bridge;
    expect(() => {
      bridge = initBridge({});
    }).not.toThrow();
    expect(() => bridge.dispose()).not.toThrow();
  });
});
