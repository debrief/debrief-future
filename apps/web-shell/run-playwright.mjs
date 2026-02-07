/**
 * Script to run Playwright tests with sparticuz/chromium in Claude Code.
 */
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const CHROMIUM_PATH_FILE = join(process.cwd(), 'playwright', '.chromium-path');

async function main() {
  console.log('Extracting chromium from @sparticuz/chromium...');

  // Import and extract chromium
  const chromium = (await import('@sparticuz/chromium')).default;
  const executablePath = await chromium.executablePath();
  console.log(`Chromium extracted to: ${executablePath}`);

  // Write the path to a file that the config can read synchronously
  writeFileSync(CHROMIUM_PATH_FILE, executablePath, 'utf8');

  console.log('Running Playwright tests...');

  // Build the command with args and explicit config path
  const args = process.argv.slice(2).join(' ');
  const command = `CHROMIUM_PATH="${executablePath}" pnpm exec playwright test --config=playwright/playwright.config.ts ${args}`;

  try {
    // Run playwright with the chromium path set in command
    execSync(command, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    });
  } catch (error) {
    // execSync throws on non-zero exit, but we've already shown output
    process.exitCode = error.status || 1;
  } finally {
    // Cleanup the temp file
    try {
      unlinkSync(CHROMIUM_PATH_FILE);
    } catch {
      // Ignore cleanup errors
    }
  }
}

main().catch(console.error);
