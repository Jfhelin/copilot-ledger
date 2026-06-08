import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";
import { PageHeader, Section, Prose, Badge, Callout, Pre, TextLink } from "../components/ui.jsx";
import { BarChart, StackedBar } from "../components/charts.jsx";

var REPORT_ROUTE = "/reports/skill-overhead-cleaned";

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

export default function InstalledSkillOverhead() {
  return (
    <div>
      <div style={{ marginBottom: theme.space.lg }}>
        <TextLink to="/experiments">← All experiments</TextLink>
      </div>

      <PageHeader
        kicker="Experiment"
        title="Removing a plugin's tool schemas barely moved the wire. Its skills cost every call."
      >
        <div style={{ display: "flex", gap: theme.space.md, alignItems: "center", marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <Badge tone="info">Measured · N=3 captures, one machine</Badge>
          <span style={{ color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            A clean before/after staircase on a trivial prompt. The final step changed only skills and reconciles ~1:1.
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
          I uninstalled one Copilot plugin. Removing its tool schemas barely moved the wire.
          Removing its skills cut tokens on every call.
        </blockquote>
      </PageHeader>

      <Section title="Executive summary">
        <Prose>
          <p>
            The popular advice — “disable tools to save money” — aims at the wrong half of
            Copilot’s fixed cost floor. <strong>Tool schemas are virtualized:</strong> most enabled
            tools ride name-only in a deferred, cached index, so trimming them barely moves the wire
            (that’s <TextLink to="/experiments/tool-skill-overhead">experiment 07</TextLink>). The
            <strong> installed-skill catalog is not virtualized:</strong> every installed skill
            injects a <code>name + description</code> block into the system prompt, sent in full on
            every single call. So skill <em>installation</em>, not usage, is the lever that actually
            shrinks the floor.
          </p>
          <p>
            I measured a clean three-step before/after on a trivial <code>hi</code> prompt
            (claude-sonnet-4.5, same workspace each time). The billed prompt fell from
            <strong> 25,367 to 20,167 tokens</strong> — not by disabling anything in settings, but by
            <strong> relocating</strong> installed skills into the one repo that needs them. The
            cleanest causal evidence is the <strong>final step, which changed only skills</strong>:
            every tool count held constant, the skill catalog fell <strong>≈1,110 tokens</strong> and
            the billed prompt fell <strong>1,197</strong> — a near 1:1 match. Throughout, the full
            tool-schema payload stayed flat at <strong>~9,107 tokens</strong> even as the <em>flat</em>
            tool catalog shrank ~19,500. Tools are virtualized; skills are not.
          </p>
          <p>
            Why this is worth doing once: it’s a <strong>one-time edit with a persistent, machine-wide
            effect.</strong> The skill catalog is global, so every chat you start on this
            machine/profile — in any repo, on any task — paid the inflated floor, and now pays the
            reduced floor, until you next change the installed skill/plugin set. Unlike per-prompt
            techniques you must re-apply every time, you spend the effort once and the saving keeps
            applying.
          </p>
        </Prose>
      </Section>

      <Section title="Hypothesis">
        <Prose>
          <p>
            Installed-but-irrelevant skills are assumed “free until used.” If instead every installed
            skill pays a fixed <strong>catalog rent</strong> in the system prompt — present on the
            first call, re-read for the rest of the session — then skill <em>installation</em>, not
            <em> usage</em>, is the cost lever, and the lever you reach for tools (disable them) does
            <strong> not</strong> transfer to skills.
          </p>
        </Prose>
      </Section>

      <Section title="What happened — the staircase">
        <Prose>
          <p>
            The same trivial <code>hi</code> prompt, same model, same <code>octocat_supply</code>
            workspace, captured at three points while the globally installed skill set changed.
            Catalog token columns are 4-char-per-token approximations of the system-prompt
            <code> &lt;skill&gt;</code> blocks; <code>prompt_tokens</code> and tool counts are exact.
          </p>
        </Prose>
        <Table
          head={["Stage (capture)", "Global-plugin skills", "Total skills", "Skill catalog ≈tok", "Billed prompt_tokens", "Tools (sent / enabled)"]}
          rows={[
            ["Dirty baseline (hi_116)", "23", "37", "≈5,146", "25,367", "23 / 120"],
            ["After relocating 18 data skills + MCP server (hi_skillCleaned)", "5", "19", "≈3,027", "21,364", "23 / 56"],
            ["After relocating M365 toolkit + foundry — skills only (hi_skillCleaned3)", "0", "14", "≈1,917", "20,167", "23 / 56"],
          ]}
        />
        <BarChart
          ariaLabel="Skill catalog tokens falling from about 5,146 to 3,027 to 1,917 across the three captures"
          max={5146}
          data={[
            { label: "Dirty baseline", value: 5146, display: "≈5,146 tok", sublabel: "37 skills", color: theme.cost.ctxSystem },
            { label: "Pass 1 · data skills moved", value: 3027, display: "≈3,027 tok", sublabel: "19 skills", color: theme.cost.ctxSystem },
            { label: "Pass 2 · M365 + foundry moved", value: 1917, display: "≈1,917 tok", sublabel: "14 skills · 0 global", color: theme.semantic.success },
          ]}
          caption="The installed-skill catalog in the system prompt, sent in full on every call. Relocating plugins into the repos that need them cut it ~63% — and took global-plugin skills from 23 to zero."
        />
      </Section>

      <Section title="The contrast — skills moved, tools didn't">
        <Prose>
          <p>
            This is the whole point. Over the cleanup the <em>flat</em> tool catalog shrank ~19,500
            tokens (<code>catalogIfFlatApproxTokens</code> 36,020 → 16,545) when an MCP server left —
            yet the full tool schemas actually <strong>sent</strong> to the model never moved. The
            skill catalog, which <em>is</em> sent in full, fell by more than 3,000 tokens.
          </p>
        </Prose>
        <BarChart
          ariaLabel="Skill catalog dropped from about 5,146 to 1,917 tokens while sent tool schemas held flat at about 9,107 tokens before and after"
          max={9107}
          data={[
            { label: "Skill catalog — before", value: 5146, display: "≈5,146 tok", color: theme.cost.ctxSystem },
            { label: "Skill catalog — after", value: 1917, display: "≈1,917 tok", sublabel: "−3,229", color: theme.semantic.success },
            { label: "Sent tool schemas — before", value: 9107, display: "~9,107 tok", color: theme.cost.ctxToolDefs },
            { label: "Sent tool schemas — after", value: 9107, display: "~9,107 tok", sublabel: "±0", color: theme.cost.ctxToolDefs },
          ]}
          caption="Skills are sent in full, so pruning them moves the wire. Tool schemas are virtualized and cached, so removing tools barely does — the sent block held flat at ~9,107 tokens even as ~19,500 tokens left the flat catalog."
        />
        <Callout tone="info" label="The clean step">
          The final pass changed only skills — tool catalog (56), deferred (33) and sent schemas (23)
          all held constant. The skill catalog fell ≈1,110 tokens; the billed prompt fell 1,197. That
          near 1:1 match is the controlled evidence that the skill catalog is billed in full.
        </Callout>
      </Section>

      <Section title="Where the billed prompt went">
        <Prose>
          <p>
            Splitting the billed <code>prompt_tokens</code> into its big pieces shows which slice
            actually shrank: the skills segment collapses, the sent-tools segment is unchanged
            (segment sizes are approximate — catalog tokens are char/4).
          </p>
        </Prose>
        <StackedBar
          ariaLabel="Dirty baseline prompt of 25,367 tokens split into skills, sent tool schemas, and everything else"
          label="Dirty baseline — 37 skills"
          totalDisplay="25,367 tok"
          total={25367}
          max={25367}
          segments={[
            { label: "skill catalog", value: 5146, display: "≈5,146", color: theme.cost.ctxSystem },
            { label: "sent tool schemas", value: 9107, display: "~9,107", color: theme.cost.ctxToolDefs },
            { label: "everything else (history, deferred index, env, output)", value: 11114, display: "≈11,114", color: theme.cost.ctxHistory },
          ]}
        />
        <StackedBar
          ariaLabel="Cleaned prompt of 20,167 tokens with the skills segment collapsed and the sent tool schemas unchanged"
          label="After relocation — 14 skills, 0 global"
          totalDisplay="20,167 tok"
          total={20167}
          max={25367}
          segments={[
            { label: "skill catalog", value: 1917, display: "≈1,917", color: theme.semantic.success },
            { label: "sent tool schemas", value: 9107, display: "~9,107", color: theme.cost.ctxToolDefs },
            { label: "everything else", value: 9143, display: "≈9,143", color: theme.cost.ctxHistory },
          ]}
        />
        <Prose>
          <p style={{ marginTop: theme.space.md, fontSize: theme.fontSize.sm, color: theme.text.dim }}>
            The grey tool-schema band is identical in both. The blue/green skills band is what you
            actually removed — and you removed it from every future call, not just this one.
          </p>
        </Prose>
      </Section>

      <Section title="Key findings">
        <BulletList
          items={[
            "The skill catalog is a large, non-virtualized slice of the system prompt. In the dirty baseline it was 37 skill blocks ≈ 5,146 tokens (≈44% of the ≈11,700-token system prompt), every one sent in full on every call.",
            "Relocation cut it ~63%, monotonically: ≈5,146 → ≈3,027 → ≈1,917 tokens; global-plugin skills 23 → 5 → 0.",
            "The clean skill-only step reconciles ~1:1. The final pass changed only skills (all tool counts constant); the skill catalog fell ≈1,110 and billed prompt_tokens fell 1,197.",
            "Tools behaved oppositely — they're virtualized. Removing an MCP server cut the flat tool catalog 36,020 → 16,545, yet the sent full-schema payload stayed flat at ~9,107 tokens. Those schemas were never on the wire to expand.",
            "The floor doesn't reach zero — it converges on the built-ins. 14 skills remain: 2 workspace project skills, 5 irreducible VS Code built-ins (~904 tok), and 7 from two extensions (~700 tok, removable by disabling them).",
            "It's a one-time edit with a persistent, machine-wide payoff. The catalog is global, so the saving applies to future chats in any repo until the installed skill/plugin set changes.",
          ]}
        />
      </Section>

      <Section title="What's left — the 14-skill floor">
        <Table
          head={["Bucket", "Skills", "≈tok", "Reducible?"]}
          rows={[
            ["Project (workspace .github/skills)", "2", "~260", "Workspace-scoped — only loads in that repo"],
            ["VS Code built-in Copilot", "5", "~904", "No — bundled with Copilot"],
            ["VS Code extensions (GitHub-PR ×6, evals ×1)", "7", "~700", "Yes — disable the extensions"],
          ]}
        />
        <Prose>
          <p style={{ marginTop: theme.space.md }}>
            In a repo with no project skills the floor is ~1,604 tokens; the irreducible built-in
            floor is ~904.
          </p>
        </Prose>
      </Section>

      <Section title="Practical guidance">
        <BulletList
          items={[
            "Prune or relocate installed skills — this is the lever that works. Removing an installed skill removes tokens sent in full on every call.",
            "Relocate, don't just delete. Move a plugin's skill folders into the .github/skills/ of the one repo that needs them (and its MCP servers into that repo's .vscode/mcp.json). The capability stays where it's relevant; its rent leaves every other session.",
            "Don't reach for \"disable tools\" to cut cost. Tool schemas are virtualized and cached (experiment 07). Curate tools for selection quality, not price.",
            "De-duplicate MCP servers. Duplicate servers (e.g. three GitHub MCP servers) are pure redundancy worth collapsing to one.",
            "Audit the system prompt, not just the tool list. Tool-def trimming misses the skills catalog — a separate slice of the fixed prefix.",
            "Do it once and forget it. Because the catalog is global, this is a one-time edit that lowers the floor for chats you start afterward, until you next change the installed skill/plugin set.",
          ]}
        />
      </Section>

      <Section title="Confidence">
        <Prose>
          <p>
            <strong>Medium — a clean, reproduced before/after staircase (N=3 captures), single
            machine.</strong> The three captures share model, prompt, and workspace, and the direction
            is monotonic. The strongest single point is pass 2: it changed only skills and the
            catalog drop (≈1,110) matched the billed prompt drop (1,197) almost 1:1. Caveats:
          </p>
        </Prose>
        <BulletList
          items={[
            "Don't over-attribute the −5,200 total. Only pass 2 is a controlled skill-only step; pass 1 also removed an MCP server, so part of its drop is the deferred-tool index, not skills.",
            "Catalog token figures are 4-char-per-token approximations (±~20%); prompt_tokens and toolDefs counts are exact. Treat catalog shares (≈44%) as indicative.",
            "The trivial \"hi\" prompt inflates the percentages — an empty prompt maximizes the floor's share. In a real session the absolute per-call saving persists but the percentage shrinks.",
            "It's one machine's plugin set on one workspace. The mechanism (skills sent in full, tools deferred) is the transferable claim, not the exact token counts.",
          ]}
        />
      </Section>

      <Section title="Evidence">
        <Prose>
          <p>
            This is the actual Copilot Ledger report for the cleaned floor (0 global-plugin skills).
            Open the <strong>system</strong> box to see the shrunken 14-skill catalog (~1,917
            tokens), then compare the <strong>tool_defs</strong> box to the{" "}
            <TextLink to="/reports/tool-overhead-120">120-tools report</TextLink>: the same 23
            schemas / ~9,107 tokens are sent in both — tools didn’t move, skills did.
          </p>
        </Prose>
        <div style={{ marginTop: theme.space.lg }}>
          <ReportButton>Open the cleaned floor in Copilot Ledger</ReportButton>
        </div>
        <Prose>
          <p style={{ marginTop: theme.space.lg }}>
            Cross-reference:{" "}
            <TextLink to="/experiments/tool-skill-overhead">experiment 07</TextLink> for the tool
            half (the decoupling curve) and{" "}
            <TextLink to="/experiments/cache-behavior">experiment 08</TextLink> for the cached-prefix
            mechanism the skill catalog sits inside.
          </p>
        </Prose>
      </Section>

      <Section title="LinkedIn draft">
        <Pre>
{`I uninstalled one Copilot plugin. Removing its tool schemas barely moved the wire. Removing its skills cut tokens on every call.

Everyone says "disable tools to save money." I measured it. That advice aims at the wrong half of Copilot's fixed cost floor.

Tool schemas are virtualized: most enabled tools ride name-only in a deferred index, and it's cached. When I removed an internal MCP server, the *flat* tool catalog shrank ~19,500 tokens — and the full schemas actually SENT to the model didn't move (~9,107, flat). They were never on the wire to begin with.

The installed-SKILL catalog is different. Every installed skill injects a name+description into the system prompt, sent in full on every single call. Not virtualized. No per-repo relevance filter.

Same trivial "hi" prompt, same model, same repo — I just changed what was installed. The cleanest step touched only skills (every tool count held constant):

Skill catalog: ≈3,027 → ≈1,917 tokens
Billed prompt:  21,364 → 20,167 tokens  (−1,197)

A ~1,100-token skill cut showed up as a ~1,200-token prompt cut — near 1:1. Skills are billed in full. Over the whole cleanup the skill catalog went ≈5,146 → ≈1,917 and global-plugin skills 23 → 0.

And I didn't disable a single thing. I RELOCATED the skills into the one repo that actually uses them, so they load only when that repo is open.

The best part: the skill catalog is global, so this wasn't a per-session trick. I did it once, and every chat I start on this machine from now on — until I next change what's installed — pays the lower floor. One edit, lasting effect.

Tool count is nearly free. Installed skills are not. Prune the skills; don't bother disabling the tools.

(Three captures, one machine. Catalog tokens are ~char/4; prompt_tokens are exact.)`}
        </Pre>
      </Section>

      <Section title="Video outline">
        <Prose>
          <p>60–90 second LinkedIn video, screen-recording the Copilot Ledger canvas:</p>
        </Prose>
        <BulletList
          items={[
            "0–10s — \"I uninstalled one Copilot plugin. Removing its tool schemas barely moved the wire. Its skills cost me on every call.\" Open the dirty hi_116 report.",
            "10–35s — Highlight the system box: the skill catalog, ~5,146 tokens, 44% of the system prompt. Then the tool_defs box: 23 sent, ~9,107 tokens — most of the 120 enabled tools are deferred name-only.",
            "35–65s — Load hi_skillCleaned3 side by side. Skill catalog collapsed to ~1,917; tool_defs unchanged at ~9,107. \"Same cleanup — the skills fell, the tools didn't budge.\"",
            "65–100s — The fix: not \"disable,\" but relocate. Show the staircase 5,146 → 3,027 → 1,917 and \"23 → 0 global skills.\" Close on the compounding angle: \"I did this once, and every chat I start from now on pays the lower floor.\"",
          ]}
        />
      </Section>

      <Section title="Open the report">
        <Prose>
          <p>Inspect the cleaned floor yourself — the 14-skill catalog and the unchanged tool block are visible per box.</p>
        </Prose>
        <div style={{ marginTop: theme.space.lg }}>
          <ReportButton>Open the cleaned floor in Copilot Ledger</ReportButton>
        </div>
      </Section>
    </div>
  );
}
