import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";
import { PageHeader, Section, Prose, Badge, Callout, Pre, TextLink } from "../components/ui.jsx";
import { BarChart, StackedBar } from "../components/charts.jsx";
import { STATUS_TONE } from "../content/site.js";

var REPORT_ROUTE = "/reports/context-quality-maprows";

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

      <PageHeader kicker="Experiment" title="The answer lived in one file. Letting the agent find it cost 37% more.">
        <div style={{ display: "flex", gap: theme.space.md, alignItems: "center", marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <Badge tone={STATUS_TONE.Published}>Published</Badge>
          <span style={{ color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            One run per arm (N=1), not a universal benchmark.
          </span>
        </div>
      </PageHeader>

      <Section title="Executive summary">
        <Prose>
          <p>
            I asked GitHub Copilot the same question two ways: once with the relevant file
            attached, once without. The only variable was the attachment. Letting the agent find
            the file itself turned a single model call into <strong>six</strong> — one search,
            four reads, and an answer — and raised the cost from <strong>8.0 credits ($0.080) to
            12.8 credits ($0.128)</strong>, a <strong>37% increase</strong>.
          </p>
          <p>
            The cost lesson is not that tool calls are bad. The lesson is that missing context
            creates extra agent round trips, and <em>each round trip re-bills the whole
            conversation prefix</em>. When you already know which file, log, error message, or
            symbol matters, providing it up front deletes those round trips.
          </p>
          <p>
            The surprise underneath it: every run started with the <em>exact same</em> 9,680
            tokens already cached on the very first call, in a fresh session — a shared prefix
            cache none of us warmed.
          </p>
        </Prose>
        <BarChart
          ariaLabel="Arm A lazy run cost 12.8 credits versus 8.0 credits for Arm B with the file attached, a 37% increase"
          max={14}
          data={[
            { label: "Arm A — lazy (6 calls)", value: 12.8, display: "12.8 cr", color: theme.semantic.warning },
            { label: "Arm B — file attached (1 call)", value: 8.0, display: "8.0 cr", color: theme.semantic.success },
          ]}
          caption="Same prompt, same model, same repo. The only variable was the attachment — letting the agent discover the file cost 37% more."
        />
      </Section>

      <Section title="Hypothesis">
        <Prose>
          <p>
            If the developer already knows which file holds the answer, attaching it up front
            should be cheaper than letting the agent discover it — because discovery adds extra
            round trips, and each round trip re-bills the whole conversation prefix.
          </p>
        </Prose>
      </Section>

      <Section title="The prompt (identical in both arms)">
        <Pre>
          {"Our repository classes all call a helper called mapDatabaseRows when returning query results. How does it actually work — what does it do to the rows it gets back from SQLite?"}
        </Pre>
        <Prose>
          <p style={{ marginTop: theme.space.md }}>
            <strong>Arm A (lazy):</strong> no attachment. <strong>Arm B (attached):</strong> same
            prompt plus <code>api/src/utils/sql.ts</code>, the file that defines the helper. Same
            repo, same model (<code>claude-sonnet-4.5</code>).
          </p>
        </Prose>
      </Section>

      <Section title="What happened">
        <Prose><p><strong>Arm A — lazy</strong> (<code>t2.json</code>):</p></Prose>
        <OrderedList
          items={[
            "p2.l0 — “Let me search for its definition” → emits a grep_search for mapDatabaseRows. (5.9 cr)",
            "p2.l1 — grep returns the hits.",
            "p2.l3 / l5 / l7 / l9 — four read_file calls on api/src/utils/sql.ts in small overlapping windows (one used a corrupted path and was retried).",
            "p2.l10 — final answer: it maps snake_case columns to camelCase object keys. (1.8 cr)",
          ]}
        />
        <Prose>
          <p style={{ marginTop: theme.space.lg }}>
            Total: 6 model calls, 5 tool calls, <strong>12.8 credits</strong>.
          </p>
          <p><strong>Arm B — attached</strong> (<code>t2_2.json</code>):</p>
        </Prose>
        <OrderedList
          items={[
            "p2.l0 — the file is already in context; the agent answers directly. One call, no tools, 8.0 credits.",
          ]}
        />
        <StackedBar
          ariaLabel="Arm A is six stacked call costs totalling 12.8 credits; Arm B is a single 8.0 credit call"
          label="Arm A — lazy (6 model calls)"
          totalDisplay="12.8 cr"
          total={12.7}
          max={12.7}
          segments={[
            { label: "search (p2.l0)", value: 5.9, display: "5.9 cr", color: theme.cost.cwrite },
            { label: "read (p2.l2)", value: 1.6, display: "1.6 cr", color: theme.cost.cached },
            { label: "read (p2.l4)", value: 1.1, display: "1.1 cr", color: theme.cost.cached },
            { label: "read (p2.l6)", value: 1.2, display: "1.2 cr", color: theme.cost.cached },
            { label: "read (p2.l8)", value: 1.1, display: "1.1 cr", color: theme.cost.cached },
            { label: "answer (p2.l10)", value: 1.8, display: "1.8 cr", color: theme.cost.output },
          ]}
        />
        <StackedBar
          ariaLabel="Arm B is a single 8.0 credit answer call"
          label="Arm B — file attached (1 model call)"
          totalDisplay="8.0 cr"
          total={8.0}
          max={12.7}
          segments={[
            { label: "answer (p2.l0)", value: 8.0, display: "8.0 cr", color: theme.cost.output },
          ]}
        />
        <Prose>
          <p style={{ marginTop: theme.space.md, fontSize: theme.fontSize.sm, color: theme.text.dim }}>
            Hop count, not hop size: Arm B’s single call was actually more expensive than Arm A’s
            first call. The 37% gap is the five discovery round trips, each re-billing the prefix.
          </p>
        </Prose>
      </Section>

      <Section title="Key findings">
        <Callout tone="info" label="Key finding">
          The answer was never the expensive part. The five discovery round trips were — each one
          re-billed the ~25K-token prefix again just to read the same file.
        </Callout>
        <BulletList
          items={[
            "Attaching the file was 37% cheaper (8.0 vs 12.8 credits) and removed 5 round trips.",
            "Inlining is not free on the first call. Arm B’s single call (8.0 cr) was MORE expensive than Arm A’s first call (5.9 cr); the win comes entirely from deleting the tail.",
            "Hop count, not hop size, dominates. Arm A fanned out into a grep plus four small overlapping reads, each re-billing the prefix at the cache-read rate. That fan-out is nondeterministic — another run might take three hops, not six.",
            "A shared prefix cache is real. Every cold first call — across four independent fresh sessions — started with exactly 9,680 tokens already cached, despite no prior activity and a 5+ minute idle gap.",
          ]}
        />
      </Section>

      <Section title="Practical guidance">
        <Prose>
          <p>When you know the relevant context, provide it directly:</p>
        </Prose>
        <BulletList
          items={[
            "the specific file or function",
            "the error message or stack trace",
            "the failing test",
            "the relevant log lines",
            "architectural constraints",
          ]}
        />
        <Prose>
          <p style={{ marginTop: theme.space.lg }}>
            Avoid dumping the whole codebase. The goal is high-quality context, not maximum
            context — attaching the one file that holds the answer, not fifty.
          </p>
        </Prose>
      </Section>

      <Section title="Recommended developer behavior">
        <Pre label="Instead of">How does mapDatabaseRows work?</Pre>
        <Pre label="Use">{"Here is api/src/utils/sql.ts. How does mapDatabaseRows transform the rows it gets back from SQLite?"}</Pre>
      </Section>

      <Section title="Evidence">
        <Prose>
          <p>
            This is the actual Copilot Ledger report for Arm A — the lazy run. It opens in the
            same read-only viewer used across the lab, pinned to this one export, with the search
            → read → answer fan-out and the cold-call shared-cache hit visible per call.
          </p>
        </Prose>
        <div style={{ marginTop: theme.space.lg }}>
          <ReportButton>Open the fixed Copilot Ledger report</ReportButton>
        </div>
      </Section>

      <Section title="LinkedIn draft">
        <Pre>
{`The answer lived in one file. Letting the agent find it cost 37% more.

I asked GitHub Copilot the same question two ways. Same prompt, same model, same repo. The only difference: in one run I attached the file that held the answer, in the other I didn't.

Without the file, the agent didn't just answer. It:
1. searched (grep)
2. read the file across four overlapping windows
3. then answered

Six model calls instead of one. 12.8 credits instead of 8.0 — a 37% increase.

The twist: inlining the file wasn't free either. Arm B's single call was actually MORE expensive than Arm A's first call. The savings came entirely from deleting the round trips, not from a cheaper answer.

Hop count, not hop size, is the lever.

When you already know which file holds the answer, attach it. You're not saving tokens — you're saving round trips.

(N=1 — a single run per arm, not a benchmark.)`}
        </Pre>
      </Section>

      <Section title="Video outline">
        <Prose>
          <p>60–90 second LinkedIn video:</p>
        </Prose>
        <BulletList
          items={[
            "Show the identical prompt in both arms",
            "Arm A: show the grep_search, then the four read_file calls",
            "Arm B: show the single call with the file attached",
            "Put the two totals side by side: 12.8 vs 8.0 credits",
            "Explain that the answer was cheap — the discovery round trips were not",
            "End with: when you know the file, attach it; you're deleting round trips, not tokens",
          ]}
        />
      </Section>

      <Section title="Open the report">
        <Prose>
          <p>
            One run per arm (N=1), not a universal benchmark — open the report and follow the six
            model calls and five tool calls yourself.
          </p>
        </Prose>
        <div style={{ marginTop: theme.space.lg }}>
          <ReportButton>Open the fixed Copilot Ledger report</ReportButton>
        </div>
      </Section>
    </div>
  );
}
