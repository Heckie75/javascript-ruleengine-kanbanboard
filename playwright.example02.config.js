const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e-example02',
  use: {
    baseURL: 'http://127.0.0.1:4175',
    browserName: 'chromium'
  },
  webServer: {
    command: 'npm run dev:example02 -- --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: !process.env.CI
  }
});