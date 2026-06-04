import { PageHeader, Section, Prose, TextLink, ExternalLink } from "../components/ui.jsx";
import { REPO_URL } from "../content/site.js";

export default function About() {
  return (
    <div>
      <PageHeader
        kicker="About"
        title="About this project"
        tagline="A personal, evidence-based notebook about how AI coding agents behave."
      />

      <Prose>
        <p>
          Copilot Behavior Lab is a personal knowledge-sharing project. Its goal is to
          help developers understand how AI coding agents work — how they call models
          and tools, how context and cache shape cost, and where credits actually go.
        </p>
        <p>
          <ExternalLink href={REPO_URL}>Copilot Ledger</ExternalLink> is the tool used
          to analyze session data here. It is the measurement instrument behind the
          observations, not a product being sold — the source is on{" "}
          <ExternalLink href={REPO_URL}>GitHub</ExternalLink>. Every claim on this site
          is meant to be traceable back to a real exported session you can open under{" "}
          <TextLink to="/analyze">Analyze Session</TextLink>.
        </p>
      </Prose>

      <Section title="How to read this site">
        <Prose>
          <ul style={{ margin: 0, paddingLeft: "1.2em", lineHeight: 1.7 }}>
            <li>
              The content is evidence-based and deliberately careful not to overclaim.
            </li>
            <li>
              Experiments should be treated as observations unless they have been
              repeated and explicitly marked as high confidence.
            </li>
            <li>
              Where findings touch on official guidance, the intent is to reinforce it —
              choose the right model for the job, use Auto Mode where appropriate,
              provide useful context up front without sending excessive context, write
              precise prompts with clear guardrails, and review tools and skills
              periodically.
            </li>
            <li>
              Nothing here is intended to attack Microsoft or GitHub guidance. The tone
              is that of a curious engineer sharing what the data showed in a particular
              session.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section title="A note on confidence">
        <Prose>
          <p style={{ margin: 0 }}>
            A single session is an anecdote, not a benchmark. Phrases like "in this
            session" and "the data suggests" are used on purpose. Findings graduate from
            observation to guidance only after repetition.
          </p>
        </Prose>
      </Section>
    </div>
  );
}
