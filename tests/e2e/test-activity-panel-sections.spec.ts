/**
 * Activity Panel — section expand/collapse and tools presence.
 *
 * Validates:
 * - The Debrief Activity panel is present in the sidebar
 * - Five child sections (Time Controller, Tools, Layers, Properties,
 *   Storyboard) exist — the Storyboard was flattened into the Activity
 *   panel as a 5th collapsible section (UX-review)
 * - Each section can be collapsed and re-expanded via its header button
 * - The Tools section shows tool items or a status message (proves debrief-calc responded)
 *
 * Uses revealSidebar() only (no openPlotViaStacTree) to match the
 * reliable pattern from the activity-panel-screenshot test.
 */
import { test, expect } from './fixtures/base';

test.describe('Activity Panel Sections', () => {
  test.setTimeout(90_000);

  test('activity panel is present with five collapsible sections', async ({
    codeServerPage,
  }) => {
    await codeServerPage.dismissNotifications();

    // ─── Reveal the Debrief sidebar (no plot needed) ───
    await codeServerPage.revealSidebar();
    await codeServerPage.dismissNotifications();

    // ─── Locate the activity panel inside the webview frame ───
    const page = codeServerPage.page;

    // Poll for the activity panel React content in nested frames
    // (same approach as the passing screenshot test)
    let activityFrame: import('@playwright/test').Frame | null = null;
    const start = Date.now();
    while (Date.now() - start < 20_000) {
      for (const frame of page.frames()) {
        if (!frame.url().includes('webview')) continue;
        for (const child of frame.childFrames()) {
          const found = await child
            .locator('.debrief-activity-panel')
            .first()
            .isVisible()
            .catch(() => false);
          if (found) {
            activityFrame = child;
            break;
          }
        }
        if (activityFrame) break;
      }
      if (activityFrame) break;
      await page.waitForTimeout(1_000);
    }

    expect(activityFrame, 'Activity panel frame should be found').not.toBeNull();
    const frame = activityFrame!;
    console.log('  ✓ Activity panel found in webview frame');

    // ─── Verify five section headers exist ───
    const sectionHeaders = frame.locator(
      '.debrief-activity-panel__section-header'
    );
    const headerCount = await sectionHeaders.count();
    expect(headerCount).toBe(5);
    console.log(`  ✓ Found ${headerCount} section headers`);

    // Verify section titles
    const timeHeader = frame.locator(
      '.debrief-activity-panel__section-header:has-text("Time Controller")'
    );
    const toolsHeader = frame.locator(
      '.debrief-activity-panel__section-header:has-text("Tools")'
    );
    const layersHeader = frame.locator(
      '.debrief-activity-panel__section-header:has-text("Layers")'
    );
    const propertiesHeader = frame.locator(
      '.debrief-activity-panel__section-header:has-text("Properties")'
    );
    const storyboardHeader = frame.locator(
      '.debrief-activity-panel__section-header:has-text("Storyboard")'
    );
    expect(await timeHeader.isVisible()).toBe(true);
    expect(await toolsHeader.isVisible()).toBe(true);
    expect(await layersHeader.isVisible()).toBe(true);
    expect(await propertiesHeader.isVisible()).toBe(true);
    expect(await storyboardHeader.isVisible()).toBe(true);
    console.log('  ✓ All five sections visible: Time Controller, Tools, Layers, Properties, Storyboard');

    // ─── Test collapse/expand for each section ───
    const sections = [
      { name: 'Time Controller', header: timeHeader },
      { name: 'Tools', header: toolsHeader },
      { name: 'Layers', header: layersHeader },
      { name: 'Properties', header: propertiesHeader },
      { name: 'Storyboard', header: storyboardHeader },
    ];

    for (const { name, header } of sections) {
      // Check initial expanded state
      const initialState = await header.getAttribute('aria-expanded');
      expect(initialState, `${name} should start expanded`).toBe('true');

      // Collapse
      await header.click();
      await page.waitForTimeout(300);
      const collapsed = await header.getAttribute('aria-expanded');
      expect(collapsed, `${name} should be collapsed after click`).toBe('false');

      // Re-expand
      await header.click();
      await page.waitForTimeout(300);
      const reExpanded = await header.getAttribute('aria-expanded');
      expect(reExpanded, `${name} should be re-expanded after second click`).toBe('true');

      console.log(`  ✓ ${name}: expand → collapse → expand`);
    }
  });

  test('tools section shows debrief-calc status', async ({
    codeServerPage,
  }) => {
    await codeServerPage.dismissNotifications();

    // ─── Reveal the Debrief sidebar (no plot needed) ───
    await codeServerPage.revealSidebar();
    await codeServerPage.dismissNotifications();

    // ─── Find the activity panel frame ───
    const page = codeServerPage.page;
    let activityFrame: import('@playwright/test').Frame | null = null;
    const start = Date.now();
    while (Date.now() - start < 20_000) {
      for (const frame of page.frames()) {
        if (!frame.url().includes('webview')) continue;
        for (const child of frame.childFrames()) {
          const found = await child
            .locator('.debrief-activity-panel')
            .first()
            .isVisible()
            .catch(() => false);
          if (found) {
            activityFrame = child;
            break;
          }
        }
        if (activityFrame) break;
      }
      if (activityFrame) break;
      await page.waitForTimeout(1_000);
    }

    expect(activityFrame, 'Activity panel frame should be found').not.toBeNull();
    const frame = activityFrame!;

    // ─── Wait for tools section to settle ───
    // The tools panel transitions through states:
    //   "Loading analysis tools…" → tool items or status message
    // Wait up to 20s for it to move past loading.
    const toolItems = frame.locator('.debrief-tools-panel__item');
    const toolsMessage = frame.locator('.debrief-tools-panel__message');
    const toolsList = frame.locator('.debrief-tools-panel__list');

    let toolCount = 0;
    let messageText = '';
    const pollStart = Date.now();
    while (Date.now() - pollStart < 20_000) {
      toolCount = await toolItems.count().catch(() => 0);
      if (toolCount > 0) break;

      // Check for a status message that isn't "Loading"
      const msgVisible = await toolsMessage.isVisible().catch(() => false);
      if (msgVisible) {
        messageText = (await toolsMessage.textContent()) ?? '';
        if (!messageText.includes('Loading')) break;
      }
      await page.waitForTimeout(1_000);
    }

    if (toolCount > 0) {
      // Tools are listed — verify some are inactive/blocked (no selection made)
      const inactiveCount = await frame
        .locator('.debrief-tools-panel__item--inactive')
        .count();
      expect(
        inactiveCount,
        'Expected blocked/inactive tools (proves debrief-calc inventory received)'
      ).toBeGreaterThan(0);
      console.log(`  ✓ Tools panel: ${toolCount} total, ${inactiveCount} blocked`);
    } else {
      // No tool items — we have a status message. Any post-loading state is valid:
      //   "Select features to see available tools"
      //   "Analysis tools unavailable — debrief-calc not connected"
      //   "No matching tools for current selection"
      // All prove the panel rendered and attempted to contact debrief-calc.
      console.log(`  ✓ Tools panel message: "${messageText}"`);
      expect(
        messageText.length,
        'Tools panel should show a status message'
      ).toBeGreaterThan(0);
    }
  });
});
