import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'qa',
  timeout: 120_000,
  globalTimeout: 600_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    serviceWorkers: 'block',
    baseURL: 'http://127.0.0.1:4173/bonbon-boing/',
    trace: 'off',
    video: 'retain-on-failure',
    actionTimeout: 90_000,
    navigationTimeout: 30_000,
    ...devices['Desktop Chrome'],
    launchOptions: {
      args: ['--mute-audio'],
    },
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
