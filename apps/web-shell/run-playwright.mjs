/**
 * Script to run Playwright tests with sparticuz/chromium in Claude Code.
 */
import { execSync, spawn } from 'child_process';

async function main() {
  console.log('Extracting chromium from @sparticuz/chromium...');
  
  // Import and extract chromium
  const chromium = (await import('@sparticuz/chromium')).default;
  const executablePath = await chromium.executablePath();
  console.log(`Chromium extracted to: ${executablePath}`);
  
  // Set environment variable for Playwright config
  process.env.CHROMIUM_PATH = executablePath;
  
  console.log('Running Playwright tests...');
  
  // Run playwright
  const result = spawn('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, CHROMIUM_PATH: executablePath },
    cwd: process.cwd(),
  });
  
  result.on('close', (code) => {
    process.exit(code);
  });
}

main().catch(console.error);
