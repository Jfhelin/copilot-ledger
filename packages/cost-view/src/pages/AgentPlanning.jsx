import { theme } from "../lib/theme.js";
import { PageHeader, Section, Prose, Badge, Callout, Pre, TextLink } from "../components/ui.jsx";
import { STATUS_TONE } from "../content/site.js";

// All numbers below are measured from 04-plan-implement-cart.json
// (claude-sonnet-4.6) via:
//   node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout
// except the single-threaded "modeled" path, which is an explicit cost model
// (labelled as such on the page).

function BulletList({ items }) {
  return (
    <ul style={{ margin: 0, marginTop: theme.space.md, paddingLeft: theme.space.xxl, color: theme.text.secondary, fontSize: theme.fontSize.md, lineHeight: 1.7 }}>
      {items.map(function (item, i) {
        return <li key={i} style={{ marginBottom: theme.space.sm }}>{item}</li>;
      })}
    </ul>
  );
}

function LegendDot({ color, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: theme.fontSize.sm, color: theme.text.secondary }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: "inline-block" }} />
      {children}
    </span>
  );
}

function Table({ head, rows, minWidth }) {
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
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: minWidth || 520 }}>
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

// Stacked single bar: the 106.6-credit session split into the planning phase
// (plan reasoning + the two exploration sub-agents) and implementation.
function PhaseSplitBar() {
  var segs = [
    { label: "Sub-agent p0 — components", cr: 16.8, color: theme.cost.ctxSystem },
    { label: "Sub-agent p1 — structure", cr: 11.9, color: theme.cost.ctxToolResults },
    { label: "Plan reasoning p2", cr: 11.5, color: theme.cost.cwrite },
    { label: "Implementation p3", cr: 66.4, color: theme.cost.cached },
  ];
  var total = 106.6;
  return (
    <div style={{ marginTop: theme.space.lg }}>
      <div style={{ display: "flex", width: "100%", height: 40, borderRadius: theme.radius.md, overflow: "hidden", border: "1px solid " + theme.border.subtle }}>
        {segs.map(function (s) {
          var pct = (s.cr / total) * 100;
          return (
            <div key={s.label} title={s.label + ": " + s.cr + " cr"}
              style={{ width: pct + "%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#0b0f17", fontWeight: 700, fontSize: theme.fontSize.sm }}>
              {Math.round(pct)}%
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: theme.space.lg, flexWrap: "wrap", marginTop: theme.space.md }}>
        {segs.map(function (s) {
          return <LegendDot key={s.label} color={s.color}>{s.label} — <strong>{s.cr} cr</strong></LegendDot>;
        })}
      </div>
      <div style={{ marginTop: theme.space.md, color: theme.text.dim, fontSize: theme.fontSize.sm }}>
        The three left segments are the 40.2-credit planning phase (38%). The two
        sub-agents alone are 28.7 cr — 71% of planning, more than double the 11.5-cr
        plan reasoning.
      </div>
    </div>
  );
}

// The overlap: of the 8 source files sub-agent p1 read, 7 were already read by p0.
function OverlapDiagram() {
  var shared = [
    "Navigation.tsx",
    "Products.tsx",
    "AuthContext.tsx",
    "ThemeContext.tsx",
    "config.ts",
    "themeContextUtils.tsx",
    "useTheme.tsx",
  ];
  var chip = function (txt, dup) {
    return (
      <span key={txt} style={{
        display: "inline-block",
        padding: "4px 10px",
        margin: 4,
        borderRadius: theme.radius.full,
        fontSize: theme.fontSize.xs,
        fontWeight: 600,
        background: dup ? theme.cost.ctxToolResults : theme.bg.active,
        color: dup ? "#0b0f17" : theme.text.secondary,
        border: "1px solid " + theme.border.subtle,
      }}>{txt}{dup ? " ×2" : ""}</span>
    );
  };
  return (
    <div style={{ marginTop: theme.space.lg, padding: theme.space.lg, background: theme.bg.raised, border: "1px solid " + theme.border.default, borderRadius: theme.radius.lg }}>
      <div style={{ fontSize: theme.fontSize.sm, fontWeight: 700, color: theme.text.secondary, marginBottom: theme.space.sm }}>
        Files read by BOTH sub-agents (duplicated)
      </div>
      <div>{shared.map(function (f) { return chip(f, true); })}</div>
      <div style={{ marginTop: theme.space.md, color: theme.text.dim, fontSize: theme.fontSize.sm, lineHeight: 1.6 }}>
        7 of the 8 source files sub-agent <code>p1</code> read had already been read
        by <code>p0</code> — <strong>94% of p1&rsquo;s read byte volume (23,158 of
        24,695 B)</strong>. Within its own run, <code>p1</code> read{" "}
        <code>Products.tsx</code> and <code>config.ts</code> twice.
      </div>
    </div>
  );
}

// Compression: ~51 KB of unique source read -> ~9 KB summary returned to the
// main thread. Two proportional bars.
function CompressionBars() {
  var rawKB = 51, summaryKB = 9.1;
  var bar = function (label, kb, max, color, note) {
    var pct = Math.max(3, (kb / max) * 100);
    return (
      <div style={{ marginBottom: theme.space.md }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: theme.space.xs }}>
          <span style={{ color: theme.text.secondary, fontSize: theme.fontSize.sm, fontWeight: 600 }}>{label}</span>
          <span style={{ color: theme.text.primary, fontSize: theme.fontSize.sm, fontWeight: 700, font: theme.font.mono }}>{note}</span>
        </div>
        <div style={{ height: 14, background: theme.bg.active, borderRadius: theme.radius.full, overflow: "hidden" }}>
          <div style={{ width: pct + "%", height: "100%", background: color, borderRadius: theme.radius.full }} />
        </div>
      </div>
    );
  };
  return (
    <div style={{ marginTop: theme.space.lg, padding: theme.space.lg, background: theme.bg.raised, border: "1px solid " + theme.border.default, borderRadius: theme.radius.lg }}>
      {bar("Unique source the sub-agents read", rawKB, rawKB, theme.cost.ctxToolResults, "~51 KB (~12,700 tok)")}
      {bar("Summary returned to the main thread", summaryKB, rawKB, theme.cost.cached, "~9 KB (~2,286 tok)")}
      <div style={{ marginTop: theme.space.sm, color: theme.text.dim, fontSize: theme.fontSize.sm }}>
        A ~5.6× reduction. The main thread&rsquo;s permanent prefix grew ~2,300 tokens
        instead of ~12,700 — and that prefix is re-read on every later call.
      </div>
    </div>
  );
}

// Fan-out vs modeled single-thread: two totals, segmented by discovery + carry.
function CounterfactualBars() {
  var rows = [
    {
      label: "Actual — two sub-agents",
      segs: [
        { label: "Sub-agent discovery", cr: 28.7, color: theme.cost.ctxToolResults },
        { label: "Carry the 2.3K summary", cr: 2.2, color: theme.cost.cached },
      ],
      total: 30.9,
      modeled: false,
    },
    {
      label: "Modeled — single thread",
      segs: [
        { label: "One-pass read (no duplication)", cr: 13.2, color: theme.cost.ctxToolResults },
        { label: "Carry ~10.5K raw reads", cr: 9.9, color: theme.cost.cached },
      ],
      total: 23.1,
      modeled: true,
    },
  ];
  var max = 31;
  return (
    <div style={{ marginTop: theme.space.lg, padding: theme.space.lg, background: theme.bg.raised, border: "1px solid " + theme.border.default, borderRadius: theme.radius.lg }}>
      {rows.map(function (r) {
        var widthPct = (r.total / max) * 100;
        return (
          <div key={r.label} style={{ marginBottom: theme.space.lg }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: theme.space.xs }}>
              <span style={{ color: theme.text.secondary, fontSize: theme.fontSize.sm, fontWeight: 600 }}>
                {r.label}{r.modeled && <span style={{ color: theme.text.dim, fontWeight: 400 }}> · modeled</span>}
              </span>
              <span style={{ color: theme.text.primary, fontSize: theme.fontSize.sm, fontWeight: 700, font: theme.font.mono }}>~{r.total} cr</span>
            </div>
            <div style={{ display: "flex", width: widthPct + "%", minWidth: 60, height: 18, borderRadius: theme.radius.md, overflow: "hidden", background: theme.bg.active }}>
              {r.segs.map(function (s, i) {
                var segPct = (s.cr / r.total) * 100;
                return (
                  <div key={i} title={s.label + ": " + s.cr + " cr"} style={{ width: segPct + "%", background: s.color, borderRight: i < r.segs.length - 1 ? "1px solid " + theme.bg.raised : "none" }} />
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: theme.space.lg, flexWrap: "wrap", marginTop: theme.space.sm, marginBottom: theme.space.md }}>
        <LegendDot color={theme.cost.ctxToolResults}>Discovery</LegendDot>
        <LegendDot color={theme.cost.cached}>Context-carry tax</LegendDot>
      </div>
      <div style={{ color: theme.text.dim, fontSize: theme.fontSize.sm, lineHeight: 1.6 }}>
        In this session the fan-out cost <strong>~7–8 credits more</strong> than an
        optimistic single-threaded path. The modeled bar assumes each file is read
        once and synthesized in one pass — a best case, not a second measured run.
      </div>
    </div>
  );
}

export default function AgentPlanning() {
  return (
    <div>
      <div style={{ marginBottom: theme.space.lg }}>
        <TextLink to="/experiments">← All experiments</TextLink>
      </div>

      <PageHeader kicker="Experiment" title="The agent spawned two sub-agents to plan. They both read the same seven files.">
        <div style={{ display: "flex", gap: theme.space.md, alignItems: "center", marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <Badge tone={STATUS_TONE.Published}>Published</Badge>
          <span style={{ color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            Single session (N=1), claude-sonnet-4.6 — with a modeled comparison. A direction, not a benchmark.
          </span>
        </div>
      </PageHeader>

      <Section title="Executive summary">
        <Prose>
          <p>
            In a 106.6-credit “plan, then implement a shopping cart” session, the
            planning phase was <strong>40.2 credits (38% of the run)</strong> — and{" "}
            <strong>71% of that was two sub-agents</strong> the planner sent to explore
            the codebase, not the plan it wrote. The new finding is what those
            sub-agents did with the money.
          </p>
          <p>
            They were handed overlapping briefs, so they{" "}
            <strong>independently read the same files</strong>: 7 of the 8 source files
            the second sub-agent read had already been read by the first — 94% of its
            read volume, duplicated. Yet the fan-out still bought something real: the
            two agents read ~51&nbsp;KB of source and handed back only ~9&nbsp;KB of
            summary, so the <strong>main thread’s permanent context grew ~2,300 tokens
            instead of ~12,700</strong>.
          </p>
          <p>
            That trade — pay credits now in a throwaway window to keep raw exploration{" "}
            <em>out</em> of the main thread’s growing prefix — is what a sub-agent
            really is. It’s a <strong>context loan, not a discount</strong>. And in this
            session, an optimistic single-threaded model comes out{" "}
            <strong>~7–8 credits cheaper</strong>: the loan’s overhead beat what it
            saved on context growth over a session this short.
          </p>
        </Prose>
        <Callout tone="info" label="Headline">
          A sub-agent is a context loan: it pays credits now to keep exploration out of
          your main thread. Overlapping briefs are the interest you pay for nothing.
        </Callout>
      </Section>

      <Section title="Where the 106.6 credits went">
        <Prose>
          <p>
            The plan wasn’t a cheap thinking step. It was a fan-out: two parallel
            sub-agents (<code>p0</code>, <code>p1</code>), ~6 model calls each, then a
            synthesis turn (<code>p2</code>) that wrote the actual plan.
          </p>
        </Prose>
        <PhaseSplitBar />
      </Section>

      <Section title="The two sub-agents read the same files">
        <Prose>
          <p>
            Both explorers were told, in effect, “go look at the frontend.” With
            overlapping briefs and no coordination, they re-read the same core files
            independently — each in its own window, each paying to load them.
          </p>
        </Prose>
        <OverlapDiagram />
      </Section>

      <Section title="But the fan-out compresses — that’s its real value">
        <Prose>
          <p>
            A sub-agent runs in its <em>own</em> context. Its file reads land in{" "}
            <em>its</em> prefix and are summarized back to the parent — the raw bytes
            never enter the main thread, which re-reads its prefix on every later call
            (experiment&nbsp;05).
          </p>
        </Prose>
        <CompressionBars />
      </Section>

      <Section title="Sub-agents vs. doing it in the main thread">
        <Prose>
          <p>
            What if the main thread had explored the files itself — no sub-agents,
            reading each unique file once? Using the session’s real sonnet-4.6 rates:
          </p>
        </Prose>
        <CounterfactualBars />
        <Table
          minWidth={560}
          head={["Path", "Discovery", "Context-carry tax", "Total"]}
          rows={[
            ["Actual — two sub-agents", "28.7 cr", "+2.2 cr", "~30.9 cr"],
            ["Modeled — single thread", "~13.2 cr", "+9.9 cr", "~23.1 cr"],
          ]}
        />
        <Callout tone="warning" label="What this is, and isn’t">
          This is a cost <em>model</em>, not a second measured run. It assumes the main
          thread would read each file once and synthesize in one pass — a best case.
          The defensible claim is narrow: <strong>sub-agent fan-out is not
          automatically cheaper, and on a short session it can cost more.</strong> The
          break-even — where keeping ~10,000 tokens out of the prefix pays for itself —
          is around ~45 later main-thread calls; this run had ~20.
        </Callout>
      </Section>

      <Section title="Key findings">
        <BulletList
          items={[
            "A “plan” is a fan-out, not a step. 71% of the 40.2-credit planning bill (28.7 cr) was two exploration sub-agents, not the 11.5-credit plan text.",
            "The two sub-agents overlapped almost completely. 7 of the 8 source files p1 read were already read by p0 — 94% of p1’s read byte volume (23,158 of 24,695 B). p1 even read Products.tsx and config.ts twice.",
            "Sub-agents compress hard — that’s their value. ~51 KB of unique source in, ~9 KB (~2,286 tok) of summary out. The main thread’s prefix grew ~2,300 tokens instead of ~12,700, a ~5.6× reduction in what it carried forward.",
            "The fan-out did not save credits here. An optimistic single-threaded model is ~23 cr vs the fan-out’s ~31 cr. The loan’s overhead beat its savings in a session this short; break-even is ~45 later calls.",
          ]}
        />
      </Section>

      <Section title="Interpretation">
        <Prose>
          <p>
            The useful way to think about a sub-agent is a <strong>context loan</strong>.
            It lets the main thread borrow a clean prefix: heavy exploration happens
            off-book, in a window you throw away, and only a compact summary comes back.
            Like any loan it has interest — the fixed cost of running the agent, plus
            whatever the agents duplicate among themselves. You come out ahead only if
            the context it spared you re-reading, over all the calls that follow, is
            worth more than that interest.
          </p>
          <p>
            That reframes both levers. <strong>Overlapping sub-agents are pure waste</strong>{" "}
            — two agents re-reading the same seven files is interest with no principal.
            And <strong>a sub-agent on a short task may never break even</strong> — the
            loan pays off across many later calls, and a quick session doesn’t have them.
            The fan-out here was a reasonable <em>planning</em> move (it kept the plan
            thread clean and reviewable) but a <em>credit-negative</em> one, and both are
            true at once. It also loops back to context quality (experiment&nbsp;01): the
            cheapest exploration is the one that never happens.
          </p>
        </Prose>
      </Section>

      <Section title="Practical guidance">
        <BulletList
          items={[
            "Don’t reach for sub-agents to save credits — reach for them to protect context. Their payoff is a clean main thread that compounds over a long session, not a discount on a short one. Here the fan-out cost ~7–8 credits more than doing the work inline.",
            "Give sub-agents narrow, non-overlapping briefs. Two agents told to “explore the frontend” re-read the same files — 94% overlap here. “Look at routing” + “look at the cart components” explores each file once.",
            "Front-load the files you already know matter. Named context means the planner doesn’t dispatch explorers to rediscover what you could have pointed at — no exploration, no loan, no interest (experiment 01).",
            "Budget for planning; don’t optimize it away. The plan made implementation orderly and reviewable. The goal is to know it costs real credits (~40 here), most of it exploration, not thinking.",
          ]}
        />
      </Section>

      <Section title="Confidence">
        <Prose>
          <p>
            <strong>Medium-Low — single session (N=1), with a modeled comparison.</strong>{" "}
            The measured facts come directly from one export
            (<code>04-plan-implement-cart.json</code>): the 40.2 / 66.4 phase split
            (consistent, 40.2 + 66.4 = 106.6), the 94% file overlap, the ~5.6× summary
            compression, and the 28.7-credit sub-agent cost.
          </p>
          <p>
            Caveats: the single-threaded comparison is a <strong>model, not a
            measurement</strong> — it assumes a best case (each file read once, one
            synthesis pass) and is most sensitive to how much output the main thread
            would need, so a few thousand extra output tokens would erase the 7–8 credit
            gap. The ~45-call break-even is set by this run’s token geometry, not a
            universal threshold. The 106.6 headline is a <strong>lower bound</strong>:
            ~1,250 tokens of extended-thinking output (~1.9 cr) are under-counted. Treat
            the <em>direction</em> — a plan is an overlapping fan-out, and the fan-out is
            a context loan that doesn’t always pay off — as the finding, not the exact
            numbers.
          </p>
        </Prose>
      </Section>

      <Section title="Evidence">
        <Prose>
          <p>
            Primary export: <code>04-plan-implement-cart.json</code> (7.5 MB). The
            overlap, compression, and phase costs are measured per prompt and per call
            from the digest; the single-threaded path is computed from the session’s own
            sonnet-4.6 rates (cache-read 0.03, cache-write 0.375, output 1.5 credits per
            1K tokens). Regenerate any measured number with:
          </p>
        </Prose>
        <Pre>
{`node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout`}
        </Pre>
        <Prose>
          <p style={{ marginTop: theme.space.md }}>
            Read <code>prompts[].credits</code> / <code>filesTouched</code> /{" "}
            <code>spawnedSubagents</code>, per-call <code>timeline[]</code>
            (<code>promptTokens</code>, <code>cachedTokens</code>,{" "}
            <code>cacheCreationTokens</code>, <code>credits</code>), and{" "}
            <code>rollups.cost.thinkingUnderCount</code>. Key refs: sub-agents{" "}
            <code>p0</code> (16.8 cr) and <code>p1</code> (11.9 cr); 7-file overlap in
            their <code>filesTouched</code>; summaries returned at <code>p2.l0</code>{" "}
            (4,239 B) and <code>p2.l1</code> (4,903 B).
          </p>
        </Prose>
      </Section>

      <Section title="LinkedIn draft">
        <Pre>
{`The agent spawned two sub-agents to plan a feature. They both read the same seven files.

I measured a "plan, then implement a shopping cart" session in GitHub Copilot.
Total: 106.6 credits. Planning was 40.2 of them (38%) — and 71% of that was two
sub-agents the planner sent to explore the codebase, not the plan it wrote.

Here's the part that surprised me. The two explorers had overlapping briefs, so
they independently read the same files: 7 of the 8 source files the second one
read had already been read by the first. 94% duplicated.

So are sub-agents a waste? Not exactly. They compress: those two agents read
~51KB of code and handed back ~9KB of summary. The main thread's context grew
~2,300 tokens instead of ~12,700 — and that prefix gets re-read on every later
call.

That's the real mental model: a sub-agent is a context LOAN, not a discount. It
pays credits now, in a throwaway window, to keep raw exploration out of your main
thread. You only come out ahead if the context it spared you re-reading, over all
the calls that follow, beats the cost of running it.

In this short session, it didn't. An optimistic single-threaded version comes out
~7–8 credits cheaper — the loan's interest (two agents, 94% overlap) beat what it
saved. Break-even was ~45 later calls; this run had ~20.

Takeaways for your sessions:
- Reach for sub-agents to protect context on long work, not to save credits on
  short tasks.
- Give them narrow, non-overlapping briefs — "routing" + "cart components", not
  "the frontend" twice.
- Front-load the files you already know matter, so there's nothing to explore.

(Single session, N=1, plus a model for the comparison — a direction, not a benchmark.)`}
        </Pre>
      </Section>

      <Section title="Video outline">
        <Prose>
          <p>60–90 second LinkedIn video:</p>
        </Prose>
        <BulletList
          items={[
            "Open the cart run in Copilot Ledger; show the total: 106.6 credits, planning 40.2 (38%).",
            "Point at the plan turn and its two spawned sub-agents in the timeline.",
            "Put the overlap on screen: 7 of 8 files read by both — 94% duplicated.",
            "Flip it: the two agents read ~51KB, returned ~9KB — the main thread grew 2.3K not 12.7K.",
            "Say the model plainly: a sub-agent is a context loan. Pay now, keep the main thread clean later.",
            "Show the comparison: fan-out ~31 cr vs single-thread ~23 cr — it didn’t pay off in a session this short (break-even ~45 calls).",
            "End with: use sub-agents to protect context, give them non-overlapping briefs, and front-load the files you already know.",
          ]}
        />
      </Section>
    </div>
  );
}
