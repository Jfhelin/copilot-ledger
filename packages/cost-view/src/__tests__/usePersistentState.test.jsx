// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import usePersistentState from "../hooks/usePersistentState.js";

// Harness: renders the hook and pushes the latest [state, setState] tuple out
// to the test via a capture callback so we can read and drive it.
function Harness({ storageKey, initialValue, capture }) {
  const [state, setState] = usePersistentState(storageKey, initialValue);
  capture(state, setState);
  return null;
}

let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

function render(props) {
  let latest = {};
  const capture = (state, setState) => {
    latest.state = state;
    latest.setState = setState;
  };
  act(() => root.render(<Harness {...props} capture={capture} />));
  return latest;
}

describe("usePersistentState", () => {
  it("uses the provided initial value when storage is empty", () => {
    const h = render({ storageKey: "theme", initialValue: "light" });
    expect(h.state).toBe("light");
  });

  it("supports a lazy initializer function", () => {
    const h = render({ storageKey: "k", initialValue: () => 42 });
    expect(h.state).toBe(42);
  });

  it("reads and parses an existing JSON value", () => {
    window.localStorage.setItem("filters", JSON.stringify({ open: true }));
    const h = render({ storageKey: "filters", initialValue: null });
    expect(h.state).toEqual({ open: true });
  });

  it("falls back to the raw string for legacy non-JSON values", () => {
    window.localStorage.setItem("mode", "light"); // bare string, not "\"light\""
    const h = render({ storageKey: "mode", initialValue: "dark" });
    expect(h.state).toBe("light");
  });

  it("persists updates to localStorage after the debounce window", () => {
    const h = render({ storageKey: "count", initialValue: 0 });
    act(() => h.setState(5));
    // Nothing written before the debounce elapses.
    expect(window.localStorage.getItem("count")).toBeNull();
    act(() => vi.advanceTimersByTime(300));
    expect(window.localStorage.getItem("count")).toBe("5");
  });

  it("flushes the latest value synchronously on unmount", () => {
    const h = render({ storageKey: "draft", initialValue: "" });
    act(() => h.setState("hello"));
    act(() => root.unmount());
    expect(window.localStorage.getItem("draft")).toBe(JSON.stringify("hello"));
    // Re-create a root so the shared afterEach unmount stays a no-op-safe call.
    root = createRoot(container);
  });

  it("does not touch storage when no key is provided", () => {
    const h = render({ storageKey: "", initialValue: "x" });
    act(() => h.setState("y"));
    act(() => vi.advanceTimersByTime(300));
    expect(window.localStorage.length).toBe(0);
    expect(h.state !== undefined).toBe(true);
  });
});
