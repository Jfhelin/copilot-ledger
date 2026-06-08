import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackPageview } from "../lib/analytics.js";

describe("trackPageview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    delete window.goatcounter;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    delete window.goatcounter;
  });

  it("does not throw when goatcounter is absent", () => {
    expect(() => trackPageview("/")).not.toThrow();
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
  });

  it("calls goatcounter.count with the given path", () => {
    var count = vi.fn();
    window.goatcounter = { count: count };
    trackPageview("/reports/claude-agent-context-window");
    expect(count).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledWith({ path: "/reports/claude-agent-context-window" });
  });

  it("sends '/' for a root path", () => {
    var count = vi.fn();
    window.goatcounter = { count: count };
    trackPageview("/");
    expect(count).toHaveBeenCalledWith({ path: "/" });
  });

  it("retries until goatcounter loads, then counts once", () => {
    trackPageview("/learn");
    var count = vi.fn();
    window.goatcounter = { count: count };
    vi.advanceTimersByTime(300);
    expect(count).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledWith({ path: "/learn" });
  });

  it("gives up silently after max attempts without throwing", () => {
    trackPageview("/about");
    expect(() => vi.advanceTimersByTime(300 * 12)).not.toThrow();
  });
});
