import { defineConfig } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Playwright config for the Tabular Results Panel webview E2E tests.
 *
 * Feature: 178-vscode-tabular-results
 *
 * These tests load the bundled `dist/webview/resultsPanel.js` into a
 * minimal HTML harness and drive it by posting fake `results:*`
 * extension messages.  They do NOT need code-server or a running VS
 * Code instance — the webview is R5 "stateless renderer" so driving it
 * via postMessage is equivalent to the real extension host.
 *
 * Browser resolution order (mirrors tests/e2e/playwright.config.ts):
 * 1. CHROMIUM_PATH env var
 * 2. tests/e2e/.chromium-path file
 * 3. Local Playwright chromium at /opt/pw-browsers/**
 * 4. Default Playwright browser
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const chromiumPathFile = join(__dirname, '../../tests/e2e/.chromium-path');
let chromiumPath: string | undefined = process.env.CHROMIUM_PATH;
if (!chromiumPath && existsSync(chromiumPathFile)) {
  chromiumPath = readFileSync(chromiumPathFile, 'utf8').trim();
}
// Fallback to the locally installed Playwright chromium binary if present.
if (!chromiumPath) {
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      chromiumPath = candidate;
      break;
    }
  }
}

const launchOptions = chromiumPath
  ? {
      executablePath: chromiumPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-zygote',
      ],
    }
  : undefined;

export default defineConfig({
  testDir: '.',
  testMatch: 'test-tabular-results-*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    viewport: { width: 1280, height: 720 },
    launchOptions,
    actionTimeout: 10_000,
    navigationTimeout: 10_000,
  },
  timeout: 30_000,
});
