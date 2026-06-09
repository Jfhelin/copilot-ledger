// The published bubble's article set. Each entry is one standalone page.
//
// This is intentionally a tiny, explicit manifest (not folder auto-discovery)
// so that adding/removing a public page is a deliberate one-line edit — there is
// no mechanism by which an unlisted draft can leak into the build.
//
// `slug` becomes the output filename (`<slug>.html`). The entry whose slug is
// "index" is the site root. `src` is resolved relative to repo `docs/articles/`.
// Order controls the "Read next" footer link (the only inter-page navigation).

export const SITE = {
  name: "Copilot Ledger",
  // Used only for <title>/meta; no link target is rendered to the wider lab.
  tagline: "Notes on how AI coding agents actually behave",
};

export const ARTICLES = [
  {
    slug: "index",
    src: "why-n1-benchmarks-mislead.md",
    title: "Why coding-agent comparisons keep disagreeing",
    description:
      "Same task, same model family, six runs — an ~18× cost spread. Why single-run timing/cost/cache comparisons measure variance and configuration, not harness effectiveness.",
    order: 1,
  },
  {
    slug: "what-actually-differs",
    src: "what-actually-differs.md",
    title:
      "What actually differs between VS Code Copilot, Claude Code in VS Code, and the Claude CLI",
    description:
      "Same Sonnet weights, 22k–131k tokens before you type. A measured decomposition of what each environment injects, what the harness controls, and what you do.",
    order: 2,
  },
];
