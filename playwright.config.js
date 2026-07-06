const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:8010',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 8010',
    url: 'http://127.0.0.1:8010',
    reuseExistingServer: true,
    timeout: 15_000
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
});
