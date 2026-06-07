// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BarChart, StackedBar, LineChart } from "../components/charts.jsx";

function mount(element) {
  var host = document.createElement("div");
  document.body.appendChild(host);
  var root = createRoot(host);
  act(function () {
    root.render(element);
  });
  return host;
}

describe("charts", function () {
  beforeEach(function () {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = "";
  });

  afterEach(function () {
    document.body.innerHTML = "";
  });

  describe("BarChart", function () {
    it("renders one bar per datum with its label and display value", function () {
      var host = mount(
        <BarChart
          ariaLabel="cost compare"
          data={[
            { label: "Arm A", value: 12.8, display: "12.8 cr" },
            { label: "Arm B", value: 8.0, display: "8.0 cr" },
          ]}
        />,
      );
      var text = host.textContent || "";
      expect(text).toContain("Arm A");
      expect(text).toContain("12.8 cr");
      expect(text).toContain("Arm B");
      expect(text).toContain("8.0 cr");
      expect(host.querySelector('[aria-label="cost compare"]')).toBeTruthy();
    });

    it("scales bar widths against the explicit max", function () {
      var host = mount(
        <BarChart
          ariaLabel="scaled"
          max={16}
          data={[{ label: "half", value: 8 }]}
        />,
      );
      // The filled bar is the inner div whose width is a percentage string.
      var filled = Array.from(host.querySelectorAll("div")).find(function (d) {
        return d.style && d.style.width === "50%";
      });
      expect(filled).toBeTruthy();
    });

    it("renders the sublabel when provided", function () {
      var host = mount(
        <BarChart ariaLabel="sub" data={[{ label: "warm", value: 1, sublabel: "98% hit" }]} />,
      );
      expect((host.textContent || "")).toContain("98% hit");
    });
  });

  describe("StackedBar", function () {
    it("renders one segment per entry and the total display", function () {
      var host = mount(
        <StackedBar
          ariaLabel="round trips"
          label="Arm A"
          totalDisplay="12.8 cr"
          total={12}
          max={12}
          segments={[
            { label: "search", value: 6, color: "#111111" },
            { label: "read", value: 4, color: "#222222" },
            { label: "answer", value: 2, color: "#333333" },
          ]}
        />,
      );
      expect((host.textContent || "")).toContain("Arm A");
      expect((host.textContent || "")).toContain("12.8 cr");
      var wrapper = host.querySelector('[aria-label="round trips"]');
      expect(wrapper).toBeTruthy();
      // Three colored segment divs carry a title attribute.
      var segs = Array.from(host.querySelectorAll("div[title]"));
      expect(segs.length).toBe(3);
      expect(segs[0].getAttribute("title")).toContain("search");
    });

    it("scales the bar width by total relative to a shared max", function () {
      var host = mount(
        <StackedBar
          ariaLabel="short"
          label="Arm B"
          total={6}
          max={12}
          segments={[{ label: "answer", value: 6 }]}
        />,
      );
      var bar = Array.from(host.querySelectorAll("div")).find(function (d) {
        return d.style && d.style.width === "50%";
      });
      expect(bar).toBeTruthy();
    });
  });

  describe("LineChart", function () {
    it("renders an svg polyline with one point per datum", function () {
      var host = mount(
        <LineChart
          ariaLabel="cache curve"
          yMin={0}
          yMax={100}
          valueSuffix="%"
          points={[
            { label: "1", value: 40 },
            { label: "2", value: 93 },
            { label: "3", value: 99 },
          ]}
        />,
      );
      var svg = host.querySelector('svg[aria-label="cache curve"]');
      expect(svg).toBeTruthy();
      var polyline = svg.querySelector("polyline");
      expect(polyline).toBeTruthy();
      var pointPairs = polyline.getAttribute("points").trim().split(/\s+/);
      expect(pointPairs.length).toBe(3);
      expect(svg.querySelectorAll("circle").length).toBe(3);
      // Axis labels include the suffixed bounds.
      expect((svg.textContent || "")).toContain("100%");
    });
  });
});
