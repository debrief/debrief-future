/**
 * Playwright configuration for Storybook e2e tests.
 *
 * Supports two environments:
 * - Standard: Uses Playwright's bundled Chromium
 * - Claude Code: Uses @sparticuz/chromium with sandbox-disable flags
 *
 * To run in Claude Code sessions:
 *   CLAUDE_CODE=1 pnpm test:e2e
 *
 * See docs/project_notes/playwright-installation-research.md for details.
 */

import { defineConfig, devices } from '@playwright/test';

// Claude Code environment detection
const isClaudeCode = !!process.env.CLAUDE_CODE;

// Claude Code requires special launch options due to sandbox restrictions
const claudeCodeLaunchOptions = {
  executablePath: '/tmp/chromium', // From @sparticuz/chromium
  args: [
    '--disable-setuid-sandbox',
    '--no-sandbox',
    '--no-zygote',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-features=IsolateOrigins,site-per-process',
  ],
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !isClaudeCode, // Serial execution in Claude Code for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI || isClaudeCode ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:6006',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Apply Claude Code launch options when detected
    ...(isClaudeCode && { launchOptions: claudeCodeLaunchOptions }),
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Override launch options for Claude Code
        ...(isClaudeCode && { launchOptions: claudeCodeLaunchOptions }),
      },
    },
  ],
  webServer: isClaudeCode
    ? undefined // No webServer in Claude Code - use page.setContent() instead
    : {
        command: 'pnpm storybook',
        url: 'http://localhost:6006',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  // Screenshot output directory for media capture
  snapshotDir: './screenshots',
});
