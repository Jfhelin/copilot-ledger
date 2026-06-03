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
  },
});
