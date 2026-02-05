import { defineConfig } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Playwright configuration for web-shell E2E tests.
 *
 * Two browser modes:
 * - LOCAL (macOS/Windows): Run `pnpm exec playwright install chromium` first,
 *   then `pnpm test`. Uses native Playwright browser.
 * - CLOUD (CI, Claude Code, Lambda): Run `node run-playwright.mjs` which
 *   extracts the bundled @sparticuz/chromium Linux binary.
 *
 * Note: @sparticuz/chromium is Linux x86-64 only — fails on local macOS/Windows.
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
// Note: --single-process causes browser to crash after each test, so we avoid it.
// Instead we use --disable-dev-shm-usage and memory-saving flags for stability.
const launchOptions = useSparticuz
  ? {
      executablePath: chromiumPath,
      headless: true,
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
      ],
    }
  : undefined;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Disable parallel to avoid chromium issues
  forbidOnly: !!process.env.CI,
  retries: 1, // Retry once to handle transient browser issues
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
