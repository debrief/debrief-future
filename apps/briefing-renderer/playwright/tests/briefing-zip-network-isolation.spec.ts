/**
 * T061 — zero external requests across load → play → mode toggle → replay.
 *
 * The headline FR-015 + SC-002 verification: monitors every request the
 * page makes throughout a complete user-facing flow and asserts that no
 * request leaves the local file:// or data: origin.
 */

import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distRoot = resolve(__dirname, '../../dist');
const indexUrl = pathToFileURL(`${distRoot}/index.html`).href;

test('SC-002 — zero external requests across the full lifecycle', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith('file:') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      externalRequests.push(`${req.method()} ${url}`);
    }
  });

  await page.goto(indexUrl);
  await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });

  // Step through the Storyboard.
  await page.locator('[data-testid="transport-next"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-testid="transport-next"]').click();
  await page.waitForTimeout(200);

  // Toggle to Present mode then back.
  await page.keyboard.press('p');
  await page.waitForTimeout(200);
  await page.keyboard.press('p');
  await page.waitForTimeout(200);

  // Get back to Scene 0 (Replay flow).
  await page.locator('[data-testid="transport-prev"]').click();
  await page.locator('[data-testid="transport-prev"]').click();
  await page.waitForTimeout(200);

  expect(
    externalRequests,
    `Unexpected external requests:\n${externalRequests.join('\n')}`,
  ).toEqual([]);
});
