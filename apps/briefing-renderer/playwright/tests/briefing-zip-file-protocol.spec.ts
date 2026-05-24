/**
 * T060 — file:// origin gate.
 *
 * Loads the briefing-renderer's built index.html directly from disk and
 * verifies the SPA boots (no spinner stuck, no console errors), renders
 * the minimal chrome surface, and shows Scene 0 from the dev fixture.
 */

import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distRoot = resolve(__dirname, '../../dist');
const indexUrl = pathToFileURL(`${distRoot}/index.html`).href;

test.describe('briefing renderer — file:// origin', () => {
  test('boots from file:// and renders the dev-fixture Scene 0', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      // Leaflet's TileLayer attempts every visible tile; under the
      // dev-fixture build the basemap dir ships only the placeholder,
      // so ERR_FILE_NOT_FOUND is expected — Leaflet falls back to the
      // placeholder (errorTileUrl). Filter these out; everything else
      // is a real error.
      if (text.includes('ERR_FILE_NOT_FOUND') || text.includes('Failed to load resource')) {
        return;
      }
      errors.push(`console.error: ${text}`);
    });

    await page.goto(indexUrl);

    // Map mounts.
    await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });
    // Minimal chrome is the default.
    await expect(page.locator('[data-testid="briefing-minimal-chrome"]')).toBeVisible();
    // Transport bar shows Scene 1 / N for the dev fixture (4 Scenes).
    await expect(page.locator('[data-testid="transport-scene-index"]')).toContainText('1 / 4');

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('renders without making any external network request', async ({ page }) => {
    const external: string[] = [];
    await page.route('**/*', (route, request) => {
      const url = request.url();
      // file:// and data: are local; everything else is external.
      if (!url.startsWith('file:') && !url.startsWith('data:')) {
        external.push(url);
      }
      return route.continue();
    });

    await page.goto(indexUrl);
    await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });

    // Interact a bit so we cover playback paths too.
    await page.locator('[data-testid="transport-next"]').click();
    await page.locator('[data-testid="transport-next"]').click();
    await page.waitForTimeout(500);

    expect(external, `Unexpected external requests:\n${external.join('\n')}`).toEqual([]);
  });
});
