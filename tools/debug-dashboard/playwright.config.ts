/**
 * Playwright configuration for debug dashboard e2e tests.
 * Feature: 024-document-session-state
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node ../../services/session-state/dist/standalone.js',
    url: 'http://localhost:3001/health',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
