/**
 * Global setup for Playwright tests in Claude Code environment.
 * Extracts the sparticuz/chromium binary before tests run.
 */
import chromium from '@sparticuz/chromium';

export default async function globalSetup() {
  // Extract chromium binary - this makes it available at the executablePath
  const executablePath = await chromium.executablePath();
  console.log(`Chromium extracted to: ${executablePath}`);

  // Store the path for use in config
  process.env.CHROMIUM_PATH = executablePath;
}
