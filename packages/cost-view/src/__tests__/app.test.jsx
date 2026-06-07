// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App.jsx";
import { assetUrl } from "../content/site.js";

function textOf(container) {
  return container.textContent || "";
}

function setLocation(path) {
  window.history.replaceState({}, "", path);
}

async function flush() {
  // Let the fetch -> text -> parse promise chain settle.
  await act(async function () {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
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

  it("renders the bespoke cache-behavior experiment page from a hash route", async function () {
    setLocation("/#/experiments/cache-behavior");
    var mounted = await renderApp();
    var text = textOf(mounted.container);
    expect(text).toContain("The first call was already warm.");
    // Measured numbers from the article appear on the page.
    expect(text).toContain("9,680");
    expect(text).toContain("Open the cache curve in Copilot Ledger");
    await act(async function () { mounted.root.unmount(); });
  });

  it("renders the bespoke context-growth experiment page from a hash route", async function () {
    setLocation("/#/experiments/context-growth");
    var mounted = await renderApp();
    var text = textOf(mounted.container);
    expect(text).toContain("Context only grows.");
    // Measured numbers from the article appear on the page.
    expect(text).toContain("64,202");
    expect(text).toContain("42.4");
    await act(async function () { mounted.root.unmount(); });
  });

  it("renders the bespoke installed-skill-overhead experiment page from a hash route", async function () {
    setLocation("/#/experiments/installed-skill-overhead");
    var mounted = await renderApp();
    var text = textOf(mounted.container);
    expect(text).toContain("Its skills cost every call.");
    // Measured numbers from the article appear on the page.
    expect(text).toContain("20,167");
    expect(text).toContain("9,107");
    expect(text).toContain("Open the cleaned floor in Copilot Ledger");
    await act(async function () { mounted.root.unmount(); });
  });

  it("renders an experiment detail from a nested hash route", async function () {
    setLocation("/#/experiments/context-quality-readme");
    var mounted = await renderApp();
    var text = textOf(mounted.container);
    expect(text).toContain("The answer lived in one file. Letting the agent find it cost 37% more.");
    expect(text).toContain("mapDatabaseRows");
    expect(text).toContain("Open the fixed Copilot Ledger report");
    await act(async function () { mounted.root.unmount(); });
  });

  it("renders a fixed report without the file picker and with a back link", async function () {
    setLocation("/#/reports/02-one-tool");
    var mounted = await renderApp();
    var text = textOf(mounted.container);
    expect(text).toContain("Back to experiment");
    // The fixed report must never expose the uploader / file switcher.
    expect(text).not.toContain("Choose file");
    expect(text).not.toContain("Upload or select");
    // The back link points at the owning experiment.
    var back = mounted.container.querySelector('a[href="#/experiments/context-quality-readme"]');
    expect(back).not.toBeNull();
    await act(async function () { mounted.root.unmount(); });
  });

  it("shows a not-found state for an unknown fixed report", async function () {
    setLocation("/#/reports/does-not-exist");
    var mounted = await renderApp();
    var text = textOf(mounted.container);
    expect(text).toContain("Report not found");
    await act(async function () { mounted.root.unmount(); });
  });

  it("loads the fixed report into the viewer without uploader or switcher", async function () {
    var json = readFileSync(
      path.resolve(process.cwd(), "public/sessions/02-one-tool.json"),
      "utf8",
    );
    var fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: function () { return Promise.resolve(json); },
    });
    try {
      setLocation("/#/reports/02-one-tool");
      var mounted = await renderApp();
      await flush();
      var text = textOf(mounted.container);
      // The parsed report viewer is shown (its header brand), with the back
      // link — but never the uploader, recents, or a Close/switch affordance.
      expect(text).toContain("COPILOT LEDGER");
      expect(text).toContain("Back to experiment");
      expect(text).not.toContain("Choose file");
      expect(text).not.toContain("Upload or select");
      expect(text).not.toContain("Close");
      await act(async function () { mounted.root.unmount(); });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("bakes the authored summary and descriptive label into the maprows fixed report", async function () {
    var json = readFileSync(
      path.resolve(process.cwd(), "public/sessions/t2-maprows-lazy.json"),
      "utf8",
    );
    var fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: function () { return Promise.resolve(json); },
    });
    try {
      setLocation("/#/reports/context-quality-maprows");
      var mounted = await renderApp();
      await flush();
      var text = textOf(mounted.container);
      // The descriptive title is shown in the header instead of the filename.
      expect(text).toContain("Context Quality — lazy lookup");
      expect(text).not.toContain("t2-maprows-lazy.json");
      // The authored summaries render at the top without any canvas bridge.
      expect(text).toContain("mapDatabaseRows");
      expect(text).toContain("grep_search");
      // Still a fixed report: no uploader chrome.
      expect(text).not.toContain("Choose file");
      expect(text).not.toContain("Upload or select");
      await act(async function () { mounted.root.unmount(); });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("bakes the cache-focused summary and label into the cache-curve fixed report", async function () {
    var json = readFileSync(
      path.resolve(process.cwd(), "public/sessions/t2-maprows-lazy.json"),
      "utf8",
    );
    var fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: function () { return Promise.resolve(json); },
    });
    try {
      setLocation("/#/reports/cache-curve");
      var mounted = await renderApp();
      await flush();
      var text = textOf(mounted.container);
      // The descriptive, cache-focused title is shown instead of the filename.
      expect(text).toContain("Cache behavior");
      expect(text).not.toContain("t2-maprows-lazy.json");
      // The authored cache summary renders at the top without any canvas bridge.
      expect(text).toContain("cache hit rate");
      // Back link points to the cache experiment, and no uploader chrome.
      expect(text).toContain("Back to experiment");
      expect(text).not.toContain("Choose file");
      await act(async function () { mounted.root.unmount(); });
    } finally {
      fetchSpy.mockRestore();
    }
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
