import { defineConfig } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Playwright configuration for code-server E2E tests.
 *
 * Browser resolution order:
 * 1. CHROMIUM_PATH env var (explicit path to chrome binary)
 * 2. .chromium-path file (written by ensure-chromium.sh)
 * 3. CLAUDE_CODE=1 env var (triggers sandboxed mode)
 * 4. Default Playwright browser (local development)
 *
 * Setup: run `bash tests/e2e/scripts/ensure-chromium.sh` to download
 * Chromium from the GH release when the Playwright CDN is unavailable.
 *
 * Environment variables:
 * - CODE_SERVER_URL: Base URL for code-server (default: http://localhost:8080)
 * - CHROMIUM_PATH: Path to chromium binary (overrides all other resolution)
 * - CLAUDE_CODE: Set to '1' to enable sandboxed chromium flags
 * - E2E_HEADED: Set to '1' to run in headed mode (use with xvfb-run in CI)
 *
 * @see tests/e2e/scripts/ensure-chromium.sh
 * @see docs/project_notes/playwright-installation-research.md
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read chromium path from file or env var
const chromiumPathFile = join(__dirname, '.chromium-path');
let chromiumPath: string | undefined = process.env.CHROMIUM_PATH;
if (!chromiumPath && existsSync(chromiumPathFile)) {
  chromiumPath = readFileSync(chromiumPathFile, 'utf8').trim();
}
const useSandboxedChromium = !!chromiumPath || process.env.CLAUDE_CODE === '1';
const useHeadedMode = process.env.E2E_HEADED === '1';

const CODE_SERVER_URL = process.env.CODE_SERVER_URL ?? 'http://localhost:8080';

// Launch options for sandboxed/cloud environments.
// NOTE: --single-process is intentionally omitted — it causes the browser to
// crash after each test in constrained sandboxes (see web-shell config and
// docs/project_notes/playwright-installation-research.md). Instead we use
// --disable-features=IsolateOrigins,site-per-process which achieves sandbox
// compatibility without crashing.
//
// E2E_HEADED=1 switches to headed mode for webview testing.
// Use with xvfb-run in CI: xvfb-run --auto-servernum npx playwright test ...
const launchOptions = useSandboxedChromium
  ? {
      executablePath: chromiumPath,
      headless: !useHeadedMode,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--no-zygote',
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

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: CODE_SERVER_URL,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    launchOptions,
    // code-server pages can be slow to load
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  timeout: 60_000,
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  // No webServer — code-server is started by global-setup or Docker
});
