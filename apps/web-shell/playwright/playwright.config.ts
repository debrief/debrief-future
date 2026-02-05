import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for web-shell E2E tests.
 *
 * In Claude Code environment, uses @sparticuz/chromium which bundles Chromium.
 * Standard browser downloads are blocked (403 from CDN).
 *
 * @see https://playwright.dev/docs/test-configuration
 * @see docs/project_notes/playwright-installation-research.md
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Single worker for stability with sparticuz
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // Use sparticuz chromium when CHROMIUM_PATH is set (Claude Code environment)
    ...(process.env.CHROMIUM_PATH && {
      launchOptions: {
        executablePath: process.env.CHROMIUM_PATH,
        args: [
          '--disable-setuid-sandbox',
          '--no-sandbox',
          '--no-zygote',
          '--disable-gpu',
          '--disable-dev-shm-usage',
        ],
      },
    }),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  timeout: 30000,
});
