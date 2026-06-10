import type { Locator, Page } from '@playwright/test';

/** Playwright-style modifier names, so call sites can forward them verbatim. */
export type RowClickModifier = 'Meta' | 'Control' | 'Shift';

/**
 * Robustly click a row inside a virtualised (`@tanstack/react-virtual`)
 * feature list that lives in the scrollable ActivityPanel column.
 *
 * Why this exists
 * ---------------
 * At a 1280×720 viewport the ~487px GoldenLayout sidebar scrolls (US4/FR-012)
 * and the Time Controller is pinned `sticky` at the top. The feature row is
 * genuinely rendered inside the viewport (verified via getBoundingClientRect),
 * but Playwright's own `click()` still fails on it: a plain click scroll-thrashes
 * the virtualiser into a 30 s "element is not visible" timeout, and a `force`
 * click reports "outside of the viewport" — the nested inner-list scroll plus
 * the sticky header confuse Playwright's scroll/visibility heuristics.
 *
 * Since the element is present and correct, we dispatch the click directly
 * through the DOM: scroll it to centre for a clean visual position, then
 * dispatch a `MouseEvent` (carrying any modifier keys) which fires React's
 * delegated onClick (feature selection) without any of Playwright's viewport
 * machinery. The scroll + dispatch happen in a single `evaluate` so the
 * virtualiser cannot detach the node between the two steps.
 */
export async function clickVirtualisedRow(
  page: Page,
  target: Locator,
  modifiers: ReadonlyArray<RowClickModifier> = [],
): Promise<void> {
  await target.evaluate((el, mods) => {
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    el.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        metaKey: mods.includes('Meta'),
        ctrlKey: mods.includes('Control'),
        shiftKey: mods.includes('Shift'),
      }),
    );
  }, modifiers as RowClickModifier[]);
  // Let React process the selection + the virtualiser re-render settle.
  await page.waitForTimeout(50);
}
