import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatDuration,
  formatTime,
  formatDurationLong,
  formatRelativeTime,
  truncateText,
  formatTimeClock,
} from "../lib/formatTime.js";

describe("formatDuration", () => {
  it("returns -- for null/zero", () => {
    expect(formatDuration(null)).toBe("--");
    expect(formatDuration(undefined)).toBe("--");
    expect(formatDuration(0)).toBe("--");
  });

  it("formats sub-10ms as <10ms", () => {
    expect(formatDuration(0.005)).toBe("<10ms");
  });

  it("formats sub-second as milliseconds", () => {
    expect(formatDuration(0.25)).toBe("250ms");
    expect(formatDuration(0.999)).toBe("999ms");
  });

  it("formats seconds with one decimal", () => {
    expect(formatDuration(1)).toBe("1.0s");
    expect(formatDuration(59.4)).toBe("59.4s");
  });

  it("formats minutes once past 60s", () => {
    expect(formatDuration(60)).toBe("1.0m");
    expect(formatDuration(150)).toBe("2.5m");
  });
});

describe("formatTime", () => {
  it("returns -- for null", () => {
    expect(formatTime(null)).toBe("--");
  });

  it("formats sub-minute as seconds", () => {
    expect(formatTime(12.3)).toBe("12.3s");
  });

  it("formats minute clock with zero-padded seconds", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(125)).toBe("2:05");
  });

  it("treats 0 as a real value, not missing", () => {
    expect(formatTime(0)).toBe("0.0s");
  });
});

describe("formatDurationLong", () => {
  it("returns -- for falsy", () => {
    expect(formatDurationLong(0)).toBe("--");
    expect(formatDurationLong(null)).toBe("--");
  });

  it("formats hours and zero-padded minutes", () => {
    expect(formatDurationLong(3661)).toBe("1h 01m");
    expect(formatDurationLong(7800)).toBe("2h 10m");
  });

  it("formats minutes and zero-padded seconds when under an hour", () => {
    expect(formatDurationLong(125)).toBe("2m 05s");
  });

  it("formats bare seconds when under a minute", () => {
    expect(formatDurationLong(42)).toBe("42s");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty string for falsy or invalid input", () => {
    expect(formatRelativeTime("")).toBe("");
    expect(formatRelativeTime(null)).toBe("");
    expect(formatRelativeTime("not-a-date")).toBe("");
  });

  it("reports 'just now' within a minute", () => {
    expect(formatRelativeTime("2026-06-03T11:59:30Z")).toBe("just now");
  });

  it("reports minutes, hours, days and months", () => {
    expect(formatRelativeTime("2026-06-03T11:30:00Z")).toBe("30m ago");
    expect(formatRelativeTime("2026-06-03T09:00:00Z")).toBe("3h ago");
    expect(formatRelativeTime("2026-05-31T12:00:00Z")).toBe("3d ago");
    expect(formatRelativeTime("2026-04-01T12:00:00Z")).toBe("2mo ago");
  });

  it("clamps future timestamps to 'just now'", () => {
    expect(formatRelativeTime("2026-06-03T12:05:00Z")).toBe("just now");
  });
});

describe("truncateText", () => {
  it("returns empty string for falsy", () => {
    expect(truncateText("", 5)).toBe("");
    expect(truncateText(null, 5)).toBe("");
  });

  it("leaves short text untouched", () => {
    expect(truncateText("hello", 10)).toBe("hello");
    expect(truncateText("hello", 5)).toBe("hello");
  });

  it("clips and appends ellipsis when over the limit", () => {
    expect(truncateText("hello world", 5)).toBe("hello...");
  });
});

describe("formatTimeClock", () => {
  it("returns -- for null/NaN", () => {
    expect(formatTimeClock(null)).toBe("--");
    expect(formatTimeClock(NaN)).toBe("--");
  });

  it("always uses clock format with floored seconds", () => {
    expect(formatTimeClock(0)).toBe("0:00");
    expect(formatTimeClock(5.9)).toBe("0:05");
    expect(formatTimeClock(65)).toBe("1:05");
    expect(formatTimeClock(125.4)).toBe("2:05");
  });
});
