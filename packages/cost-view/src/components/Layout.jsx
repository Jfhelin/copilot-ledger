import { useEffect, useState } from "react";
import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";
import { NAV_ITEMS, REPO_URL } from "../content/site.js";

var MOBILE_QUERY = "(max-width: 820px)";
var SIDEBAR_WIDTH = 232;

function useIsMobile() {
  var state = useState(function () {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });
  var isMobile = state[0];
  var setIsMobile = state[1];
  useEffect(function () {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    var mql = window.matchMedia(MOBILE_QUERY);
    function onChange() { setIsMobile(mql.matches); }
    onChange();
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return function () {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);
  return isMobile;
}

// A nav item is active when the current path equals its path, or (for section
// roots like /experiments) when the current path is nested under it.
function isActive(itemPath, currentPath) {
  if (itemPath === "/") return currentPath === "/";
  return currentPath === itemPath || currentPath.indexOf(itemPath + "/") === 0;
}

function Brand({ compact }) {
  return (
    <a
      href={hrefFor("/")}
      style={{
        display: "block",
        textDecoration: "none",
        color: theme.text.primary,
        fontWeight: 800,
        letterSpacing: "0.08em",
        fontSize: compact ? theme.fontSize.md : theme.fontSize.lg,
        lineHeight: 1.3,
      }}
    >
      COPILOT
      <br />
      BEHAVIOR LAB
    </a>
  );
}

function NavLinks({ currentPath, onNavigate, orientation }) {
  var column = orientation !== "row";
  return (
    <nav
      style={{
        display: "flex",
        flexDirection: column ? "column" : "row",
        flexWrap: column ? "nowrap" : "wrap",
        gap: theme.space.xs,
      }}
    >
      {NAV_ITEMS.map(function (item) {
        var active = isActive(item.path, currentPath);
        return (
          <a
            key={item.id}
            href={hrefFor(item.path)}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            style={{
              display: "block",
              padding: theme.space.sm + "px " + theme.space.md + "px",
              borderRadius: theme.radius.md,
              textDecoration: "none",
              fontSize: theme.fontSize.md,
              fontWeight: active ? 700 : 500,
              color: active ? theme.accent.primary : theme.text.secondary,
              background: active ? theme.accent.muted : "transparent",
              border: "1px solid " + (active ? theme.accent.muted : "transparent"),
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

export default function Layout({ currentPath, fullBleed, children }) {
  var isMobile = useIsMobile();
  var menuState = useState(false);
  var menuOpen = menuState[0];
  var setMenuOpen = menuState[1];

  // Close the mobile menu whenever the route changes.
  useEffect(function () { setMenuOpen(false); }, [currentPath]);

  var contentRegion = (
    <main
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: fullBleed ? "hidden" : "auto",
        background: theme.bg.base,
      }}
    >
      {fullBleed ? (
        <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      ) : (
        <div style={{ width: "100%", maxWidth: 1080, margin: "0 auto", padding: theme.space.xxl + "px " + theme.space.xxl + "px " + theme.space.giant + "px" }}>
          {children}
        </div>
      )}
    </main>
  );

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: theme.bg.base, color: theme.text.primary }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.space.md,
            padding: theme.space.md + "px " + theme.space.lg,
            borderBottom: "1px solid " + theme.border.default,
            background: theme.bg.surface,
          }}
        >
          <Brand compact />
          <button
            type="button"
            onClick={function () { setMenuOpen(function (v) { return !v; }); }}
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
            style={{
              background: "transparent",
              color: theme.text.primary,
              border: "1px solid " + theme.border.default,
              borderRadius: theme.radius.md,
              padding: theme.space.sm + "px " + theme.space.md + "px",
              cursor: "pointer",
              font: "inherit",
              fontSize: theme.fontSize.md,
            }}
          >
            {menuOpen ? "✕ Menu" : "☰ Menu"}
          </button>
        </header>
        {menuOpen && (
          <div style={{ padding: theme.space.md + "px " + theme.space.lg, borderBottom: "1px solid " + theme.border.default, background: theme.bg.surface }}>
            <NavLinks currentPath={currentPath} onNavigate={function () { setMenuOpen(false); }} />
          </div>
        )}
        {contentRegion}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", background: theme.bg.base, color: theme.text.primary }}>
      <aside
        style={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          borderRight: "1px solid " + theme.border.default,
          background: theme.bg.surface,
          padding: theme.space.xl + "px " + theme.space.lg,
          display: "flex",
          flexDirection: "column",
          gap: theme.space.xl,
          overflowY: "auto",
        }}
      >
        <Brand />
        <NavLinks currentPath={currentPath} />
        <div style={{ marginTop: "auto", color: theme.text.dim, fontSize: theme.fontSize.xs, lineHeight: 1.5 }}>
          Powered by{" "}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.accent.primary, textDecoration: "none", fontWeight: 600 }}
          >
            Copilot Ledger
          </a>{" "}
          — the measurement tool behind these observations.
        </div>
      </aside>
      {contentRegion}
    </div>
  );
}
