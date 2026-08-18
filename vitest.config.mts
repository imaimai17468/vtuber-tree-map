import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    isolate: false,
    setupFiles: ["./src/test-setup.ts"],
    // AGENTS.md "Testing": pure functions require 100% branch coverage.
    // `include` is the full list of modules held to it — add each new pure
    // module here alongside its test.
    coverage: {
      include: ["src/entities/**"],
      thresholds: {
        perFile: true,
        branches: 100,
      },
    },
  },
});
