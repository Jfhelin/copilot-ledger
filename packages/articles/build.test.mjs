import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, "../..");

test("both article layouts preserve viewer footers and standalone exports", () => {
  const root = mkdtempSync(join(tmpdir(), "ledger-articles-"));
  try {
    const articles = join(root, "packages/articles");
    const theme = join(root, "packages/cost-view/src/lib");
    const figures = join(root, "docs/articles/figures");
    const standalone = join(articles, "static/VSCodeBuildCart");
    for (const dir of [articles, theme, figures, standalone]) mkdirSync(dir, { recursive: true });
    writeFileSync(join(root, "package.json"), '{"type":"module"}');
    symlinkSync(join(repoRoot, "node_modules"), join(root, "node_modules"), "dir");
    cpSync(join(packageDir, "build.mjs"), join(articles, "build.mjs"));
    cpSync(join(repoRoot, "packages/cost-view/src/lib/theme.js"), join(theme, "theme.js"));
    writeFileSync(join(articles, "articles.config.mjs"), `
      export const SITE = {
        name: "Test", tagline: "Test", baseUrl: "https://example.test/",
        agentvizUrl: "https://example.test/agentviz/?a=1&b=2"
      };
      export const ARTICLES = [
        { slug: "lab", src: "test.md", title: "Lab", description: "Test", order: 1 },
        { slug: "blog", src: "test.md", title: "Blog", description: "Test", order: 2, theme: "github-blog" }
      ];
    `);
    writeFileSync(join(root, "docs/articles/test.md"), "# Test\n\nBody.");
    writeFileSync(join(standalone, "index.html"), "<html>Standalone export</html>");
    execFileSync(process.execPath, [join(articles, "build.mjs")], { encoding: "utf8" });
    for (const slug of ["lab", "blog"]) {
      const html = readFileSync(join(articles, "dist", `${slug}.html`), "utf8");
      assert.match(html, /<a href="https:\/\/example\.test\/agentviz\/\?a=1&amp;b=2">Open Agentviz Studio<\/a>/);
    }
    assert.equal(
      readFileSync(join(articles, "dist/VSCodeBuildCart/index.html"), "utf8"),
      "<html>Standalone export</html>",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
