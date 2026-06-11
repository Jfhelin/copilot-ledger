// Build the standalone "articles bubble" — one self-contained HTML file per
// entry in articles.config.mjs. No client JS, no router, no shared nav: the only
// inter-page link is a single "Read next" footer to the sibling article. This is
// what makes the bubble safe to ship before the rest of the lab is public.
//
// Styling reuses the cost-view light-mode design tokens so the pages match the
// lab visually without importing any of its React/runtime.

import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
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

// Resolve the author identity + disclaimer for an article, falling back to the
// SITE-level defaults. This is what makes the byline + personal-views disclaimer
// apply to every page — current and future, both layouts — without repeating the
// fields per article. A per-article value overrides the default; set
// `hideByline` / `hideDisclaimer: true` on an entry to opt out (e.g. a guest post).
function resolveByline(article) {
  return {
    author: article.author ?? SITE.author ?? null,
    authorTitle: article.authorTitle ?? SITE.authorTitle ?? null,
    avatar: article.avatar ?? SITE.avatar ?? null,
    org: article.authorOrg ?? SITE.authorOrg ?? null,
    date: article.date ?? null,
    disclaimer: article.disclaimer ?? SITE.disclaimer ?? null,
    hideByline: article.hideByline === true,
    hideDisclaimer: article.hideDisclaimer === true,
  };
}

// The escaped "<title> at <org> · <date>" sub-line shared by both layouts.
function bylineSubHtml(b) {
  const titleWithOrg =
    b.authorTitle && b.org ? `${b.authorTitle} at ${b.org}` : b.authorTitle || null;
  return [titleWithOrg, b.date].filter(Boolean).map(escapeHtml).join(" · ");
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
.byline {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 ${t.space.huge}px;
  padding-bottom: ${t.space.lg}px;
  border-bottom: 1px solid var(--border-subtle);
}
.byline-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border);
  flex: 0 0 auto;
}
.byline-meta { display: flex; flex-direction: column; line-height: 1.35; }
.byline-name { color: var(--text); font-weight: 600; font-size: 0.98rem; }
.byline-sub { color: var(--muted); font-size: 0.88rem; }
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
footer p { margin: 0 0 ${t.space.xs}px; }
footer p:last-child { margin-bottom: 0; }
.disclaimer { font-style: italic; }
@media (max-width: 600px) { .wrap { padding: ${t.space.xxl}px ${t.space.lg}px; } h1 { font-size: 1.7rem; } body { font-size: 16px; } }
`.trim();
}

function readNextBlock(sibling) {
  if (!sibling) return "";
  const href = `./${sibling.slug}.html`;
  return `
    <a class="readnext" href="${href}">
      <span class="rn-kicker">Read next</span>
      <span class="rn-title">${escapeHtml(sibling.title)} →</span>
    </a>`;
}

// ---- GitHub-blog post theme (opt-in via article.theme === "github-blog") ----
// A self-contained restyle that mirrors the look of a github.blog article —
// GitHub system font stack, near-black ink, blue links, a hero with a category
// label + big bold title + author/date byline, and prominent pull-quotes — with
// no external fonts or assets so the page stays a single shippable HTML file.

function githubBlogStyles() {
  return `
:root {
  --gh-bg: #ffffff;
  --gh-ink: #1f2328;
  --gh-muted: #59636e;
  --gh-subtle: #656d76;
  --gh-link: #0969da;
  --gh-link-hover: #0550ae;
  --gh-border: #d1d9e0;
  --gh-border-subtle: #eaeef2;
  --gh-raised: #f6f8fa;
  --gh-accent: #0969da;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--gh-bg);
  color: var(--gh-ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  font-size: 19px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}
.masthead {
  border-bottom: 1px solid var(--gh-border);
  padding: 18px 24px;
}
.masthead .mast-name {
  font-weight: 800;
  font-size: 15px;
  letter-spacing: -0.01em;
  color: var(--gh-ink);
}
.gh-wrap { max-width: 688px; margin: 0 auto; padding: 56px 24px 80px; }
.gh-hero { margin: 0 0 40px; }
.gh-cat {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--gh-accent);
  margin: 0 0 16px;
}
.gh-hero h1 {
  font-size: 2.7rem;
  line-height: 1.12;
  letter-spacing: -0.02em;
  font-weight: 800;
  margin: 0 0 20px;
}
.gh-byline {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--gh-border-subtle);
}
.gh-byline .gh-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--gh-border);
  flex: 0 0 auto;
}
.gh-byline .gh-author-meta { display: flex; flex-direction: column; line-height: 1.35; }
.gh-byline .gh-author-name { color: var(--gh-ink); font-weight: 600; font-size: 1rem; }
.gh-byline .gh-author-sub { color: var(--gh-muted); font-size: 0.9rem; }
h2 { font-size: 1.65rem; line-height: 1.25; letter-spacing: -0.01em; font-weight: 700; margin: 56px 0 16px; }
h3 { font-size: 1.2rem; font-weight: 700; margin: 36px 0 8px; }
p { margin: 0 0 24px; }
a { color: var(--gh-link); text-decoration: none; }
a:hover { color: var(--gh-link-hover); text-decoration: underline; }
strong { color: var(--gh-ink); font-weight: 700; }
em { font-style: italic; }
hr { border: 0; border-top: 1px solid var(--gh-border); margin: 48px 0; }
ul, ol { margin: 0 0 24px; padding-left: 1.5em; }
li { margin: 6px 0; }
blockquote {
  margin: 36px 0;
  padding: 4px 0 4px 24px;
  border-left: 4px solid var(--gh-accent);
  font-size: 1.5rem;
  line-height: 1.35;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--gh-ink);
}
blockquote p { margin: 0; }
blockquote p:last-child { margin-bottom: 0; }
code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.85em;
  background: var(--gh-raised);
  border-radius: 6px;
  padding: 0.15em 0.4em;
}
pre {
  background: var(--gh-raised);
  border: 1px solid var(--gh-border);
  border-radius: 8px;
  padding: 16px 20px;
  overflow-x: auto;
}
pre code { background: none; padding: 0; font-size: 0.8em; }
.table-scroll { overflow-x: auto; margin: 0 0 24px; }
table { border-collapse: collapse; width: 100%; font-size: 0.92rem; }
th, td { border: 1px solid var(--gh-border); padding: 8px 14px; text-align: left; }
thead th { background: var(--gh-raised); font-weight: 700; }
tbody tr:nth-child(even) { background: var(--gh-raised); }
iframe { border-radius: 8px; border: 1px solid var(--gh-border) !important; }
.readnext {
  display: block;
  margin-top: 64px;
  padding: 24px;
  border: 1px solid var(--gh-border);
  border-radius: 12px;
  background: var(--gh-bg);
  text-decoration: none;
}
.readnext:hover { border-color: var(--gh-accent); text-decoration: none; }
.readnext .rn-kicker { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--gh-muted); }
.readnext .rn-title { display: block; margin-top: 6px; color: var(--gh-link); font-weight: 700; font-size: 1.1rem; }
footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid var(--gh-border-subtle); color: var(--gh-muted); font-size: 0.85rem; }
footer p { margin: 0 0 6px; }
footer p:last-child { margin-bottom: 0; }
.gh-disclaimer { font-style: italic; }
@media (max-width: 600px) {
  .gh-wrap { padding: 32px 18px 56px; }
  .gh-hero h1 { font-size: 2rem; }
  body { font-size: 18px; }
  blockquote { font-size: 1.25rem; }
}
`.trim();
}

// Drop the leading "# Title" the markdown body opens with — in the blog layout
// the title is rendered in the hero header from article.title instead.
function stripLeadingH1(html) {
  return html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/, "");
}

function githubBlogPage(article, bodyHtml, sibling) {
  const canonical = `${SITE.baseUrl}${article.slug}.html`;
  const body = stripLeadingH1(bodyHtml);
  const b = resolveByline(article);
  const sub = bylineSubHtml(b);
  const byline =
    b.author && !b.hideByline
      ? `<div class="gh-byline">
${b.avatar ? `<img class="gh-avatar" src="./figures/${escapeHtml(b.avatar)}" alt="${escapeHtml(b.author)}" width="48" height="48">` : ""}
<span class="gh-author-meta">
<span class="gh-author-name">${escapeHtml(b.author)}</span>
${sub ? `<span class="gh-author-sub">${sub}</span>` : ""}
</span>
</div>`
      : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(article.title)} — ${escapeHtml(SITE.name)}</title>
<meta name="description" content="${escapeHtml(article.description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(article.title)}">
<meta property="og:description" content="${escapeHtml(article.description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta name="robots" content="index,follow">
<style>${githubBlogStyles()}</style>
</head>
<body>
<header class="masthead"><span class="mast-name">${escapeHtml(SITE.name)}</span></header>
<main class="gh-wrap">
<article>
<header class="gh-hero">
${article.category ? `<p class="gh-cat">${escapeHtml(article.category)}</p>` : ""}
<h1>${escapeHtml(article.title)}</h1>
${byline}
</header>
${body}
</article>
${readNextBlock(sibling)}
<footer>
${b.disclaimer && !b.hideDisclaimer ? `<p class="gh-disclaimer">${escapeHtml(b.disclaimer)}</p>` : ""}
<p class="gh-colophon">${escapeHtml(SITE.name)} — ${escapeHtml(SITE.tagline)}.</p>
</footer>
</main>
</body>
</html>
`;
}

function page(article, bodyHtml, sibling) {
  if (article.theme === "github-blog") return githubBlogPage(article, bodyHtml, sibling);
  // Canonical/og:url always point at the stable per-article slug page, even for
  // the home article (which is also served at index.html) — so the shareable
  // long URL stays the preferred one regardless of which article is the root.
  const canonical = `${SITE.baseUrl}${article.slug}.html`;
  const body = stripLeadingH1(bodyHtml);
  const b = resolveByline(article);
  const sub = bylineSubHtml(b);
  const byline =
    b.author && !b.hideByline
      ? `<div class="byline">
${b.avatar ? `<img class="byline-avatar" src="./figures/${escapeHtml(b.avatar)}" alt="${escapeHtml(b.author)}" width="44" height="44">` : ""}
<span class="byline-meta">
<span class="byline-name">${escapeHtml(b.author)}</span>
${sub ? `<span class="byline-sub">${sub}</span>` : ""}
</span>
</div>`
      : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(article.title)} — ${escapeHtml(SITE.name)}</title>
<meta name="description" content="${escapeHtml(article.description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(article.title)}">
<meta property="og:description" content="${escapeHtml(article.description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta name="robots" content="index,follow">
<style>${styles()}</style>
</head>
<body>
<main class="wrap">
<p class="kicker">${escapeHtml(SITE.name)}</p>
<h1>${escapeHtml(article.title)}</h1>
${byline}
${body}
${readNextBlock(sibling)}
<footer>
${b.disclaimer && !b.hideDisclaimer ? `<p class="disclaimer">${escapeHtml(b.disclaimer)}</p>` : ""}
<p class="colophon">${escapeHtml(SITE.name)} — ${escapeHtml(SITE.tagline)}.</p>
</footer>
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

    // The home article is also served at the site root. It keeps its own stable
    // slug page (above) as the canonical URL; index.html is an additional copy.
    if (article.home) {
      await writeFile(resolve(OUT_DIR, "index.html"), html, "utf8");
      console.log(`  ✓ ${article.src} → dist/index.html (home)`);
    }
  }

  // Copy referenced static assets (chart SVGs, interactive HTML) so the
  // articles' ./figures/* links resolve in the published bubble.
  await cp(resolve(CONTENT_DIR, "figures"), resolve(OUT_DIR, "figures"), {
    recursive: true,
  });

  // A .nojekyll file keeps GitHub Pages from running Jekyll over the output.
  await writeFile(resolve(OUT_DIR, ".nojekyll"), "", "utf8");
  console.log(`Built ${ordered.length} article(s) to ${OUT_DIR}`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
