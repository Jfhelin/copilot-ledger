import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";
import { PageHeader, Section, Prose, Badge, Callout, TextLink } from "../components/ui.jsx";
import { BarChart } from "../components/charts.jsx";
import { STATUS_TONE } from "../content/site.js";

var REPORT_ROUTE = "/reports/claude-agent-context-window";

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

function BulletList({ items }) {
  return (
    <ul style={{ margin: 0, marginTop: theme.space.md, paddingLeft: theme.space.xxl, color: theme.text.secondary, fontSize: theme.fontSize.md, lineHeight: 1.7 }}>
      {items.map(function (item, i) {
        return <li key={i} style={{ marginBottom: theme.space.sm }}>{item}</li>;
      })}
    </ul>
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

export default function AgentContextWindow() {
  return (
    <div>
      <div style={{ marginBottom: theme.space.lg }}>
        <TextLink to="/experiments">← All experiments</TextLink>
      </div>

      <PageHeader
        kicker="Internal comparison"
        title="Same model, same prompt: one agent's context window was 4× the other's — almost all of it tool schemas."
      >
        <div style={{ display: "flex", gap: theme.space.md, alignItems: "center", marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <Badge tone={STATUS_TONE.Internal}>Internal</Badge>
          <span style={{ color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            One capture per agent (N=1), one machine, both on claude-sonnet-4.5. Sub-bucket
            token figures are char/4 estimates; the billed prompt_tokens totals are exact.
          </span>
        </div>
      </PageHeader>

      <Section title="Executive summary">
        <Prose>
          <p>
            I ran the same trivial prompt against two agents inside VS Code on the same model
            (<code>claude-sonnet-4.5</code>): the <strong>Claude Agent SDK</strong> (the
            Claude Code harness, run from VS Code) and the <strong>VS Code Copilot Chat</strong>
            agent. The billed input was <strong>86,085 tokens</strong> for the Claude agent vs
            <strong> 20,167 tokens</strong> for Copilot — a 4.3× gap on a one-word reply. These are
            gross input tokens straight from <code>usage.prompt_tokens</code>, independent of any
            cache discount.
          </p>
          <p>
            Almost the entire gap is <strong>tool definitions</strong>. The Claude SDK shipped all
            <strong> 247 tool schemas in full</strong> (~72,000 tokens, ≈84% of its prompt). Copilot
            <em> virtualizes</em>: of 56 enabled tools it bills only ~9,100 tokens of full schemas
            and defers the rest to a cached, name-only index. Skills are encoded differently too —
            the Claude agent is actually leaner there — but at under 200 tokens that difference is a
            rounding error against the tool gap.
          </p>
          <Callout tone="info" label="The one thing they do the same">
            Both agents follow Anthropic's <strong>level-1 progressive disclosure</strong> for
            skills: only each skill's name + description is preloaded, never the SKILL.md body.
            Neither dumps skill bodies into the prompt. The interesting differences are in
            everything <em>around</em> that shared rule.
          </Callout>
        </Prose>
      </Section>

      <Section title="The headline — billed input on a trivial prompt">
        <BarChart
          ariaLabel="Claude Agent SDK billed 86,085 input tokens versus Copilot Chat 20,167 on the same model and trivial prompt"
          max={86085}
          data={[
            { label: "Claude Agent SDK", value: 86085, display: "86,085 tok", sublabel: "247 tools, all full", color: theme.cost.ctxToolDefs },
            { label: "VS Code Copilot Chat", value: 20167, display: "20,167 tok", sublabel: "56 tools, virtualized", color: theme.accent.primary },
          ]}
          caption="Gross input tokens for a one-word prompt, same model (claude-sonnet-4.5), same machine. N=1 each."
        />
      </Section>

      <Section title="Where the 86,085 tokens went (Claude Agent SDK)">
        <Prose>
          <p>
            The Claude agent's prompt is dominated by tool schemas. Built-in agent tools are a
            minority; <strong>223 of 247 tools are MCP</strong>, and they account for the bulk of
            the payload:
          </p>
        </Prose>
        <BarChart
          ariaLabel="Tool definitions are about 72,000 of the 86,085 tokens; system prompt and skills are the rest"
          max={72000}
          data={[
            { label: "Tool schemas (247, full)", value: 72000, display: "≈72,000 tok", sublabel: "≈84% of prompt", color: theme.cost.ctxToolDefs },
            { label: "System prompt + memory rules", value: 6700, display: "≈6,700 tok", color: theme.cost.ctxSystem },
            { label: "Second message", value: 1800, display: "≈1,800 tok", color: theme.cost.ctxHistory },
          ]}
          caption="Char/4 estimate of the major buckets. The buckets undercount slightly vs the exact 86,085 billed; the remainder is tokenizer/format overhead. Skills (~1,000 tok) live inside the system-prompt bucket."
        />
        <Table
          head={["Tool group", "Count", "Schema ≈tok", "Note"]}
          rows={[
            ["Built-in agent tools", "24", "≈18,350", "Bash, Edit, Read, Grep, Skill, Agent, …"],
            ["MCP tools (all servers)", "223", "≈54,012", "Sent in full — no deferral"],
            ["  of which one Azure MCP server", "64", "≈19,203", "A single connected server"],
            ["Total", "247", "≈72,362", "≈293 tok per tool, all shipped"],
          ]}
        />
      </Section>

      <Section title="The two independent causes — don't blame it all on virtualization">
        <Prose>
          <p>
            The gap has <strong>two</strong> separate drivers, and it's worth keeping them apart:
          </p>
        </Prose>
        <BulletList
          items={[
            "Inventory — the Claude agent simply had far more tools connected (247 vs 56), mostly one large Azure MCP server plus other MCP servers (223 MCP tools in total). Crucially, this was largely NOT a user choice (see note below), so it isn't a fair 'you installed more' difference.",
            "Virtualization policy — the Claude Agent SDK ships every tool schema in full, so its prompt scales linearly with the inventory. Copilot defers most schemas to a name-only index, so its sent payload stays roughly flat as the catalog grows.",
          ]}
        />
        <Callout tone="warning" label="The inventory difference was mostly outside the user's control">
          In this setup the Claude agent (run inside VS Code) loaded <strong>every MCP server
          configured in VS Code</strong> with no per-server on/off toggle, whereas the GitHub
          Copilot agent <strong>lets you enable/disable MCP servers individually</strong>. So the
          Copilot side had a curated 56-tool set by choice, while the Claude side inherited all 247
          tools whether or not the task needed them. That makes the larger inventory partly a
          property of the harness too — not just "more stuff installed." Combined with no
          virtualization, the Claude agent both <em>can't prune</em> the catalog and <em>ships all of
          it in full.</em>
        </Callout>
        <Prose>
          <p style={{ marginTop: theme.space.lg }}>
            The honest counterfactual ties the two together. Our separate{" "}
            <TextLink to="/experiments/tool-skill-overhead">Tool Overhead</TextLink> experiment
            showed Copilot sends only ~25 full schemas whether 120 or 320 tools are enabled — so
            <strong> even with the Claude agent's 247-tool inventory, Copilot would still bill ~9–10k
            tokens for tools, and its floor would stay near 20k.</strong> Conversely, the Claude SDK
            on Copilot's smaller 56-tool set would still ship them in full (~56 × ~293 ≈ 16k tokens
            of tools). So virtualization explains the bulk of the gap; the un-prunable, un-virtualized
            MCP inventory is what made it bite this hard.
          </p>
        </Prose>
      </Section>

      <Section title="Tool definitions — virtualized vs shipped in full">
        <Prose>
          <p>
            The cleanest single metric, immune to the count difference, is{" "}
            <strong>billed tokens per installed tool</strong>:
          </p>
        </Prose>
        <BarChart
          ariaLabel="The Claude agent bills about 293 tokens per tool; Copilot about 163 effective per tool"
          max={300}
          data={[
            { label: "Claude Agent SDK", value: 293, display: "≈293 tok/tool", sublabel: "full schema, every tool", color: theme.cost.ctxToolDefs },
            { label: "VS Code Copilot Chat", value: 163, display: "≈163 tok/tool", sublabel: "blended; most deferred", color: theme.accent.primary },
          ]}
          caption="Per-installed-tool billed cost. Copilot's effective rate is lower because most tools ride as a cached name-only line, not a full schema — and that rate keeps falling as the catalog grows, while the Claude SDK's stays at full-schema cost."
        />
        <Callout tone="info" label="Why this is the difference that matters">
          Virtualization is what makes Copilot's fixed cost robust to MCP sprawl. Connect a 200-tool
          MCP server to Copilot and the wire barely moves; connect it to the Claude Agent SDK and
          every call carries ~60k extra tokens of schemas.
        </Callout>
      </Section>

      <Section title="Skills — the Claude agent is leaner here, but it barely matters">
        <Prose>
          <p>
            On skills the result flips: the Claude agent encodes the catalog more compactly. Same
            level-1 progressive disclosure, very different serialization:
          </p>
        </Prose>
        <Table
          head={["", "Claude Agent SDK", "VS Code Copilot Chat"]}
          rows={[
            ["Format", "compact bullet: - ns:name: description…", "XML <skill><name><description><file>"],
            ["Description", "truncated ~250 chars", "full, untruncated (one was 1,024 chars)"],
            ["File path in prompt", "none", "absolute /Users/.../SKILL.md per skill"],
            ["Approx tokens / skill", "≈61", "≈144"],
          ]}
        />
        <BarChart
          ariaLabel="About 61 tokens per skill in the Claude agent versus 144 in Copilot Chat"
          max={150}
          data={[
            { label: "Claude Agent SDK", value: 61, display: "≈61 tok/skill", color: theme.semantic.success },
            { label: "VS Code Copilot Chat", value: 144, display: "≈144 tok/skill", color: theme.cost.ctxSystem },
          ]}
          caption="Per-skill encoding cost. The ~2.4× ratio is robust to the char/4 estimator (same method both sides). But the whole skills catalog is under ~2,000 tokens on each side — dwarfed by the tool-definition gap above."
        />
        <Prose>
          <p style={{ marginTop: theme.space.lg }}>
            Two concrete, product-feedback-worthy differences in Copilot's encoding: it sends the
            full author description (no truncation), and it embeds an absolute <code>SKILL.md</code>
            file path per skill. Both are avoidable. But fixing them would save hundreds of tokens,
            not tens of thousands — so it's a tidy-up, not the headline.
          </p>
        </Prose>
      </Section>

      <Section title="Other differences worth noting">
        <BulletList
          items={[
            "System prompt: the Claude agent's base system prompt (~6,700 tok, including a file-based memory instruction block) is smaller than Copilot's (~11,700 tok including the skills catalog). Modest, and it cuts the opposite way from tools.",
            "Cache state is first-call noise, not structure. This Claude capture was cold (0 read / 86,075 write); the Copilot capture was warm-ish (9,680 read / 10,478 write). That reflects when each was captured, not an inherent property — don't read the 86k vs 20k gap as a cache story. Both prompt_tokens figures are gross input, before any cache discount.",
            "The Claude agent ran the Claude Agent SDK (TypeScript) from inside VS Code, metered through Copilot (the usage block carries copilot_usage / nano_aiu). It is the Claude Code harness, not the default Copilot Chat agent.",
          ]}
        />
      </Section>

      <Section title="What this means for token comparisons">
        <Prose>
          <p>
            For anyone benchmarking Copilot vs Claude on token usage, the practical takeaways:
          </p>
        </Prose>
        <BulletList
          items={[
            "Normalize for installed tools and MCP servers before comparing. A connected Azure MCP server can add ~60k tokens to every call on a non-virtualizing harness and almost nothing on a virtualizing one — that's configuration, not engine efficiency.",
            "Check whether you can even curate the toolset. In this setup the Claude agent in VS Code force-loaded all MCP servers with no per-server toggle, while the Copilot agent lets you disable them — so 'just install fewer tools' isn't always available to the user.",
            "Tool virtualization is the single biggest structural lever between these two. It makes Copilot's fixed floor near-constant as you add tools; the Claude Agent SDK's floor scales with the inventory.",
            "Skill encoding is a real but minor difference. Copilot could trim it (truncate descriptions, drop absolute file paths) for a few hundred tokens.",
            "Record the inventory (tools, MCP servers, skills) alongside the token counts for every run. Without it, a default-mode comparison mostly measures what each machine happens to have installed — and whether the harness even let the user prune it.",
          ]}
        />
      </Section>

      <Section title="Confidence">
        <Prose>
          <p>
            <strong>Single capture per agent (N=1), one machine.</strong> The exact billed totals
            (86,085 vs 20,167) and the tool counts (247 vs 56) come straight from the exports. The
            sub-bucket splits (tools ~72k, system ~6.7k, per-skill ~61/~144) are char/4
            approximations (±~20% on absolute values; ratios are more robust because the same
            estimator is applied to both sides). The virtualization claim is corroborated by the
            multi-capture <TextLink to="/experiments/tool-skill-overhead">Tool Overhead</TextLink>
            {" "}experiment. This is a structural comparison of two harnesses, not a cost benchmark —
            different cache states and different installed inventories mean the 4.3× is specific to
            this machine's configuration.
          </p>
        </Prose>
      </Section>

      <Section title="Evidence">
        <Prose>
          <p>
            This is the actual (scrubbed) Claude agent capture, pinned to that one export. Open the
            <strong> tool_defs</strong> box to watch the 247 full schemas dominate the window
            (~72,000 tokens, ≈84% of the prompt) while the skill catalog sits compact in the
            system box. Usernames in the export are obfuscated; every token figure is unchanged.
          </p>
        </Prose>
        <div style={{ marginTop: theme.space.lg }}>
          <ReportButton>Open the 247-tool Claude capture in Copilot Ledger</ReportButton>
        </div>
        <Prose>
          <p style={{ marginTop: theme.space.lg }}>
            The Copilot side of the comparison is the published{" "}
            <TextLink to="/experiments/installed-skill-overhead">Installed Skill Overhead</TextLink>
            {" "}capture (a scrubbed, 14-skill cleaned floor at 20,167 tokens).
          </p>
        </Prose>
      </Section>
    </div>
  );
}
