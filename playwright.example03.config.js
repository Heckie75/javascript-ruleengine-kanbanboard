const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e-example03',
  use: {
    baseURL: 'http://127.0.0.1:4176',
    browserName: 'chromium'
  },
  webServer: {
    command: 'npm run dev:example03 -- --port 4176',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: !process.env.CI
  }
});
