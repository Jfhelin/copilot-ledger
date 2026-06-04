// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App.jsx";
import { assetUrl } from "../content/site.js";

function textOf(container) {
  return container.textContent || "";
}

function setLocation(path) {
  window.history.replaceState({}, "", path);
}

describe("App shell routing", function () {
  beforeEach(function () {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = "";
    setLocation("/");
  });

  afterEach(function () {
    document.body.innerHTML = "";
    setLocation("/");
  });

  async function renderApp() {
    var container = document.createElement("div");
    document.body.appendChild(container);
    var root = createRoot(container);
    await act(async function () { root.render(<App />); });
    return { container: container, root: root };
  }

  it("renders the knowledge-site shell with nav on the home route", async function () {
    var mounted = await renderApp();
    var text = textOf(mounted.container);
    expect(text).toContain("BEHAVIOR LAB"); // sidebar brand
    expect(text).toContain("Understanding how AI coding agents think");
    await act(async function () { mounted.root.unmount(); });
  });

  it("bypasses the nav shell in embed mode", async function () {
    setLocation("/?embed=1");
    var mounted = await renderApp();
    var text = textOf(mounted.container);
    // The raw viewer renders, but the knowledge-site sidebar brand does not.
    expect(text).toContain("COPILOT LEDGER");
    expect(text).not.toContain("BEHAVIOR LAB");
    await act(async function () { mounted.root.unmount(); });
  });

  it("renders the analyze viewer (not the shell home) on the analyze route", async function () {
    setLocation("/#/analyze");
    var mounted = await renderApp();
    var text = textOf(mounted.container);
    expect(text).toContain("Upload or select a VS Code Copilot session JSON file");
    await act(async function () { mounted.root.unmount(); });
  });

  it("renders an experiment detail from a nested hash route", async function () {
    setLocation("/#/experiments/context-quality");
    var mounted = await renderApp();
    var text = textOf(mounted.container);
    expect(text).toContain("Context Quality");
    expect(text).toContain("The README was cheap. Finding it wasn't.");
    await act(async function () { mounted.root.unmount(); });
  });
});

describe("content assetUrl", function () {
  it("joins onto the Vite base without double slashes and keeps the path relative to base", function () {
    var base = import.meta.env.BASE_URL; // "/" under vitest, "./" in the production build
    expect(assetUrl("sessions/x.json")).toBe(base.replace(/\/$/, "") + "/sessions/x.json");
    // A leading slash in the input must not create a double slash.
    expect(assetUrl("/sessions/x.json")).not.toContain("//sessions");
    // It must never hardcode an absolute origin.
    expect(assetUrl("sessions/x.json").startsWith("http")).toBe(false);
  });
});
