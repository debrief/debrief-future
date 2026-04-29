/**
 * Visibility-invariant Playwright helper (#235 — FR-VIS-022/023, SC-001/SC-002).
 *
 * Asserts that the Leaflet map and time controller remain visible AND
 * pointer-reachable (no element with `role="dialog"`, `aria-modal="true"`,
 * `[data-overlay]`, or fixed positioning above the rail's z-index sits on
 * top of either control's bounding box) during a flow.
 *
 * Usage:
 *
 * ```ts
 * import { assertViewportControlsRemainAccessible } from '../helpers/viewport-invariants';
 *
 * await page.click('[data-testid="capture-scene-button"]');
 * await assertViewportControlsRemainAccessible(page);
 * await page.fill('[data-testid="storyboard-naming-row-input"]', 'Alpha');
 * await assertViewportControlsRemainAccessible(page);
 * await page.click('[data-testid="storyboard-naming-row-confirm"]');
 * await assertViewportControlsRemainAccessible(page);
 * ```
 *
 * The helper records every call to `window.__visibilityInvariantChecks__`
 * so the Polish-phase aggregator (T094) can produce a per-flow occlusion
 * report.
 */

import { expect, type Page } from '@playwright/test';

const MAP_SELECTOR = '.leaflet-container';
const TIME_CONTROLLER_SELECTOR = '[data-testid="time-controller"]';

interface AssertionRecord {
  readonly checkId: string;
  readonly mapVisible: boolean;
  readonly mapPointerReachable: boolean;
  readonly timeControllerVisible: boolean;
  readonly timeControllerPointerReachable: boolean;
  readonly occludingSelectors: readonly string[];
  readonly timestamp: number;
}

declare global {
  interface Window {
    __visibilityInvariantChecks__?: AssertionRecord[];
  }
}

let assertionCounter = 0;

/**
 * Assert that the map (`.leaflet-container`) and time controller
 * (`[data-testid="time-controller"]`) are both:
 *   1. Present in the DOM
 *   2. Visible (non-zero bounding box, not `display: none` / `visibility: hidden`)
 *   3. Pointer-reachable (the topmost element at the centre of each
 *      control is the control itself or a child — no overlay sits above)
 *   4. Not under any element with `role="dialog"`, `aria-modal="true"`,
 *      `[data-overlay]`, or fixed positioning above z-index 1000.
 *
 * Records the result onto `window.__visibilityInvariantChecks__`.
 */
export async function assertViewportControlsRemainAccessible(
  page: Page,
  options?: { readonly checkId?: string },
): Promise<void> {
  assertionCounter += 1;
  const checkId = options?.checkId ?? `check-${assertionCounter}`;

  const result = await page.evaluate(
    ({ mapSel, timeSel, id }) => {
      const occludingSelectors: string[] = [];

      function isVisible(el: Element | null): boolean {
        if (!el) return false;
        const style = window.getComputedStyle(el as HTMLElement);
        if (style.display === 'none') return false;
        if (style.visibility === 'hidden') return false;
        if (parseFloat(style.opacity || '1') === 0) return false;
        const rect = (el as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function selectorOf(el: Element): string {
        const id = el.id ? `#${el.id}` : '';
        const cls =
          typeof el.className === 'string' && el.className.length > 0
            ? `.${el.className.split(/\s+/).join('.')}`
            : '';
        const role = el.getAttribute('role')
          ? `[role="${el.getAttribute('role')}"]`
          : '';
        const testId = el.getAttribute('data-testid')
          ? `[data-testid="${el.getAttribute('data-testid')}"]`
          : '';
        return `${el.tagName.toLowerCase()}${id}${cls}${role}${testId}`;
      }

      function isOccludingTop(target: Element, top: Element | null): boolean {
        if (!top) return false;
        if (target.contains(top)) return false;
        if (top.contains(target)) return false;
        // Look up the chain for an explicit overlay marker.
        let cursor: Element | null = top;
        while (cursor !== null) {
          if (cursor.getAttribute('role') === 'dialog') {
            occludingSelectors.push(`role=dialog: ${selectorOf(cursor)}`);
            return true;
          }
          if (cursor.getAttribute('aria-modal') === 'true') {
            occludingSelectors.push(`aria-modal: ${selectorOf(cursor)}`);
            return true;
          }
          if (cursor.hasAttribute('data-overlay')) {
            occludingSelectors.push(`data-overlay: ${selectorOf(cursor)}`);
            return true;
          }
          const style = window.getComputedStyle(cursor as HTMLElement);
          if (style.position === 'fixed') {
            const z = parseInt(style.zIndex || '0', 10);
            if (z > 1000) {
              occludingSelectors.push(
                `fixed z=${z}: ${selectorOf(cursor)}`,
              );
              return true;
            }
          }
          cursor = cursor.parentElement;
        }
        // No overlay marker but a different element is on top — still
        // counts as occlusion of the user's pointer reachability.
        occludingSelectors.push(`stacked: ${selectorOf(top)}`);
        return true;
      }

      function checkControl(
        sel: string,
      ): { visible: boolean; pointerReachable: boolean } {
        const el = document.querySelector(sel);
        if (!el || !isVisible(el)) {
          return { visible: false, pointerReachable: false };
        }
        const rect = (el as HTMLElement).getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const top = document.elementFromPoint(cx, cy);
        const occluded = isOccludingTop(el, top);
        return { visible: true, pointerReachable: !occluded };
      }

      const map = checkControl(mapSel);
      const time = checkControl(timeSel);

      const record = {
        checkId: id,
        mapVisible: map.visible,
        mapPointerReachable: map.pointerReachable,
        timeControllerVisible: time.visible,
        timeControllerPointerReachable: time.pointerReachable,
        occludingSelectors,
        timestamp: Date.now(),
      };
      if (!window.__visibilityInvariantChecks__) {
        window.__visibilityInvariantChecks__ = [];
      }
      window.__visibilityInvariantChecks__.push(record);
      return record;
    },
    {
      mapSel: MAP_SELECTOR,
      timeSel: TIME_CONTROLLER_SELECTOR,
      id: checkId,
    },
  );

  expect(
    result.mapVisible,
    `[${checkId}] Leaflet map (${MAP_SELECTOR}) was not visible`,
  ).toBe(true);
  expect(
    result.timeControllerVisible,
    `[${checkId}] Time controller (${TIME_CONTROLLER_SELECTOR}) was not visible`,
  ).toBe(true);
  expect(
    result.mapPointerReachable,
    `[${checkId}] Leaflet map was occluded by: ${result.occludingSelectors.join(', ')}`,
  ).toBe(true);
  expect(
    result.timeControllerPointerReachable,
    `[${checkId}] Time controller was occluded by: ${result.occludingSelectors.join(', ')}`,
  ).toBe(true);
}

/** Reset the counter between tests. */
export function resetViewportInvariantCounter(): void {
  assertionCounter = 0;
}
