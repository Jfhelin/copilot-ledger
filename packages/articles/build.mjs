// Build the standalone "articles bubble" — one self-contained HTML file per
// entry in articles.config.mjs. No client JS, no router, no shared nav: the only
// inter-page link is a single "Read next" footer to the sibling article. This is
// what makes the bubble safe to ship before the rest of the lab is public.
//
// Styling reuses the cost-view light-mode design tokens so the pages match the
// lab visually without importing any of its React/runtime.

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { marked } from "marked";
import { getThemeTokensForMode } from "../cost-view/src/lib/theme.js";
import { SITE, ARTICLES } from "./articles.config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const CONTENT_DIR = resolve(REPO_ROOT, "docs", "articles");
const OUT_DIR = resolve(__dirname, "dist");

const t = getThemeTokensForMode("light");

marked.setOptions({ gfm: true, breaks: false });

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function styles() {
  return `
:root {
  --bg: ${t.bg.base};
  --surface: ${t.bg.surface};
  --raised: ${t.bg.raised};
  --border: ${t.border.default};
  --border-subtle: ${t.border.subtle};
  --text: ${t.text.primary};
  --text-2: ${t.text.secondary};
  --muted: ${t.text.muted};
  --accent: ${t.accent.primary};
  --accent-hover: ${t.accent.hover};
  --accent-muted: ${t.accent.muted};
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: ${t.font.ui};
  font-size: 17px;
  line-height: 1.66;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 720px; margin: 0 auto; padding: ${t.space.giant}px ${t.space.xl}px ${t.space.huge}px; }
.kicker {
  font-family: ${t.font.mono};
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0 0 ${t.space.lg}px;
}
h1 { font-size: 2.1rem; line-height: 1.18; letter-spacing: -0.01em; margin: 0 0 ${t.space.xl}px; }
h2 { font-size: 1.4rem; line-height: 1.3; letter-spacing: -0.005em; margin: ${t.space.huge}px 0 ${t.space.md}px; }
h3 { font-size: 1.12rem; margin: ${t.space.xxl}px 0 ${t.space.sm}px; }
p { margin: 0 0 ${t.space.lg}px; }
a { color: var(--accent); text-decoration: none; border-bottom: 1px solid ${t.accent.muted}; }
a:hover { color: var(--accent-hover); border-bottom-color: var(--accent-hover); }
strong { color: var(--text); font-weight: 650; }
em { color: var(--text-2); }
hr { border: 0; border-top: 1px solid var(--border-subtle); margin: ${t.space.huge}px 0; }
ul, ol { margin: 0 0 ${t.space.lg}px; padding-left: 1.4em; }
li { margin: ${t.space.xs}px 0; }
blockquote {
  margin: ${t.space.xl}px 0;
  padding: ${t.space.md}px ${t.space.xl}px;
  border-left: 3px solid var(--accent);
  background: var(--accent-muted);
  border-radius: 0 ${t.radius.md}px ${t.radius.md}px 0;
  color: var(--text);
}
blockquote p:last-child { margin-bottom: 0; }
code {
  font-family: ${t.font.mono};
  font-size: 0.86em;
  background: var(--raised);
  border: 1px solid var(--border-subtle);
  border-radius: ${t.radius.sm}px;
  padding: 0.1em 0.36em;
}
pre {
  background: var(--raised);
  border: 1px solid var(--border);
  border-radius: ${t.radius.lg}px;
  padding: ${t.space.lg}px ${t.space.xl}px;
  overflow-x: auto;
}
pre code { background: none; border: 0; padding: 0; font-size: 0.82em; }
.table-scroll { overflow-x: auto; margin: 0 0 ${t.space.lg}px; }
table { border-collapse: collapse; width: 100%; font-size: 0.92rem; }
th, td { border: 1px solid var(--border); padding: ${t.space.sm}px ${t.space.lg}px; text-align: left; }
thead th { background: var(--raised); font-weight: 650; }
tbody tr:nth-child(even) { background: ${t.bg.surface}; }
.byline { color: var(--muted); font-size: 0.95rem; margin: 0 0 ${t.space.huge}px; }
.readnext {
  display: block;
  margin-top: ${t.space.huge}px;
  padding: ${t.space.xl}px;
  border: 1px solid var(--border);
  border-radius: ${t.radius.lg}px;
  background: var(--surface);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
}
.readnext:hover { border-color: var(--accent); }
.readnext .rn-kicker { font-family: ${t.font.mono}; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.readnext .rn-title { display: block; margin-top: ${t.space.sm}px; color: var(--accent); font-weight: 600; font-size: 1.05rem; }
footer { margin-top: ${t.space.huge}px; padding-top: ${t.space.xl}px; border-top: 1px solid var(--border-subtle); color: var(--muted); font-size: 0.85rem; }
@media (max-width: 600px) { .wrap { padding: ${t.space.xxl}px ${t.space.lg}px; } h1 { font-size: 1.7rem; } body { font-size: 16px; } }
`.trim();
}

function readNextBlock(sibling) {
  if (!sibling) return "";
  const href = sibling.slug === "index" ? "./" : `./${sibling.slug}.html`;
  return `
    <a class="readnext" href="${href}">
      <span class="rn-kicker">Read next</span>
      <span class="rn-title">${escapeHtml(sibling.title)} →</span>
    </a>`;
}

function page(article, bodyHtml, sibling) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(article.title)} — ${escapeHtml(SITE.name)}</title>
<meta name="description" content="${escapeHtml(article.description)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(article.title)}">
<meta property="og:description" content="${escapeHtml(article.description)}">
<meta name="robots" content="index,follow">
<style>${styles()}</style>
</head>
<body>
<main class="wrap">
<p class="kicker">${escapeHtml(SITE.name)}</p>
${bodyHtml}
${readNextBlock(sibling)}
<footer>${escapeHtml(SITE.name)} — ${escapeHtml(SITE.tagline)}.</footer>
</main>
</body>
</html>
`;
}

// Wrap GFM tables in a horizontally-scrollable container for small screens.
function wrapTables(html) {
  return html.replace(/<table>[\s\S]*?<\/table>/g, (m) => `<div class="table-scroll">${m}</div>`);
}

async function build() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const ordered = [...ARTICLES].sort((a, b) => a.order - b.order);

  for (let i = 0; i < ordered.length; i++) {
    const article = ordered[i];
    const sibling = ordered[(i + 1) % ordered.length];
    const md = await readFile(resolve(CONTENT_DIR, article.src), "utf8");
    const bodyHtml = wrapTables(marked.parse(md));
    const html = page(article, bodyHtml, ordered.length > 1 ? sibling : null);
    const outName = `${article.slug}.html`;
    await writeFile(resolve(OUT_DIR, outName), html, "utf8");
    console.log(`  ✓ ${article.src} → dist/${outName}`);
  }

  // A .nojekyll file keeps GitHub Pages from running Jekyll over the output.
  await writeFile(resolve(OUT_DIR, ".nojekyll"), "", "utf8");
  console.log(`Built ${ordered.length} article(s) to ${OUT_DIR}`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
