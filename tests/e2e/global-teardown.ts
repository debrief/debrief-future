/**
 * Global teardown for E2E tests.
 *
 * Stops code-server if it was started by global-setup.
 * In Docker mode (CODE_SERVER_URL set): no-op (Docker manages the lifecycle).
 */
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function globalTeardown(): Promise<void> {
  // If using external code-server (Docker), nothing to stop
  if (process.env.CODE_SERVER_URL) {
    console.log('External code-server — skipping teardown');
    return;
  }

  const pidFile = join(__dirname, '.code-server-pid');
  if (!existsSync(pidFile)) {
    console.log('No code-server PID file — skipping teardown');
    return;
  }

  try {
    const pid = parseInt(readFileSync(pidFile, 'utf8').trim(), 10);
    console.log(`Stopping code-server (PID ${pid})...`);
    process.kill(pid, 'SIGTERM');
  } catch (err) {
    // Process may have already exited
    console.log(`code-server cleanup: ${err}`);
  } finally {
    try {
      unlinkSync(pidFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

export default globalTeardown;
