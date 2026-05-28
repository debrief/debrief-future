/**
 * Test-side fixture for the Activity panel's Properties section.
 *
 * Spec #192 changed the Properties section's content: when a feature is
 * selected, `FeatureEditorMode` now renders 7+ editable slot rows + revert
 * controls — substantially more vertical space than #447's plot-only
 * editor previously claimed. The section is `layout="fixed"` in production
 * by design (analysts who care about Properties want it sized to its
 * content), but the side effect is that the Layers section gets squeezed
 * in the 1280×720 headless viewport. `@tanstack/react-virtual` then
 * renders 0 feature rows in the Layers list, and any Playwright test
 * that selects a feature via the Layers panel followed by another
 * Layers-panel interaction times out at 30 s — the row it tried to
 * click is no longer in the DOM.
 *
 * Pre-#192 specs (selection-sync, run-dropdown-visibility-format, drawing,
 * log-edit-face, log-panel, capture-log-evidence, event-log-propagation,
 * result-file-actions) were written when Properties was small. They
 * remain valid as functional tests — the regression is purely a layout
 * coincidence — so the fix lives on the test side: call this helper in
 * `beforeEach` to keep the Properties section header-only. The Layers
 * section then gets the full pre-#192 share of vertical space.
 *
 * Idempotent — it probes the header's `aria-expanded` and only clicks if
 * the section is currently expanded.
 */

import type { Page } from '@playwright/test';

export async function collapsePropertiesSection(page: Page): Promise<void> {
  const propertiesHeader = page.locator(
    'button.debrief-activity-panel__section-header:has-text("Properties")',
  );
  if ((await propertiesHeader.count()) === 0) return;
  const expanded = await propertiesHeader.getAttribute('aria-expanded');
  if (expanded === 'true') await propertiesHeader.click();
}
