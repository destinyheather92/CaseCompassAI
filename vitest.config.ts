import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

loadEnv({ path: ".env.local" });

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // The `server-only` marker package's default export condition
      // throws (it expects a bundler that sets the `react-server`
      // condition, like Next's). Under plain Vitest/Node we want the
      // no-op build it ships for that condition instead, so files that
      // import "server-only" are still testable.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  plugins: [react()],
  test: {
    // Default environment is node; component tests opt into jsdom
    // individually via a `// @vitest-environment jsdom` docblock.
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
