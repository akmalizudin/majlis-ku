import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    // A low-end Android phone: 360 px wide, touch.
    {
      name: "mobile",
      use: {
        ...devices["Galaxy S9+"],
        viewport: { width: 360, height: 740 },
        // A fake microphone so the voice recorder can be tested.
        permissions: ["microphone"],
        launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
      },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { AUTH_URL: `http://localhost:${PORT}`, NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}` },
  },
});
