import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base so the built assets load under any path, including a
  // GitHub Pages project subpath (e.g. /copilot-ledger/).
  base: "./",
  plugins: [react()],
  server: { port: 3000, host: "127.0.0.1" },
  build: { outDir: "dist", sourcemap: true },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    coverage: {
      provider: "v8",
      // Measure the pure-logic and hook source we care about. Components and
      // entry points are exercised indirectly; reporting is informational
      // (no enforced thresholds yet — see plan) so CI stays stable.
      include: ["src/lib/**", "src/hooks/**"],
      reporter: ["text", "html"],
    },
  },
});
