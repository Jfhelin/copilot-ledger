import { describe, expect, it } from "vitest";
import { parseHash, hrefFor } from "../lib/router.js";

describe("router parseHash", function () {
  it("defaults an empty hash to root", function () {
    expect(parseHash("")).toEqual({ path: "/", params: {} });
    expect(parseHash("#")).toEqual({ path: "/", params: {} });
  });

  it("parses a simple path", function () {
    expect(parseHash("#/learn")).toEqual({ path: "/learn", params: {} });
  });

  it("parses nested experiment paths", function () {
    expect(parseHash("#/experiments/context-quality")).toEqual({
      path: "/experiments/context-quality",
      params: {},
    });
  });

  it("strips a trailing slash but keeps root", function () {
    expect(parseHash("#/gallery/").path).toBe("/gallery");
    expect(parseHash("#/").path).toBe("/");
  });

  it("decodes query params from the hash", function () {
    var encoded = encodeURIComponent("./sessions/x.json");
    var result = parseHash("#/analyze?src=" + encoded);
    expect(result.path).toBe("/analyze");
    expect(result.params.src).toBe("./sessions/x.json");
  });

  it("round-trips an encoded url through hrefFor and parseHash", function () {
    var url = "https://example.com/a.json?x=1&y=2";
    var href = hrefFor("/analyze", { src: url });
    // The url must be encoded so its own query does not leak into the hash query.
    expect(href.indexOf("&y=2")).toBe(-1);
    var parsed = parseHash(href);
    expect(parsed.path).toBe("/analyze");
    expect(parsed.params.src).toBe(url);
  });

  it("normalises a path missing its leading slash", function () {
    expect(parseHash("#home").path).toBe("/home");
  });
});

describe("router hrefFor", function () {
  it("builds a bare path href", function () {
    expect(hrefFor("/experiments")).toBe("#/experiments");
  });

  it("omits empty query strings", function () {
    expect(hrefFor("/analyze", {})).toBe("#/analyze");
  });

  it("adds a leading slash when missing", function () {
    expect(hrefFor("about")).toBe("#/about");
  });
});
