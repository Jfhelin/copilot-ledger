import { useEffect, useMemo } from "react";
import { useHashRoute, navigate } from "./lib/router.js";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Learn from "./pages/Learn.jsx";
import Experiments from "./pages/Experiments.jsx";
import Observations from "./pages/Observations.jsx";
import SessionGallery from "./pages/SessionGallery.jsx";
import About from "./pages/About.jsx";
import AnalyzeSession from "./pages/AnalyzeSession.jsx";
import ContextQualityReadme from "./pages/ContextQualityReadme.jsx";
import CacheBehavior from "./pages/CacheBehavior.jsx";
import FixedReport from "./pages/FixedReport.jsx";

// Application shell for the Copilot Behavior Lab knowledge site.
//
// Load/route precedence (kept deliberately simple — see plan):
//   1. ?embed=1 (real query string, set by the canvas extension) ALWAYS wins:
//      render the report viewer raw with no nav shell, exactly as the original
//      standalone app did. The canvas bridge lives inside AnalyzeSession.
//   2. Otherwise the hash router drives a navigable site. On /analyze the hash
//      `src` param wins over the legacy ?export= query param.
//   3. A bare ?export=<url> (no hash) redirects once to /analyze?src=<url> so
//      old deep links keep auto-loading an export.

function readQueryParams() {
  if (typeof window === "undefined") return { exportUrl: null, embed: false };
  var params = new URLSearchParams(window.location.search);
  return {
    exportUrl: params.get("export"),
    embed: params.get("embed") === "1",
  };
}

function ContentForRoute({ path, params }) {
  if (path === "/" || path === "/home") return <Home />;
  if (path === "/learn") return <Learn />;
  if (path === "/observations") return <Observations />;
  if (path === "/gallery") return <SessionGallery />;
  if (path === "/about") return <About />;
  if (path === "/experiments") return <Experiments />;
  if (path === "/experiments/context-quality-readme") return <ContextQualityReadme />;
  if (path === "/experiments/cache-behavior") return <CacheBehavior />;
  if (path.indexOf("/experiments/") === 0) {
    return <Experiments experimentId={path.slice("/experiments/".length)} />;
  }
  if (path.indexOf("/reports/") === 0) {
    return <FixedReport reportId={path.slice("/reports/".length)} />;
  }
  if (path === "/analyze") {
    return <AnalyzeSession initialExportUrl={params.src || null} />;
  }
  return <Home />;
}

export default function App() {
  var query = useMemo(readQueryParams, []);
  var route = useHashRoute();

  // Legacy ?export=<url> with no hash route -> redirect once to the analyze
  // route so the export auto-loads and the URL reflects where we are.
  useEffect(function () {
    if (query.embed) return;
    if (!query.exportUrl) return;
    var hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash && hash !== "#" && hash !== "#/") return;
    navigate("/analyze", { src: query.exportUrl });
  }, [query.embed, query.exportUrl]);

  // Canvas / embed mode: bypass the knowledge-site shell entirely.
  if (query.embed) {
    return <AnalyzeSession embed initialExportUrl={query.exportUrl} />;
  }

  var fullBleed = route.path === "/analyze" || route.path.indexOf("/reports/") === 0;

  return (
    <Layout currentPath={route.path} fullBleed={fullBleed}>
      <ContentForRoute path={route.path} params={route.params} />
    </Layout>
  );
}
