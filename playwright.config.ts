import { defineConfig } from "@playwright/test";
import "dotenv/config";
import { join } from "node:path";
import { tmpdir } from "node:os";
const authState = (process.env.SELRS_E2E_AUTH_STATE ??= join(
  tmpdir(),
  `selrs-e2e-auth-${process.pid}.json`,
));

// Keep the browser cache in the checked-out workspace so service-account and
// interactive test runs use the same downloaded revision.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0";

export default defineConfig({
  globalSetup: "./tests/e2e/global-setup.ts",
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://127.0.0.1:4000/healthz",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:4000",
    storageState: authState,
    headless: true,
    browserName: "chromium",
  },
});
