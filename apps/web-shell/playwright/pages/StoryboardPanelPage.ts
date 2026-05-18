/**
 * StoryboardPanelPage - Page Object Model for the Storyboard panel rail.
 *
 * Provides selectors and helpers for the panel introduced by #235 and
 * extended through the storyboarding feature line (#216, #217, #218,
 * #258, #259). Used by tests that drive the capture / playback / edit
 * flows in the web-shell.
 */

import type { Page, Locator } from '@playwright/test';

export interface SceneRowSnapshot {
  readonly id: string;
  readonly title: string;
  readonly dtg: string;
}

export class StoryboardPanelPage {
  readonly page: Page;
  readonly rail: Locator;
  readonly captureButton: Locator;
  readonly emptyState: Locator;
  readonly namingRow: Locator;
  readonly namingInput: Locator;
  readonly namingConfirm: Locator;
  readonly storyboardName: Locator;
  readonly sceneCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.rail = page.locator('[data-testid="storyboard-panel-rail"]');
    this.captureButton = page.locator('[data-testid="capture-scene-button"]');
    this.emptyState = page.locator('[data-testid="storyboard-empty-state"]');
    this.namingRow = page.locator('[data-testid="storyboard-naming-row"]');
    this.namingInput = page.locator(
      '[data-testid="storyboard-naming-row-input"]',
    );
    this.namingConfirm = page.locator(
      '[data-testid="storyboard-naming-row-confirm"]',
    );
    this.storyboardName = page.locator('[data-testid="storyboard-name"]');
    this.sceneCount = page.locator('[data-testid="storyboard-scene-count"]');
  }

  /**
   * Enumerate the Scene rows currently rendered in the panel, in DOM
   * (= rendered) order. The panel renders rows in
   * `(timestamp, creation_order)` ASC per #259's `listScenesOrdered`
   * canonical helper, so the order returned here matches the documented
   * sort key.
   */
  async getSceneRows(): Promise<readonly SceneRowSnapshot[]> {
    const rows = await this.page
      .locator('[data-testid="scene-row"]')
      .elementHandles();
    const snapshots: SceneRowSnapshot[] = [];
    for (const row of rows) {
      const id = (await row.getAttribute('data-scene-id')) ?? '';
      const titleEl = await row.$('[data-testid="scene-row-title"]');
      const dtgEl = await row.$('[data-testid="scene-row-dtg"]');
      const title = titleEl ? ((await titleEl.textContent()) ?? '').trim() : '';
      const dtg = dtgEl ? ((await dtgEl.textContent()) ?? '').trim() : '';
      snapshots.push({ id, title, dtg });
    }
    return snapshots;
  }

  /** Count of Scene rows currently rendered. */
  async sceneRowCount(): Promise<number> {
    return this.page.locator('[data-testid="scene-row"]').count();
  }

  /**
   * First-capture flow — opens the panel, enters a Storyboard name in the
   * naming row, confirms, and waits for the first Scene to render.
   */
  async firstCapture(storyboardName: string): Promise<void> {
    await this.captureButton.click();
    await this.namingRow.waitFor({ state: 'visible', timeout: 5000 });
    await this.namingInput.fill(storyboardName);
    await this.namingConfirm.click();
    await this.namingRow.waitFor({ state: 'hidden', timeout: 5000 });
    await this.page.waitForFunction(
      () => {
        const fc = window.__currentPlotFeatures ?? [];
        return fc.some(
          (f) =>
            (f.properties as { kind?: string })?.kind === 'STORYBOARD_SCENE',
        );
      },
      { timeout: 10000 },
    );
  }

  /**
   * Subsequent capture — clicks the top-right capture button on the
   * already-populated panel and waits for the Scene count to advance.
   */
  async subsequentCapture(): Promise<void> {
    const before = await this.sceneRowCount();
    await this.page.locator('[data-testid="capture-button"]').click();
    await this.page.waitForFunction(
      (expected) => {
        const rows = document.querySelectorAll('[data-testid="scene-row"]');
        return rows.length >= expected + 1;
      },
      before,
      { timeout: 10000 },
    );
  }
}
