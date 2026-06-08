import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";
import { PageHeader, Section, Prose, Badge, Callout, Pre, TextLink } from "../components/ui.jsx";
import { BarChart, LineChart } from "../components/charts.jsx";
import { STATUS_TONE } from "../content/site.js";

var REPORT_ROUTE = "/reports/tool-overhead-120";

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

export default function ToolOverhead() {
  return (
    <div>
      <div style={{ marginBottom: theme.space.lg }}>
        <TextLink to="/experiments">← All experiments</TextLink>
      </div>

      <PageHeader kicker="Experiment" title="I added a 100-tool MCP server to Copilot. The bytes on the wire barely moved.">
        <div style={{ display: "flex", gap: theme.space.md, alignItems: "center", marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <Badge tone={STATUS_TONE.Published}>Published</Badge>
          <span style={{ color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            Decoupling curve across six captures (catalog 23–320); the 15.7-credit churn event is a single session (N=1).
          </span>
        </div>
      </PageHeader>

      <Section title="Executive summary">
        <Prose>
          <p>
            Tool definitions are real, always-sent context — but <strong>how many tools you enable
            is almost decoupled from how many are actually sent to the model.</strong> Across six
            captures, VS Code sent a roughly constant <strong>~23–25 full tool schemas</strong>
            whether the enabled catalog held 26, 120, 142, or 320 tools. The rest are advertised
            <em> name-only</em> and fetched on demand via an internal <code>tool_search</code>.
          </p>
          <p>
            So the popular advice “disable tools to save money” mostly trims a list the model never
            receives in full. The cost that <em>does</em> bite is <strong>churn</strong>: in one
            plan-then-implement session, a Plan→Agent mode switch changed the sent tool set and
            forced a single <strong>15.7-credit</strong> cold cache re-write.
          </p>
          <Callout tone="info" label="Scope note">
            This page is the <strong>tool</strong> half. The separate cost of the installed{" "}
            <strong>skill</strong> catalog in the system prompt is its own experiment —{" "}
            <TextLink to="/experiments/installed-skill-overhead">Installed Skill Overhead</TextLink>{" "}
            — because skills are injected by a different mechanism (system-prompt text, not the
            grouped/deferred tool schemas measured here).
          </Callout>
        </Prose>
      </Section>

      <Section title="Hypothesis">
        <Prose>
          <p>We started with two assumptions and the data broke the first one:</p>
        </Prose>
        <BulletList
          items={[
            "“Tool definitions scale with the number of tools you enable, and there’s a clean threshold (VS Code’s default 128) below which everything is sent flat.” — Not what we observed.",
            "“Because tool definitions sit early in the cached prefix, changing them is disproportionately expensive.” — Consistent with what we observed (N=1).",
          ]}
        />
      </Section>

      <Section title="What happened — the decoupling curve">
        <Prose>
          <p>
            Holding the task trivial (a one-word <code>hi</code>, same workspace) and varying only
            the enabled catalog, the count of full schemas actually sent stayed flat while the
            deferred name-only index absorbed everything else:
          </p>
        </Prose>
        <Table
          head={["Capture", "Catalog", "Sent (full)", "Deferred", "Sent ≈tok", "If flat ≈tok"]}
          rows={[
            ["hi18", "23", "20", "3", "8,361", "8,654"],
            ["hi3_21", "26", "23", "3", "9,107", "9,401"],
            ["cart (real work)", "56", "45", "11", "14,606", "15,929"],
            ["hi_116", "120", "23", "97", "9,107", "35,571"],
            ["hi_140", "142", "24", "118", "9,283", "39,146"],
            ["workiq", "320", "25", "295", "9,606", "81,026"],
          ]}
        />
        <BarChart
          ariaLabel="Full tool schemas sent stays around 20-25 even as the enabled catalog grows from 23 to 320 tools"
          max={50}
          data={[
            { label: "23 enabled", value: 20, display: "20 sent", sublabel: "3 deferred", color: theme.accent.primary },
            { label: "26 enabled", value: 23, display: "23 sent", sublabel: "3 deferred", color: theme.accent.primary },
            { label: "120 enabled", value: 23, display: "23 sent", sublabel: "97 deferred", color: theme.accent.primary },
            { label: "142 enabled", value: 24, display: "24 sent", sublabel: "118 deferred", color: theme.accent.primary },
            { label: "320 enabled", value: 25, display: "25 sent", sublabel: "295 deferred", color: theme.accent.primary },
          ]}
          caption="Full schemas actually sent, by enabled-catalog size (trivial prompt). The catalog grows ~14x; the sent count barely moves. There is no flat-list cliff at 128 — at 120 tools, 97 were already deferred."
        />
        <BarChart
          ariaLabel="At 320 enabled tools the model receives about 9,606 tokens of schemas versus 81,026 if sent flat"
          max={81026}
          data={[
            { label: "Actually sent (25 schemas)", value: 9606, display: "9,606 tok", color: theme.accent.primary },
            { label: "If the 320-tool catalog were flat", value: 81026, display: "81,026 tok", color: theme.cost.cwrite },
          ]}
          caption="The 320-tool catalog would be ~81K tokens of schemas if sent flat every call; the model actually received ~9,600 — roughly an 8x compression via the deferred index."
        />
      </Section>

      <Section title="The expensive part — churning the sent set">
        <Prose>
          <p>
            A separate session (<code>04-plan-implement-cart.json</code>, all turns on{" "}
            <code>claude-sonnet-4.6</code>) shows where tool cost actually lands. A Plan→Agent mode
            switch took the <em>sent</em> set from <strong>14 → 45</strong> schemas
            (<strong>+10,044 tokens</strong>) at the very front of the prefix, invalidating ~40K
            tokens of warm cache and forcing a cold re-write:
          </p>
        </Prose>
        <Table
          head={["Call", "Prefix tokens", "Cached", "Written", "Hit", "Credits"]}
          rows={[
            ["p2.l7 · last plan call", "34,905", "32,897", "2,007", "94%", "3.3"],
            ["p3.l0 · first implement call", "49,401", "9,447", "39,952", "19%", "15.7"],
            ["p3.l2 · next implement call", "49,739", "49,399", "339", "99%", "2.0"],
          ]}
        />
        <BarChart
          ariaLabel="Credits jump to 15.7 on the first implement call after the mode switch, then fall back to 2.0"
          max={16}
          data={[
            { label: "p2.l7 · last plan", value: 3.3, display: "3.3 cr", sublabel: "94% hit", color: theme.accent.primary },
            { label: "p3.l0 · first implement", value: 15.7, display: "15.7 cr", sublabel: "19% hit", color: theme.cost.missAccent },
            { label: "p3.l2 · next", value: 2.0, display: "2.0 cr", sublabel: "99% hit", color: theme.accent.primary },
          ]}
          caption="The cost cliff is the tool-set change, not the work. Changing ~10,044 tokens at the front of the prefix re-wrote everything after it: a 15.7-credit cold call between two ~2–3 credit ones."
        />
      </Section>

      <Section title="Key findings">
        <Callout tone="info" label="Key finding">
          The wire payload is roughly constant across catalog size. What you pay for is the ~20–45
          schemas the task activates — plus a cheap, cached name-only index for everything else.
        </Callout>
        <BulletList
          items={[
            "Enabling ~100 extra tools (a whole Azure MCP server) left the sent schema count essentially unchanged: ~23–25 sent at 120, 142, and 320 enabled.",
            "There is no flat-list cliff at 128. At 120 enabled tools — under the threshold — 97 of 120 were already deferred name-only. Selective grouping is active well below 128.",
            "Task relevance moves the sent set more than catalog size does. The 56-tool cart session, doing real file work, sent 45 schemas — roughly double the trivial 120- and 142-tool runs — because more tool groups were contextually pre-activated.",
            "Deferred tools are cheap and cached, so trimming them saves little. A deferred tool rides as a single name (~8 tokens) inside the cached prefix. Removing unused tools mostly removes name lines, not schemas.",
            "Churning the sent set is the expensive event (N=1). The Plan→Agent switch (+10,044 tokens at the front) forced a 15.7-credit cold re-write — the digest flags the cause directly: tool-defs-changed (Δ +10,044 tokens).",
          ]}
        />
      </Section>

      <Section title="Does curation help quality?">
        <Prose>
          <p>
            If trimming tools barely moves cost, is there any reason to do it?{" "}
            <strong>We expect yes — for quality, not price — though this session did not measure
            it.</strong> VS Code’s own virtual-tools setting warns that you experience{" "}
            <em>degraded tool calling</em> once the threshold is hit: that’s the platform team
            saying selection <em>accuracy</em>, not cost, is what suffers as the enabled set grows.
          </p>
        </Prose>
        <BulletList
          items={[
            "Deferral adds indirection. A directly-sent tool is available immediately; a deferred one must first be discovered via tool_search, then chosen — two failure points instead of one. Deferral starts well below 128, so a tool you actually want can hide behind a search.",
            "Near-duplicates invite mis-picks. When two tools overlap (a GitHub MCP server and a shell that can run gh), the model often reaches for the more familiar one. Removing the redundant tool removes the wrong turn.",
          ]}
        />
        <Prose>
          <p style={{ marginTop: theme.space.lg }}>
            So the quality case for curation is real but <strong>inferred, not measured here</strong>:
            a lean, non-overlapping toolset raises the odds the right tool ships as a full schema
            instead of hiding in the deferred index. A selection-accuracy benchmark is a follow-up.
          </p>
        </Prose>
      </Section>

      <Section title="Practical guidance">
        <BulletList
          items={[
            "Don’t expect “disable tools” to cut cost much. Most enabled tools are sent name-only and cached — the lever is mostly disconnected from the wire.",
            "Treat a mode switch as a cache reset. Plan→Agent changes the sent tool set and re-pays the cold write; planning and implementing in the same mode keeps the warm prefix.",
            "Let sub-agents carry narrow toolsets. The sub-agents here ran on ~13 sent schemas and entered warm; a focused subtask doesn’t need the full implementation set.",
            "If you want to trim always-sent overhead, look at skill instructions, not tool counts. Instruction text isn’t virtualized; tool schemas largely are. (That’s the Installed Skill Overhead experiment.)",
            "Curate for quality, not cost. VS Code’s own team warns of degraded tool calling past the threshold, so a lean, non-overlapping toolset likely helps the model pick the right tool.",
            "Expect the first call after any tool/skill change to be expensive. It’s the re-warm, not the work — budget for it and avoid triggering it repeatedly.",
          ]}
        />
      </Section>

      <Section title="Confidence">
        <Prose>
          <p>
            <strong>Mixed.</strong> The decoupling curve is <strong>medium</strong> confidence: six
            captures across catalog sizes 23–320, all internally reconciled (sent + deferred =
            catalog; sent tokens reconcile against billed <code>prompt_tokens</code>). It’s still a
            controlled micro-benchmark on one workspace and a mostly-trivial prompt, and the
            grouping policy is VS Code’s — it may change between versions.
          </p>
          <p>
            The <strong>15.7-credit churn event is low confidence (N=1)</strong> — measured cleanly
            from one export, but a single observation. The <strong>quality claim is inferred</strong>,
            resting on VS Code’s “degraded tool calling” warning, not a selection benchmark. Token
            figures are ~4-char-per-token approximations (±~20%); treat shares as indicative.
          </p>
        </Prose>
      </Section>

      <Section title="Evidence">
        <Prose>
          <p>
            This is the actual Copilot Ledger report for the 120-tool capture, pinned to that one
            export. Open the <strong>tool_defs</strong> box to see the 23 schemas sent (~9,107
            tokens, ~33% of the prompt) while 97 of the 120 enabled tools ride along name-only.
          </p>
        </Prose>
        <div style={{ marginTop: theme.space.lg }}>
          <ReportButton>Open the 120-tool report in Copilot Ledger</ReportButton>
        </div>
      </Section>

      <Section title="LinkedIn draft">
        <Pre>
{`I added a 100-tool MCP server to GitHub Copilot. The bytes on the wire barely moved.

I measured what Copilot actually sends to the model as you enable more tools. I expected the tool-definition block to grow with the count — and that everything under VS Code's 128-tool threshold would be sent as one flat list.

Neither held up.

Same trivial prompt, different enabled-tool catalogs. Full tool schemas actually sent over the wire:

26 tools → 23 sent
120 tools → 23 sent (97 deferred)
142 tools → 24 sent (118 deferred)
320 tools → 25 sent (295 deferred)

Most tools aren't sent as full schemas. They're advertised name-only and fetched on demand. Enabling ~100 extra tools (a whole Azure MCP server) left the sent count essentially unchanged. There's no flat-list cliff at 128 either — at 120 tools, 97 were already deferred.

So "disable tools to save money" mostly trims a list the model never fully receives. What actually costs: CHURNING the sent set. In a separate session, switching Plan→Agent changed the sent tools (+10,044 tokens at the front of the prefix), invalidated ~40,000 tokens of warm cache, and forced one 15.7-credit cold re-write.

Tool count is almost free. Changing the tool set is not.

(Six captures for the curve; the 15.7-credit event is a single session.)`}
        </Pre>
      </Section>

      <Section title="Video outline">
        <Prose>
          <p>60–90 second LinkedIn video:</p>
        </Prose>
        <BulletList
          items={[
            "Open the 120-tool report in Copilot Ledger; highlight the tool_defs box — ~9,100 tokens, 23 schemas sent.",
            "Call out the deferred 97: enabled but name-only, riding in the cached prefix for almost nothing.",
            "Show the curve: 26 → 23 sent, 120 → 23, 142 → 24, 320 → 25. “Crossed 128, nothing jumped.”",
            "Cut to the cart run: the plan turn (14 sent) then the implement turn (45 sent), then p3.l0 — 19% hit, 15.7 credits.",
            "End: enabling tools is nearly free — they’re deferred and cached. Changing the active set mid-task is what resets the cache and costs real credits.",
          ]}
        />
      </Section>

      <Section title="Open the report">
        <Prose>
          <p>
            Inspect the 120-tool capture yourself — the 23 sent schemas and the 97 deferred tools
            are visible on the tool_defs box.
          </p>
        </Prose>
        <div style={{ marginTop: theme.space.lg }}>
          <ReportButton>Open the 120-tool report in Copilot Ledger</ReportButton>
        </div>
      </Section>
    </div>
  );
}
