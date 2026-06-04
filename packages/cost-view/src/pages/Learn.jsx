import { theme } from "../lib/theme.js";
import { PageHeader, Section, Prose, TextLink } from "../components/ui.jsx";
import { LEARN_SECTIONS } from "../content/site.js";

export default function Learn() {
  return (
    <div>
      <PageHeader
        kicker="Learn"
        title="How Copilot cost and behavior work"
        tagline="Reference material for anyone new to how AI coding agents spend time and credits. Plain-language, no prior cost knowledge assumed."
      />

      {LEARN_SECTIONS.map(function (section) {
        return (
          <Section key={section.id} title={section.title}>
            <Prose>
              <p style={{ margin: 0 }}>{section.body}</p>
            </Prose>
          </Section>
        );
      })}

      <Section title="See it on a real session">
        <Prose>
          <p style={{ margin: 0 }}>
            The fastest way to internalize these ideas is to open a report and look.
            Head to <TextLink to="/analyze">Analyze Session</TextLink> to load your own
            export, or browse the{" "}
            <TextLink to="/gallery">Session Gallery</TextLink> for ready-made examples.
          </p>
        </Prose>
      </Section>

      <div style={{ height: theme.space.xxl }} />
    </div>
  );
}
