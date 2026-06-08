import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";
import { PageHeader, Section, Prose, Badge, Callout, TextLink, Pre } from "../components/ui.jsx";
import { BarChart } from "../components/charts.jsx";
import { STATUS_TONE } from "../content/site.js";

var SONNET_REPORT = "/reports/model-choice-sonnet";
var HAIKU_REPORT = "/reports/model-choice-haiku";

function BulletList({ items }) {
  return (
    <ul style={{ margin: 0, marginTop: theme.space.md, paddingLeft: theme.space.xxl, color: theme.text.secondary, fontSize: theme.fontSize.md, lineHeight: 1.7 }}>
      {items.map(function (item, i) {
        return <li key={i} style={{ marginBottom: theme.space.sm }}>{item}</li>;
      })}
    </ul>
  );
}

function ReportButton({ to, children }) {
  return (
    <a
      href={hrefFor(to)}
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

export default function ModelChoice() {
  return (
    <div>
      <div style={{ marginBottom: theme.space.lg }}>
        <TextLink to="/experiments">← All experiments</TextLink>
      </div>

      <PageHeader kicker="Experiment" title="Same task. Half the credits. More of it done. I changed the model.">
        <div style={{ display: "flex", gap: theme.space.md, alignItems: "center", marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <Badge tone={STATUS_TONE.Published}>Published</Badge>
          <span style={{ color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            One task per arm (N=1). Credits, tool calls, output and cache are digest-measured; the symbol-completeness grade is from a prior published review, not the digest.
          </span>
        </div>
      </PageHeader>

      <Section title="Executive summary">
        <Prose>
          <p>
            GitHub’s top two cost levers are <em>choose the right model</em> and
            <em> use Auto Mode</em> — two answers to the same question:{" "}
            <strong>which model runs your turn?</strong> I ran one real job —
            <em> add JSDoc to every exported symbol in a repository</em>
            {" "}(<code>/test-mcp-audit-jsdoc</code>, ~24 symbols) — twice,
            changing nothing but the worker model, and digested both exports.
          </p>
          <p>
            <code>claude-sonnet-4.5</code> cost <strong>20.7 credits</strong> and
            documented 16 of ~24 symbols. <code>claude-haiku-4.5</code> cost
            <strong> 10.5 credits</strong> and documented all 24. The lighter
            model was <strong>~49% cheaper</strong> <em>and</em> more complete —
            roughly <strong>3× the documented-symbols-per-credit</strong>. On a
            mechanical, well-specified task the heavy model’s per-token premium
            bought nothing but a bigger bill and a third of the job left undone.
          </p>
        </Prose>
      </Section>

      <Section title="The headline — credits for the same task">
        <BarChart
          ariaLabel="Credits for the same JSDoc task: claude-sonnet-4.5 cost 20.7 credits, claude-haiku-4.5 cost 10.5 credits"
          max={22}
          data={[
            { label: "claude-sonnet-4.5 (heavy)", value: 20.7, display: "20.7 cr", color: theme.cost.cwrite },
            { label: "claude-haiku-4.5 (light)", value: 10.5, display: "10.5 cr", color: theme.accent.primary, sublabel: "−49%" },
          ]}
          caption="Total credits for the identical task. Swapping the worker model from Sonnet to Haiku halved the bill — no prompt or repo change."
        />
      </Section>

      <Section title="The twist — cheaper was also more complete">
        <Prose>
          <p>
            The intuition is that a lighter model saves money by doing less. Here
            it did <em>more</em>: more tool calls (16 vs 9), more output (7,544 vs
            5,760 tokens), and — on the prior published quality review of these
            same runs (not a digest field) — full coverage.
          </p>
        </Prose>
        <BarChart
          ariaLabel="Symbols documented: Sonnet 16 of 24, Haiku 24 of 24"
          max={24}
          data={[
            { label: "claude-sonnet-4.5", value: 16, display: "16 / 24", color: theme.accent.warning, sublabel: "a third left undone" },
            { label: "claude-haiku-4.5", value: 24, display: "24 / 24", color: theme.accent.success, sublabel: "complete" },
          ]}
          caption="Exported symbols actually documented (graded externally, not from the digest). The cheaper model finished the job; the heavier one didn’t."
        />
        <BarChart
          ariaLabel="Documented symbols per credit: Sonnet 0.77, Haiku 2.29 — about three times more"
          max={2.5}
          data={[
            { label: "claude-sonnet-4.5", value: 0.77, display: "0.77 / cr", color: theme.accent.warning },
            { label: "claude-haiku-4.5", value: 2.29, display: "2.29 / cr", color: theme.accent.success, sublabel: "~3×" },
          ]}
          caption="Documented symbols per credit (16/20.7 vs 24/10.5). Combining cost and completeness, Haiku returned ~3× the value per credit on this task."
        />
      </Section>

      <Section title="The two runs, side by side">
        <Table
          head={["Arm", "Model", "Credits", "Tool calls", "Output tok", "Cache hit", "Symbols*"]}
          rows={[
            ["Heavy", "claude-sonnet-4.5", "20.7", "9", "5,760", "67%", "16 / 24"],
            ["Light", "claude-haiku-4.5", "10.5", "16", "7,544", "68%", "24 / 24"],
          ]}
        />
        <Prose>
          <p style={{ marginTop: theme.space.md, color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            * Credits, tool calls, output and cache are from our digest; the
            symbols-documented grade is from the prior published quality review of
            these same runs, not the digest.
          </p>
        </Prose>
      </Section>

      <Section title="Key findings">
        <Callout tone="info" label="Key finding">
          The worker model is the biggest cost dial you have. Here a single swap
          was a 2× swing on identical work — far more than any prompt-level tweak.
        </Callout>
        <BulletList
          items={[
            "Switching the worker halved the bill (measured): 20.7 cr on Sonnet → 10.5 cr on Haiku, a 49% reduction, with nothing else changed.",
            "Cheaper was also more complete here: Haiku ran more tool calls and more output and documented 24/24 symbols vs Sonnet’s 16/24 (completeness graded externally).",
            "Every session already runs two models: even a one-word turn routes title/categorization to gpt-4o-mini and the answer to your chosen worker — model routing is already happening under you.",
            "Auto Mode adds a flat 10% discount on top (a documented 0.9× credit multiplier), before any routing benefit. This page does not test Auto’s routing quality.",
          ]}
        />
      </Section>

      <Section title="Why it happened">
        <Prose>
          <p>
            JSDoc-ing exported symbols is rote, local and low-ambiguity — exactly
            the kind of work that doesn’t need a frontier reasoning model. The
            heavy model’s per-token premium is justified when a turn needs hard
            reasoning; here it just re-billed the cached prefix at a higher rate on
            every call (see <TextLink to="/experiments/cache-behavior">Cache
            Behavior</TextLink>) and still stopped short of the full set.
          </p>
          <p>
            The honest boundary: this is one task of a type that favors a light
            model. A harder, more exploratory task could invert it — a too-light
            model that flails would burn its saving in extra round trips. That’s
            why Auto Mode is the pragmatic default: it routes per turn so you don’t
            have to pre-judge difficulty, and it bills at 0.9× on top.
          </p>
        </Prose>
      </Section>

      <Section title="Practical guidance">
        <BulletList
          items={[
            "Treat the worker model as a major cost dial — here it was a 2× swing on identical work, far more than a prompt tweak moves.",
            "Right-size, don’t max out: for mechanical, well-specified work a light model can be both cheaper and more complete.",
            "Use Auto Mode when you can’t predict difficulty — let the router pick per turn and bank the documented 10% (0.9×) discount.",
            "Watch the outcome, not just per-token price: judge by total credits AND whether the job was actually finished. On this task the light model won both.",
          ]}
        />
      </Section>

      <Section title="See the evidence">
        <Prose>
          <p>
            Both runs are pinned as read-only reports — same task, same repo, only
            the worker model differs. Open each to inspect the per-call cost and
            tool flow yourself.
          </p>
        </Prose>
        <div style={{ display: "flex", gap: theme.space.md, marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <ReportButton to={SONNET_REPORT}>Sonnet 4.5 run (20.7 cr)</ReportButton>
          <ReportButton to={HAIKU_REPORT}>Haiku 4.5 run (10.5 cr)</ReportButton>
        </div>
      </Section>

      <Section title="LinkedIn draft">
        <Pre>
{`Same task. Half the credits. More of it done. I changed one thing: the model.

I gave a Copilot agent one job — add JSDoc to every exported symbol in a repo — and ran it twice, changing nothing but the worker model. Then I digested both exports:

- claude-sonnet-4.5 → 20.7 credits, documented 16 of ~24 symbols.
- claude-haiku-4.5 → 10.5 credits, documented all 24.

The lighter model cost ~49% less AND finished the job. More tool calls, more output, less money. On a mechanical, well-specified task the heavy model's per-token premium bought nothing but a bigger bill and a third of the work left undone.

This is GitHub's #1 cost lever in one measurement: the worker model is the biggest dial you have, because it multiplies the price of every cached re-read on every turn — far more than any prompt tweak. "Choose the right model" isn't fussy advice; here it was a 2x swing on identical work.

The catch: this is the kind of task that favors a light model — rote and low-ambiguity. A harder, exploratory task could flip it. Which is why Auto Mode is the easy default: it routes per turn so you don't have to guess, and it bills at 0.9x — a flat 10% off — on top.

Single-session observation, not a universal benchmark. But the direction is hard to argue with.`}
        </Pre>
      </Section>

      <Section title="Video outline">
        <Prose>
          <p>60–120 second LinkedIn video, screen-recording the Copilot Ledger canvas:</p>
        </Prose>
        <BulletList
          items={[
            "0–10s — \u201cSame task. Half the credits. More of it done. I changed one thing — the model.\u201d Show both digests side by side.",
            "10–40s — The task: JSDoc every exported symbol. Sonnet → 20.7 cr, 16/24 symbols. Haiku → 10.5 cr, 24/24. Point at the credit totals and the coverage.",
            "40–75s — Counter-intuitive bit: the cheaper model made more tool calls and more output. Light model, more work, less money — on this kind of task.",
            "75–105s — The routing anchor: even a one-word \u201chi\u201d already runs two models. Model choice is routing the product already does; Auto extends it to the main call — and bills 10% less doing it.",
            "105–120s — Takeaway: \u201cThe worker model is your biggest cost dial. Right-size it for the task, or let Auto pick — just don\u2019t pay top-tier rates for rote work.\u201d",
          ]}
        />
      </Section>

      <Section title="Confidence">
        <Prose>
          <p>
            <strong>Medium — single-session per arm (N=1).</strong> Both arms are
            digest-measured on real exports of the identical task; the credit, tool,
            output and cache numbers are exact. The symbol-completeness grade
            (16/24 vs 24/24) is from a prior published quality review, not a digest
            field. This is one task of a type that favors a light model — not a
            universal “Haiku beats Sonnet” benchmark. The Auto 0.9× figure is a
            documented billing rule, not a captured A/B.
          </p>
        </Prose>
      </Section>
    </div>
  );
}
