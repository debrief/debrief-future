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

const CODE_SERVER_URL = process.env.CODE_SERVER_URL ?? 'http://localhost:8080';

// Launch options for sandboxed/cloud environments.
// --single-process and --no-zygote are required to avoid renderer crashes
// in containerized environments (the VS Code workbench is too complex for
// multi-process chromium in constrained sandboxes).
const launchOptions = useSandboxedChromium
  ? {
      executablePath: chromiumPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--single-process',
        '--no-zygote',
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
