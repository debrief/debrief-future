import { defineConfig } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Playwright configuration for the NL Demo (#189).
 *
 * Mirrors apps/web-shell/playwright/playwright.config.ts. In Claude Code or CI
 * the bundled @sparticuz/chromium is detected via the .chromium-path file
 * written by run-playwright.mjs. On local macOS/Windows, the user can install
 * chromium with `pnpm exec playwright install chromium` and run vanilla.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const chromiumPathFile = join(__dirname, '.chromium-path');
let chromiumPath: string | undefined = process.env.CHROMIUM_PATH;
if (!chromiumPath && existsSync(chromiumPathFile)) {
  chromiumPath = readFileSync(chromiumPathFile, 'utf8').trim();
}
const useSparticuz = !!chromiumPath;

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
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
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

const SERVER_PORT = process.env.NL_DEMO_PORT ?? '8765';
const BASE_URL = `http://localhost:${SERVER_PORT}`;
// #190 — fixed loopback port for the live-proxy stub. e2e/fixtures/
// live-config.valid.json points at this port. Keep stable.
const STUB_PROXY_PORT = process.env.NL_DEMO_STUB_PROXY_PORT ?? '18082';

export default defineConfig({
  testDir: '../e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
    launchOptions,
  },
  // #190: convert webServer to an array — Playwright starts both the demo's
  // static server and a stub-mode live-proxy. The stub requires no credential
  // and no network, so it runs fine in CI.
  webServer: [
    {
      // Pure-Node http-server avoids relying on `pnpm dlx` networked installs.
      command: `node ../scripts/serve.mjs ${SERVER_PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      cwd: __dirname,
    },
    {
      command: `node ../scripts/live-proxy.mjs --stub ../e2e/fixtures/live-stub.json`,
      url: `http://127.0.0.1:${STUB_PROXY_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
      cwd: __dirname,
      env: {
        PROXY_PORT: STUB_PROXY_PORT,
        PROXY_BIND: '127.0.0.1',
      },
    },
  ],
  timeout: 30_000,
});
