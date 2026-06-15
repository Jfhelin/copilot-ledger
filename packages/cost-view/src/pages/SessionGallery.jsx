import { theme } from "../lib/theme.js";
import { hrefFor } from "../lib/router.js";
import { PageHeader, Card, CardTitle, CardBody, CardGrid, Badge } from "../components/ui.jsx";
import { GALLERY_SESSIONS, assetUrl } from "../content/site.js";

export default function SessionGallery() {
  return (
    <div>
      <PageHeader
        kicker="Session Gallery"
        title="Example sessions"
        tagline="Explore real Copilot Ledger reports without uploading anything of your own. Open a session to inspect its token cost, context buildup, tool calls, and cache behavior."
      />

      <CardGrid min={300}>
        {GALLERY_SESSIONS.map(function (session) {
          var available = Boolean(session.file);
          // Gallery links carry the export URL in the hash query so deep links
          // survive a refresh on GitHub Pages. assetUrl keeps the path base-safe
          // under the project subpath, and the URL is encoded by hrefFor.
          var href = available
            ? hrefFor("/analyze", { src: assetUrl(session.file) })
            : null;
          return (
            <Card key={session.id} href={href || undefined} title={session.title}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.space.md }}>
                <CardTitle>{session.title}</CardTitle>
                {available ? (
                  <Badge tone="success">Open</Badge>
                ) : (
                  <Badge tone="muted">Coming soon</Badge>
                )}
              </div>
              <CardBody>{session.description}</CardBody>
              {!available && (
                <div style={{ marginTop: theme.space.md, color: theme.text.dim, fontSize: theme.fontSize.sm }}>
                  This example session hasn't been published yet.
                </div>
              )}
            </Card>
          );
        })}
      </CardGrid>
    </div>
  );
}
