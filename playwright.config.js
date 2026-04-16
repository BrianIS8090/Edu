const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true
  },
  webServer: {
    command: 'python -m http.server 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 30000
  }
});
