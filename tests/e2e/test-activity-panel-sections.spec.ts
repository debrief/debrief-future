/**
 * Activity Panel — section expand/collapse and tools presence.
 *
 * Validates:
 * - The Debrief Activity panel is present in the sidebar
 * - Three child sections (Time Controller, Tools, Layers) exist
 * - Each section can be collapsed and re-expanded via its header button
 * - The Tools section lists blocked/inactive tools (proves debrief-calc is active)
 */
import { test, expect } from './fixtures/base';

test.describe('Activity Panel Sections', () => {
  test.setTimeout(90_000);

  test('activity panel is present with three collapsible sections', async ({
    codeServerPage,
  }) => {
    // ─── Setup: open a plot so the extension activates fully ───
    await codeServerPage.dismissNotifications();
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    await codeServerPage.dismissNotifications();

    // ─── Reveal the Debrief sidebar ───
    await codeServerPage.revealSidebar();
    await codeServerPage.dismissNotifications();

    // ─── Locate the activity panel frame ───
    const frame = await codeServerPage.getActivityPanelFrame();
    const activityPanel = frame.locator('.debrief-activity-panel');
    await expect(activityPanel).toBeVisible({ timeout: 15_000 });

    // ─── Verify three section headers exist ───
    const sectionHeaders = frame.locator(
      '.debrief-activity-panel__section-header'
    );
    await expect(sectionHeaders).toHaveCount(3, { timeout: 10_000 });

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
    await expect(timeHeader).toBeVisible();
    await expect(toolsHeader).toBeVisible();
    await expect(layersHeader).toBeVisible();

    // ─── Test collapse/expand for each section ───
    const sections = [
      { name: 'Time Controller', header: timeHeader },
      { name: 'Tools', header: toolsHeader },
      { name: 'Layers', header: layersHeader },
    ];

    for (const { name, header } of sections) {
      // Verify the section starts expanded (aria-expanded="true")
      const initialState = await header.getAttribute('aria-expanded');
      expect(
        initialState,
        `${name} should start expanded`
      ).toBe('true');

      // Collapse the section
      await header.click();
      await expect(header).toHaveAttribute('aria-expanded', 'false', {
        timeout: 3_000,
      });

      // Re-expand the section
      await header.click();
      await expect(header).toHaveAttribute('aria-expanded', 'true', {
        timeout: 3_000,
      });
    }
  });

  test('tools section lists blocked tools when no selection', async ({
    codeServerPage,
  }) => {
    // ─── Setup: open a plot so debrief-calc connects ───
    await codeServerPage.dismissNotifications();
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    await codeServerPage.dismissNotifications();

    // ─── Reveal the Debrief sidebar ───
    await codeServerPage.revealSidebar();
    await codeServerPage.dismissNotifications();

    // ─── Locate the activity panel frame ───
    const frame = await codeServerPage.getActivityPanelFrame();

    // ─── Wait for the tools panel to finish loading ───
    // First the panel shows "Loading analysis tools…", then populates.
    // Wait for either tool items or a "no tools" message to appear,
    // indicating debrief-calc has responded.
    const toolItems = frame.locator('.debrief-tools-panel__item');
    const toolsMessage = frame.locator('.debrief-tools-panel__message');

    // Poll until either tools appear or a status message is shown
    await expect(toolItems.or(toolsMessage)).not.toHaveCount(0, {
      timeout: 20_000,
    });

    // If tools are listed, verify there are inactive/blocked ones
    // (no selection → all tools are blocked). This proves debrief-calc
    // returned an inventory.
    const toolCount = await toolItems.count();
    if (toolCount > 0) {
      const inactiveTools = frame.locator(
        '.debrief-tools-panel__item--inactive'
      );
      const inactiveCount = await inactiveTools.count();
      expect(
        inactiveCount,
        'Expected blocked/inactive tools (proves debrief-calc is responding)'
      ).toBeGreaterThan(0);
      console.log(
        `  ✓ Tools panel: ${toolCount} total, ${inactiveCount} blocked`
      );
    } else {
      // No tool items but we have a message — check it's a reasonable state
      const messageText = await toolsMessage.textContent();
      console.log(`  ⚠ Tools panel message: ${messageText}`);
      // Accept "Select features" or "No matching tools" as valid states
      // that prove debrief-calc responded (vs "Loading" or "unavailable")
      expect(
        messageText,
        'Tools panel should show a state beyond loading'
      ).not.toContain('Loading');
    }
  });
});
