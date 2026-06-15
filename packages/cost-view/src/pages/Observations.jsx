import { theme } from "../lib/theme.js";
import { PageHeader, Prose } from "../components/ui.jsx";
import { OBSERVATIONS } from "../content/site.js";

function ObservationCard({ observation }) {
  return (
    <details
      style={{
        background: theme.bg.surface,
        border: "1px solid " + theme.border.default,
        borderRadius: theme.radius.xl,
        padding: theme.space.lg + "px " + theme.space.xl,
        boxShadow: theme.shadow.sm,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontSize: theme.fontSize.lg,
          fontWeight: 700,
          color: theme.text.primary,
          listStyle: "none",
        }}
      >
        {observation.title}
      </summary>
      <p style={{ marginTop: theme.space.md, marginBottom: 0, color: theme.text.secondary, fontSize: theme.fontSize.md, lineHeight: 1.6 }}>
        {observation.body}
      </p>
    </details>
  );
}

export default function Observations() {
  return (
    <div>
      <PageHeader
        kicker="Observations"
        title="Short notes from real sessions"
        tagline="Small, surprising insights about agent behavior. Each one is a single-session observation unless stated otherwise — read them as prompts for further testing, not proven rules."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: theme.space.md, maxWidth: 820 }}>
        {OBSERVATIONS.map(function (observation) {
          return <ObservationCard key={observation.id} observation={observation} />;
        })}
      </div>

      <div style={{ marginTop: theme.space.xxl }}>
        <Prose>
          <p style={{ margin: 0, color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            The data suggests these patterns; further testing may be needed before
            treating any of them as general guidance.
          </p>
        </Prose>
      </div>
    </div>
  );
}
