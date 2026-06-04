// Small shared presentational atoms for the knowledge-site pages. These keep
// the editorial pages consistent with the existing Copilot Ledger look (light,
// monospace, theme tokens) without duplicating inline-style boilerplate.

import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";

export function PageHeader({ kicker, title, tagline, children }) {
  return (
    <header style={{ marginBottom: theme.space.xxl }}>
      {kicker && (
        <div
          style={{
            fontSize: theme.fontSize.xs,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: theme.text.dim,
            fontWeight: 700,
            marginBottom: theme.space.md,
          }}
        >
          {kicker}
        </div>
      )}
      <h1
        style={{
          margin: 0,
          fontSize: theme.fontSize.hero,
          fontWeight: 800,
          letterSpacing: "0.01em",
          color: theme.text.primary,
        }}
      >
        {title}
      </h1>
      {tagline && (
        <p style={{ marginTop: theme.space.md, marginBottom: 0, color: theme.text.secondary, fontSize: theme.fontSize.lg, maxWidth: 720 }}>
          {tagline}
        </p>
      )}
      {children}
    </header>
  );
}

export function Card({ children, onClick, href, title, style }) {
  var base = {
    display: "block",
    textAlign: "left",
    background: theme.bg.surface,
    border: "1px solid " + theme.border.default,
    borderRadius: theme.radius.xl,
    padding: theme.space.xl,
    color: theme.text.primary,
    font: "inherit",
    boxShadow: theme.shadow.sm,
  };
  var interactive = Boolean(onClick || href);
  var merged = Object.assign(base, interactive ? { cursor: "pointer" } : {}, style || {});
  if (href) {
    return (
      <a href={href} title={title} style={Object.assign({ textDecoration: "none" }, merged)}>
        {children}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title} style={merged}>
        {children}
      </button>
    );
  }
  return <div style={merged}>{children}</div>;
}

export function CardTitle({ children }) {
  return (
    <div style={{ fontSize: theme.fontSize.lg, fontWeight: 700, color: theme.text.primary }}>{children}</div>
  );
}

export function CardBody({ children }) {
  return (
    <p style={{ margin: 0, marginTop: theme.space.md, color: theme.text.secondary, fontSize: theme.fontSize.md, lineHeight: 1.55 }}>
      {children}
    </p>
  );
}

function resolveToneColor(tone) {
  switch (tone) {
    case "success": return theme.semantic.success;
    case "warning": return theme.semantic.warning;
    case "info": return theme.semantic.info;
    case "error": return theme.semantic.error;
    default: return theme.text.muted;
  }
}

export function Badge({ tone, children }) {
  var color = resolveToneColor(tone);
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: theme.fontSize.xs,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontWeight: 700,
        color: color,
        border: "1px solid " + color,
        borderRadius: theme.radius.full,
        padding: "2px " + theme.space.md + "px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function CardGrid({ children, min }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(" + (min || 280) + "px, 1fr))",
        gap: theme.space.lg,
      }}
    >
      {children}
    </div>
  );
}

export function Prose({ children }) {
  return (
    <div style={{ maxWidth: 760, color: theme.text.secondary, fontSize: theme.fontSize.md, lineHeight: 1.65 }}>
      {children}
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section style={{ marginTop: theme.space.xxl }}>
      {title && (
        <h2 style={{ fontSize: theme.fontSize.xl, fontWeight: 700, color: theme.text.primary, margin: 0, marginBottom: theme.space.lg }}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

// A definition-style field used by the experiment detail layout.
export function Field({ label, value, placeholder }) {
  var empty = !value;
  return (
    <div style={{ marginTop: theme.space.xl }}>
      <div
        style={{
          fontSize: theme.fontSize.xs,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: theme.text.dim,
          fontWeight: 700,
          marginBottom: theme.space.sm,
        }}
      >
        {label}
      </div>
      <div style={{ color: empty ? theme.text.dim : theme.text.secondary, fontSize: theme.fontSize.md, lineHeight: 1.6, fontStyle: empty ? "italic" : "normal" }}>
        {empty ? (placeholder || "Placeholder — to be written.") : value}
      </div>
    </div>
  );
}

export function TextLink({ to, params, children }) {
  return (
    <a
      href={hrefFor(to, params)}
      style={{ color: theme.accent.primary, textDecoration: "none", fontWeight: 600 }}
    >
      {children}
    </a>
  );
}

// Monospace preformatted block for prompts, drafts, and example snippets.
export function Pre({ children, label }) {
  return (
    <div style={{ marginTop: theme.space.md }}>
      {label && (
        <div
          style={{
            fontSize: theme.fontSize.xs,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: theme.text.dim,
            fontWeight: 700,
            marginBottom: theme.space.sm,
          }}
        >
          {label}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: theme.space.lg,
          background: theme.bg.raised,
          border: "1px solid " + theme.border.default,
          borderRadius: theme.radius.lg,
          color: theme.text.primary,
          font: theme.font.mono,
          fontSize: theme.fontSize.md,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflowX: "auto",
        }}
      >
        {children}
      </pre>
    </div>
  );
}

// A highlighted takeaway box. tone matches Badge tones.
export function Callout({ tone, label, children }) {
  var color = resolveToneColor(tone);
  return (
    <div
      style={{
        marginTop: theme.space.lg,
        padding: theme.space.lg + "px " + theme.space.xl,
        borderLeft: "3px solid " + color,
        background: theme.accent.muted,
        borderRadius: theme.radius.md,
      }}
    >
      {label && (
        <div
          style={{
            fontSize: theme.fontSize.xs,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: color,
            fontWeight: 700,
            marginBottom: theme.space.sm,
          }}
        >
          {label}
        </div>
      )}
      <div style={{ color: theme.text.primary, fontSize: theme.fontSize.lg, lineHeight: 1.55, fontWeight: 600 }}>
        {children}
      </div>
    </div>
  );
}
