import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { theme } from "../lib/theme.js";

// Global tooltip layer.
//
// Native HTML `title` tooltips are unreliable inside the canvas iframe
// (macOS WKWebView): long delay, sometimes never show, never on keyboard
// focus. This single component replaces that behaviour app-wide with zero
// changes to the ~100 existing `title=` call sites.
//
// How it works: document-level capture listeners find the nearest ancestor
// carrying a `title`, strip it from the DOM (so the OS tooltip can't fire),
// cache the text, and render our own themed, fixed-position tooltip. The
// original title is restored on mouse-out / blur.
//
// Restoration is deliberately defensive (see rubber-duck review): we only
// ever restore the one element we are tracking, and only if it is still in
// the document and still missing its title -- so we never clobber a value
// React re-rendered in the meantime.

const CACHE_ATTR = "data-native-title-cached";
const DESCRIBED_FLAG = "data-tooltip-described";
const TOOLTIP_ID = "copilot-ledger-tooltip";
const SHOW_DELAY_MS = 250;
const GAP = 8;
const MAX_WIDTH = 340;

function findTitledAncestor(node) {
  let el = node;
  while (el && el.nodeType === 1 && el.id !== TOOLTIP_ID) {
    if (el.hasAttribute && el.hasAttribute("title") && el.getAttribute("title")) {
      return el;
    }
    el = el.parentNode;
  }
  return null;
}

export default function TooltipLayer() {
  const [tip, setTip] = useState(null); // { text, rect } | null
  const [coords, setCoords] = useState(null); // { left, top } | null
  const tipRef = useRef(null);
  const activeRef = useRef(null); // the element whose title we currently own
  const timerRef = useRef(null);

  // Strip + cache the title so the native tooltip can't fire, and flag the
  // element for screen readers via aria-describedby while shown.
  function capture(el) {
    const text = el.getAttribute("title");
    if (text == null) return null;
    el.setAttribute(CACHE_ATTR, text);
    el.removeAttribute("title");
    if (!el.getAttribute("aria-describedby")) {
      el.setAttribute("aria-describedby", TOOLTIP_ID);
      el.setAttribute(DESCRIBED_FLAG, "1");
    }
    activeRef.current = el;
    return text;
  }

  // Put the title back -- but only if it is safe to do so. If React already
  // re-rendered the element with a (possibly different) title, or the node
  // left the DOM, we leave it alone rather than restoring a stale value.
  function release() {
    const el = activeRef.current;
    activeRef.current = null;
    if (!el) return;
    const cached = el.getAttribute(CACHE_ATTR);
    if (cached != null && el.isConnected && !el.hasAttribute("title")) {
      el.setAttribute("title", cached);
    }
    el.removeAttribute(CACHE_ATTR);
    if (el.getAttribute(DESCRIBED_FLAG)) {
      el.removeAttribute("aria-describedby");
      el.removeAttribute(DESCRIBED_FLAG);
    }
  }

  function hide() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    release();
    setTip(null);
    setCoords(null);
  }

  function scheduleShow(el) {
    const text = capture(el);
    if (text == null) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(function () {
      timerRef.current = null;
      if (activeRef.current !== el || !el.isConnected) return;
      setCoords(null);
      setTip({ text: text, rect: el.getBoundingClientRect() });
    }, SHOW_DELAY_MS);
  }

  useEffect(function () {
    function onOver(e) {
      const el = findTitledAncestor(e.target);
      if (!el || el === activeRef.current) return;
      if (activeRef.current) hide();
      scheduleShow(el);
    }
    function onOut(e) {
      const el = activeRef.current;
      if (!el) return;
      // Ignore moves that stay within the tracked element.
      if (e.relatedTarget && el.contains(e.relatedTarget)) return;
      hide();
    }
    function onFocusIn(e) {
      const el = findTitledAncestor(e.target);
      if (!el || el === activeRef.current) return;
      if (activeRef.current) hide();
      scheduleShow(el);
    }
    function onFocusOut() { hide(); }
    function onKeyDown(e) { if (e.key === "Escape") hide(); }
    function onScrollOrResize() { hide(); }

    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return function () {
      if (timerRef.current) clearTimeout(timerRef.current);
      release();
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After the tooltip mounts we know its real size, so flip above/below and
  // clamp horizontally to the viewport.
  useLayoutEffect(function () {
    if (!tip || !tipRef.current) return;
    const vw = window.innerWidth || 0;
    const vh = window.innerHeight || 0;
    const box = tipRef.current.getBoundingClientRect();
    const rect = tip.rect;
    const cx = rect.left + rect.width / 2;
    let left = cx - box.width / 2;
    left = Math.max(GAP, Math.min(left, vw - box.width - GAP));
    let top = rect.top - box.height - GAP;
    if (top < GAP) {
      const below = rect.bottom + GAP;
      top = below + box.height + GAP <= vh ? below : Math.max(GAP, top);
    }
    setCoords({ left: Math.round(left), top: Math.round(top) });
  }, [tip]);

  if (!tip) return null;

  return (
    <div
      id={TOOLTIP_ID}
      ref={tipRef}
      role="tooltip"
      style={{
        position: "fixed",
        left: (coords ? coords.left : 0) + "px",
        top: (coords ? coords.top : 0) + "px",
        maxWidth: MAX_WIDTH + "px",
        padding: theme.space.sm + "px " + theme.space.md + "px",
        background: theme.text.primary,
        color: theme.bg.surface,
        border: "1px solid " + theme.border.strong,
        borderRadius: theme.radius.md,
        boxShadow: theme.shadow.lg,
        font: theme.font.ui,
        fontSize: theme.fontSize.sm,
        lineHeight: 1.4,
        whiteSpace: "pre-line",
        wordBreak: "break-word",
        pointerEvents: "none",
        opacity: coords ? 1 : 0,
        zIndex: 2147483647,
      }}
    >
      {tip.text}
    </div>
  );
}
