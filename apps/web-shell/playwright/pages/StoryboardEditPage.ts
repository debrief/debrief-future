/**
 * Page object for the Storyboard edit harness (Feature 230 US4).
 *
 * The harness is a standalone browser view at `?storyboard-edit-harness=1`
 * — no VS Code involvement, no golden-layout chrome. Driven entirely by
 * data-testid selectors on the shared StoryboardPanel components.
 */

import type { Page, Locator } from '@playwright/test';

export interface HarnessOpenOptions {
  readonly stale?: readonly string[];
  readonly pendingDelete?: readonly string[];
  readonly missingData?: Readonly<Record<string, readonly string[]>>;
}

export class StoryboardEditPage {
  constructor(public readonly page: Page) {}

  /**
   * Navigate to the harness with optional initial-state knobs.
   */
  async open(options: HarnessOpenOptions = {}): Promise<void> {
    const params = new URLSearchParams();
    params.set('storyboard-edit-harness', '1');
    if (options.stale && options.stale.length > 0) {
      params.set('stale', options.stale.join(','));
    }
    if (options.pendingDelete && options.pendingDelete.length > 0) {
      params.set('pendingDelete', options.pendingDelete.join(','));
    }
    if (options.missingData) {
      const parts: string[] = [];
      for (const [sceneId, ids] of Object.entries(options.missingData)) {
        parts.push(`${sceneId}:${ids.join(',')}`);
      }
      if (parts.length > 0) {
        params.set('missingData', parts.join('|'));
      }
    }
    await this.page.goto(`/?${params.toString()}`);
    await this.page.waitForSelector('[data-testid="storyboard-edit-harness"]', {
      state: 'visible',
      timeout: 10000,
    });
    await this.page.waitForSelector('[data-testid="storyboard-panel"]', {
      state: 'visible',
      timeout: 10000,
    });
  }

  sceneRow(sceneId: string): Locator {
    // Scope to data-testid=scene-row so the Undo toast (which also
    // carries data-scene-id) does not match.
    return this.page.locator(
      `[data-testid="scene-row"][data-scene-id="${sceneId}"]`,
    );
  }

  overflowTriggerFor(sceneId: string): Locator {
    return this.sceneRow(sceneId).locator(
      '[data-testid="scene-overflow-trigger"]',
    );
  }

  overflowMenu(): Locator {
    return this.page.locator('[data-testid="scene-overflow-menu"]');
  }

  overflowMenuItem(id: string): Locator {
    return this.page.locator(`[data-testid="scene-overflow-menuitem-${id}"]`);
  }

  /** The per-Scene edit dialog (replaced the inline edit form). */
  editDialog(): Locator {
    return this.page.locator('[data-testid="scene-edit-dialog"]');
  }

  /**
   * Open the per-Scene edit dialog via the ⋯ overflow menu's "Edit scene…"
   * item (the chevron + inline form were removed in the UX-review flatten).
   */
  async openEditDialog(sceneId: string): Promise<void> {
    await this.overflowTriggerFor(sceneId).click();
    await this.overflowMenuItem('edit-description').click();
    await this.editDialog().waitFor({ state: 'visible', timeout: 5000 });
  }

  undoToast(): Locator {
    return this.page.locator('[data-testid="undo-toast"]');
  }

  staleBadgeFor(sceneId: string): Locator {
    return this.page.locator(
      `[data-testid="stale-badge"][data-scene-id="${sceneId}"]`,
    );
  }

  refreshAllStaleButton(): Locator {
    return this.page.locator('[data-testid="refresh-all-stale"]');
  }

  /**
   * Read the captured outbound message stream from the page.
   */
  async outboundMessages(): Promise<
    Array<{ type: string; payload: Record<string, unknown> }>
  > {
    return this.page.evaluate(() => {
      const raw = (globalThis as { __harnessOutbound__?: unknown })
        .__harnessOutbound__;
      return Array.isArray(raw)
        ? (raw as Array<{ type: string; payload: Record<string, unknown> }>)
        : [];
    });
  }
}
