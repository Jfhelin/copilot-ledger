import { theme } from "../lib/theme.js";
import { PageHeader, Section, Prose, Badge, Callout, Pre, TextLink } from "../components/ui.jsx";
import { STATUS_TONE } from "../content/site.js";

// Measured before/after capture for the installed-skill catalog.
// All four runs are the same trivial "hi" prompt in the same repo
// (octocat_supply). The main agent call (p2) is claude-sonnet-4.5 in the first
// three; hi4_0's main call used gpt-5.4-mini, so it is a reference point only.
// System-prompt and catalog sizes are chars/4 approx tokens, measured from
// message[0]; promptTokens / credits / cache come from the digest:
//   node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout
var CAPTURE = [
  { skills: 37, sysTok: 11026, catalogTok: 5165, label: "All plugins installed", ref: "hi18", reference: false },
  { skills: 19, sysTok: 8739, catalogTok: 3037, label: "Partial cleanup", ref: "hi_skillCleaned", reference: false },
  { skills: 14, sysTok: 7629, catalogTok: 1924, label: "Internal plugins removed", ref: "hi_skillCleaned3", reference: false },
  { skills: 0, sysTok: 6940, catalogTok: 0, label: "Fully clean (reference)", ref: "hi4_0", reference: true },
];

var BEFORE = CAPTURE[0];
var AFTER = CAPTURE[2];

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

// Two stacked bars: the system prompt before vs after, split into the installed
// -skill catalog (chars/4) and the rest of the system prompt.
function CompositionBars() {
  var rows = [
    { name: "Before — 37 skills", total: BEFORE.sysTok, catalog: BEFORE.catalogTok },
    { name: "After — 14 skills", total: AFTER.sysTok, catalog: AFTER.catalogTok },
  ];
  var scaleMax = BEFORE.sysTok; // widest bar = full width
  return (
    <div style={{ marginTop: theme.space.lg }}>
      {rows.map(function (r) {
        var rest = r.total - r.catalog;
        var catPct = (r.catalog / scaleMax) * 100;
        var restPct = (rest / scaleMax) * 100;
        var skillShare = Math.round((r.catalog / r.total) * 100);
        return (
          <div key={r.name} style={{ marginBottom: theme.space.lg }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: theme.fontSize.sm, color: theme.text.secondary }}>
              <span>{r.name}</span>
              <span style={{ color: theme.text.dim }}>~{r.total.toLocaleString()} approx tok · skills {skillShare}%</span>
            </div>
            <div style={{ display: "flex", width: "100%", height: 34, borderRadius: theme.radius.md, overflow: "hidden", border: "1px solid " + theme.border.subtle }}>
              <div title={"Installed-skill catalog: ~" + r.catalog.toLocaleString() + " approx tok"}
                style={{ width: catPct + "%", background: theme.cost.ctxHistory, display: "flex", alignItems: "center", justifyContent: "center", color: "#0b0f17", fontWeight: 700, fontSize: theme.fontSize.xs, minWidth: r.catalog ? 0 : 0 }}>
                {catPct > 9 ? "~" + r.catalog.toLocaleString() : ""}
              </div>
              <div title={"Rest of system prompt: ~" + rest.toLocaleString() + " approx tok"}
                style={{ width: restPct + "%", background: theme.cost.ctxSystem, display: "flex", alignItems: "center", justifyContent: "center", color: "#0b0f17", fontWeight: 700, fontSize: theme.fontSize.xs }}>
                {restPct > 9 ? "~" + rest.toLocaleString() : ""}
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: theme.space.lg, flexWrap: "wrap", marginTop: theme.space.sm }}>
        <LegendDot color={theme.cost.ctxHistory}>Installed-skill catalog</LegendDot>
        <LegendDot color={theme.cost.ctxSystem}>Rest of system prompt</LegendDot>
      </div>
    </div>
  );
}

// Capture curve: installed-skill count vs system-prompt approx tokens, across
// the four runs. The 0-skill point is drawn in grey as a reference (different
// model/template), not as part of the sonnet before/after comparison.
function CaptureCurve() {
  var W = 680, H = 300;
  var padL = 56, padR = 20, padT = 20, padB = 44;
  var plotW = W - padL - padR, plotH = H - padT - padB;
  var xMax = 40, yMax = 12000;
  var x = function (v) { return padL + (v / xMax) * plotW; };
  var y = function (v) { return padT + plotH - (v / yMax) * plotH; };

  var sonnet = CAPTURE.filter(function (d) { return !d.reference; });
  var linePath = sonnet
    .slice()
    .sort(function (a, b) { return a.skills - b.skills; })
    .map(function (d, k) { return (k === 0 ? "M" : "L") + x(d.skills).toFixed(1) + "," + y(d.sysTok).toFixed(1); })
    .join(" ");

  var yGrid = [0, 4000, 8000, 12000];
  var xGrid = [0, 10, 20, 30, 40];

  return (
    <div style={{ marginTop: theme.space.lg }}>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={"0 0 " + W + " " + H} width="100%" role="img"
          aria-label="System prompt approximate tokens rising with installed-skill count, from about 6,940 at 0 skills to about 11,026 at 37 skills"
          style={{ maxWidth: W, display: "block" }}>
          {yGrid.map(function (gv) {
            return (
              <g key={"y" + gv}>
                <line x1={padL} y1={y(gv)} x2={W - padR} y2={y(gv)} stroke={theme.border.subtle} strokeWidth="1" />
                <text x={padL - 8} y={y(gv) + 4} textAnchor="end" fontSize="11" fill={theme.text.dim}>
                  {gv === 0 ? "0" : (gv / 1000) + "K"}
                </text>
              </g>
            );
          })}
          {xGrid.map(function (gx) {
            return (
              <text key={"x" + gx} x={x(gx)} y={H - 22} textAnchor="middle" fontSize="11" fill={theme.text.dim}>{gx}</text>
            );
          })}
          <text x={(padL + W - padR) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill={theme.text.dim}>installed skills in system prompt</text>
          <path d={linePath} fill="none" stroke={theme.cost.ctxHistory} strokeWidth="2" strokeLinejoin="round" />
          {CAPTURE.map(function (d) {
            return (
              <g key={d.ref}>
                <circle cx={x(d.skills)} cy={y(d.sysTok)} r={d.reference ? 4 : 5}
                  fill={d.reference ? theme.cost.ctxSystem : theme.cost.ctxHistory}
                  stroke={d.reference ? theme.text.dim : "none"} strokeWidth={d.reference ? 1 : 0} />
                <text x={x(d.skills)} y={y(d.sysTok) - 12} textAnchor="middle" fontSize="10" fontWeight="700"
                  fill={d.reference ? theme.text.dim : theme.text.secondary}>
                  {d.skills} sk
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: "flex", gap: theme.space.lg, flexWrap: "wrap", marginTop: theme.space.sm }}>
        <LegendDot color={theme.cost.ctxHistory}>claude-sonnet-4.5 (before/after)</LegendDot>
        <LegendDot color={theme.cost.ctxSystem}>0-skill reference (gpt-5.4-mini, different template)</LegendDot>
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

export default function InstalledSkillOverhead() {
  return (
    <div>
      <div style={{ marginBottom: theme.space.lg }}>
        <TextLink to="/experiments">← All experiments</TextLink>
      </div>

      <PageHeader kicker="Experiment" title="A third of my system prompt was skills I never used.">
        <div style={{ display: "flex", gap: theme.space.md, alignItems: "center", marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <Badge tone={STATUS_TONE.Published}>Published</Badge>
          <span style={{ color: theme.text.dim, fontSize: theme.fontSize.sm }}>
            Before/after capture (N=1 each), claude-sonnet-4.5 — a direction, not a benchmark.
          </span>
        </div>
      </PageHeader>

      <Section title="Executive summary">
        <Prose>
          <p>
            Copilot tells the model about every <strong>installed</strong> skill/plugin by
            injecting a short <em>name + description</em> entry into the system prompt — so the
            agent knows the skill exists and can route to it. In these captures that catalog
            showed up <strong>whether or not the prompt used it</strong>: the same trivial
            “hi” prompt, in the same repo, carried <strong>37 skills</strong> when my plugins
            were installed.
          </p>
          <p>
            I then uninstalled the internal plugins and re-ran the identical prompt. The
            installed-skill catalog fell from <strong>~5,165 to ~1,924 approx tokens</strong>{" "}
            (chars/4), and the whole system prompt dropped from{" "}
            <strong>~11,026 to ~7,629 approx tokens — about 3,400 fewer, ~31% of the system
            prompt</strong>. That weight sat at the front of the cached prefix, so before the
            cleanup I paid to write it once and re-read it on <em>every</em> subsequent call.
          </p>
        </Prose>
        <Callout tone="info" label="Headline">
          Removing 23 installed-but-unused skills cut the measured system prompt by ~3,400
          approx tokens (~31%) — on a task that never touched any of them.
        </Callout>
      </Section>

      <Section title="What the system prompt was made of — before vs after">
        <Prose>
          <p>
            Both bars are the system prompt (<code>message[0]</code>) of the main agent call,
            measured as chars/4 approx tokens. The amber slice is the installed-skill catalog;
            the grey is everything else (the actual instructions). Before the cleanup, the
            catalog was nearly half the system prompt.
          </p>
        </Prose>
        <CompositionBars />
      </Section>

      <Section title="The capture curve — system prompt grows with installed skills">
        <Prose>
          <p>
            Four runs of the same prompt at different cleanup stages. Across the three
            sonnet-4.5 captures the system prompt tracks the installed-skill count almost
            linearly — the 23 skills I removed averaged <strong>~141 approx tokens each</strong>,
            though individual skills vary, so this is an average, not a fixed per-skill
            constant. The 0-skill point is a <em>reference only</em> (its main call used a
            different model and prompt template), not part of the before/after.
          </p>
        </Prose>
        <CaptureCurve />
        <Table
          head={["Run", "Skills", "Skill catalog (approx tok)", "System prompt (approx tok)", "Skills as % of system prompt"]}
          rows={[
            ["hi18 (before)", "37", "~5,165", "~11,026", "47%"],
            ["hi_skillCleaned", "19", "~3,037", "~8,739", "35%"],
            ["hi_skillCleaned3 (after)", "14", "~1,924", "~7,629", "25%"],
            ["hi4_0 (reference)", "0", "0", "~6,940", "0%"],
          ]}
        />
      </Section>

      <Section title="What about credits? (the honest caveat)">
        <Prose>
          <p>
            It’s tempting to read the credits straight off these runs — the before call billed{" "}
            <strong>8.6 credits</strong> and the after call <strong>4.3</strong> — but that
            comparison is <strong>confounded by cache warmth</strong>, not a clean skill-removal
            saving. The before run was a <em>cold</em> call (0% cache hit, a full ~22,061-token
            cache write); the after run was <em>warm</em> (48% hit). Cache state dominates that
            gap, and there is no cold “after” capture on the same model to isolate it.
          </p>
          <p>
            So the defensible result here is the <strong>token reduction</strong>, not a measured
            credit delta. As a <em>pricing estimate only</em>: ~3,200 fewer catalog tokens trims a
            cold first-call cache write by roughly <strong>~1 credit</strong> at Sonnet
            cache-write pricing — small per call, but it lowers the prefix that every later call
            re-reads, so on a long session you stop paying for it dozens of times.
          </p>
        </Prose>
        <Callout tone="warning" label="Don’t over-read this">
          The 8.6 → 4.3 credit drop is <strong>not</strong> attributable to skill removal: the
          before call was cold and the after call was warm. Headline the measured ~3,400-token
          system-prompt reduction; treat any credit figure as an estimate.
        </Callout>
      </Section>

      <Section title="System prompt vs. total prompt — two different measurements">
        <Prose>
          <p>
            One subtlety worth stating plainly so the numbers aren’t mistaken for each other.
            The installed-skill effect is measured inside the <strong>system prompt</strong>{" "}
            (<code>message[0]</code>): ~11,026 → ~7,629 approx tokens. The <strong>total</strong>{" "}
            prompt (the digest’s <code>promptTokens</code>: system + tool defs + environment +
            history) fell less — 22,070 → 20,167 — because other prefix parts moved at the same
            time (tool definitions actually rose, 8,361 → 9,107 approx tokens, between the two
            runs). This experiment isolates <em>catalog rent in the system prompt</em>; it does
            not claim the whole prompt prefix shrank by the same amount.
          </p>
        </Prose>
      </Section>

      <Section title="Key findings">
        <BulletList
          items={[
            "The installed-skill catalog was ~47% of the system prompt. Before cleanup, 37 skills ≈ ~5,165 approx tokens of a ~11,026-token system prompt.",
            "Uninstalling internal plugins cut the system prompt ~31%. Removing 23 installed-but-unused skills dropped it to ~7,629 approx tokens — a measured ~3,400-token reduction in message[0].",
            "It tracks installation, not usage. The same trivial prompt carried 37 skills purely because the plugins were installed; the user prompt invoked none of them.",
            "Per-skill cost averaged ~141 approx tokens, but varies. The removed skills weren't uniform — descriptions differ in length — so treat ~141 as an average across this capture, not a constant.",
            "Credits here are confounded by cache state. The before run was cold and the after warm, so the 8.6 → 4.3 credit move can't be attributed to skills; the clean signal is the token reduction.",
          ]}
        />
      </Section>

      <Section title="Interpretation">
        <Prose>
          <p>
            The mechanism is discoverability: the model can only invoke a skill it’s been told
            exists, so a name+description catalog is the cheapest honest way to make installed
            skills usable. That’s real value, not pure waste. The fair critique is that there’s
            <strong> no per-repo or per-session relevance filter</strong> for skills — an
            installed plugin pays catalog rent in the system prompt on every call of every task,
            relevant or not.
          </p>
          <p>
            VS Code already solves the analogous problem for <em>tools</em>: above ~128 enabled
            tools it sends a name-only deferred index and expands full schemas on demand (see{" "}
            <TextLink to="/experiments/tool-skill-overhead">Tool Overhead</TextLink>). The same
            lazy treatment hasn’t reached the skills catalog. And this sharpens{" "}
            <TextLink to="/experiments/cache-behavior">Cache Behavior</TextLink>’s “~9,680-token
            shared block”: part of that fixed floor is <em>your own</em> installed-plugin
            catalog, so it shrinks when you uninstall.
          </p>
        </Prose>
      </Section>

      <Section title="Practical guidance">
        <BulletList
          items={[
            "Uninstall plugins you don't routinely use. It's the one lever that removes the catalog rent at the source — disabling-but-keeping-installed may not help if the catalog is injected on install.",
            "Audit the system prompt, not just the tool list. Tool-def trimming (Tool Overhead) misses the skills catalog — it's a separate slice of the fixed prefix.",
            "Relocate, don't just delete. Moving a plugin's skill folders into a specific repo's .github/skills/ (and its MCP servers into that repo's config) keeps the capability where it's relevant while removing its rent from every other session.",
            "Audit installed agents too before publishing a raw export. A skill adds a catalog line; an installed agent adds a one-line description but can pull large internal references into context if invoked.",
            "Remember it's a floor, not a spike. The saving is small per call but rides in the cached prefix on every call — it compounds most on long sessions (see Context Growth).",
          ]}
        />
      </Section>

      <Section title="Confidence">
        <Prose>
          <p>
            <strong>Medium-Low — before/after is N=1 each.</strong> The system-prompt and catalog
            sizes are measured directly from <code>message[0]</code> (chars/4 approx tokens) and
            are internally consistent across four runs of the same prompt. The token reduction is
            measured; the <em>credit</em> impact is only estimated, because no cold “after”
            capture exists to isolate it from cache warmth. Treat the direction — installed
            skills are a real, removable slice of the fixed system-prompt floor — as the finding,
            not the exact per-skill split.
          </p>
        </Prose>
      </Section>

      <Section title="Evidence">
        <Prose>
          <p>
            Captures: <code>hi18.json</code> (before), <code>hi_skillCleaned.json</code> /{" "}
            <code>hi_skillCleaned3.json</code> (cleanup passes), <code>hi4_0.json</code>{" "}
            (reference) — each the same “hi” prompt in <code>octocat_supply</code>. The raw
            exports are <strong>not bundled</strong>: their system prompts contain internal
            plugin catalog descriptions, so this page publishes derived aggregate measurements
            only. Regenerate any figure with:
          </p>
        </Prose>
        <Pre>
{`node .github/skills/copilot-chat-export/scripts/digest.mjs <export> --stdout`}
        </Pre>
        <Prose>
          <p style={{ marginTop: theme.space.md }}>
            Count <code>&lt;skill&gt;</code> blocks and chars in the main agent call’s{" "}
            <code>requestMessages.messages[0]</code> (system) for the catalog/system-prompt
            sizes; read per-prompt <code>promptTokens</code>, <code>cachedTokens</code>,{" "}
            <code>cacheCreationTokens</code>, <code>toolDefsApproxTokens</code> and{" "}
            <code>credits</code> from the digest for the cache/credit context.
          </p>
        </Prose>
      </Section>

      <Section title="LinkedIn draft">
        <Pre>
{`A third of my Copilot system prompt was skills I never used.

I ran the same trivial prompt twice in the same repo. The only thing I changed:
I uninstalled the plugins I wasn't using.

Before: the system prompt carried 37 installed "skills" — a name+description for
every plugin Copilot tells the model about. That catalog was ~5,165 of ~11,026
approx tokens — nearly HALF the system prompt — on a task that used none of them.

After uninstalling the internal ones: 14 skills, and the system prompt dropped to
~7,629 approx tokens. ~3,400 tokens gone (~31%), just from uninstalling.

The surprise: it's not about usage. The catalog is injected because a plugin is
*installed*, not because you invoke it. (And it's not MCP tool schemas — that's a
separate slice; see my Tool Overhead post.)

One honest caveat: I won't quote a credit saving from this pair, because my before
run was a cold cache call and my after run was warm — cache state, not skills,
drove the credit difference. The clean, measured result is the token reduction.
It sits at the front of the cached prefix, so you pay to re-read it on every call.

The fix is boring but real: uninstall plugins you don't routinely use. Discovery
has value — the model can't call what it can't see — but installed-and-irrelevant
skills pay rent on every turn.

(Before/after capture, N=1 each — a direction, not a benchmark.)`}
        </Pre>
      </Section>
    </div>
  );
}
