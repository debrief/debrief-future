/**
 * Global setup for E2E tests.
 *
 * Starts a VS Code web server and waits for it to be ready before tests execute.
 *
 * Server resolution order:
 * 1. CODE_SERVER_URL env var → external server (Docker, CI)
 * 2. Already running on default port → reuse
 * 3. openvscode-server binary found → start it (preferred for sandboxed envs)
 * 4. code-server binary found → start it
 *
 * openvscode-server is preferred over code-server because it does not require
 * the proprietary vsda WASM module for WebSocket authentication.
 */
import { execSync, spawn, type ChildProcess } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_PORT = '8080';
const CODE_SERVER_URL =
  process.env.CODE_SERVER_URL ?? `http://localhost:${DEFAULT_PORT}`;
const WORKSPACE_PATH = join(__dirname, 'test-workspace');
const READY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

let serverProcess: ChildProcess | undefined;

async function isReachable(url: string): Promise<boolean> {
  try {
    const healthz = await fetch(`${url}/healthz`).catch(() => null);
    if (healthz?.ok) return true;
    const root = await fetch(url).catch(() => null);
    if (root?.ok) return true;
  } catch {
    // Not reachable
  }
  return false;
}

async function waitForReady(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isReachable(url)) {
      console.log(`VS Code server ready at ${url}`);
      return;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`VS Code server not ready after ${timeoutMs}ms at ${url}`);
}

function whichSync(cmd: string): string | null {
  try {
    return execSync(`which ${cmd}`, { stdio: 'pipe' }).toString().trim();
  } catch {
    return null;
  }
}

/**
 * Write machine-level settings to disable the Welcome tab and workspace trust.
 * The Welcome tab captures keyboard focus into an iframe, breaking shortcuts.
 * Workspace trust must be disabled so extensions activate without user interaction.
 */
function writeVSCodeSettings(dataDir: string): void {
  const settingsDir = join(dataDir, 'User');
  mkdirSync(settingsDir, { recursive: true });
  writeFileSync(
    join(settingsDir, 'settings.json'),
    JSON.stringify(
      {
        'security.workspace.trust.enabled': false,
        'workbench.startupEditor': 'none',
        'workbench.welcomePage.walkthroughs.openOnInstall': false,
        'workbench.tips.enabled': false,
      },
      null,
      2
    )
  );
}

/**
 * Ensure the Debrief config file exists with the test STAC store registered.
 * Without this, the STAC tree view is empty and the E2E test cannot open a plot.
 * In Docker, the Dockerfile handles this; for local runs, we seed it here.
 */
function ensureDebriefConfig(): void {
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  const configDir = join(xdgConfig, 'debrief');
  const configFile = join(configDir, 'config.json');

  if (existsSync(configFile)) {
    return; // Already configured (e.g. developer has their own stores)
  }

  const storePath = join(WORKSPACE_PATH, 'local-store');
  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    configFile,
    JSON.stringify(
      {
        stores: [
          {
            id: 'local-store',
            path: storePath,
            displayName: 'Test Maritime Data',
            status: 'available',
          },
        ],
        preferences: {},
      },
      null,
      2
    )
  );
  console.log(`Pre-seeded Debrief config at ${configFile}`);
}

async function globalSetup(): Promise<void> {
  // Ensure the test STAC store is registered for locally-started servers.
  // Docker environments are pre-seeded via the Dockerfile.
  if (!process.env.CODE_SERVER_URL) {
    ensureDebriefConfig();
  }

  // If CODE_SERVER_URL is explicitly set, assume external management (Docker)
  if (process.env.CODE_SERVER_URL) {
    console.log(`Using external VS Code server at ${CODE_SERVER_URL}`);
    await waitForReady(CODE_SERVER_URL, READY_TIMEOUT_MS);
    return;
  }

  // Check if a server is already running
  if (await isReachable(CODE_SERVER_URL)) {
    console.log(`VS Code server already running at ${CODE_SERVER_URL}`);
    return;
  }

  // Try openvscode-server first (no vsda dependency)
  const ovsPath = whichSync('openvscode-server');
  if (ovsPath) {
    console.log(`Starting openvscode-server at ${CODE_SERVER_URL}...`);
    const dataDir = join(__dirname, '.vscode-server-data');
    writeVSCodeSettings(dataDir);

    serverProcess = spawn(
      ovsPath,
      [
        '--host',
        '0.0.0.0',
        '--port',
        DEFAULT_PORT,
        '--without-connection-token',
        '--disable-telemetry',
        '--user-data-dir',
        dataDir,
        WORKSPACE_PATH,
      ],
      { stdio: 'pipe', detached: true }
    );
  } else {
    // Fall back to code-server (check PATH, then standalone install location)
    const csPath =
      whichSync('code-server') ?? whichSync('/opt/code-server/bin/code-server');
    if (!csPath) {
      throw new Error(
        'Neither openvscode-server nor code-server found.\n' +
          'Install openvscode-server or code-server, or set CODE_SERVER_URL to an external instance.\n' +
          'In cloud sessions: bash tests/e2e/scripts/cloud-e2e-setup.sh\n' +
          'Or use Docker: docker compose -f docker/code-server/docker-compose.yml up -d'
      );
    }

    console.log(`Starting code-server at ${CODE_SERVER_URL}...`);
    serverProcess = spawn(
      csPath,
      [
        '--auth',
        'none',
        '--bind-addr',
        `0.0.0.0:${DEFAULT_PORT}`,
        '--disable-telemetry',
        WORKSPACE_PATH,
      ],
      { stdio: 'pipe', detached: true }
    );
  }

  // Store PID for teardown
  if (serverProcess.pid) {
    writeFileSync(
      join(__dirname, '.code-server-pid'),
      String(serverProcess.pid)
    );
  }

  // Don't let the child keep the parent alive
  serverProcess.unref();

  await waitForReady(CODE_SERVER_URL, READY_TIMEOUT_MS);
}

export default globalSetup;
