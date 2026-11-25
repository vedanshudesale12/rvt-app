import { defineConfig, devices } from "@playwright/test";

const port = 3000;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    channel: process.env.CI ? undefined : "chrome",
    screenshot: "off",
    trace: "off",
  },
  webServer: {
    command: `RVT_DEMO=1 npm run dev -- --port ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { RVT_DEMO: "1" },
  },
});
