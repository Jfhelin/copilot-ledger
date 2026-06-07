import { theme } from "../lib/theme.js";
import { PageHeader, Section, Prose, Badge, Callout, Pre, TextLink } from "../components/ui.jsx";
import { STATUS_TONE } from "../content/site.js";

// Per-model-call prefix-token curve for 04-plan-implement-cart.json
// (claude-sonnet-4.6, 34 model calls). Measured from the digest:
//   node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout
// p0/p1 are exploration sub-agents (their own windows); p2 is the plan main
// thread; p3 is the implement main thread — the clean monotonic growth.
var CURVE = [
  { ref: "p0.l2", phase: "p0", pt: 20132, hit: 98, cr: 1.7 },
  { ref: "p0.l9", phase: "p0", pt: 22776, hit: 88, cr: 2.1 },
  { ref: "p0.l13", phase: "p0", pt: 23285, hit: 98, cr: 1.4 },
  { ref: "p0.l17", phase: "p0", pt: 30731, hit: 76, cr: 4.3 },
  { ref: "p0.l23", phase: "p0", pt: 36442, hit: 84, cr: 3.5 },
  { ref: "p0.l26", phase: "p0", pt: 37540, hit: 97, cr: 3.9 },
  { ref: "p1.l0", phase: "p1", pt: 19551, hit: 98, cr: 0.9 },
  { ref: "p1.l3", phase: "p1", pt: 19775, hit: 99, cr: 0.8 },
  { ref: "p1.l5", phase: "p1", pt: 19883, hit: 100, cr: 1.1 },
  { ref: "p1.l9", phase: "p1", pt: 23751, hit: 84, cr: 2.7 },
  { ref: "p1.l14", phase: "p1", pt: 27514, hit: 86, cr: 2.6 },
  { ref: "p1.l18", phase: "p1", pt: 28245, hit: 97, cr: 3.6 },
  { ref: "p2.l2", phase: "p2", pt: 30363, hit: 88, cr: 3.4 },
  { ref: "p2.l5", phase: "p2", pt: 32898, hit: 92, cr: 4.9 },
  { ref: "p2.l7", phase: "p2", pt: 34905, hit: 94, cr: 3.3 },
  { ref: "p3.l0", phase: "p3", pt: 49401, hit: 19, cr: 15.7 },
  { ref: "p3.l2", phase: "p3", pt: 49739, hit: 99, cr: 2.0 },
  { ref: "p3.l4", phase: "p3", pt: 49995, hit: 100, cr: 1.8 },
  { ref: "p3.l6", phase: "p3", pt: 50756, hit: 99, cr: 2.3 },
  { ref: "p3.l8", phase: "p3", pt: 51123, hit: 99, cr: 2.2 },
  { ref: "p3.l12", phase: "p3", pt: 53512, hit: 96, cr: 3.0 },
  { ref: "p3.l15", phase: "p3", pt: 55878, hit: 96, cr: 3.7 },
  { ref: "p3.l17", phase: "p3", pt: 56720, hit: 99, cr: 2.3 },
  { ref: "p3.l19", phase: "p3", pt: 56972, hit: 100, cr: 6.3 },
  { ref: "p3.l21", phase: "p3", pt: 60068, hit: 95, cr: 3.2 },
  { ref: "p3.l23", phase: "p3", pt: 60318, hit: 100, cr: 2.7 },
  { ref: "p3.l25", phase: "p3", pt: 60866, hit: 99, cr: 2.4 },
  { ref: "p3.l27", phase: "p3", pt: 61114, hit: 100, cr: 3.3 },
  { ref: "p3.l29", phase: "p3", pt: 62118, hit: 98, cr: 2.6 },
  { ref: "p3.l31", phase: "p3", pt: 62364, hit: 100, cr: 3.1 },
  { ref: "p3.l33", phase: "p3", pt: 63195, hit: 99, cr: 2.5 },
  { ref: "p3.l35", phase: "p3", pt: 63439, hit: 100, cr: 2.4 },
  { ref: "p3.l37", phase: "p3", pt: 63951, hit: 99, cr: 2.4 },
  { ref: "p3.l39", phase: "p3", pt: 64202, hit: 100, cr: 2.5 },
];

var PHASE_COLOR = {
  p0: theme.cost.ctxSystem,
  p1: theme.cost.ctxSystem,
  p2: theme.cost.cwrite,
  p3: theme.cost.cached,
};

var PHASE_LABEL = {
  p0: "Sub-agent (own window)",
  p1: "Sub-agent (own window)",
  p2: "Plan — main thread",
  p3: "Implement — main thread",
};

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

// Prefix-token growth across all 34 model calls. Sub-agent points sit lower and
// dip independently (their own windows); the main thread (p2 -> p3) is the
// monotonic line, with a labelled cold-write spike at p3.l0.
function GrowthChart() {
  var W = 680, H = 300;
  var padL = 52, padR = 16, padT = 16, padB = 40;
  var plotW = W - padL - padR, plotH = H - padT - padB;
  var n = CURVE.length;
  var yMax = 70000;
  var x = function (i) { return padL + (n === 1 ? 0 : (i / (n - 1)) * plotW); };
  var y = function (v) { return padT + plotH - (v / yMax) * plotH; };

  var mainPts = CURVE
    .map(function (d, i) { return { d: d, i: i }; })
    .filter(function (o) { return o.d.phase === "p2" || o.d.phase === "p3"; });
  var mainPath = mainPts
    .map(function (o, k) { return (k === 0 ? "M" : "L") + x(o.i).toFixed(1) + "," + y(o.d.pt).toFixed(1); })
    .join(" ");

  var spike = CURVE.findIndex(function (d) { return d.ref === "p3.l0"; });
  var gridVals = [0, 20000, 40000, 60000];

  return (
    <div style={{ marginTop: theme.space.lg }}>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={"0 0 " + W + " " + H} width="100%" role="img"
          aria-label="Prefix tokens per model call, rising from about 19,500 to 64,200 across the session"
          style={{ maxWidth: W, display: "block" }}>
          {gridVals.map(function (gv) {
            return (
              <g key={gv}>
                <line x1={padL} y1={y(gv)} x2={W - padR} y2={y(gv)} stroke={theme.border.subtle} strokeWidth="1" />
                <text x={padL - 8} y={y(gv) + 4} textAnchor="end" fontSize="11" fill={theme.text.dim}>
                  {gv === 0 ? "0" : (gv / 1000) + "K"}
                </text>
              </g>
            );
          })}
          <path d={mainPath} fill="none" stroke={theme.cost.cached} strokeWidth="2" strokeLinejoin="round" />
          {CURVE.map(function (d, i) {
            var isSpike = i === spike;
            return (
              <circle key={d.ref} cx={x(i)} cy={y(d.pt)} r={isSpike ? 5 : 3.5}
                fill={PHASE_COLOR[d.phase]}
                stroke={isSpike ? theme.cost.missAccent : "none"} strokeWidth={isSpike ? 2 : 0} />
            );
          })}
          {spike >= 0 ? (
            <g>
              <line x1={x(spike)} y1={y(CURVE[spike].pt) - 10} x2={x(spike)} y2={y(CURVE[spike].pt) - 34}
                stroke={theme.cost.missAccent} strokeWidth="1" />
              <text x={x(spike)} y={y(CURVE[spike].pt) - 40} textAnchor="middle" fontSize="11"
                fontWeight="700" fill={theme.cost.missAccent}>
                p3.l0 cold write — 15.7 cr (19% hit)
              </text>
            </g>
          ) : null}
          <text x={padL} y={H - 12} fontSize="11" fill={theme.text.dim}>first call</text>
          <text x={W - padR} y={H - 12} textAnchor="end" fontSize="11" fill={theme.text.dim}>last call</text>
        </svg>
      </div>
      <div style={{ display: "flex", gap: theme.space.lg, flexWrap: "wrap", marginTop: theme.space.sm }}>
        <LegendDot color={theme.cost.ctxSystem}>Sub-agent (own window)</LegendDot>
        <LegendDot color={theme.cost.cwrite}>Plan — main thread</LegendDot>
        <LegendDot color={theme.cost.cached}>Implement — main thread</LegendDot>
      </div>
    </div>
  );
}

// Where the 106.6 credits went: re-reading the grown prefix (cache-read)
// outweighed the model's own output.
function CostBucketBar() {
  var buckets = [
    { label: "Cache-read (re-sending the grown prefix)", cr: 42.4, color: theme.cost.cached },
    { label: "Cache-write (first write of each new chunk)", cr: 33.7, color: theme.cost.cwrite },
    { label: "Model output", cr: 30.5, color: theme.cost.output },
  ];
  var total = 106.6;
  return (
    <div style={{ marginTop: theme.space.lg }}>
      <div style={{ display: "flex", width: "100%", height: 40, borderRadius: theme.radius.md, overflow: "hidden", border: "1px solid " + theme.border.subtle }}>
        {buckets.map(function (b) {
          var pct = (b.cr / total) * 100;
          return (
            <div key={b.label} title={b.label + ": " + b.cr + " cr"}
              style={{ width: pct + "%", background: b.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#0b0f17", fontWeight: 700, fontSize: theme.fontSize.sm }}>
              {Math.round(pct)}%
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: theme.space.lg, flexWrap: "wrap", marginTop: theme.space.md }}>
        {buckets.map(function (b) {
          return <LegendDot key={b.label} color={b.color}>{b.label} — <strong>{b.cr} cr</strong></LegendDot>;
        })}
      </div>
    </div>
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

export default function ContextGrowth() {
  return (
    <div>
      <div style={{ marginBottom: theme.space.lg }}>
        <TextLink to="/experiments">← All experiments</TextLink>
      </div>

      <PageHeader kicker="Experiment" title="Context only grows. Re-reading it was 40% of my Copilot session.">
        <div style={{ display: "flex", gap: theme.space.md, alignItems: "center", marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <Badge tone={STATUS_TONE.Published}>Published</Badge>
          <span style={{ color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            Single session (N=1), claude-sonnet-4.6 — a direction, not a benchmark.
          </span>
        </div>
      </PageHeader>

      <Section title="Executive summary">
        <Prose>
          <p>
            In one “plan, then implement a shopping cart” session, the conversation the main
            agent carried grew from <strong>~19,500 tokens early on to ~64,200 on its last call</strong>
            — it more than <strong>tripled</strong>, and within the main thread it never shrank.
            Inside the implementation turn alone the prefix climbed{" "}
            <strong>49,401 → 64,202 tokens</strong> across 20 model calls.
          </p>
          <p>
            The surprise: even at a <strong>94% cache hit</strong>, <em>re-reading</em> that
            ever-growing context was the single largest cost line in the whole session —{" "}
            <strong>42.4 of 106.6 credits (40%)</strong>, more than the model’s actual output
            (30.5 credits, 29%). Context growth isn’t a token-count curiosity; it’s a per-call
            tax that rises as the session goes on.
          </p>
        </Prose>
        <Callout tone="info" label="Headline">
          The agent spent more re-reading what it already knew (42.4 cr) than producing new
          output (30.5 cr).
        </Callout>
      </Section>

      <Section title="The growth curve — prefix tokens per model call">
        <Prose>
          <p>
            Every dot is one model call. The main thread (<code>p2 → p3</code>) only climbs —
            from ~30K to 64.2K tokens — and never comes back down. The two exploration
            sub-agents (<code>p0</code>, <code>p1</code>) ran in their <em>own</em> windows, so
            they sit lower and dip independently; the monotonic growth is the main conversation.
            The labelled spike is the Plan→Agent mode switch: a single cold cache write of the
            whole ~40K prefix.
          </p>
        </Prose>
        <GrowthChart />
        <Prose>
          <p style={{ marginTop: theme.space.lg }}>
            Watch <code>p3.l4</code> and <code>p3.l35</code>: both did the same trivial thing —
            read a file, adding ~250 tokens — yet the later one cost more. The only thing that
            changed was that the agent was now carrying 13K more tokens of history, and
            re-reading it cost ~0.4 credits more, on every call.
          </p>
        </Prose>
        <Table
          head={["Call", "Doing", "Prompt tok", "New written", "Re-read cost", "Total"]}
          rows={[
            ["p3.l0", "mode switch, cold write", "49,401", "39,952", "0.3 cr", "15.7 cr"],
            ["p3.l4", "read a file (+256 tok)", "49,995", "256", "1.5 cr", "1.8 cr"],
            ["p3.l21", "edit (+3,096 tok)", "60,068", "3,096", "1.8 cr", "3.2 cr"],
            ["p3.l35", "read a file (+244 tok)", "63,439", "244", "1.9 cr", "2.4 cr"],
            ["p3.l39", "final file read (+251 tok)", "64,202", "251", "1.9 cr", "2.5 cr"],
          ]}
        />
      </Section>

      <Section title="Where the 106.6 credits went">
        <Prose>
          <p>
            Split by what each token was billed as, re-reads out-weighed everything the model
            actually wrote:
          </p>
        </Prose>
        <CostBucketBar />
      </Section>

      <Section title="Key findings">
        <BulletList
          items={[
            "Context only grows in the main thread (N=1). The prefix went from 19,551 tokens (the lowest point) to 64,202 (the last call) — a 3.3× increase — and never decreased: there was no compaction, so every tool result stayed in the window for the rest of the run.",
            "The implementation turn's prefix grew 30% mid-turn. Within p3 the prompt climbed 49,401 → 64,202 tokens over 20 calls (+14,801), purely from the files it read and the edits it made accreting into history.",
            "Re-reading that context was the #1 cost line — 40% of the session. Of 106.6 credits: cache-read 42.4 (40%), cache-write 33.7 (32%), output 30.5 (29%).",
            "The per-call floor rises as context grows. A near-trivial call that wrote only ~250 new tokens still cost ~1.5 credits to re-read a 50K prefix early in the turn, climbing to ~1.9 credits to re-read the 64K prefix by the end — a ~29% increase in the unavoidable cost of doing anything.",
            "Growth is paid once per chunk, then re-read forever. Each new piece of context is written to cache once and then re-read on every subsequent call. In p3, ~14,800 tokens of new content were written across the turn — cheap individually, but re-read 1–19 more times each.",
          ]}
        />
      </Section>

      <Section title="What the prefix was made of">
        <Prose>
          <p>
            Start vs. end of the implement turn. The fixed parts (system + tool defs) don’t move —
            <em> what grows is the conversation</em>, and it does nothing but grow:
          </p>
        </Prose>
        <Table
          head={["Component", "p3.l0 (start)", "p3.l39 (end)"]}
          rows={[
            ["Shared system / scaffolding (from #08)", "~9,680", "~9,680"],
            ["Tool definitions", "14,606", "14,606"],
            ["Accumulated conversation (history)", "~25,115", "~39,916"],
            ["Total prompt", "49,401", "64,202"],
          ]}
        />
      </Section>

      <Section title="Interpretation">
        <Prose>
          <p>
            The intuition “caching makes context size free” is the half-truth here. Caching makes
            context <em>re-reads</em> cheap — about a tenth of fresh price — but it does not make
            them free, and it does not stop the prefix from growing. A tenth of 50K is small; a
            tenth of 64K is bigger; and you pay it on <strong>every single call</strong>, whether
            that call does real work or just reads one more file.
          </p>
          <p>
            That’s why re-reads (42.4 cr) out-weighed output (30.5 cr). The agent wasn’t expensive
            because it wrote a lot — its output was the <em>smallest</em> of the three buckets. It
            was expensive because it had to re-read an ever-larger context to write anything at all.
            A short session pays that floor a few times; a long one pays a <em>higher</em> floor
            many times. The two are not the same shape.
          </p>
        </Prose>
      </Section>

      <Section title="Practical guidance">
        <BulletList
          items={[
            "Avoid excessive context — it’s re-read, not just stored. Every file the agent pulls in joins the prefix and is re-billed (at cache-read rate) on every later call. Trimming what the agent loads cuts a recurring cost, not a one-time one.",
            "Front-load the right context so the agent fetches less. Discovery doesn’t just cost its round trips; what it discovers swells the prefix for the rest of the run (see experiment 01).",
            "Compact deliberately on genuinely long sessions. Compaction is the one lever that makes the prefix shrink. It isn’t free — it’s a model call and it invalidates the cache (experiment 08) — but once history is large and mostly stale, resetting to a smaller prefix lowers the floor under every future call. On a short session it costs more than it saves.",
            "Don’t assume “cached” means “size-independent.” The per-call floor here rose ~29% (≈1.5 → 1.9 cr) just from carrying more history.",
            "Let sub-agents absorb heavy exploration. Their fan-out reads land in their window, not the parent’s, so they keep large transient context out of the main conversation’s permanent prefix (see experiments 06 and 08).",
          ]}
        />
      </Section>

      <Section title="Confidence">
        <Prose>
          <p>
            <strong>Medium-Low — single session (N=1).</strong> Every figure is measured directly
            from one export (<code>04-plan-implement-cart.json</code>) and the components are
            internally consistent (cache-read 42.4 + cache-write 33.7 + output 30.5 = 106.6;
            planning 40.2 + implement 66.4 = 106.6). The 106.6 headline is a <strong>lower
            bound</strong>: ~1,250 tokens of extended-thinking output (~1.9 credits) are
            under-counted; this does not change the 40% re-read share materially. Treat the{" "}
            <em>direction</em> — context grows monotonically and re-reading it is a first-class,
            rising cost — as the finding, not the exact split.
          </p>
        </Prose>
      </Section>

      <Section title="Evidence">
        <Prose>
          <p>
            Primary export: <code>04-plan-implement-cart.json</code> (7.5 MB). The growth curve
            and cost split above are measured per call from the digest. Regenerate any number with:
          </p>
        </Prose>
        <Pre>
{`node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout`}
        </Pre>
        <Prose>
          <p style={{ marginTop: theme.space.md }}>
            Read per-request <code>timeline[]</code> (<code>promptTokens</code>,{" "}
            <code>cachedTokens</code>, <code>cacheCreationTokens</code>,{" "}
            <code>cachedReadUsd</code>, <code>credits</code>,{" "}
            <code>toolDefsApproxTokens</code>) plus <code>rollups.cost</code>. Key refs: prefix
            floor <code>p1.l0</code> (19,551 tok) → last call <code>p3.l39</code> (64,202 tok);
            trivial-call floor <code>p3.l4</code> (1.5 cr re-read) vs <code>p3.l35</code> (1.9 cr);
            cold mode-switch write <code>p3.l0</code> (15.7 cr).
          </p>
        </Prose>
      </Section>

      <Section title="LinkedIn draft">
        <Pre>
{`Context only grows. Re-reading it was 40% of my Copilot session.

I measured a "plan, then implement a shopping cart" run in GitHub Copilot.
106.6 credits total. Here's where they actually went:

- Re-reading the accumulated context: 42.4 credits (40%)
- Writing new context to cache: 33.7 credits (32%)
- The model's actual output: 30.5 credits (29%)

The agent spent more re-reading what it already knew than producing new output.

Why? The conversation the main agent carries only grows. It bottomed out around
~19,500 tokens early on and finished at ~64,200 — more than triple, and within the
main thread it never shrank. Every file it read and every edit it made stayed in the
prefix and got re-sent on every later call.

Caching helps — re-reads run at ~10% of fresh price. But 10% of a prefix that keeps
growing is a bill that keeps growing too. Two calls did the exact same trivial thing
(read one file, +250 tokens). The later one cost ~0.4 credits more — purely because it
was now hauling 13K more tokens of history.

"Cached" doesn't mean "size doesn't matter." The floor under every call rises as
context grows.

The takeaway: avoid excessive context (it's re-read, not just stored), front-load the
right files so the agent fetches less, and compact deliberately on long sessions — the
one lever that makes the prefix shrink.

(Single session, N=1 — a direction, not a benchmark.)`}
        </Pre>
      </Section>

      <Section title="Video outline">
        <Prose>
          <p>60–90 second LinkedIn video:</p>
        </Prose>
        <BulletList
          items={[
            "Open the cart run in Copilot Ledger. Point at the main thread's lowest call (~19,500 tokens) and its last (~64,200) — more than triple, never shrank.",
            "Step through the implement turn and watch the prefix climb 49K → 64K while cache hit stays ~99%.",
            "Put the cost split on screen: re-read 42.4 cr vs output 30.5 cr.",
            "Land the kicker: two calls did the same trivial file read, but the later one cost more — it was carrying 13K more history.",
            "Explain it: caching makes re-reads cheap (~10%), not free, and the prefix only grows, so the floor under every call rises.",
            "Takeaway: avoid excessive context, front-load the right files, compact long sessions. End on “cached doesn't mean free.”",
          ]}
        />
      </Section>
    </div>
  );
}
