// Public article set — what the public site builds and deploys.
//
// This is the PUBLIC override of the manifest: the private repo's full
// articles.config.mjs lists every draft, but only what appears here is ever
// built or deployed. Two entries:
//   1. blog3 — the public front page (`home: true` → `index.html` + its slug).
//   2. what-your-ide-sends — an UNLISTED article: a random, hard-to-guess slug,
//      `noindex`, and `unlisted: true` so no page links to it (the home page's
//      "Read next" skips it). It is reachable only by its direct URL; share that
//      link, don't expect it to be discoverable.

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
  {
    slug: "c964808fb248",
    src: "what-your-ide-sends.md",
    title: "How harness design shows up in coding-agent behavior",
    description:
      "Same Claude Sonnet 4.5 across the Copilot CLI and the Claude CLI, ten runs each on six tasks. How a harness's tool, search, delegation, and prompt choices show up as observable behaviour — and where they fade — plus a structural look at Copilot in VS Code.",
    unlisted: true,
    robots: "noindex, nofollow",
    order: 2,
  },
];
