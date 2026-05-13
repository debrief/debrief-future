/**
 * Cloud-friendly Playwright runner for shared/components/e2e/.
 *
 * Mirrors `apps/web-shell/run-playwright.mjs` — extracts the bundled
 * `@sparticuz/chromium` binary and runs Playwright against a locally-served
 * Storybook static build.
 *
 * Steps:
 *   1. Build Storybook to `storybook-static/` (skipped if `--no-build`).
 *   2. Extract @sparticuz/chromium to `/tmp/chromium`.
 *   3. Start a static http-server on port 6006 serving storybook-static.
 *   4. Run Playwright tests with CLAUDE_CODE=1 against `http://localhost:6006`.
 *   5. Clean up the server.
 *
 * Usage from `shared/components/`:
 *   node run-playwright.mjs                     # run all e2e tests
 *   node run-playwright.mjs spec258-screenshots # run a specific spec
 *   node run-playwright.mjs --no-build          # skip Storybook rebuild
 */

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const PORT = 6006;
const STORYBOOK_STATIC = join(process.cwd(), 'storybook-static');

async function main() {
  const args = process.argv.slice(2);
  const skipBuild = args.includes('--no-build');
  const playwrightArgs = args.filter((a) => a !== '--no-build');

  if (!skipBuild) {
    console.log('[run-playwright] Building Storybook static…');
    execSync('pnpm exec storybook build --quiet', { stdio: 'inherit' });
  } else if (!existsSync(STORYBOOK_STATIC)) {
    console.error(
      '[run-playwright] storybook-static/ missing — run without --no-build first.',
    );
    process.exit(2);
  }

  console.log('[run-playwright] Extracting chromium from @sparticuz/chromium…');
  const chromium = (await import('@sparticuz/chromium')).default;
  const executablePath = await chromium.executablePath();
  console.log(`[run-playwright] Chromium ready at: ${executablePath}`);

  console.log(`[run-playwright] Starting static server on port ${PORT}…`);
  const server = spawn(
    'http-server',
    [STORYBOOK_STATIC, '-p', String(PORT), '--silent'],
    { stdio: 'pipe' },
  );

  // Give the server a moment to bind, then probe it.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  try {
    execSync(`curl -sf http://localhost:${PORT}/iframe.html -o /dev/null`, {
      stdio: 'inherit',
    });
  } catch {
    console.error('[run-playwright] Static server failed to come up.');
    server.kill('SIGTERM');
    process.exit(2);
  }

  console.log('[run-playwright] Running Playwright tests…');
  const argsJoined = playwrightArgs.join(' ');
  const command = `CLAUDE_CODE=1 pnpm exec playwright test ${argsJoined}`;
  let exitCode = 0;
  try {
    execSync(command, { stdio: 'inherit', shell: true });
  } catch (error) {
    exitCode = error.status ?? 1;
  } finally {
    console.log('[run-playwright] Stopping static server…');
    server.kill('SIGTERM');
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('[run-playwright] Failed:', err);
  process.exit(1);
});
