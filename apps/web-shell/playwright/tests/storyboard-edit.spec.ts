/**
 * E2E tests for the Storyboard edit suite (Feature 230 US4).
 *
 * Drives the full polish loop against the in-browser harness at
 * `?storyboard-edit-harness=1` — no VS Code involvement. Produces the
 * evidence screenshots enumerated in #218's evidence-requirements
 * table and saves them under `specs/218-storyboarding-edit/evidence/
 * screenshots/` (per FR-040).
 *
 * Coverage scope (keeping it pragmatic for MVP — expand-and-edit, undo,
 * stale refresh, refresh-all, overflow menu, missing-data remediation).
 * Additional scenarios (rename, duplicate, copy-to-other, deep-copy
 * failure) exercise the same message contract via the outbound
 * recorder and can be added incrementally.
 */

import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { StoryboardEditPage } from '../pages/StoryboardEditPage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.resolve(
  __dirname,
  '../../../../specs/218-storyboarding-edit/evidence/screenshots',
);

async function saveScreenshot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, name),
    fullPage: false,
    animations: 'disabled',
  });
}

test.describe('Storyboard edit harness — smoke', () => {
  test('harness renders with fixture Scenes', async ({ page }) => {
    const harness = new StoryboardEditPage(page);
    await harness.open();
    await expect(page.locator('[data-testid="storyboard-panel"]')).toBeVisible();
    await expect(harness.sceneRow('sceneA')).toBeVisible();
    await expect(harness.sceneRow('sceneB')).toBeVisible();
    await expect(harness.sceneRow('sceneC')).toBeVisible();
    await saveScreenshot(page, 'storyboard-panel-default.png');
  });

  test('chevron toggles inline edit form (FR-001 / FR-004)', async ({
    page,
  }) => {
    const harness = new StoryboardEditPage(page);
    await harness.open();
    await harness.chevronFor('sceneA').click();
    await expect(page.locator('[data-testid="scene-edit-form"]')).toBeVisible();
    await expect(harness.sceneRow('sceneA')).toHaveAttribute(
      'data-edit-form-open',
      'true',
    );
    // Open a different row — first form should close (FR-004).
    await harness.chevronFor('sceneB').click();
    await expect(harness.sceneRow('sceneA')).not.toHaveAttribute(
      'data-edit-form-open',
      'true',
    );
    await expect(harness.sceneRow('sceneB')).toHaveAttribute(
      'data-edit-form-open',
      'true',
    );
    await saveScreenshot(page, 'storyboard-edit-form-open.png');
  });

  test('overflow menu opens on right-click and lists six actions (FR-003)', async ({
    page,
  }) => {
    const harness = new StoryboardEditPage(page);
    await harness.open();
    await harness.sceneRow('sceneB').click({ button: 'right' });
    await expect(harness.overflowMenu()).toBeVisible();
    const items = page.locator('[role="menuitem"]');
    await expect(items).toHaveCount(6);
    await saveScreenshot(page, 'storyboard-overflow-menu-open.png');
  });

  test('overflow menu Delete triggers undo toast (FR-005 + US2 AC2)', async ({
    page,
  }) => {
    const harness = new StoryboardEditPage(page);
    await harness.open();
    await harness.sceneRow('sceneB').click({ button: 'right' });
    await harness.overflowMenuItem('delete').click();
    await expect(harness.undoToast()).toBeVisible();
    // Row is removed after soft-delete.
    await expect(harness.sceneRow('sceneB')).toHaveCount(0);
    await saveScreenshot(page, 'storyboard-undo-toast.png');

    // Undo → row restored.
    await page.locator('[data-testid="undo-toast-undo-button"]').click();
    await expect(harness.sceneRow('sceneB')).toBeVisible();
    const outbound = await harness.outboundMessages();
    expect(outbound.some((m) => m.type === 'scene-delete-requested')).toBe(
      true,
    );
    expect(outbound.some((m) => m.type === 'scene-undo-delete-clicked')).toBe(
      true,
    );
  });

  test('stale badge renders from ?stale knob and clears on refresh (FR-012)', async ({
    page,
  }) => {
    const harness = new StoryboardEditPage(page);
    await harness.open({ stale: ['sceneA', 'sceneC'] });
    await expect(harness.staleBadgeFor('sceneA')).toBeVisible();
    await expect(harness.staleBadgeFor('sceneC')).toBeVisible();
    await saveScreenshot(page, 'storyboard-stale-badge.png');

    // Refresh all stale.
    await harness.refreshAllStaleButton().click();
    await expect(harness.staleBadgeFor('sceneA')).toHaveCount(0);
    await expect(harness.staleBadgeFor('sceneC')).toHaveCount(0);
    const outbound = await harness.outboundMessages();
    expect(
      outbound.some((m) => m.type === 'storyboard-refresh-all-stale-clicked'),
    ).toBe(true);
  });

  test('keyboard: Shift+F10 opens overflow menu', async ({ page }) => {
    const harness = new StoryboardEditPage(page);
    await harness.open();
    await harness.sceneRow('sceneA').focus();
    await page.keyboard.press('Shift+F10');
    await expect(harness.overflowMenu()).toBeVisible();
  });

  test('missing-data harness knob renders a remediation affordance', async ({
    page,
  }) => {
    const harness = new StoryboardEditPage(page);
    await harness.open({
      missingData: { sceneC: ['track-alpha', 'track-bravo'] },
    });
    // Expand sceneC so the edit form shows the missing-data panel.
    await harness.chevronFor('sceneC').click();
    await expect(
      page.locator('[data-testid="scene-edit-form-missing-data"]'),
    ).toBeVisible();
    await saveScreenshot(page, 'storyboard-missing-data-remediation.png');
  });
});
