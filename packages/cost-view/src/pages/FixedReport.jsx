import AnalyzeSession from "./AnalyzeSession.jsx";
import { PageHeader, TextLink } from "../components/ui.jsx";
import { assetUrl, findFixedReport } from "../content/site.js";

// Renders a bundled export pinned to a stable #/reports/<id> route in the
// read-only viewer (no file picker, no switching). The viewer component is
// reused verbatim via its `fixed` prop so the report UI is identical to
// Analyze Session.
export default function FixedReport({ reportId }) {
  var report = findFixedReport(reportId);
  if (!report) {
    return (
      <div>
        <PageHeader kicker="Report" title="Report not found" />
        <div>
          That report doesn't exist. <TextLink to="/experiments">Back to experiments.</TextLink>
        </div>
      </div>
    );
  }
  return (
    <AnalyzeSession
      fixed
      initialExportUrl={assetUrl(report.file)}
      displayLabel={report.title}
      fixedSummaries={report.summaries || null}
      backTo={report.backTo}
      backLabel={report.backLabel || "Back"}
    />
  );
}
