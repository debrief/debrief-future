/**
 * Global setup for E2E tests.
 *
 * Starts code-server (if not already running via Docker) and waits
 * for it to be ready before any tests execute.
 *
 * In Docker mode (CODE_SERVER_URL set): just waits for readiness.
 * In local mode: starts code-server as a child process.
 */
import { execSync, spawn, type ChildProcess } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CODE_SERVER_URL = process.env.CODE_SERVER_URL ?? 'http://localhost:8080';
const WORKSPACE_PATH = join(__dirname, 'test-workspace');
const READY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

let codeServerProcess: ChildProcess | undefined;

async function waitForReady(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      // Try /healthz first (code-server), fall back to root (openvscode-server)
      const healthz = await fetch(`${url}/healthz`).catch(() => null);
      if (healthz?.ok) {
        console.log(`code-server ready at ${url}`);
        return;
      }
      const root = await fetch(url).catch(() => null);
      if (root?.ok) {
        console.log(`code-server ready at ${url}`);
        return;
      }
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`code-server not ready after ${timeoutMs}ms at ${url}`);
}

async function globalSetup(): Promise<void> {
  // If CODE_SERVER_URL is explicitly set, assume external management (Docker)
  if (process.env.CODE_SERVER_URL) {
    console.log(`Using external code-server at ${CODE_SERVER_URL}`);
    await waitForReady(CODE_SERVER_URL, READY_TIMEOUT_MS);
    return;
  }

  // Check if code-server is already running
  try {
    const healthz = await fetch(`${CODE_SERVER_URL}/healthz`).catch(() => null);
    const root = await fetch(CODE_SERVER_URL).catch(() => null);
    if (healthz?.ok || root?.ok) {
      console.log(`code-server already running at ${CODE_SERVER_URL}`);
      return;
    }
  } catch {
    // Not running — start it
  }

  console.log(`Starting code-server at ${CODE_SERVER_URL}...`);

  // Verify code-server is installed
  try {
    execSync('which code-server', { stdio: 'ignore' });
  } catch {
    throw new Error(
      'code-server not found. Install with: npm install -g code-server\n' +
        'Or use Docker: docker compose -f docker/code-server/docker-compose.yml up -d'
    );
  }

  // Start code-server
  codeServerProcess = spawn(
    'code-server',
    [
      '--auth',
      'none',
      '--bind-addr',
      '0.0.0.0:8080',
      '--disable-telemetry',
      WORKSPACE_PATH,
    ],
    {
      stdio: 'pipe',
      detached: true,
    }
  );

  // Store PID for teardown
  if (codeServerProcess.pid) {
    writeFileSync(
      join(__dirname, '.code-server-pid'),
      String(codeServerProcess.pid)
    );
  }

  // Don't let the child keep the parent alive
  codeServerProcess.unref();

  await waitForReady(CODE_SERVER_URL, READY_TIMEOUT_MS);
}

export default globalSetup;
