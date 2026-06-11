// The published bubble's article set. Each entry is one standalone page.
//
// This is intentionally a tiny, explicit manifest (not folder auto-discovery)
// so that adding/removing a public page is a deliberate one-line edit — there is
// no mechanism by which an unlisted draft can leak into the build.
//
// `slug` becomes the output filename (`<slug>.html`) and is the article's
// stable, permanent URL — share that, not the bare site root, so the link
// survives any future reshuffle of which article is the front page. The entry
// marked `home: true` is ALSO emitted as `index.html` (the site root); change
// that flag to move the front page without breaking any shared `<slug>.html`
// link. `src` is resolved relative to repo `docs/articles/`. Order controls the
// "Read next" footer link (the only inter-page navigation).

export const SITE = {
  name: "Copilot Ledger",
  // Used only for <title>/meta; no link target is rendered to the wider lab.
  tagline: "Notes on how AI coding agents actually behave",
  // Public origin of the published bubble, with trailing slash. Used to build
  // absolute canonical / og:url tags so the stable per-article slug URL is the
  // one search engines and link unfurlers prefer (not the root index.html copy).
  baseUrl: "https://jfhelin.github.io/copilot-ledger/",
  // Author's employer, appended to the byline title as "<title> at <org>" on
  // blog-themed pages. A per-article `authorOrg` overrides this default.
  authorOrg: "GitHub",
  // Personal-views disclaimer rendered in the footer of blog-themed pages (the
  // ones that carry an author byline). A per-article `disclaimer` overrides it.
  disclaimer:
    "I work at GitHub. This is my personal blog — views are my own, not company-sponsored.",
};

export const ARTICLES = [
  {
    slug: "one-run-cant-rank-two-agents",
    home: true,
    src: "one-run-cant-rank-two-agents.md",
    title: "One run can't tell two coding agents apart",
    description:
      "Same model, same repo, same prompt, 40 runs across the Copilot CLI and the Claude CLI. Why a single timed run measures run-to-run variance and local configuration — not which harness is better.",
    order: 1,
  },
  {
    slug: "one-run-cant-rank-two-agents-blog",
    src: "one-run-cant-rank-two-agents-blog.md",
    title: "One run can't rank two coding agents",
    description:
      "Same model, same repo, same prompt, 40 headless runs across the Copilot CLI and the Claude CLI. Coding agents are models plus harnesses — and a single run measures harness behavior and variance, not which agent is better.",
    // Renders with a blog-style post layout (hero title, category label,
    // author/date byline, clean serif-free reading column) instead of the
    // default lab style. This is an independent Copilot Ledger page — it mimics
    // a typical tech-blog format but is not affiliated with the GitHub Blog.
    theme: "github-blog",
    category: "AI & ML",
    author: "Jonas Helin",
    authorTitle: "Strategic Cloud Solutions Engineer",
    avatar: "author-jonas.png",
    date: "June 10, 2026",
    order: 2,
  },
  {
    slug: "one-run-cant-rank-two-agents-blog2",
    src: "one-run-cant-rank-two-agents-blog2.md",
    title: "One run can't rank two coding agents",
    description:
      "Same model, same repo, same prompt, 40 headless runs across the Copilot CLI and the Claude CLI. Coding agents are models plus harnesses — and a single run measures harness behavior and variance, not which agent is better.",
    theme: "github-blog",
    category: "AI & ML",
    author: "Jonas Helin",
    authorTitle: "Strategic Cloud Solutions Engineer",
    avatar: "author-jonas.png",
    date: "June 10, 2026",
    order: 3,
  },
  {
    slug: "why-n1-benchmarks-mislead",
    src: "why-n1-benchmarks-mislead.md",
    title: "Why coding-agent comparisons keep disagreeing",
    description:
      "Same task, same model family, six runs — an ~18× cost spread. Why single-run timing/cost/cache comparisons measure variance and configuration, not harness effectiveness.",
    order: 4,
  },
  {
    slug: "what-actually-differs",
    src: "what-actually-differs.md",
    title:
      "What actually differs between VS Code Copilot, Claude Code in VS Code, and the Claude CLI",
    description:
      "Same Sonnet weights, 22k–131k tokens before you type. A measured decomposition of what each environment injects, what the harness controls, and what you do.",
    order: 5,
  },
];
