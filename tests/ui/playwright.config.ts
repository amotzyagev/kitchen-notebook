import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.', testMatch: 'shopping-list.spec.ts',
  use: { baseURL: 'http://127.0.0.1:4175', channel: 'chrome', screenshot: 'only-on-failure', viewport: { width: 390, height: 844 } },
  webServer: { command: 'npx vite --config vite.config.mts', url: 'http://127.0.0.1:4175', reuseExistingServer: false, timeout: 60000 },
})
