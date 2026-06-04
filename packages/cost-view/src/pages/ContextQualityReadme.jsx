import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";
import { PageHeader, Section, Prose, Badge, Callout, Pre, TextLink } from "../components/ui.jsx";
import { STATUS_TONE } from "../content/site.js";

var REPORT_ROUTE = "/reports/02-one-tool";

function OrderedList({ items }) {
  return (
    <ol style={{ margin: 0, marginTop: theme.space.md, paddingLeft: theme.space.xxl, color: theme.text.secondary, fontSize: theme.fontSize.md, lineHeight: 1.7 }}>
      {items.map(function (item, i) {
        return <li key={i} style={{ marginBottom: theme.space.sm }}>{item}</li>;
      })}
    </ol>
  );
}

function BulletList({ items }) {
  return (
    <ul style={{ margin: 0, marginTop: theme.space.md, paddingLeft: theme.space.xxl, color: theme.text.secondary, fontSize: theme.fontSize.md, lineHeight: 1.7 }}>
      {items.map(function (item, i) {
        return <li key={i} style={{ marginBottom: theme.space.sm }}>{item}</li>;
      })}
    </ul>
  );
}

function ReportButton({ children }) {
  return (
    <a
      href={hrefFor(REPORT_ROUTE)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: theme.space.sm,
        background: theme.accent.primary,
        color: "#ffffff",
        textDecoration: "none",
        fontWeight: 700,
        fontSize: theme.fontSize.md,
        padding: theme.space.md + "px " + theme.space.xl,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadow.sm,
      }}
    >
      {children} <span aria-hidden="true">→</span>
    </a>
  );
}

export default function ContextQualityReadme() {
  return (
    <div>
      <div style={{ marginBottom: theme.space.lg }}>
        <TextLink to="/experiments">← All experiments</TextLink>
      </div>

      <PageHeader kicker="Experiment" title="The README was cheap. Finding it wasn't.">
        <div style={{ display: "flex", gap: theme.space.md, alignItems: "center", marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <Badge tone={STATUS_TONE.Published}>Published</Badge>
          <span style={{ color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            One measured session, not a universal benchmark.
          </span>
        </div>
      </PageHeader>

      <Section title="Executive summary">
        <Prose>
          <p>
            The user asked Copilot to read the root README and summarize the project in one
            sentence. The README itself was small, but because the agent did not have it in
            context, the harness first had to issue a <code>read_file</code> tool call and then
            make a second model call with the README content included.
          </p>
          <p>
            The cost lesson is not that tool calls are bad. The lesson is that missing context
            can create extra agent round trips. When the user already knows which file, log,
            error message, or code section matters, providing that context up front can reduce
            unnecessary exploration.
          </p>
          <p>
            In this session, including the README from the start would likely have reduced the
            cost by roughly 10%.
          </p>
        </Prose>
      </Section>

      <Section title="Hypothesis">
        <Prose>
          <p>Providing relevant context up front can reduce unnecessary agent work.</p>
        </Prose>
      </Section>

      <Section title="What happened">
        <OrderedList
          items={[
            "User asked for a README summary.",
            "The model did not yet have README.md content.",
            "The harness requested a read_file tool call.",
            "README.md was returned as the tool result.",
            "A second model call included the README content.",
            "The model produced the final answer.",
          ]}
        />
      </Section>

      <Section title="Key finding">
        <Callout tone="info" label="Key finding">
          The README content was not the expensive part. The extra agent round trip was the
          cost driver.
        </Callout>
      </Section>

      <Section title="Practical guidance">
        <Prose>
          <p>When you know the relevant context, provide it directly:</p>
        </Prose>
        <BulletList
          items={[
            "relevant files",
            "specific functions",
            "error messages",
            "logs",
            "stack traces",
            "failing tests",
            "architectural constraints",
          ]}
        />
        <Prose>
          <p style={{ marginTop: theme.space.lg }}>
            Avoid dumping the whole codebase. The goal is high-quality context, not maximum
            context.
          </p>
        </Prose>
      </Section>

      <Section title="Recommended developer behavior">
        <Pre label="Instead of">Read the root README and tell me what this project does.</Pre>
        <Pre label="Use">{"Here is the root README. Summarize what this project does in one sentence: …"}</Pre>
        <Pre label="Or, for coding tasks">
          {"The relevant files are src/cart/store.ts and src/components/NavBar.tsx. Use the existing cart store and do not modify backend APIs."}
        </Pre>
      </Section>

      <Section title="Evidence">
        <Prose>
          <p>
            This is the actual Copilot Ledger report for the session. It opens in the same
            read-only viewer used across the lab, pinned to this one export.
          </p>
        </Prose>
        <div style={{ marginTop: theme.space.lg }}>
          <ReportButton>Open the fixed Copilot Ledger report</ReportButton>
        </div>
      </Section>

      <Section title="LinkedIn draft">
        <Pre>
{`The README was cheap. Finding it wasn't.

I analyzed a small Copilot session where the user asked the agent to read the root README and summarize the project.

The README content was tiny.

But the agent did not have it yet, so the harness had to:
1. make an initial model call
2. request read_file
3. add the README as tool result
4. make a second model call

That extra round trip mattered more than the README itself.

In this case, providing the README up front would likely have reduced the run cost by about 10%.

The lesson is not "avoid tools."
The lesson is: when you already know the relevant context, give it to the agent.

Good context beats extra exploration.`}
        </Pre>
      </Section>

      <Section title="Video outline">
        <Prose>
          <p>60–90 second LinkedIn video:</p>
        </Prose>
        <BulletList
          items={[
            "Show the initial user prompt",
            "Show the read_file tool call",
            "Show the second model call",
            "Highlight the cost",
            "Explain that the README was small but the round trip added cost",
            "End with: provide relevant context up front, but do not dump the whole codebase",
          ]}
        />
      </Section>

      <Section title="Open the report">
        <Prose>
          <p>
            One measured session, not a universal benchmark — open the report and follow the
            two model calls and the single tool call yourself.
          </p>
        </Prose>
        <div style={{ marginTop: theme.space.lg }}>
          <ReportButton>Open the fixed Copilot Ledger report</ReportButton>
        </div>
      </Section>
    </div>
  );
}
