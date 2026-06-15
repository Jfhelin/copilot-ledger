import { describe, expect, it } from "vitest";
import {
  computeEffectiveInputTokens,
  computeCacheHitRate,
  summarizeTokenUsage,
  formatCacheUsageSummary,
} from "../lib/cacheMetrics";

describe("computeEffectiveInputTokens", () => {
  it("subtracts cache read and write from input", () => {
    expect(computeEffectiveInputTokens(1000, 600, 100)).toBe(300);
  });

  it("defaults cache write to zero", () => {
    expect(computeEffectiveInputTokens(1000, 600)).toBe(400);
  });

  it("never goes negative", () => {
    expect(computeEffectiveInputTokens(100, 900, 0)).toBe(0);
  });

  it("ignores negative cache write", () => {
    expect(computeEffectiveInputTokens(1000, 0, -50)).toBe(1000);
  });
});

describe("computeCacheHitRate", () => {
  it("returns undefined when the denominator is zero", () => {
    expect(computeCacheHitRate(0, 0, 0)).toBeUndefined();
  });

  it("computes read / (effectiveInput + write + read)", () => {
    // input 1000, write 0, read 900 -> effective 100, denom 1000 -> 0.9
    expect(computeCacheHitRate(1000, 0, 900)).toBeCloseTo(0.9, 6);
  });

  it("includes cache write in the denominator", () => {
    // input 1000, write 200, read 500 -> effective 300, denom 300+200+500=1000
    expect(computeCacheHitRate(1000, 200, 500)).toBeCloseTo(0.5, 6);
  });

  it("is 0 when nothing was read from cache", () => {
    expect(computeCacheHitRate(1000, 0, 0)).toBe(0);
  });
});

describe("summarizeTokenUsage", () => {
  it("returns null when no usages are present", () => {
    expect(summarizeTokenUsage([])).toBeNull();
    expect(summarizeTokenUsage([null, undefined])).toBeNull();
  });

  it("sums fields across entries and skips nullish ones", () => {
    const result = summarizeTokenUsage([
      { inputTokens: 100, outputTokens: 10, cacheRead: 40, cacheWrite: 5 },
      null,
      { inputTokens: 200, outputTokens: 20, cacheRead: 60, cacheWrite: 5 },
    ]);
    expect(result).not.toBeNull();
    expect(result!.inputTokens).toBe(300);
    expect(result!.outputTokens).toBe(30);
    expect(result!.cacheRead).toBe(100);
    expect(result!.cacheWrite).toBe(10);
  });

  it("attaches a derived cache hit rate", () => {
    const result = summarizeTokenUsage([
      { inputTokens: 1000, outputTokens: 0, cacheRead: 900, cacheWrite: 0 },
    ]);
    expect(result!.cacheHitRate).toBeCloseTo(0.9, 6);
  });

  it("treats missing numeric fields as zero", () => {
    const result = summarizeTokenUsage([{ inputTokens: 50 }]);
    expect(result).not.toBeNull();
    expect(result!.outputTokens).toBe(0);
    expect(result!.cacheRead).toBe(0);
    expect(result!.cacheWrite).toBe(0);
  });
});

describe("formatCacheUsageSummary", () => {
  it("returns null when usage is missing or has no cache reads", () => {
    expect(formatCacheUsageSummary(null)).toBeNull();
    expect(formatCacheUsageSummary({ inputTokens: 100, cacheRead: 0 })).toBeNull();
  });

  it("renders cache read with a verbose hit rate by default", () => {
    const text = formatCacheUsageSummary({
      inputTokens: 1000,
      cacheRead: 900,
      cacheWrite: 0,
    });
    expect(text).toContain("900 cache read");
    expect(text).toContain("cache hit rate 90.0%");
  });

  it("includes cache write when present", () => {
    const text = formatCacheUsageSummary({
      inputTokens: 1000,
      cacheRead: 500,
      cacheWrite: 200,
    });
    expect(text).toContain("200 cache write");
  });

  it("uses a compact hit-rate label when asked", () => {
    const text = formatCacheUsageSummary(
      { inputTokens: 1000, cacheRead: 900, cacheWrite: 0 },
      { variant: "compact" },
    );
    expect(text).toContain("90.0% hit");
    expect(text).not.toContain("cache hit rate");
  });

  it("prefers a precomputed cacheHitRate over recomputing", () => {
    const text = formatCacheUsageSummary({
      inputTokens: 1000,
      cacheRead: 900,
      cacheWrite: 0,
      cacheHitRate: 0.25,
    });
    expect(text).toContain("25.0%");
  });
});
