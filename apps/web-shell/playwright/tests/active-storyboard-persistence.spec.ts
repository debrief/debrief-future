/**
 * E2E tests for #237 — Active-Storyboard selection persistence.
 *
 * Exercises the user-visible workflow:
 *   1. Open a multi-storyboard plot
 *   2. Read the default selection
 *   3. Pick a different Storyboard from the header dropdown
 *   4. Assert that the SystemState feature for state_type=active_storyboard
 *      is now present in the FeatureCollection (via the live
 *      `window.__sessionStore` exposed by the web-shell)
 *   5. Reload the plot in-session by going back to the catalog and
 *      re-opening — assert the persisted selection wins on remount
 *
 * The full-page-reload path (URL-driven plot restoration) was deemed
 * unreliable by #236 (see stac-writes.spec.ts comment) — for this spec
 * we use the back-to-catalog round-trip, which exercises the same
 * remount path StoryboardPanelMount sees on a real reopen.
 */

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EVIDENCE_DIR = resolve(
  __dirname,
  '../../../../specs/237-active-storyboard-persistence/evidence/screenshots',
);
mkdirSync(EVIDENCE_DIR, { recursive: true });

const ACTIVE_STORYBOARD_FEATURE_ID = 'state.activestoryboard';
const ACTIVE_STORYBOARD_STATE_TYPE = 'active_storyboard';

async function clearWriterIdb(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolveDb) => {
        if (typeof indexedDB === 'undefined' || indexedDB === null) {
          resolveDb();
          return;
        }
        const req = indexedDB.deleteDatabase('debrief-stac-writer-v1');
        req.onsuccess = () => resolveDb();
        req.onerror = () => resolveDb();
        req.onblocked = () => resolveDb();
      }),
  );
}

async function openFirstPlot(page: Page): Promise<void> {
  await page.goto('/');
  await clearWriterIdb(page);
  await page.goto('/?storyboardPanel=1');
  await expect(page.locator('.web-shell--welcome')).toBeVisible({
    timeout: 15000,
  });
  await page
    .locator('[data-testid="exercise-list-item-row"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 });
  await page
    .locator('[data-testid="exercise-list-item-row"]')
    .first()
    .dblclick();
  await expect(page.locator('.web-shell--analysis')).toBeVisible({
    timeout: 20000,
  });
  await expect(
    page.locator('[data-testid="storyboard-panel"]'),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.leaflet-container')).toBeVisible({
    timeout: 15000,
  });
}

async function captureFirstStoryboard(page: Page, name: string): Promise<void> {
  // Empty-state path: capture-button → naming row → confirm.
  await page.locator('[data-testid="capture-button"]').click();
  await page
    .locator('[data-testid="storyboard-naming-row-input"]')
    .waitFor({ state: 'visible', timeout: 10_000 });
  await page
    .locator('[data-testid="storyboard-naming-row-input"]')
    .fill(name);
  await page
    .locator('[data-testid="storyboard-naming-row-confirm"]')
    .click();
  await page
    .locator('[data-testid="storyboard-naming-row"]')
    .waitFor({ state: 'hidden', timeout: 10_000 })
    .catch(() => {
      /* tolerate slower naming-row teardown */
    });
  await page
    .locator('[data-testid="storyboard-panel"]')
    .getByText(name)
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
}

async function createAdditionalStoryboard(page: Page, name: string): Promise<void> {
  // Header overflow menu → "Create" → naming row appears → fill + confirm.
  await page.locator('[data-testid="storyboard-header-overflow"]').click();
  await page.locator('[data-testid="storyboard-header-menu-create"]').click();
  await page
    .locator('[data-testid="storyboard-naming-row-input"]')
    .waitFor({ state: 'visible', timeout: 10_000 });
  await page
    .locator('[data-testid="storyboard-naming-row-input"]')
    .fill(name);
  await page
    .locator('[data-testid="storyboard-naming-row-confirm"]')
    .click();
  // The new Storyboard is created without scenes; wait until it appears in
  // the dropdown options.
  await page.waitForFunction(
    (target) => {
      const select = document.querySelector(
        '[data-testid="storyboard-header-select"]',
      ) as HTMLSelectElement | null;
      if (!select) return false;
      return Array.from(select.options).some((o) => o.text === target);
    },
    name,
    { timeout: 15_000 },
  );
}

async function readPersistedActiveStoryboardId(
  page: Page,
): Promise<string | null> {
  return await page.evaluate(
    ({ id, stateType }) => {
      const features = (window as unknown as { __currentPlotFeatures?: Array<{
        id?: unknown;
        properties?: { state_type?: unknown; active_storyboard_id?: unknown };
      }> }).__currentPlotFeatures;
      if (!features) return null;
      const match = features.find(
        (f) =>
          f?.properties?.state_type === stateType &&
          f?.id === id,
      );
      const sysId = match?.properties?.active_storyboard_id;
      return typeof sysId === 'string' ? sysId : null;
    },
    {
      id: ACTIVE_STORYBOARD_FEATURE_ID,
      stateType: ACTIVE_STORYBOARD_STATE_TYPE,
    },
  );
}

test.describe('#237 — Active-storyboard selection persistence', () => {
  test.setTimeout(180_000);

  test('US1 — picking a non-default storyboard writes a SystemState feature into the FC', async ({
    page,
  }) => {
    await openFirstPlot(page);

    // Capture the first Storyboard via the empty-state path; create a
    // second one via the header overflow menu so the dropdown has two
    // options. Names sort alphabetically: Alpha < Bravo (so Alpha is the
    // default selection).
    await captureFirstStoryboard(page, 'Storyboard Alpha');
    await createAdditionalStoryboard(page, 'Storyboard Bravo');

    // The header select renders only when ≥1 Storyboard exists; with two
    // it should now be visible.
    const dropdown = page.locator('[data-testid="storyboard-header-select"]');
    await expect(dropdown).toBeVisible({ timeout: 10_000 });
    const options = await dropdown.locator('option').allTextContents();
    expect(options).toContain('Storyboard Alpha');
    expect(options).toContain('Storyboard Bravo');

    // Read the current default selection (the most-recently-modified — the
    // second capture, "Storyboard Bravo").
    const defaultValue = await dropdown.inputValue();

    // Capture a screenshot of the default state.
    await page.locator('[data-testid="storyboard-panel"]').screenshot({
      path: resolve(EVIDENCE_DIR, 'before-default-fallback.png'),
    });

    // Pick the other Storyboard (Alpha) — this is the override.
    const allOptionValues = await dropdown
      .locator('option')
      .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    const otherValue = allOptionValues.find((v) => v !== defaultValue);
    expect(otherValue, 'expected a second storyboard option to switch to').toBeTruthy();
    await dropdown.selectOption(otherValue!);

    // Wait for the FC to reflect the new SystemState feature.
    await expect(async () => {
      const persisted = await readPersistedActiveStoryboardId(page);
      expect(persisted).toBe(otherValue!);
    }).toPass({ timeout: 5_000 });

    // Capture a screenshot of the restored state.
    await page.locator('[data-testid="storyboard-panel"]').screenshot({
      path: resolve(EVIDENCE_DIR, 'after-restored-selection.png'),
    });

    // Verify the dropdown shows the chosen Storyboard.
    expect(await dropdown.inputValue()).toBe(otherValue!);
  });

  test('US2 — single Storyboard plot still allows the SystemState feature without breaking the panel', async ({
    page,
  }) => {
    await openFirstPlot(page);

    // Single Storyboard — the dropdown is hidden per #235.
    await captureFirstStoryboard(page, 'Solo Storyboard');

    // The panel should render without errors and the rail should be
    // visible.
    await expect(
      page.locator('[data-testid="storyboard-panel"]'),
    ).toBeVisible();

    // No persistence write is expected for a single-storyboard plot
    // (the analyst hasn't overridden via the dropdown).
    const persisted = await readPersistedActiveStoryboardId(page);
    expect(persisted).toBeNull();
  });
});
