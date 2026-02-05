import { defineConfig } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Playwright configuration for web-shell E2E tests.
 *
 * In Claude Code environment, uses @sparticuz/chromium which bundles Chromium.
 * Standard browser downloads are blocked (403 from CDN).
 *
 * @see https://playwright.dev/docs/test-configuration
 * @see docs/project_notes/playwright-installation-research.md
 */

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read chromium path from file (written by run-playwright.mjs) or env var
const chromiumPathFile = join(__dirname, '.chromium-path');
let chromiumPath: string | undefined = process.env.CHROMIUM_PATH;
if (!chromiumPath && existsSync(chromiumPathFile)) {
  chromiumPath = readFileSync(chromiumPathFile, 'utf8').trim();
}
const useSparticuz = !!chromiumPath;

// Debug: log chromium path detection
console.log(`Playwright config: useSparticuz=${useSparticuz}, chromiumPath=${chromiumPath}`);

// Launch options for sparticuz chromium
const launchOptions = useSparticuz
  ? {
      executablePath: chromiumPath,
      headless: true,
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--no-zygote',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--single-process',
      ],
    }
  : undefined;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Disable parallel to avoid chromium issues
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for stability with sparticuz
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    // Apply launch options at use level
    launchOptions,
  },
  // No projects - use single config
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  timeout: 30000,
});
