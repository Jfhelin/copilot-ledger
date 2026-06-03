// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TooltipLayer from "../components/Tooltip.jsx";

function stubRect(el, rect) {
  el.getBoundingClientRect = function () {
    return Object.assign(
      { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: function () {} },
      rect,
    );
  };
}

function getTooltip() {
  return document.getElementById("copilot-ledger-tooltip");
}

describe("TooltipLayer", function () {
  beforeEach(function () {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(function () {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  function mountLayer() {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(function () {
      root.render(<TooltipLayer />);
    });
    return root;
  }

  it("strips the native title on hover, renders a tooltip, and restores on mouseout", function () {
    const root = mountLayer();

    const btn = document.createElement("button");
    btn.setAttribute("title", "Back to file picker");
    stubRect(btn, { top: 100, left: 100, right: 160, bottom: 120, width: 60, height: 20 });
    document.body.appendChild(btn);

    act(function () {
      btn.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    // Native title removed immediately so the OS tooltip can't fire.
    expect(btn.hasAttribute("title")).toBe(false);
    expect(btn.getAttribute("data-native-title-cached")).toBe("Back to file picker");
    expect(btn.getAttribute("aria-describedby")).toBe("copilot-ledger-tooltip");
    expect(getTooltip()).toBeNull();

    act(function () {
      vi.advanceTimersByTime(300);
    });

    const tip = getTooltip();
    expect(tip).not.toBeNull();
    expect(tip.textContent).toBe("Back to file picker");
    expect(tip.getAttribute("role")).toBe("tooltip");

    act(function () {
      btn.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
    });

    expect(btn.getAttribute("title")).toBe("Back to file picker");
    expect(btn.hasAttribute("data-native-title-cached")).toBe(false);
    expect(btn.hasAttribute("aria-describedby")).toBe(false);
    expect(getTooltip()).toBeNull();

    act(function () {
      root.unmount();
    });
  });

  it("does not restore a stale title when the element's title changed during hover", function () {
    const root = mountLayer();

    const el = document.createElement("span");
    el.setAttribute("title", "old tip");
    stubRect(el, { top: 50, left: 50, right: 90, bottom: 66, width: 40, height: 16 });
    document.body.appendChild(el);

    act(function () {
      el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    expect(el.hasAttribute("title")).toBe(false);

    // Simulate React re-rendering this node with a new title while hovered.
    el.setAttribute("title", "new tip");

    act(function () {
      el.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
    });

    // The newer value must win; the cached "old tip" must not clobber it.
    expect(el.getAttribute("title")).toBe("new tip");
    expect(el.hasAttribute("data-native-title-cached")).toBe(false);

    act(function () {
      root.unmount();
    });
  });

  it("ignores mouseout that moves to a child within the tracked element", function () {
    const root = mountLayer();

    const wrap = document.createElement("div");
    wrap.setAttribute("title", "wrapper tip");
    stubRect(wrap, { top: 10, left: 10, right: 110, bottom: 40, width: 100, height: 30 });
    const child = document.createElement("span");
    wrap.appendChild(child);
    document.body.appendChild(wrap);

    act(function () {
      wrap.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    expect(wrap.hasAttribute("title")).toBe(false);

    // Moving onto an inner child should NOT tear the tooltip down.
    act(function () {
      wrap.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: child }));
    });
    expect(wrap.hasAttribute("title")).toBe(false);
    expect(wrap.getAttribute("data-native-title-cached")).toBe("wrapper tip");

    act(function () {
      root.unmount();
    });
    // Cleanup on unmount must restore the title.
    expect(wrap.getAttribute("title")).toBe("wrapper tip");
  });
});
