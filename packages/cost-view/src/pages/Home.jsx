import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";
import { PageHeader, Section, Card, CardTitle, CardBody, CardGrid, Badge, Prose, TextLink } from "../components/ui.jsx";
import { EXPERIMENTS, STATUS_TONE } from "../content/site.js";

export default function Home() {
  var latest = EXPERIMENTS.slice(0, 4);
  return (
    <div>
      <PageHeader
        kicker="Copilot Behavior Lab"
        title="Copilot Behavior Lab"
        tagline="Understanding how AI coding agents think, work, and spend credits."
      />

      <Prose>
        <p>
          This is a working notebook about how GitHub Copilot agents actually behave —
          where the time goes, what the cache buys you, which tools and sub-agents do
          what, and how a conversation's shape drives its cost. The aim is to make agent
          runs legible, with careful, evidence-based observations rather than absolute
          claims.
        </p>
        <p>
          <strong>Copilot Ledger</strong> is the measurement tool behind every
          observation here. It digests an exported VS Code Copilot Chat session and
          breaks it down into per-prompt cost, context buildup, tool usage, and cache
          behavior. The reports are the evidence layer — you can open the same exports
          yourself under{" "}
          <TextLink to="/analyze">Analyze Session</TextLink>.
        </p>
      </Prose>

      <Section title="Latest experiments">
        <CardGrid>
          {latest.map(function (exp) {
            return (
              <Card key={exp.id} href={hrefFor("/experiments/" + exp.id)} title={exp.title}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.space.md }}>
                  <CardTitle>{exp.title}</CardTitle>
                  <Badge tone={STATUS_TONE[exp.status] || "muted"}>{exp.status}</Badge>
                </div>
                <CardBody>{exp.hook}</CardBody>
              </Card>
            );
          })}
        </CardGrid>
        <div style={{ marginTop: theme.space.lg }}>
          <TextLink to="/experiments">See all experiments →</TextLink>
        </div>
      </Section>

      <Section title="Start here">
        <CardGrid>
          <Card href={hrefFor("/analyze")} title="Analyze Session">
            <CardTitle>Analyze a session</CardTitle>
            <CardBody>
              Drop in your own VS Code Copilot Chat export and inspect token cost,
              context buildup, tool calls, and cache behavior.
            </CardBody>
          </Card>
          <Card href={hrefFor("/learn")} title="Learn">
            <CardTitle>Learn the basics</CardTitle>
            <CardBody>
              New to Copilot cost and agent behavior? Start with model calls, tool
              calls, context windows, cache, and credits.
            </CardBody>
          </Card>
          <Card href={hrefFor("/gallery")} title="Session Gallery">
            <CardTitle>Browse the gallery</CardTitle>
            <CardBody>
              Explore example reports without uploading anything of your own.
            </CardBody>
          </Card>
        </CardGrid>
      </Section>
    </div>
  );
}
