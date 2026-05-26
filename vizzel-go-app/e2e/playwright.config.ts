import { defineConfig, devices } from "@playwright/test";

// E2E tests run against the locally-built Go binary (./bin/server.exe).
// `npm test` boots the binary with SQLite + a fresh demo seed and tears it
// down after the suite finishes.
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:18080";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    headless: true,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    locale: "th-TH",
  },
  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : {
        command:
          process.platform === "win32"
            ? "node ./tests/_server.mjs"
            : "node ./tests/_server.mjs",
        url: `${BASE_URL}/api/v1/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
