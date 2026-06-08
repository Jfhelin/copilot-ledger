import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";
import { PageHeader, Section, Prose, Badge, Callout, Pre, TextLink } from "../components/ui.jsx";
import { BarChart, StackedBar } from "../components/charts.jsx";

function BulletList({ items }) {
  return (
    <ul style={{ margin: 0, marginTop: theme.space.md, paddingLeft: theme.space.xxl, color: theme.text.secondary, fontSize: theme.fontSize.md, lineHeight: 1.7 }}>
      {items.map(function (item, i) {
        return <li key={i} style={{ marginBottom: theme.space.sm }}>{item}</li>;
      })}
    </ul>
  );
}

function ReportButton({ route, tone, children }) {
  var secondary = tone === "secondary";
  return (
    <a
      href={hrefFor(route)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: theme.space.sm,
        background: secondary ? "transparent" : theme.accent.primary,
        color: secondary ? theme.accent.primary : "#ffffff",
        border: secondary ? "1px solid " + theme.accent.primary : "1px solid transparent",
        textDecoration: "none",
        fontWeight: 700,
        fontSize: theme.fontSize.md,
        padding: theme.space.md + "px " + theme.space.xl,
        borderRadius: theme.radius.lg,
        boxShadow: secondary ? "none" : theme.shadow.sm,
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
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
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

export default function AskVsAgentMode() {
  return (
    <div>
      <div style={{ marginBottom: theme.space.lg }}>
        <TextLink to="/experiments">← All experiments</TextLink>
      </div>

      <PageHeader
        kicker="Experiment"
        title="Ask mode isn't the cheaper mode. It's the colder one."
      >
        <div style={{ display: "flex", gap: theme.space.md, alignItems: "center", marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <Badge tone="info">Cache finding · reproduced across captures</Badge>
          <Badge tone="warning">Cost · single run per task (N=1)</Badge>
          <span style={{ color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            One mode switch changes two payload fields — and neither change is a discount.
          </span>
        </div>
        <blockquote
          style={{
            margin: 0,
            marginTop: theme.space.lg,
            paddingLeft: theme.space.lg,
            borderLeft: "3px solid " + theme.accent.primary,
            color: theme.text.primary,
            fontSize: theme.fontSize.lg,
            fontStyle: "italic",
          }}
        >
          “Switch to ask mode, it’s cheaper.” I read the actual requests Copilot sends in
          each mode. The mode you pick to save money is the one that can’t touch your
          code — and pays more cold starts.
        </blockquote>
      </PageHeader>

      <Section title="Executive summary">
        <Prose>
          <p>
            A claim circulates that <strong>ask mode</strong> is materially cheaper than{" "}
            <strong>agent mode</strong> in VS Code Copilot. I ran the same prompts both ways
            on the same model (<code>claude-sonnet-4.5</code>) and diffed the raw requests.
            The popular framing is backwards, and the reason is precise: flipping to ask mode
            changes <strong>exactly two fields</strong> in the payload — the system-prompt body
            and the tool array — and each one produces an effect, but neither effect is “cheaper.”
          </p>
          <p>
            <strong>One switch, two consequences.</strong> (1) Ask mode still explores: on a
            context-hungry question it fired <strong>13 tool calls</strong> on its own and cost
            <strong> more</strong> than agent. (2) Ask mode starts <strong>colder</strong>: its
            first model call inherited <strong>0</strong> cached tokens where agent mode inherited
            <strong> 9,680</strong>, because the default agent prefix is common enough to stay
            globally warm while ask’s rarer prefix isn’t. Agent mode was ≤ ask mode in every cell
            I measured.
          </p>
        </Prose>
        <Callout tone="info" label="Two claims, two confidence levels">
          The <strong>cache-likelihood</strong> finding (“ask starts colder”) is fully traced and
          reproduced across captures. The <strong>cost comparison</strong> is single-run-per-task
          (N=1) — a clear direction (agent ≤ ask), not a benchmarked margin.
        </Callout>
      </Section>

      <Section title="Anatomy — what actually differs between the modes">
        <Prose>
          <p>
            Holding the chat and model fixed, only <strong>two</strong> request fields change when
            you flip the mode toggle. Everything else — request type, endpoint name
            (<code>panel/editAgent</code>), location, max response / prompt token limits, the model —
            is byte-identical.
          </p>
        </Prose>
        <Table
          head={["Field", "Ask mode", "Agent mode", "Same?"]}
          rows={[
            ["Model / endpoint / token limits", "sonnet-4.5", "sonnet-4.5", "identical"],
            ["System-prompt body", "+ read-only block", "+ task-tracking block", "differs"],
            ["Tool array", "28 read-only", "56 read + write", "differs"],
          ]}
        />
        <Prose>
          <p style={{ marginTop: theme.space.md }}>
            The system prompt is the <em>same length</em> in both (~8,000 tokens) — content differs,
            not size. Ask mode adds <code>&lt;modeInstructions&gt;/&lt;capabilities&gt;/&lt;rules&gt;</code>
            (“strictly read-only: NEVER modify”); agent mode adds
            <code> &lt;taskTracking&gt;/&lt;agents&gt;/&lt;notebookInstructions&gt;</code>. The tool array
            is where the real divergence is — and, crucially, the two modes differ at{" "}
            <strong>tool #1</strong> (ask: <code>fetch_webpage</code>; agent: <code>create_file</code>),
            so their cache prefixes split from the very first byte.
          </p>
        </Prose>
        <StackedBar
          ariaLabel="Tool array: ask mode 28 read-only tools versus agent mode 28 read-only plus 28 write or action tools"
          label="Ask mode — 28 tools"
          totalDisplay="~6,467 tok"
          total={6467}
          max={16095}
          segments={[
            { label: "read-only tools (grep, read, list, fetch…)", value: 6467, display: "28 · ~6,467", color: theme.cost.ctxToolDefs },
          ]}
        />
        <StackedBar
          ariaLabel="Agent mode 56 tools: the same 28 read-only plus 28 write or action tools"
          label="Agent mode — 56 tools"
          totalDisplay="~16,095 tok"
          total={16095}
          max={16095}
          segments={[
            { label: "same 28 read-only tools", value: 6467, display: "28 · ~6,467", color: theme.cost.ctxToolDefs },
            { label: "write / action tools (create_file, run_in_terminal, runSubagent…)", value: 9628, display: "28 · ~9,628", color: theme.cost.ctxToolResults },
          ]}
        />
        <Prose>
          <p style={{ marginTop: theme.space.md, fontSize: theme.fontSize.sm, color: theme.text.dim }}>
            “Ask mode = no tools” is a myth. It’s 28 read-only tools — it just can’t mutate your
            workspace. When a question needs context, it greps and reads like agent mode does.
          </p>
        </Prose>
      </Section>

      <Section title="The cold-cache asymmetry">
        <Prose>
          <p>
            Anthropic prompt caching is keyed on <code>(model, prefix)</code> with a ~5-minute TTL,
            and the prefix is ordered <strong>tools → system → messages</strong>. Because the two
            modes diverge at the first tool, they occupy <strong>separate cache prefixes</strong>.
            Agent mode’s default 56-tool prefix is so common across users that it’s effectively kept
            warm globally; ask mode’s rarer 28-tool prefix is not. The first model call shows it:
          </p>
        </Prose>
        <BarChart
          ariaLabel="First model call cached tokens: ask mode zero, agent mode 9,680"
          max={9680}
          data={[
            { label: "Ask mode — first call", value: 0, display: "0 cached", sublabel: "cold prefix", color: theme.cost.ctxToolResults },
            { label: "Agent mode — first call", value: 9680, display: "9,680 cached", sublabel: "globally warm prefix", color: theme.semantic.success },
          ]}
          caption="Cold start, same workspace, same model. Agent mode's first call inherits ~9,680 cached tokens (matching experiment 08's shared-prefix figure); ask mode's inherits nothing."
        />
        <Prose>
          <p style={{ marginTop: theme.space.md }}>
            This is not a privacy blocker. There’s no user-specific data early in the prefix — the
            workspace path first appears ~3,900 tokens deep in <em>both</em> modes, and the first
            ~805 tokens are identical. Ask mode’s prefix simply isn’t high-traffic enough to be held
            warm for you on a cold machine.
          </p>
        </Prose>
      </Section>

      <Section title="TTL evidence — private vs shared prefix">
        <Prose>
          <p>
            Re-firing the same prompt at different gaps exposes the TTL boundary directly. Ask mode
            can <em>self-warm</em> within the window but falls off a cliff past it; agent mode is
            gap-independent because its prefix is kept warm by everyone else.
          </p>
        </Prose>
        <BarChart
          ariaLabel="Ask mode re-fire after 69 seconds hits cache at 7,033 tokens; after 12 minutes it misses at 0; agent mode is 9,680 regardless of gap"
          max={9680}
          data={[
            { label: "Ask · re-fire +69s", value: 7033, display: "7,033 cached", sublabel: "within TTL → HIT", color: theme.semantic.success },
            { label: "Ask · re-fire +12min", value: 0, display: "0 cached", sublabel: "past TTL → MISS (evicted)", color: theme.cost.ctxToolResults },
            { label: "Agent · any gap", value: 9680, display: "9,680 cached", sublabel: "always warm", color: theme.cost.ctxCurrent },
          ]}
          caption="69 seconds: cache hit. 12 minutes: cache gone. Unless you're in agent mode — its shared prefix doesn't depend on your last call being recent."
        />
        <Table
          head={["Capture", "Gap since prior call", "First-call cached", "Outcome"]}
          rows={[
            ["A_ask_cold (04:03:31)", "— (cold)", "0", "cold start"],
            ["A_ask_warm (04:04:40)", "69 s", "7,033", "HIT (self-warmed)"],
            ["B_ask_warm (04:16:47)", "~12 min", "0", "MISS (TTL expired)"],
            ["A/B agent (any)", "n/a", "9,680", "HIT (shared prefix)"],
          ]}
        />
      </Section>

      <Section title="Results — same prompt, both modes">
        <Prose>
          <p>
            <strong>Task A — no-context “explain this file.”</strong> Warm-state, single run each:
          </p>
        </Prose>
        <BarChart
          ariaLabel="Task A warm cost: ask 6.3 credits versus agent 6.4 credits; Task B: ask 18.1 versus agent 16.5"
          max={18.1}
          data={[
            { label: "Task A · ask (warm)", value: 6.3, display: "6.3 cr", color: theme.cost.ctxToolResults },
            { label: "Task A · agent (warm)", value: 6.4, display: "6.4 cr", color: theme.cost.ctxCurrent },
            { label: "Task B · ask (warm)", value: 18.1, display: "18.1 cr · 13 tools", color: theme.cost.ctxToolResults },
            { label: "Task B · agent (warm)", value: 16.5, display: "16.5 cr · 10 tools", color: theme.cost.ctxCurrent },
          ]}
          caption="Agent ≤ ask in every cell. Task A is near-parity (the warm floor); Task B — a context-hungry 'find the dead code' question — has ask mode making more tool calls and costing more."
        />
        <Table
          head={["Task B capture", "tool calls", "files", "first-call cached", "session hit", "credits"]}
          rows={[
            ["ask — warm", "13 (9 grep, 4 read)", "3", "0", "83.5%", "18.1"],
            ["agent — warm", "10", "3", "9,680", "88.6%", "16.5"],
          ]}
        />
        <Prose>
          <p style={{ marginTop: theme.space.md, fontSize: theme.fontSize.sm, color: theme.text.dim }}>
            Ask mode explored <em>more</em> than agent here (13 vs 10 tool calls) and still cost more.
            The “ask = no tools = cheaper” intuition fails the moment the question needs context.
          </p>
        </Prose>
      </Section>

      <Section title="Key findings">
        <BulletList
          items={[
            "One switch changes two fields. Flipping ask↔agent alters only the system-prompt body and the tool array; model, endpoint, and token limits are byte-identical.",
            "Ask mode is not tool-free. It carries 28 read-only tools and will grep + read to answer a context-hungry question — 13 tool calls in Task B, more than agent's 10.",
            "Ask mode starts colder. Its first model call inherited 0 cached tokens vs agent's 9,680, because the two modes occupy separate cache prefixes (they differ at tool #1).",
            "The 9,680 is a shared, globally-warm prefix. It matches experiment 08's figure and is gap-independent for agent mode; ask mode must self-warm and only holds within the ~5-min TTL (7,033 at +69s, 0 at +12min).",
            "Agent ≤ ask on cost in every measured cell. Near-parity on the warm no-context task; agent cheaper on the context-hungry task. No cost advantage for ask mode appeared.",
          ]}
        />
      </Section>

      <Section title="Practical guidance">
        <BulletList
          items={[
            "Pick a mode for what it should DO, not to save credits. Ask mode's value is the read-only guardrail (it can't modify your workspace), not a discount.",
            "For cost, reach for the real levers: choose the right model, give good context up front so the agent explores less, and stay in a warm session.",
            "Don't expect ask mode to dodge exploration cost. If the question needs the codebase, ask mode pays to go read it too.",
            "Cold starts are the tax, not the mode. The mode that keeps you on a globally-warm prefix (agent) avoids the cold-start write the colder prefix (ask) pays.",
          ]}
        />
      </Section>

      <Section title="Confidence">
        <Prose>
          <p>
            <strong>Mixed — two claims, two levels.</strong>
          </p>
        </Prose>
        <BulletList
          items={[
            "Cache-likelihood (\"ask starts colder\") — high for a single-machine observation. Reproduced across every r1 capture (agent first-call 9,680; ask 0 or self-primed), mechanism fully traced (separate prefixes; tools→system order; TTL caught at 69s hit / 12min miss), and the 9,680 matches experiment 08. Not yet shown cross-user / cross-machine.",
            "Cost comparison — low / directional. One run per task (N=1), no error bars, one soft warm cell. Enough to say 'ask is not cheaper,' not a precise margin.",
          ]}
        />
        <Prose>
          <p style={{ marginTop: theme.space.md }}>
            Tightening the cost claim means N=3 warm-state captures with a controlled cold-primer
            plus a quick VS Code restart, per the test protocol in the editorial notes.
          </p>
        </Prose>
      </Section>

      <Section title="Evidence">
        <Prose>
          <p>
            All numbers come from <TextLink to="/analyze">Copilot Ledger</TextLink> digests of the
            controlled <code>r1</code> captures (Task A: ask cold/warm + agent cold/warm; Task B:
            ask + agent warm), cross-checked against the earlier directional <code>t5</code> pairs.
            First-call cache reads off
            <code> usage.prompt_tokens_details.cached_tokens</code> on the{" "}
            <code>claude-sonnet-4.5</code> request; the cold-start cause is in the digest’s
            <code> cacheAnomalies</code>.
          </p>
          <p style={{ marginTop: theme.space.md }}>
            Cross-reference{" "}
            <TextLink to="/experiments/cache-behavior">experiment 08</TextLink> for the shared-prefix
            cache mechanism the 9,680 figure comes from, and{" "}
            <TextLink to="/experiments/installed-skill-overhead">the skill-overhead experiment</TextLink>{" "}
            for the rest of the fixed system-prompt floor.
          </p>
        </Prose>
        <div style={{ marginTop: theme.space.lg, display: "flex", gap: theme.space.md, flexWrap: "wrap" }}>
          <ReportButton route="/reports/ask-mode-cold-start">
            Open the ask-mode cold start (0 cached)
          </ReportButton>
          <ReportButton route="/reports/agent-mode-warm-prefix" tone="secondary">
            Open the agent-mode cold start (9,680 cached)
          </ReportButton>
        </div>
        <Prose>
          <p style={{ marginTop: theme.space.md, fontSize: theme.fontSize.sm, color: theme.text.dim }}>
            Two real, scrubbed exports — the same fresh-chat “explain this file” prompt in each
            mode. Open the <strong>tool_defs</strong> and <strong>system</strong> boxes to see the
            different prefixes, and watch the first-call cache: <strong>0</strong> in ask mode,
            <strong> 9,680</strong> in agent mode.
          </p>
        </Prose>
      </Section>

      <Section title="LinkedIn draft">
        <Pre>
{`"Switch to ask mode, it's cheaper than agent mode in Copilot."

I believed this too. Then I diffed the actual requests Copilot sends in each mode. It's backwards — and the reason is kind of beautiful.

Switching to ask mode changes exactly TWO things in the payload:
1. the system prompt gets a "you are read-only, never edit" block
2. ~28 write tools (create_file, run_in_terminal, runSubagent…) are removed, leaving 28 read-only ones

Everything else — model, endpoint, token limits — is identical.

Those two changes cause two effects, and neither is "cheaper":

→ Ask mode still explores. On a "find the dead code" question it fired 13 tool calls on its own (9 greps, 4 reads) and cost 18.1 credits vs agent's 16.5. It's not a no-tools mode.

→ Ask mode starts COLDER. Its first model call inherited 0 cached tokens. Agent mode's inherited 9,680 — because the default agent prefix is so common it's kept warm globally, while ask's smaller, rarer prefix isn't. I caught the cache TTL on camera: re-fire the same prompt after 69 seconds → cache hit. After 12 minutes → gone. Agent mode? Warm either way.

So the mode you pick "to save money" is the one that can't touch your code AND pays more cold starts.

Pick a mode for what you want it to DO. For cost, the real levers are model choice, good context up front, and staying in a warm session.

(Cache-likelihood finding reproduced across captures; cost numbers are single-run, directional. Measured with Copilot Ledger.)`}
        </Pre>
      </Section>

      <Section title="Video outline">
        <Prose>
          <p>60–90 second LinkedIn video, screen-recording the Copilot Ledger canvas:</p>
        </Prose>
        <BulletList
          items={[
            "0–8s — Hook. \"Everyone says ask mode is cheaper. I read the actual requests. It's the opposite — here's why.\"",
            "8–25s — The two-field diff. Split view of the two system prompts + tool lists. \"One switch changes two things: a 'read-only' system block, and it deletes 28 write tools. That's it.\"",
            "25–45s — Effect 1: still explores. Open the Task B ask report — point at the 13 tool calls. 18.1 credits vs agent's 16.5. Not cheaper.",
            "45–70s — Effect 2: starts colder. Bar chart: ask first-call cached 0 vs agent 9,680. Then the TTL timeline: \"69 seconds — hit. 12 minutes — gone. Agent stays warm because its prefix is the global default.\"",
            "70–88s — Payoff + honest close. \"One switch, two consequences, neither is savings. Pick the mode for the job; save credits with model choice and good context. Cache finding reproduced; cost numbers are directional.\"",
          ]}
        />
      </Section>
    </div>
  );
}
