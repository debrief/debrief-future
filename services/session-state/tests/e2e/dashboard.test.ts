/**
 * E2E tests for the debug dashboard.
 * Feature: 024-document-session-state
 *
 * These tests verify that the dashboard correctly interacts with
 * the session state server via MCP tools.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type Server } from 'http';
import { createReadStream, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { startServer } from '../../src/server/index.js';
import { createSessionStore, type SessionStoreApi } from '../../src/store/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_PORT = 3052; // Use non-standard ports to avoid conflicts
const SERVER_PORT = 3051;
const DASHBOARD_PATH = join(__dirname, '../../../../tools/debug-dashboard');

describe('Debug Dashboard E2E', () => {
  let browser: Browser;
  let page: Page;
  let store: SessionStoreApi;
  let sessionServer: { close: () => void };
  let dashboardServer: Server;

  beforeAll(async () => {
    // Start session state server
    store = createSessionStore();
    sessionServer = startServer(store, { port: SERVER_PORT, host: 'localhost' });

    // Start simple HTTP server for dashboard
    dashboardServer = createServer((req, res) => {
      let urlPath = req.url?.split('?')[0] || '/';
      if (urlPath === '/') urlPath = '/index.html';

      let filePath = join(DASHBOARD_PATH, urlPath);

      // If it's a directory, try index.html inside it
      if (existsSync(filePath) && statSync(filePath).isDirectory()) {
        filePath = join(filePath, 'index.html');
      }

      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = filePath.split('.').pop();
      const contentType =
        ext === 'html'
          ? 'text/html'
          : ext === 'js'
            ? 'application/javascript'
            : ext === 'css'
              ? 'text/css'
              : 'text/plain';

      res.writeHead(200, { 'Content-Type': contentType });
      createReadStream(filePath).pipe(res);
    });

    await new Promise<void>((resolve) => {
      dashboardServer.listen(DASHBOARD_PORT, 'localhost', resolve);
    });

    // Launch browser in headless mode
    browser = await chromium.launch({ headless: true });
  }, 30000);

  afterAll(async () => {
    await browser?.close();
    sessionServer?.close();
    dashboardServer?.close();
  });

  beforeEach(async () => {
    // Create fresh page for each test
    page = await browser.newPage();
    // Reset store state
    store.getState().reset();
  });

  const dashboardUrl = `http://localhost:${DASHBOARD_PORT}?server=http://localhost:${SERVER_PORT}`;

  async function connectDashboard() {
    await page.goto(dashboardUrl);
    // Wait for connection with longer timeout
    await page.waitForSelector('#connection-status.connected', { timeout: 10000 });
    // Wait a bit for state sync
    await page.waitForTimeout(300);
  }

  it('should connect to the server and show connected status', async () => {
    await connectDashboard();

    const status = await page.textContent('#connection-status');
    expect(status).toBe('Connected');
  }, 15000);

  it('should display initial state values', async () => {
    await connectDashboard();

    // Check playback rate shows default value (1)
    const playbackRateText = await page.textContent('[data-field="temporal.playbackRate"] .display');
    expect(playbackRateText).toBe('1');

    // Check rotation shows default value (0)
    const rotationText = await page.textContent('[data-field="spatial.rotation"] .display');
    expect(rotationText).toBe('0');
  }, 15000);

  it('should update playback rate via editable field', async () => {
    await connectDashboard();

    // Click on playback rate field to edit
    await page.click('[data-field="temporal.playbackRate"]');

    // Enter new value
    await page.fill('[data-field="temporal.playbackRate"] .edit', '2.5');
    await page.press('[data-field="temporal.playbackRate"] .edit', 'Enter');

    // Wait for update to propagate
    await page.waitForTimeout(500);

    // Verify the value persisted (didn't reset)
    const displayText = await page.textContent('[data-field="temporal.playbackRate"] .display');
    expect(displayText).toBe('2.5');

    // Verify store was actually updated
    expect(store.getState().playbackRate).toBe(2.5);
  }, 15000);

  it('should update rotation via editable field', async () => {
    await connectDashboard();

    // Click on rotation field to edit
    await page.click('[data-field="spatial.rotation"]');

    // Enter new value
    await page.fill('[data-field="spatial.rotation"] .edit', '45');
    await page.press('[data-field="spatial.rotation"] .edit', 'Enter');

    // Wait for update to propagate
    await page.waitForTimeout(500);

    // Verify the value persisted (didn't reset)
    const displayText = await page.textContent('[data-field="spatial.rotation"] .display');
    expect(displayText).toBe('45');

    // Verify store was actually updated
    expect(store.getState().rotation).toBe(45);
  }, 15000);

  it('should receive real-time SSE updates', async () => {
    await connectDashboard();

    // Update store directly (simulating another client)
    store.getState().setPlaybackRate(5.0);

    // Wait for SSE update
    await page.waitForTimeout(500);

    // Verify dashboard shows updated value
    const playbackRateText = await page.textContent('[data-field="temporal.playbackRate"] .display');
    expect(playbackRateText).toBe('5');
  }, 15000);

  it('should handle rotation normalization correctly', async () => {
    await connectDashboard();

    // Click on rotation field to edit
    await page.click('[data-field="spatial.rotation"]');

    // Enter value that needs normalization (450 -> 90)
    await page.fill('[data-field="spatial.rotation"] .edit', '450');
    await page.press('[data-field="spatial.rotation"] .edit', 'Enter');

    // Wait for update to propagate
    await page.waitForTimeout(500);

    // Verify the value was normalized
    const displayText = await page.textContent('[data-field="spatial.rotation"] .display');
    expect(displayText).toBe('90');

    // Verify store has normalized value
    expect(store.getState().rotation).toBe(90);
  }, 15000);
});
