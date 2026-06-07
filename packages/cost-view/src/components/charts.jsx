// Small hand-rolled, dependency-free chart atoms for the experiment pages.
// They visualize numbers that already appear as prose/tables so the "surprise"
// in each writeup lands before the reader opens the full Copilot Ledger report.
// Light/dark-mode safe: colors come from theme tokens, never hard-coded.

import { theme } from "../lib/theme.js";

function toNumber(value) {
  var n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function ChartCaption({ children }) {
  if (!children) return null;
  return (
    <div
      style={{
        marginTop: theme.space.md,
        color: theme.text.dim,
        fontSize: theme.fontSize.sm,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

// Horizontal bar chart: one labeled bar per row. Each datum is
// { label, value, display?, sublabel?, color? }. `display` overrides the
// printed value (e.g. "12.8 cr"); otherwise the raw value is shown.
export function BarChart({ data, max, ariaLabel, caption }) {
  var values = data.map(function (d) { return toNumber(d.value); });
  var top = typeof max === "number" ? max : Math.max.apply(null, values.concat([0]));
  var safeTop = top > 0 ? top : 1;
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      style={{
        marginTop: theme.space.lg,
        padding: theme.space.lg,
        background: theme.bg.raised,
        border: "1px solid " + theme.border.default,
        borderRadius: theme.radius.lg,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: theme.space.md }}>
        {data.map(function (d, i) {
          var value = toNumber(d.value);
          var pct = Math.max(2, (value / safeTop) * 100);
          var color = d.color || theme.accent.primary;
          return (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: theme.space.xs,
                  gap: theme.space.md,
                }}
              >
                <span style={{ color: theme.text.secondary, fontSize: theme.fontSize.sm, fontWeight: 600 }}>
                  {d.label}
                  {d.sublabel && (
                    <span style={{ color: theme.text.dim, fontWeight: 400 }}> · {d.sublabel}</span>
                  )}
                </span>
                <span
                  style={{
                    color: theme.text.primary,
                    fontSize: theme.fontSize.sm,
                    fontWeight: 700,
                    font: theme.font.mono,
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.display != null ? d.display : value}
                </span>
              </div>
              <div
                style={{
                  height: 10,
                  background: theme.bg.active,
                  borderRadius: theme.radius.full,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: pct + "%",
                    height: "100%",
                    background: color,
                    borderRadius: theme.radius.full,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <ChartCaption>{caption}</ChartCaption>
    </div>
  );
}

// A single horizontal bar split into proportional, labeled segments. Render
// several with a shared `max` to make their total widths comparable.
// `segments` is [{ label, value, color }]; `total`/`totalDisplay` annotate it.
export function StackedBar({ label, segments, total, totalDisplay, max, ariaLabel }) {
  var sum = typeof total === "number"
    ? total
    : segments.reduce(function (acc, s) { return acc + toNumber(s.value); }, 0);
  var scaleMax = typeof max === "number" && max > 0 ? max : sum;
  var barWidthPct = scaleMax > 0 ? Math.max(2, (sum / scaleMax) * 100) : 100;
  return (
    <div role="img" aria-label={ariaLabel} style={{ marginTop: theme.space.lg }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: theme.space.xs,
          gap: theme.space.md,
        }}
      >
        <span style={{ color: theme.text.secondary, fontSize: theme.fontSize.sm, fontWeight: 600 }}>
          {label}
        </span>
        <span
          style={{
            color: theme.text.primary,
            fontSize: theme.fontSize.sm,
            fontWeight: 700,
            font: theme.font.mono,
          }}
        >
          {totalDisplay != null ? totalDisplay : sum}
        </span>
      </div>
      <div
        style={{
          width: barWidthPct + "%",
          minWidth: 40,
          display: "flex",
          height: 16,
          borderRadius: theme.radius.md,
          overflow: "hidden",
          background: theme.bg.active,
        }}
      >
        {segments.map(function (s, i) {
          var value = toNumber(s.value);
          var segPct = sum > 0 ? (value / sum) * 100 : 100 / segments.length;
          return (
            <div
              key={i}
              title={s.label + ": " + (s.display != null ? s.display : value)}
              style={{
                width: segPct + "%",
                background: s.color || theme.accent.primary,
                borderRight: i < segments.length - 1 ? "1px solid " + theme.bg.raised : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// Minimal SVG line chart with an area fill and labeled points. `points` is
// [{ label, value }]; values are plotted against [yMin, yMax].
export function LineChart({ points, yMin, yMax, ariaLabel, valueSuffix, caption }) {
  var W = 320;
  var H = 120;
  var padX = 28;
  var padTop = 14;
  var padBottom = 22;
  var vals = points.map(function (p) { return toNumber(p.value); });
  var lo = typeof yMin === "number" ? yMin : Math.min.apply(null, vals);
  var hi = typeof yMax === "number" ? yMax : Math.max.apply(null, vals);
  var span = hi - lo || 1;
  var innerW = W - padX * 2;
  var innerH = H - padTop - padBottom;
  var suffix = valueSuffix || "";

  function xAt(i) {
    return points.length <= 1 ? padX : padX + (innerW * i) / (points.length - 1);
  }
  function yAt(v) {
    return padTop + innerH - ((toNumber(v) - lo) / span) * innerH;
  }

  var line = points.map(function (p, i) { return xAt(i) + "," + yAt(p.value); }).join(" ");
  var area = padX + "," + (padTop + innerH) + " " + line + " " + xAt(points.length - 1) + "," + (padTop + innerH);
  var areaId = "ll-area-grad";

  return (
    <div
      style={{
        marginTop: theme.space.lg,
        padding: theme.space.lg,
        background: theme.bg.raised,
        border: "1px solid " + theme.border.default,
        borderRadius: theme.radius.lg,
      }}
    >
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={"0 0 " + W + " " + H}
        width="100%"
        style={{ display: "block", maxWidth: 480, margin: "0 auto" }}
      >
        <defs>
          <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.accent.primary} stopOpacity="0.28" />
            <stop offset="100%" stopColor={theme.accent.primary} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[hi, lo].map(function (g, i) {
          var y = yAt(g);
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={W - padX} y2={y} stroke={theme.border.subtle} strokeWidth="1" />
              <text x={padX - 4} y={y + 3} textAnchor="end" fontSize="9" fill={theme.text.dim}>
                {Math.round(g) + suffix}
              </text>
            </g>
          );
        })}
        <polygon points={area} fill={"url(#" + areaId + ")"} />
        <polyline points={line} fill="none" stroke={theme.accent.primary} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map(function (p, i) {
          return (
            <g key={i}>
              <circle cx={xAt(i)} cy={yAt(p.value)} r="3" fill={theme.accent.primary} />
              <text x={xAt(i)} y={H - 6} textAnchor="middle" fontSize="9" fill={theme.text.dim}>
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartCaption>{caption}</ChartCaption>
    </div>
  );
}
