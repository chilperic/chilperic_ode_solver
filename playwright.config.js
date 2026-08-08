const fs = require('fs');
const { execFileSync } = require('child_process');
const { defineConfig, devices } = require('@playwright/test');

function freshPort() {
  return Number(execFileSync('python3', ['-c', "import socket;s=socket.socket();s.bind(('127.0.0.1',0));print(s.getsockname()[1]);s.close()"], { encoding: 'utf8' }).trim());
}
const requestedPort = Number(process.env.FOKOLAB_PORT);
const PORT = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : freshPort();
// Playwright reloads this config in worker processes. Persist the selected port
// so the web server and every worker use one fresh port for this entire run.
process.env.FOKOLAB_PORT = String(PORT);
const HOST = process.env.FOKOLAB_HOST || '127.0.0.1';
const systemChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const chromiumUse = systemChromium ? {
  browserName: 'chromium',
  launchOptions: {
    executablePath: systemChromium,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  }
} : { browserName: 'chromium' };
const allBrowsers = process.env.FOKOLAB_ALL_BROWSERS === '1';
const projects = allBrowsers ? [
  { name: 'chromium', use: chromiumUse },
  { name: 'firefox', use: { browserName: 'firefox' } },
  { name: 'webkit', use: { browserName: 'webkit' } },
  { name: 'mobile-chromium', use: { ...devices['Pixel 7'], ...(systemChromium ? chromiumUse : {}) } }
] : [{ name: 'chromium', use: chromiumUse }];

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: Number(process.env.FOKOLAB_E2E_WORKERS || 1),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: true,
    timeout: 20_000
  },
  projects
});
