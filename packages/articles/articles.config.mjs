// Public article set — the single published "bubble" page.
//
// This is the PUBLIC override of the manifest: the private repo's full
// articles.config.mjs lists every draft, but only what appears here is ever
// built or deployed. Keep this blog3-only. The entry is marked `home: true`,
// so it is emitted both as `index.html` (site root `/`) and as its stable
// `<slug>.html` — share the slug URL, which survives any future reshuffle.

export const SITE = {
  name: "Copilot Ledger",
  tagline: "Notes on how AI coding agents actually behave",
  baseUrl: "https://jfhelin.github.io/copilot-ledger/",
  author: "Jonas Helin",
  authorTitle: "Strategic Cloud Solutions Engineer",
  avatar: "author-jonas.png",
  authorOrg: "GitHub",
  disclaimer:
    "I work at GitHub. This is my personal blog — views are my own, not company-sponsored.",
};

export const ARTICLES = [
  {
    slug: "one-run-cant-rank-two-agents-blog3",
    home: true,
    src: "one-run-cant-rank-two-agents-blog3.md",
    title: "One run can't rank two coding agents",
    description:
      "Same model, same repo, same prompt, 40 headless runs across the Copilot CLI and the Claude CLI. Why the cost gap traced back to a paragraph of system-prompt wording — batch your tool calls — not to which agent is smarter.",
    theme: "github-blog",
    category: "AI & ML",
    date: "June 11, 2026",
    order: 1,
  },
];
