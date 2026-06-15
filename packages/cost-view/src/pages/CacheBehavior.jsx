import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";
import { PageHeader, Section, Prose, Badge, Callout, Pre, TextLink } from "../components/ui.jsx";
import { BarChart, LineChart } from "../components/charts.jsx";
import { STATUS_TONE } from "../content/site.js";

var REPORT_ROUTE = "/reports/cache-curve";

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

function Table({ head, rows }) {
  var cell = {
    padding: theme.space.sm + "px " + theme.space.md,
    borderBottom: "1px solid " + theme.border.subtle,
    textAlign: "left",
    fontSize: theme.fontSize.sm,
    color: theme.text.secondary,
  };
  var th = Object.assign({}, cell, { color: theme.text.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: theme.fontSize.xs });
  return (
    <div style={{ marginTop: theme.space.lg, overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 520 }}>
        <thead>
          <tr>{head.map(function (h, i) { return <th key={i} style={th}>{h}</th>; })}</tr>
        </thead>
        <tbody>
          {rows.map(function (r, ri) {
            return (
              <tr key={ri}>
                {r.map(function (c, ci) { return <td key={ci} style={cell}>{c}</td>; })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CacheBehavior() {
  return (
    <div>
      <div style={{ marginBottom: theme.space.lg }}>
        <TextLink to="/experiments">← All experiments</TextLink>
      </div>

      <PageHeader kicker="Experiment" title="The first call was already warm. The cheap part was everything after it.">
        <div style={{ display: "flex", gap: theme.space.md, alignItems: "center", marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <Badge tone={STATUS_TONE.Published}>Published</Badge>
          <span style={{ color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            Shared-cache hit reproduced across 4 sessions (N=4); per-call curve and sub-agent reuse are single observations (N=1).
          </span>
        </div>
      </PageHeader>

      <Section title="Executive summary">
        <Prose>
          <p>
            Copilot’s prompt cache does most of its work invisibly. In a 6-call session, the
            cache hit rate climbed from <strong>40.3%</strong> on the first call to
            <strong> ~99%</strong> by the third and stayed there — so only the first call paid the
            real price. Each later call re-read a warm ~20K-token prefix and only billed the one
            new tool result (a few hundred tokens).
          </p>
          <p>
            Two things surprised me. First, the <em>very first</em> call in a fresh session already
            reported <strong>9,680 tokens cached</strong> — a shared prefix (tool definitions +
            system prompt) none of us warmed, identical across four independent sessions. Second, a
            sub-agent’s first call entered at <strong>~98%</strong> cache hit, reusing its parent’s
            warm prefix and writing only its ~400-token task brief.
          </p>
          <p>
            The practical lesson: the expensive moment is the <em>first</em> cold write of a new
            prefix. Anything that invalidates that prefix mid-session — switching models, switching
            modes, or compacting context — pays the cold price again.
          </p>
        </Prose>
      </Section>

      <Section title="Hypothesis">
        <Prose>
          <p>
            If the cache works on stable prefixes, then within one session the first call should be
            the expensive one, and every following call should approach near-total reuse — paying
            only for the new tokens it adds. Anything that changes the prefix should reset that.
          </p>
        </Prose>
      </Section>

      <Section title="What happened — the per-call curve">
        <Prose>
          <p>
            Six model calls on <code>claude-sonnet-4.5</code> in a single lazy-lookup run
            (<code>t2.json</code>). The hit rate climbs fast and then plateaus; credits collapse
            after the first call:
          </p>
        </Prose>
        <Table
          head={["Call", "Cache hit", "Credits", "What it paid for"]}
          rows={[
            ["p2.l0", "40.3%", "5.9", "9,680 cached + a one-time 5.4 cr cache-creation write"],
            ["p2.l2", "93.4%", "1.6", "the grep result (new tokens only)"],
            ["p2.l4", "98.7%", "1.1", "a small read_file window"],
            ["p2.l6", "98.3%", "1.2", "another read window"],
            ["p2.l8", "99.1%", "1.1", "another read window"],
            ["p2.l10", "98.9%", "1.8", "the final answer"],
          ]}
        />
        <LineChart
          ariaLabel="Cache hit rate climbing from 40.3% on call 1 to ~99% by call 3 and staying there"
          points={[
            { label: "1", value: 40.3 },
            { label: "2", value: 93.4 },
            { label: "3", value: 98.7 },
            { label: "4", value: 98.3 },
            { label: "5", value: 99.1 },
            { label: "6", value: 98.9 },
          ]}
          yMin={0}
          yMax={100}
          valueSuffix="%"
          caption="Cache hit rate per model call. It clears 90% by call 2 and plateaus near 99% — only the first call pays the cold price."
        />
        <BarChart
          ariaLabel="Credits per call collapsing from 5.9 on call 1 to roughly 1.1–1.8 afterward"
          max={6}
          data={[
            { label: "Call 1 · p2.l0", value: 5.9, display: "5.9 cr", color: theme.cost.cwrite, sublabel: "cold write" },
            { label: "Call 2 · p2.l2", value: 1.6, display: "1.6 cr", color: theme.accent.primary },
            { label: "Call 3 · p2.l4", value: 1.1, display: "1.1 cr", color: theme.accent.primary },
            { label: "Call 4 · p2.l6", value: 1.2, display: "1.2 cr", color: theme.accent.primary },
            { label: "Call 5 · p2.l8", value: 1.1, display: "1.1 cr", color: theme.accent.primary },
            { label: "Call 6 · p2.l10", value: 1.8, display: "1.8 cr", color: theme.accent.primary },
          ]}
          caption="Credits per call. The cost cliff is at call one (the cache write); every later call only bills the new tool result."
        />
        <Prose>
          <p style={{ marginTop: theme.space.lg }}>
            After call one, only the new tool result each turn (229–442 tokens) was uncached. The
            warm prefix was re-read at the cheap cache-read rate every time.
          </p>
        </Prose>
      </Section>

      <Section title="Key findings">
        <Callout tone="info" label="Key finding">
          The first call is the cache write. Everything after it is a cache read. The cost cliff is
          at call one — not spread across the session.
        </Callout>
        <BulletList
          items={[
            "A shared prefix cache is real (N=4). Every cold first call — across four independent fresh sessions — started with exactly 9,680 tokens already cached, despite no prior activity. This looks like a shared cache across users of the standard VS Code toolset, though cross-user sharing isn’t proven from one machine.",
            "Reuse plateaus near 99% within two calls. By the third model call the agent was re-reading almost the entire prefix from cache; only newly-added tool results were billed fresh.",
            "Sub-agents inherit the parent’s warm prefix (N=1). In a separate run, a sub-agent’s first call entered at ~98% hit (19,193 / 19,551 tokens cached, ~357 new, 0.9 cr) versus a cold main start of 15.7 cr.",
            "What the sub-agent reused: the system prompt (~9,500 tok), the tool definitions (28 schemas, ~6,300 tok) and environment/context (~1,700 tok). Only its ~400-token task brief was new. The parent’s accumulated conversation history was NOT inherited, and the cache is per-model.",
            "Changing the prefix resets the cache. In the same run an implementation turn re-entered cold at ~19% only ~90 seconds after planning — too soon for any TTL — because the mode switch changed the tool definitions at the front of the prefix.",
          ]}
        />
      </Section>

      <Section title="Anatomy of the warm prefix">
        <Prose>
          <p>
            What is actually <em>in</em> that ~9,680-token shared block? On the
            Anthropic wire a request is ordered{" "}
            <code>tools → system → messages</code>, so the first bytes the cache
            sees are the <strong>tool definitions</strong>, not the system prompt.
            Measured on one cold <code>claude-sonnet-4.5</code> call
            (<code>hi2_18.json</code> <code>p2.l0</code>):
          </p>
        </Prose>
        <BarChart
          ariaLabel="Prefix blocks by size: tool definitions about 8,526 tokens and the base system prompt about 3,700 tokens are shared across users; the user-specific system tail is about 7,300 tokens"
          data={[
            { label: "Tool definitions (24 schemas)", value: 8526, display: "~8,526 tok", sublabel: "shared across users", color: theme.semantic.success },
            { label: "System — base instructions", value: 3700, display: "~3,700 tok", sublabel: "shared across users", color: theme.semantic.success },
            { label: "System — your custom instructions", value: 7300, display: "~7,300 tok", sublabel: "cwd, workspace, copilot-instructions.md", color: theme.cost.missAccent },
          ]}
          caption="Tool defs are serialized first and are identical for everyone on the same toolset; the system prompt's base preamble is shared too, but its larger tail (your working directory, workspace name, and repo custom instructions) differs per user — so it can't ride a cross-user cache."
        />
        <Callout tone="info" label="Why tools go first">
          The system prompt feels like it should anchor the context window, but it
          is too user-specific to share: roughly two-thirds of it here was your
          working directory, workspace name, an embedded copilot-instructions.md
          (~2,900 tok), and template variables with absolute paths. Putting the
          invariant tool block first keeps ~8.5K bytes byte-identical ahead of any
          per-user content — so tools plus the base system preamble are what stays
          globally warm, lining up with the ~9,680-token shared hit above.
        </Callout>
        <Prose>
          <p style={{ marginTop: theme.space.lg }}>
            This is the same mechanism behind the mode-switch reset: because the
            tool block sits at the very front of the prefix, changing it (a
            Plan → Agent switch) re-freezes everything after it.
          </p>
        </Prose>
      </Section>

      <Section title="Sub-agent vs cold start">
        <Table
          head={["Call", "Role", "Cache hit", "New tokens", "Credits"]}
          rows={[
            ["p1.l0", "Sub-agent first call", "98.2%", "357", "0.9"],
            ["p0.l2", "Sub-agent first call", "97.7%", "455", "1.7"],
            ["p3.l0", "Cold main start", "19.1%", "39,952", "15.7"],
          ]}
        />
        <BarChart
          ariaLabel="Sub-agent first calls cost 0.9 and 1.7 credits versus a 15.7 credit cold main start"
          data={[
            { label: "Sub-agent · p1.l0", value: 0.9, display: "0.9 cr", sublabel: "98.2% hit", color: theme.semantic.success },
            { label: "Sub-agent · p0.l2", value: 1.7, display: "1.7 cr", sublabel: "97.7% hit", color: theme.semantic.success },
            { label: "Cold main · p3.l0", value: 15.7, display: "15.7 cr", sublabel: "19.1% hit", color: theme.cost.missAccent },
          ]}
          caption="A sub-agent lands on an already-warm prefix; a cold main start has to write a 40K-token prefix from scratch."
        />
        <Prose>
          <p style={{ marginTop: theme.space.lg }}>
            A sub-agent spun up mid-session is one of the cheapest things an agent can do, because
            it lands on an already-warm prefix. A cold main start that has to write a 40K-token
            prefix is one of the most expensive.
          </p>
        </Prose>
      </Section>

      <Section title="Practical guidance">
        <Prose>
          <p>The cache rewards stability and punishes churn. To keep it warm:</p>
        </Prose>
        <BulletList
          items={[
            "Keep one task in one session. The first call pays the write; let the rest of the session amortize it instead of restarting cold.",
            "Don’t switch models mid-task unless you need to. The cache is per-model — a different model re-pays the cold write.",
            "Expect a mode switch (Plan → Agent) to reset the cache. It changes the tool definitions at the front of the prefix, so the next call is cold even seconds later.",
            "Sub-agents are cache-cheap. Delegating a focused subtask reuses the parent’s warm prefix; the sub-agent only pays for its task brief and its own new results.",
            "Compact deliberately, not reflexively. Compaction pays off on a long, mostly-stale session — the one-time re-warm is amortized by many cheaper reads of a smaller prefix, and you avoid the context-window ceiling. It LOSES money when you compact early, often, on short sessions, in a tight back-and-forth loop, or right before finishing: you eat both the re-warm cold write AND the summarization call without enough follow-up calls to recover them.",
          ]}
        />
      </Section>

      <Section title="Confidence">
        <Prose>
          <p>
            <strong>Medium.</strong> The shared 9,680-token first-call hit is reproduced across four
            independent sessions (N=4). The per-call curve, the sub-agent reuse numbers, and the
            mode-switch cold start are each <strong>single observations (N=1)</strong>. The
            compaction and stay-vs-fresh guidance is <strong>reasoned from the cache mechanism, not
            separately measured</strong> — there is no captured compaction run yet; it’s a candidate
            for a follow-up.
          </p>
        </Prose>
      </Section>

      <Section title="Evidence">
        <Prose>
          <p>
            This is the actual Copilot Ledger report for the per-call curve. It opens pinned to this
            one export. Select the first call to see the 9,680-token shared hit on the
            context-window bar, then step through calls 2–6 to watch reuse climb to ~99%.
          </p>
        </Prose>
        <div style={{ marginTop: theme.space.lg }}>
          <ReportButton>Open the cache curve in Copilot Ledger</ReportButton>
        </div>
      </Section>

      <Section title="LinkedIn draft">
        <Pre>
{`The first call was already warm. The cheap part was everything after it.

I watched GitHub Copilot's prompt cache warm up call by call in one session:

Call 1: 40% cache hit — 5.9 credits
Call 2: 93%
Call 3: 99%
... and it stayed there.

Only the first call paid real money. Every call after it re-read a ~20K-token prefix from cache and billed only the new tool result — a few hundred tokens.

Two surprises:
1. The FIRST call in a fresh session already had 9,680 tokens cached — a shared prefix (tool defs + system prompt) I never warmed. Same number across four independent sessions.
2. A sub-agent's first call entered at ~98% hit. It reused its parent's warm prefix and only paid for its ~400-token task brief.

The expensive moment is the first cold write of a new prefix. What resets it? Switching models. Switching modes. Compacting too early.

Keep one task in one session, and the cache does the rest.

(Shared hit: N=4. The curve and sub-agent numbers: N=1.)`}
        </Pre>
      </Section>

      <Section title="Video outline">
        <Prose>
          <p>60–90 second LinkedIn video:</p>
        </Prose>
        <BulletList
          items={[
            "Open the cache-curve report and select call 1 — point at the 9,680-token cached segment",
            "Step through calls 2–6 and show the hit rate climbing to ~99%",
            "Put the credits side by side: 5.9 → 1.6 → 1.1 …",
            "Cut to the sub-agent table: ~98% hit vs a 15.7 cr cold start",
            "Explain the reset triggers: model switch, mode switch, compaction",
            "End with: keep one task in one session and let the cache amortize the first write",
          ]}
        />
      </Section>

      <Section title="Open the report">
        <Prose>
          <p>
            Follow the six calls yourself — the shared cold-call hit and the climb to ~99% are
            visible per call.
          </p>
        </Prose>
        <div style={{ marginTop: theme.space.lg }}>
          <ReportButton>Open the cache curve in Copilot Ledger</ReportButton>
        </div>
      </Section>
    </div>
  );
}
