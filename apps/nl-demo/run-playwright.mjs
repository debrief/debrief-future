#!/usr/bin/env node
/**
 * run-playwright.mjs — extract @sparticuz/chromium and invoke Playwright with
 * the bundled binary. Mirrors apps/web-shell/run-playwright.mjs.
 *
 * Usage:
 *   node run-playwright.mjs              # run all tests
 *   node run-playwright.mjs smoke.spec   # run a single spec
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const CHROMIUM_PATH_FILE = join(process.cwd(), 'playwright', '.chromium-path');

async function main() {
  console.log('[nl-demo] extracting chromium from @sparticuz/chromium...');
  const chromium = (await import('@sparticuz/chromium')).default;
  const executablePath = await chromium.executablePath();
  console.log(`[nl-demo] chromium at: ${executablePath}`);

  writeFileSync(CHROMIUM_PATH_FILE, executablePath, 'utf8');

  const args = process.argv.slice(2).join(' ');
  const command = `CHROMIUM_PATH="${executablePath}" pnpm exec playwright test --config=playwright/playwright.config.ts ${args}`;

  try {
    execSync(command, { stdio: 'inherit', shell: true, cwd: process.cwd() });
  } catch (error) {
    process.exitCode = error.status || 1;
  } finally {
    try {
      unlinkSync(CHROMIUM_PATH_FILE);
    } catch {
      /* noop */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
