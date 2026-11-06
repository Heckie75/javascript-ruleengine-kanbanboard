const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e-example01',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    browserName: 'chromium'
  },
  webServer: {
    command: 'npm run dev:example01 -- --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI
  }
});