/**
 * CodeServerPage — Page Object for VS Code chrome interactions.
 *
 * Encapsulates interactions with VS Code's outer UI (command palette,
 * file explorer, notifications, panels) running inside code-server.
 *
 * Does NOT interact with Debrief webview content — use DebriefWebview for that.
 */
import type { Page, Locator, FrameLocator } from '@playwright/test';

export class CodeServerPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Wait for VS Code to fully load inside code-server.
   * Waits for the workbench to render and extensions to activate.
   */
  async waitForReady(): Promise<void> {
    // Navigate to the VS Code server.
    // openvscode-server opens a workspace folder via ?folder= query param
    // (it doesn't accept a positional folder arg like code-server does).
    const workspaceFolder = process.env.E2E_WORKSPACE_FOLDER;
    const url = workspaceFolder ? `/?folder=${encodeURIComponent(workspaceFolder)}` : '/';
    await this.page.goto(url);

    // Wait for the VS Code workbench to render
    await this.page.waitForSelector('.monaco-workbench', {
      state: 'visible',
      timeout: 30_000,
    });

    // Wait for the editor area (indicates VS Code is fully loaded)
    await this.page.waitForSelector('.editor-group-container', {
      state: 'visible',
      timeout: 30_000,
    });

    // Wait for extensions to activate — poll for the activity bar to have
    // custom viewlet icons (indicates extensions contributed views).
    await this.page
      .locator('.activitybar .action-item')
      .nth(2)
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => {});

    // Dismiss the Workspace Trust dialog if it appears.
    // Despite --disable-workspace-trust flag, the dialog may still show
    // on first open with a new user-data-dir.
    const trustButton = this.page.locator('text=Yes, I trust the authors');
    const hasTrustDialog = await trustButton
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (hasTrustDialog) {
      await trustButton.click();
      await this.page.waitForTimeout(500);
    }

    // Close the Welcome tab if open — it captures keyboard focus into an
    // iframe, preventing command palette and Quick Open from working.
    // Click the title bar first to ensure main window gets focus.
    await this.page.locator('.part.titlebar').click().catch(() => {});
    await this.page.waitForTimeout(300);

    // Press Escape to dismiss any remaining dialogs/overlays, then close Welcome
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Control+KeyW');
    await this.page.waitForTimeout(500);

    // Click the title bar again to ensure focus is on main window
    await this.page.locator('.part.titlebar').click().catch(() => {});

    // Dismiss any notification toasts that may overlay the UI or capture focus
    await this.dismissNotifications();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Locators
  // ─────────────────────────────────────────────────────────────────────────────

  /** The VS Code workbench container. */
  get workbench(): Locator {
    return this.page.locator('.monaco-workbench');
  }

  /** The command palette input. */
  get commandInput(): Locator {
    return this.page.locator('.quick-input-box input');
  }

  /** The file explorer tree view. */
  get fileExplorer(): Locator {
    return this.page.locator('.explorer-folders-view');
  }

  /** The notification toast area. */
  get notificationArea(): Locator {
    return this.page.locator('.notifications-toasts');
  }

  /** The panel area (bottom panel). */
  get panelArea(): Locator {
    return this.page.locator('.panel');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Open a file via the VS Code command palette (Quick Open).
   * NOTE: This opens the file as plain text. It does NOT trigger the Debrief
   * extension's webview. Use openPlotViaStacTree() for that.
   * @param relativePath - Path relative to the workspace root
   */
  async openFile(relativePath: string): Promise<void> {
    // Use Ctrl+P for Quick Open
    await this.page.keyboard.press('Control+KeyP');
    await this.commandInput.waitFor({ state: 'visible', timeout: 5_000 });
    await this.commandInput.fill(relativePath);
    await this.page.keyboard.press('Enter');

    // Wait for an editor tab to appear with the filename
    const basename = relativePath.split('/').pop() ?? relativePath;
    await this.page
      .locator(`.tab:has-text("${basename}")`)
      .waitFor({ state: 'visible', timeout: 5_000 })
      .catch(() => {});
  }

  /**
   * Open a plot via the STAC tree view, which triggers the Debrief extension's
   * webview (MapPanel). This is the correct way to open a plot in E2E tests.
   *
   * Uses command-based focus (not CSS selectors) to reliably expand the STAC
   * pane, and positive signal waits (tree rows appearing) instead of polling
   * for loading-text absence.
   *
   * @param plotName - Display name of the plot in the STAC tree (e.g. "Exercise Alpha")
   */
  async openPlotViaStacTree(plotName: string): Promise<void> {
    const page = this.page;

    // Step 1: Focus and expand the STAC Stores pane via command palette
    await this.focusAndExpandStacPane();

    // Step 2: Wait for a STAC store row to appear (positive signal).
    // Must match STAC-specific rows — not file explorer rows which also
    // use .monaco-list-row. Store nodes use "STAC: {displayName}" labels.
    const storeRow = page.locator('.monaco-list-row:has-text("STAC:")').first();
    await storeRow
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(async () => {
        await this.captureTreeDiagnostics('no-store-row');
        throw new Error(
          'STAC store row not found in tree within 20s. ' +
          'Ensure config.json is pre-seeded and the extension activated.'
        );
      });

    const storeTwistie = storeRow.locator('.monaco-tl-twistie');
    const storeCollapsed = await storeTwistie
      .evaluate((el) => el.classList.contains('collapsed'))
      .catch(() => true);
    if (storeCollapsed) {
      await storeTwistie.click();
    }

    // Step 4: Find the plot node — may be directly visible or under a catalog node
    const plotNode = page.locator(`.monaco-list-row:has-text("${plotName}")`).first();
    const catalogNode = page.locator('.monaco-list-row:has-text("plots")').first();

    const firstVisible = await Promise.race([
      catalogNode.waitFor({ state: 'visible', timeout: 5_000 }).then(() => 'catalog' as const),
      plotNode.waitFor({ state: 'visible', timeout: 5_000 }).then(() => 'plot' as const),
    ]).catch(async () => {
      await this.captureTreeDiagnostics('no-catalog-or-plot');
      throw new Error(
        `Neither catalog nor plot "${plotName}" visible after expanding store.`
      );
    });

    if (firstVisible === 'catalog') {
      const catalogTwistie = catalogNode.locator('.monaco-tl-twistie');
      const catalogCollapsed = await catalogTwistie
        .evaluate((el) => el.classList.contains('collapsed'))
        .catch(() => true);
      if (catalogCollapsed) {
        await catalogTwistie.click();
      }
      await plotNode.waitFor({ state: 'visible', timeout: 5_000 });
    }

    // Step 5: Click the plot to open it (triggers debrief.openPlot → MapPanel)
    await plotNode.click();

    // Step 6: Wait for the webview iframe to appear and become ready
    await page
      .locator('iframe.webview')
      .first()
      .waitFor({ state: 'attached', timeout: 15_000 });

    await page
      .locator('iframe.webview.ready')
      .first()
      .waitFor({ state: 'attached', timeout: 10_000 })
      .catch(() => {});
  }

  /**
   * Navigate the STAC tree to find a plot node, without opening it.
   * Validates that the STAC Stores tree view loads, populates with store
   * rows, and is navigable — independent of webview rendering.
   *
   * @param plotName - Display name of the plot (e.g. "Exercise Alpha")
   * @returns Object with store and plot node labels for assertion
   */
  async navigateStacTree(plotName: string): Promise<{
    storeLabel: string;
    plotLabel: string;
    treeRowCount: number;
  }> {
    const page = this.page;

    // Step 1: Focus and expand the STAC Stores pane
    await this.focusAndExpandStacPane();

    // Step 2: Wait for a STAC store row to appear
    const storeRow = page.locator('.monaco-list-row:has-text("STAC:")').first();
    await storeRow
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(async () => {
        await this.captureTreeDiagnostics('navigate-no-store-row');
        throw new Error(
          'STAC store row not found in tree within 20s. ' +
          'Ensure config.json is pre-seeded and the extension activated.'
        );
      });

    const storeLabel = (await storeRow.textContent()) ?? '';

    // Step 3: Expand the store node
    const storeTwistie = storeRow.locator('.monaco-tl-twistie');
    const storeCollapsed = await storeTwistie
      .evaluate((el) => el.classList.contains('collapsed'))
      .catch(() => true);
    if (storeCollapsed) {
      await storeTwistie.click();
    }

    // Step 4: Find the plot node
    const plotNode = page.locator(`.monaco-list-row:has-text("${plotName}")`).first();
    const catalogNode = page.locator('.monaco-list-row:has-text("plots")').first();

    const firstVisible = await Promise.race([
      catalogNode.waitFor({ state: 'visible', timeout: 5_000 }).then(() => 'catalog' as const),
      plotNode.waitFor({ state: 'visible', timeout: 5_000 }).then(() => 'plot' as const),
    ]).catch(async () => {
      await this.captureTreeDiagnostics('navigate-no-catalog-or-plot');
      throw new Error(
        `Neither catalog nor plot "${plotName}" visible after expanding store.`
      );
    });

    if (firstVisible === 'catalog') {
      const catalogTwistie = catalogNode.locator('.monaco-tl-twistie');
      const catalogCollapsed = await catalogTwistie
        .evaluate((el) => el.classList.contains('collapsed'))
        .catch(() => true);
      if (catalogCollapsed) {
        await catalogTwistie.click();
      }
      await plotNode.waitFor({ state: 'visible', timeout: 5_000 });
    }

    const plotLabel = (await plotNode.textContent()) ?? '';
    const treeRowCount = await page.locator('.monaco-list-row').count();

    return { storeLabel, plotLabel, treeRowCount };
  }

  /**
   * Open a plot via the command palette using the "Debrief: Open Plot" command.
   * This is an alternative to `openPlotViaStacTree()` that bypasses tree UI
   * navigation entirely — useful as a fallback if tree rendering is unreliable.
   *
   * @param plotName - Display name of the plot to open (e.g. "Exercise Alpha")
   */
  async openPlotViaCommand(plotName: string): Promise<void> {
    const page = this.page;

    // Invoke "Debrief: Open Plot" via command palette.
    // The `>` prefix is required — VS Code's QuickInput auto-inserts it
    // when Ctrl+Shift+P is pressed; `fill()` would otherwise overwrite
    // the prefix and drop us into QuickOpen file-search mode.
    await page.keyboard.press('Control+Shift+KeyP');
    await this.commandInput.waitFor({ state: 'visible', timeout: 5_000 });
    await this.commandInput.fill('>Debrief: Open Plot');
    await page.keyboard.press('Enter');

    // Wait for the Quick Pick to show the plot list, then select the plot
    const plotItem = page
      .locator('.quick-input-list .monaco-list-row')
      .filter({ hasText: plotName })
      .first();
    await plotItem.waitFor({ state: 'visible', timeout: 10_000 });
    await plotItem.click();

    // Wait for the webview iframe to appear and become ready
    await page
      .locator('iframe.webview')
      .first()
      .waitFor({ state: 'attached', timeout: 15_000 });

    await page
      .locator('iframe.webview.ready')
      .first()
      .waitFor({ state: 'attached', timeout: 10_000 })
      .catch(() => {});
  }

  /**
   * Execute a VS Code command via the command palette.
   *
   * IMPORTANT: Ctrl+Shift+P inserts a '>' prefix into the Quick Input box
   * to put it in **command** mode. Using `fill(command)` would REPLACE that
   * '>' prefix, turning the search into a file (Quick Open) search and
   * yielding "No matching results" for every command. We prepend '>' if
   * the caller didn't.
   *
   * @param command - The command name to type (e.g., 'Debrief: Load File')
   */
  async executeCommand(command: string): Promise<void> {
    // Open command palette with Ctrl+Shift+P
    await this.page.keyboard.press('Control+Shift+KeyP');
    await this.commandInput.waitFor({ state: 'visible', timeout: 5_000 });
    const prefixed = command.startsWith('>') ? command : `>${command}`;
    await this.commandInput.fill(prefixed);

    // Wait for suggestions to appear, then select the first match
    await this.page.locator('.quick-input-list .monaco-list-row').first()
      .waitFor({ state: 'visible', timeout: 3_000 })
      .catch(() => {});
    await this.page.keyboard.press('Enter');
  }

  /**
   * Get all visible notification messages.
   * @returns Array of notification text contents
   */
  async getNotifications(): Promise<string[]> {
    const toasts = this.page.locator('.notification-toast-container');
    const count = await toasts.count();
    const messages: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await toasts.nth(i).textContent();
      if (text) messages.push(text.trim());
    }
    return messages;
  }

  /**
   * Wait for a notification containing the specified text.
   * @param text - Partial text to match in notification
   * @param timeout - Maximum wait time in ms
   */
  async waitForNotification(text: string, timeout = 10_000): Promise<void> {
    await this.page
      .locator(`.notification-toast-container:has-text("${text}")`)
      .waitFor({ state: 'visible', timeout });
  }

  /**
   * Dismiss all visible notifications.
   */
  async dismissNotifications(): Promise<void> {
    const closeButtons = this.page.locator(
      '.notification-toast-container .codicon-close'
    );
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click();
    }
  }

  /**
   * Access a webview panel's inner frame.
   *
   * VS Code webviews use two-level iframe nesting:
   *   Level 1: iframe.webview.ready (outer container)
   *   Level 2: #active-frame (inner content — Debrief React components)
   *
   * @param title - Optional panel title to target a specific webview
   * @returns FrameLocator pointing to the innermost webview content
   */
  async getWebviewFrame(title?: string): Promise<FrameLocator> {
    // Wait for at least one webview iframe to appear
    await this.page
      .locator('iframe.webview.ready')
      .first()
      .waitFor({ state: 'attached', timeout: 15_000 });

    // Drill into the two-level iframe hierarchy
    const outerFrame = this.page.frameLocator('iframe.webview.ready').first();
    const innerFrame = outerFrame.frameLocator('#active-frame');

    return innerFrame;
  }

  /**
   * Open the Explorer sidebar (file tree).
   */
  async openExplorer(): Promise<void> {
    await this.page.keyboard.press('Control+Shift+KeyE');
    await this.fileExplorer.waitFor({ state: 'visible', timeout: 5_000 });
  }

  /**
   * Open the Debrief sidebar (Activity Panel + Log Panel views).
   * Clicks the Debrief icon in the activity bar to reveal the sidebar container.
   */
  async openDebriefSidebar(): Promise<void> {
    const debriefIcon = this.page.locator(
      [
        '.action-item a[aria-label="Debrief"]',
        '[role="tab"][aria-label*="Debrief"]',
        '.activitybar [aria-label*="Debrief" i]',
      ].join(', ')
    ).first();
    await debriefIcon.click();
    // Wait for the sidebar content to render
    await this.page.locator('.composite.viewlet').waitFor({
      state: 'visible',
      timeout: 5_000,
    }).catch(() => {});
  }

  /**
   * Force the Debrief sidebar view to reveal, triggering resolveWebviewView.
   *
   * In openvscode-server, sidebar webview views are never automatically shown
   * because isBodyVisible() returns false — the view is not expanded and not
   * marked visible. This method uses the command palette to execute the view
   * focus command, which calls openView() → setExpanded(true) + setVisible(true),
   * triggering the webview view resolution lifecycle.
   *
   * Must be called AFTER the extension has activated (STAC tree populated).
   *
   * @see docs/project_notes/webview-e2e-research.md — Blocker 4 resolution
   */
  async revealSidebar(): Promise<void> {
    // Try the view container command first (focuses the entire Debrief sidebar).
    // VS Code's auto-generated focus title is `<containerTitle>: Focus on
    // <viewName> View`. For our manifest entry that's "Debrief: Focus on
    // Activity View" (container title "Debrief", view name "Activity"),
    // not "Debrief: Focus on Debrief View".
    await this.page.keyboard.press('Control+Shift+KeyP');
    await this.commandInput.waitFor({ state: 'visible', timeout: 5_000 });
    await this.commandInput.fill('>Debrief: Focus on Activity View');
    await this.page.keyboard.press('Enter');

    // Wait for sidebar to render
    await this.page.locator('.composite.viewlet').waitFor({
      state: 'visible',
      timeout: 10_000,
    }).catch(() => {});

    // Give the webview view resolution time to complete
    await this.page.waitForTimeout(2_000);

    // If the first command didn't work, try clicking the activity bar icon
    const hasWebview = await this.page
      .locator('iframe.webview')
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasWebview) {
      await this.openDebriefSidebar();
      await this.page.waitForTimeout(2_000);
    }
  }

  /**
   * Access the Activity Panel webview frame (sidebar — FeatureList, ToolsPanel, TimeController).
   *
   * The Activity Panel lives in the Debrief sidebar container as a webview view.
   * It uses the same two-level iframe nesting as editor webviews.
   *
   * @returns FrameLocator pointing to the innermost Activity Panel content
   */
  async getActivityPanelFrame(): Promise<FrameLocator> {
    // Ensure the Debrief sidebar is open
    await this.openDebriefSidebar();

    // Find the Activity Panel webview by probing frame content.
    // The Activity Panel renders .debrief-activity-panel as its root element.
    return this.findWebviewFrameByContent('.debrief-activity-panel', 15_000);
  }

  /**
   * Access the Log Panel webview frame (sidebar — LogPanel with entries and edit face).
   *
   * The Log Panel lives alongside the Activity Panel in the Debrief sidebar.
   * It may need to be scrolled into view or its tab clicked.
   *
   * @returns FrameLocator pointing to the innermost Log Panel content
   */
  async getLogPanelFrame(): Promise<FrameLocator> {
    // Debrief Log lives in its OWN activity-bar container (id `debrief-log`,
    // separate from the `debrief` container that hosts the Activity +
    // Storyboard panels). The container needs an activity-bar click first
    // to take the active sidebar slot — running the focus command alone
    // doesn't switch the active container in openvscode-server, leaving
    // the LogPanel webview never resolved.
    const logBarIcon = this.page.locator(
      [
        '.activitybar [aria-label="Debrief Log"]',
        '.activitybar [aria-label*="Debrief Log" i]',
        '[role="tab"][aria-label*="Debrief Log"]',
      ].join(', ')
    ).first();
    await logBarIcon.click().catch(() => {});
    await this.page.waitForTimeout(500);

    // Then run the auto-generated focus command. VS Code surfaces it as
    // `<containerTitle>: Focus on <viewName> View` → for our manifest
    // entry (container "Debrief Log" + view name "Log") that's
    // "Debrief Log: Focus on Log View".  This command triggers
    // `resolveWebviewView` (Patch 3 from #142).
    await this.executeCommand('Debrief Log: Focus on Log View');
    await this.page.waitForTimeout(1_000);

    // Find the Log Panel webview by probing frame content.
    // The Log Panel renders [data-testid="log-panel"] as its root element.
    const frame = await this.findWebviewFrameByContent(
      '[data-testid="log-panel"]',
      15_000
    );

    // Simulate the extension → webview `session:change` message so the
    // LogPanel React app reflects an active plot.  The Hybrid A+D
    // injection framework only provides the bundled JS; extension ↔
    // webview state messages don't flow naturally
    // (see docs/project_notes/webview-e2e-research.md "Limitations").
    // Without this, the panel renders the `log-panel-empty-no-plot`
    // state even after a plot has been opened — the spec's test bodies
    // expect `log-panel-empty-no-entries`.
    await frame
      .locator('[data-testid="log-panel"]')
      .evaluate((root) => {
        const win = (root.ownerDocument as Document).defaultView;
        if (!win) return;
        win.dispatchEvent(
          new MessageEvent('message', {
            data: {
              type: 'session:change',
              payload: { hasActiveSession: true, plotName: 'Exercise Alpha' },
            },
          })
        );
        // Send an empty timeline so the panel transitions out of the
        // initial "loading" placeholder if it has one.
        win.dispatchEvent(
          new MessageEvent('message', {
            data: {
              type: 'timeline:update',
              payload: { entries: [], featureNames: {} },
            },
          })
        );
      })
      .catch(() => {
        // Non-fatal — the test will report a clearer failure if the
        // expected testid is missing.
      });

    return frame;
  }

  /**
   * Find a webview inner frame that contains a given CSS selector.
   *
   * Polls until a child frame of a webview host frame contains the selector.
   * Returns the raw Frame object for direct locator access.
   *
   * @param selector - CSS selector to probe for inside the webview
   * @param timeoutMs - Maximum time to wait
   */
  async findWebviewWithContent(
    selector: string,
    timeoutMs: number
  ): Promise<import('@playwright/test').Frame> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const frames = this.page.frames();
      for (const frame of frames) {
        if (!frame.url().includes('webview')) continue;
        const children = frame.childFrames();
        for (const child of children) {
          const hasContent = await child
            .locator(selector)
            .first()
            .isVisible()
            .catch(() => false);
          if (hasContent) {
            return child;
          }
        }
      }
      await this.page.waitForTimeout(500);
    }
    throw new Error(
      `Webview frame with content "${selector}" not found after ${timeoutMs}ms`
    );
  }

  /**
   * Find a specific webview frame by probing for a CSS selector in its content.
   *
   * Iterates all webview host frames and checks each inner frame for the
   * given selector. Returns a FrameLocator for the matching inner frame.
   *
   * @param selector - CSS selector to probe for inside the webview
   * @param timeoutMs - Maximum time to wait for the frame to appear
   */
  private async findWebviewFrameByContent(
    selector: string,
    timeoutMs: number
  ): Promise<FrameLocator> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const frames = this.page.frames();
      for (const frame of frames) {
        if (!frame.url().includes('webview')) continue;
        const children = frame.childFrames();
        for (const child of children) {
          const hasContent = await child
            .locator(selector)
            .first()
            .isVisible()
            .catch(() => false);
          if (hasContent) {
            // Found it — return a FrameLocator chain for stable access
            // We need to identify which outer iframe this is.
            // Use the frame's URL to create a specific FrameLocator.
            const outerUrl = frame.url();
            const outerLocator = this.page.frameLocator(
              `iframe.webview[src*="${this.extractFrameId(outerUrl)}"]`
            );
            return outerLocator.frameLocator('#active-frame');
          }
        }
      }
      await this.page.waitForTimeout(500);
    }
    throw new Error(`Webview frame with content "${selector}" not found after ${timeoutMs}ms`);
  }

  /**
   * Extract a unique identifier from a webview frame URL for locator targeting.
   *
   * In modern openvscode-server, webview iframes are served from
   * `https://<uuid>.vscode-cdn.net/...?id=<webview-id>&...`.
   * The query string's `id` param is the most stable identifier — it's the
   * same value as the iframe element's `name` attribute, so a matching
   * locator can target the EXACT iframe whose URL matched the content
   * search.  (Older `vscode-webview://` URL form is also handled for
   * backwards compatibility.)
   */
  private extractFrameId(url: string): string {
    try {
      const id = new URL(url).searchParams.get('id');
      if (id) return id;
    } catch {
      // Fall through to legacy regex
    }
    const legacy = url.match(/vscode-webview:\/\/([^/]+)/);
    return legacy ? legacy[1].substring(0, 20) : '';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STAC Tree Helpers (private)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Focus and expand the STAC Stores pane using a command palette focus command.
   * Mirrors the proven `revealSidebar()` pattern: command-based focus is reliable
   * in openvscode-server because it bypasses CSS-selector fragility.
   *
   * After focusing, waits for the first `.monaco-list-row` to appear as a
   * positive signal that the tree has rendered.
   */
  private async focusAndExpandStacPane(): Promise<void> {
    const page = this.page;

    // Dismiss any open overlays and notifications that may cover tree rows
    await page.keyboard.press('Escape');
    await this.dismissNotifications();

    // Use command palette to focus the STAC Stores view.
    // VS Code auto-generates a focus command for registered views:
    // `debrief.stacExplorer.focus` → "Explorer: Focus on STAC Stores View"
    await page.keyboard.press('Control+Shift+KeyP');
    await this.commandInput.waitFor({ state: 'visible', timeout: 5_000 });
    await this.commandInput.fill('>Explorer: Focus on STAC Stores View');
    await page.keyboard.press('Enter');

    // Wait for the pane header to be visible (case-insensitive match)
    const stacHeader = page.locator('.pane-header').filter({
      has: page.locator('h3', { hasText: /stac stores/i }),
    });
    await stacHeader
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(async () => {
        // Fallback: try opening Explorer first, then re-focus
        await page.keyboard.press('Control+Shift+KeyE');
        await page.keyboard.press('Control+Shift+KeyP');
        await this.commandInput.waitFor({ state: 'visible', timeout: 5_000 });
        await this.commandInput.fill('>Explorer: Focus on STAC Stores View');
        await page.keyboard.press('Enter');
        await stacHeader.waitFor({ state: 'visible', timeout: 5_000 }).catch(async () => {
          await this.captureTreeDiagnostics('focus-stac-pane-failed');
          throw new Error(
            'STAC Stores pane header not visible after command-based focus. ' +
            'Check that the Debrief extension is installed and activated.'
          );
        });
      });

    // Ensure pane is expanded (aria-expanded may be "false" if collapsed)
    const expanded = await stacHeader.getAttribute('aria-expanded');
    if (expanded === 'false') {
      await stacHeader.click();
    }

    // Maximize the STAC pane by collapsing the file explorer section above it.
    // Without this, the STAC pane has too little height for tree rows to render
    // (VS Code tree views use virtual scrolling — no rows if container is tiny).
    const fileExplorerHeader = page.locator('.pane-header').filter({
      has: page.locator('h3', { hasText: /test-workspace/i }),
    }).first();
    const feExpanded = await fileExplorerHeader.getAttribute('aria-expanded').catch(() => null);
    if (feExpanded === 'true') {
      await fileExplorerHeader.click();
    }
  }

  /**
   * Capture diagnostic screenshots and tree state for debugging failures.
   * Dumps all visible tree row labels and takes a screenshot.
   */
  private async captureTreeDiagnostics(stage: string): Promise<void> {
    const page = this.page;
    const screenshotPath = `tests/e2e/evidence/debug-${stage}.png`;
    await page.screenshot({ path: screenshotPath }).catch(() => {});

    const rows = await page
      .locator('.monaco-list-row')
      .allTextContents()
      .catch(() => [] as string[]);
    if (rows.length > 0) {
      console.log(`[diag:${stage}] Tree rows (${rows.length}): ${JSON.stringify(rows.slice(0, 20))}`);
    } else {
      console.log(`[diag:${stage}] No tree rows visible`);
    }
  }
}
