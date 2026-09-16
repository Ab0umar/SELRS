import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "client/src"),
      "@shared": path.resolve(projectRoot, "shared"),
    },
  },
  test: {
    include: ["server/tests/**/*.test.ts"],
    setupFiles: ["server/tests/vitest.setup.ts"],
    testTimeout: 30_000,
  },
});
