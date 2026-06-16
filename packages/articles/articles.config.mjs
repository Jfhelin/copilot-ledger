// Public article set — what the public site builds and deploys.
//
// This is the PUBLIC override of the manifest: the private repo's full
// articles.config.mjs lists every draft, but only what appears here is ever
// built or deployed. Three entries form a linked series (1 → 2 → 3), all
// listed and indexable; the home page's "Read next" leads into the chain and
// each article links on to the next. Slugs are kept stable so existing links
// survive:
//   1. blog3 — the public front page (`home: true` → `index.html` + its slug).
//   2. more-than-a-model — slug `a-coding-agent-is-more-than-a-model`.
//   3. what-your-ide-sends — slug `c964808fb248` (kept from when it was an
//      unlisted, link-only page, so that direct link still resolves).

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
    readNext: "a-coding-agent-is-more-than-a-model",
    order: 1,
  },
  {
    slug: "a-coding-agent-is-more-than-a-model",
    src: "more-than-a-model.md",
    title: "A coding agent is more than a model — what the harness decides",
    description:
      "Same Claude Sonnet 4.5 weights across three harnesses — Copilot CLI, Claude CLI, and Copilot in VS Code. A measured map of which behaviors come from the model provider and which come from harness design, and how those choices move what the model sees before it reasons.",
    readNext: "c964808fb248",
    order: 2,
  },
  {
    slug: "c964808fb248",
    src: "what-your-ide-sends.md",
    title: "How harness design shows up in coding-agent behavior",
    description:
      "Same Claude Sonnet 4.5 across the Copilot CLI and the Claude CLI, ten runs each on six tasks. How a harness's tool, search, delegation, and prompt choices show up as observable behaviour — and where they fade — plus a structural look at Copilot in VS Code.",
    order: 3,
  },
];
