import { defineConfig, devices } from "@playwright/test";

// Playwright smoke tests for the Vizzel Track Demo (Boss) app.
//
// By default we point at the deployed Fly.io URL so the tests double as a
// post-deploy smoke check. Override BASE_URL when running against a local
// dev server (npm run dev) or staging.
const baseURL = process.env.BASE_URL || "https://vizzel-track-demo-boss.fly.dev";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    locale: "th-TH",
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
