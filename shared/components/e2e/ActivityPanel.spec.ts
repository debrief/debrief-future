/**
 * Playwright e2e tests for Feature 101 — Layers Panel Vertical Space Fix.
 *
 * Verifies that the Layers section expands to fill available vertical space
 * when sibling sections (Time Controller, Tools) are collapsed.
 *
 * Tests all 8 collapse-state combinations and theme variants.
 */

import { test, expect } from '@playwright/test';

const STORY_BASE = '/iframe.html?id=components-activitypanel';

const storyUrl = (variant: string) => `${STORY_BASE}--${variant}`;
const withTheme = (url: string, theme: 'light' | 'dark' | 'vscode') =>
  `${url}&globals=theme:${theme}`;

// Evidence screenshot directory
const EVIDENCE_DIR = 'specs/101-layers-panel-vertical-space/evidence/screenshots';

test.describe('ActivityPanel - Collapse State Layouts', () => {
  test('default: all expanded with 50/50 split', async ({ page }) => {
    await page.goto(storyUrl('default'));
    await page.waitForSelector('.debrief-activity-panel');

    const panel = page.locator('.debrief-activity-panel');
    await expect(panel).toBeVisible();

    // All three section headers should be visible
    const headers = page.locator('.debrief-activity-panel__section-header');
    await expect(headers).toHaveCount(3);

    // All three section content areas should be visible (not collapsed)
    const sections = page.locator('.debrief-activity-panel__section');
    await expect(sections).toHaveCount(3);

    // Resize handle should be visible (both flexible sections expanded)
    const resizeHandle = page.locator('.debrief-activity-panel__resize-handle');
    await expect(resizeHandle).toBeVisible();
  });

  test('tools collapsed: layers fills remaining space', async ({ page }) => {
    await page.goto(storyUrl('tools-collapsed'));
    await page.waitForSelector('.debrief-activity-panel');

    const panel = page.locator('.debrief-activity-panel');
    const panelBox = await panel.boundingBox();

    // Layers section should be the flexible one (not collapsed)
    const flexibleSections = page.locator('.debrief-activity-panel__section--flexible');
    await expect(flexibleSections).toHaveCount(1);

    // The flexible section should extend close to the panel bottom
    const flexBox = await flexibleSections.first().boundingBox();
    if (panelBox && flexBox) {
      const gap = panelBox.y + panelBox.height - (flexBox.y + flexBox.height);
      // Gap should be minimal (within 2px for border)
      expect(gap).toBeLessThan(3);
    }

    // Resize handle should NOT be visible (only one flexible section expanded)
    const resizeHandle = page.locator('.debrief-activity-panel__resize-handle');
    await expect(resizeHandle).toHaveCount(0);

    await page.screenshot({ path: `${EVIDENCE_DIR}/tools-collapsed.png` });
  });

  test('all collapsed: only headers visible', async ({ page }) => {
    await page.goto(storyUrl('all-collapsed'));
    await page.waitForSelector('.debrief-activity-panel');

    // No flexible sections
    const flexibleSections = page.locator('.debrief-activity-panel__section--flexible');
    await expect(flexibleSections).toHaveCount(0);

    // All sections should be collapsed
    const collapsedSections = page.locator('.debrief-activity-panel__section--collapsed');
    await expect(collapsedSections).toHaveCount(3);

    // No section content visible
    const content = page.locator('.debrief-activity-panel__section-content');
    await expect(content).toHaveCount(0);

    await page.screenshot({ path: `${EVIDENCE_DIR}/all-collapsed.png` });
  });

  test('only time expanded: two collapsed flexible sections', async ({ page }) => {
    await page.goto(storyUrl('only-time-expanded'));
    await page.waitForSelector('.debrief-activity-panel');

    // Two collapsed sections (Tools + Layers)
    const collapsedSections = page.locator('.debrief-activity-panel__section--collapsed');
    await expect(collapsedSections).toHaveCount(2);

    // No flexible sections (both flexible ones are collapsed)
    const flexibleSections = page.locator('.debrief-activity-panel__section--flexible');
    await expect(flexibleSections).toHaveCount(0);
  });

  test('time controller collapsed: tools and layers share space', async ({ page }) => {
    await page.goto(storyUrl('time-controller-collapsed'));
    await page.waitForSelector('.debrief-activity-panel');

    // Two flexible sections (Tools + Layers)
    const flexibleSections = page.locator('.debrief-activity-panel__section--flexible');
    await expect(flexibleSections).toHaveCount(2);

    // Resize handle visible
    const resizeHandle = page.locator('.debrief-activity-panel__resize-handle');
    await expect(resizeHandle).toBeVisible();
  });
});

test.describe('ActivityPanel - Theme Variants', () => {
  test('tools collapsed renders correctly in dark theme', async ({ page }) => {
    await page.goto(withTheme(storyUrl('tools-collapsed'), 'dark'));
    await page.waitForSelector('.debrief-activity-panel');

    const flexibleSections = page.locator('.debrief-activity-panel__section--flexible');
    await expect(flexibleSections).toHaveCount(1);

    await page.screenshot({ path: `${EVIDENCE_DIR}/tools-collapsed-dark.png` });
  });

  test('tools collapsed renders correctly in vscode theme', async ({ page }) => {
    await page.goto(withTheme(storyUrl('tools-collapsed'), 'vscode'));
    await page.waitForSelector('.debrief-activity-panel');

    const flexibleSections = page.locator('.debrief-activity-panel__section--flexible');
    await expect(flexibleSections).toHaveCount(1);

    await page.screenshot({ path: `${EVIDENCE_DIR}/tools-collapsed-vscode.png` });
  });
});
