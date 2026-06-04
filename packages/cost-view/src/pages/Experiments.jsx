import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";
import { PageHeader, Section, Card, CardTitle, CardBody, CardGrid, Badge, Field, TextLink } from "../components/ui.jsx";
import { EXPERIMENTS, STATUS_TONE, findExperiment } from "../content/site.js";

function ExperimentList() {
  return (
    <div>
      <PageHeader
        kicker="Experiments"
        title="Experiments"
        tagline="Each experiment starts as a hypothesis and a single session, then graduates toward guidance only if it repeats. Status reflects how far along it is."
      />
      <CardGrid>
        {EXPERIMENTS.map(function (exp) {
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
    </div>
  );
}

function ExperimentDetail({ experiment }) {
  return (
    <div>
      <div style={{ marginBottom: theme.space.lg }}>
        <TextLink to="/experiments">← All experiments</TextLink>
      </div>
      <PageHeader kicker="Experiment" title={experiment.title}>
        <div style={{ display: "flex", gap: theme.space.md, alignItems: "center", marginTop: theme.space.lg, flexWrap: "wrap" }}>
          <Badge tone={STATUS_TONE[experiment.status] || "muted"}>{experiment.status}</Badge>
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
          {experiment.hook}
        </blockquote>
      </PageHeader>

      <Section>
        <Field label="Executive summary" value={experiment.executiveSummary} />
        <Field label="Hypothesis" value={experiment.hypothesis} />
        <Field label="Why this matters" value={experiment.whyThisMatters} />
        <Field label="Session summary" value={experiment.sessionSummary} />
        <Field label="Key findings" value={experiment.keyFindings} />
        <Field label="What happened" value={experiment.whatHappened} />
        <Field label="Interpretation" value={experiment.interpretation} />
        <Field label="Practical guidance" value={experiment.practicalGuidance} />
        <Field label="Confidence level" value={experiment.confidence} />
        <Field
          label="Evidence / Copilot Ledger export"
          value={experiment.evidence}
          placeholder="Placeholder — link a Copilot Ledger export (JSON) and screenshots. Readers can open it under Analyze Session."
        />
        <Field label="LinkedIn post draft" value={experiment.linkedInDraft} />
        <Field label="Video outline" value={experiment.videoOutline} />
      </Section>
    </div>
  );
}

export default function Experiments({ experimentId }) {
  if (experimentId) {
    var experiment = findExperiment(experimentId);
    if (experiment) return <ExperimentDetail experiment={experiment} />;
    return (
      <div>
        <PageHeader kicker="Experiments" title="Experiment not found" />
        <div style={{ color: theme.text.muted }}>
          That experiment doesn't exist yet. <TextLink to="/experiments">Back to all experiments.</TextLink>
        </div>
      </div>
    );
  }
  return <ExperimentList />;
}
