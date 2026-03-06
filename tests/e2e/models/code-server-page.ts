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

    // Brief pause for extensions to activate
    await this.page.waitForTimeout(2_000);

    // Close the Welcome tab if open — it captures keyboard focus into an
    // iframe, preventing command palette and Quick Open from working.
    await this.page.keyboard.press('Control+KeyW');
    await this.page.waitForTimeout(500);

    // Click the title bar to ensure main window has focus (not an iframe)
    await this.page.locator('.part.titlebar').click().catch(() => {});
    await this.page.waitForTimeout(300);
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

    // Wait for editor to open the file
    await this.page.waitForTimeout(1_000);
  }

  /**
   * Open a plot via the STAC tree view, which triggers the Debrief extension's
   * webview (MapPanel). This is the correct way to open a plot in E2E tests.
   *
   * @param plotName - Display name of the plot in the STAC tree (e.g. "Exercise Alpha")
   */
  async openPlotViaStacTree(plotName: string): Promise<void> {
    const page = this.page;

    // Focus the STAC Stores view — gives it screen space and scrolls into view
    await this.focusStacView();

    // Wait for extension to finish activating
    await this.waitForExtensionReady(20_000);

    // Ensure the STAC STORES pane is expanded
    await this.ensureStacPaneExpanded();

    // Wait for tree to populate with a store row
    const storeRow = page.locator('.monaco-list-row:has-text("STAC:")').first();
    let storeRowVisible = await storeRow
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (!storeRowVisible) {
      // Config may be missing — seed it via terminal and reload
      await this.seedConfigAndReload();

      // Retry: focus STAC view, wait for extension, expand pane
      await this.focusStacView();
      await this.waitForExtensionReady(20_000);
      await this.ensureStacPaneExpanded();

      storeRowVisible = await storeRow
        .waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
      if (!storeRowVisible) {
        await page.screenshot({ path: 'tests/e2e/evidence/debug-no-stac-row.png' });
        throw new Error('STAC store tree row not visible even after seeding config');
      }
    }

    // Expand the store row if collapsed
    const storeTwistie = storeRow.locator('.monaco-tl-twistie');
    const storeCollapsed = await storeTwistie
      .evaluate((el) => el.classList.contains('collapsed'))
      .catch(() => true);
    if (storeCollapsed) {
      await storeTwistie.click();
    }
    await page.waitForTimeout(2_000);

    // Wait for tree children — plot node may be directly visible if VS Code
    // auto-expanded, or we may need to expand the catalog node first
    const plotNode = page.locator(`.monaco-list-row:has-text("${plotName}")`).first();
    const catalogNode = page.locator('.monaco-list-row:has-text("plots")').first();

    const firstVisible = await Promise.race([
      catalogNode.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'catalog' as const),
      plotNode.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'plot' as const),
    ]).catch(async () => {
      const allRows = await page.locator('.monaco-list-row').allTextContents();
      await page.screenshot({ path: 'tests/e2e/evidence/debug-no-catalog-row.png' });
      throw new Error(
        `Neither catalog nor plot "${plotName}" visible. Rows: ${JSON.stringify(allRows.slice(0, 15))}`
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
      await page.waitForTimeout(2_000);
    }

    // Click the plot node to open it (triggers debrief.openPlot → MapPanel)
    await plotNode.waitFor({ state: 'visible', timeout: 10_000 });
    await plotNode.click();

    // Wait for the webview iframe to appear
    await page
      .locator('iframe.webview')
      .first()
      .waitFor({ state: 'attached', timeout: 30_000 });

    // Wait briefly for webview content to load
    await page.waitForTimeout(3_000);
  }

  /**
   * Execute a VS Code command via the command palette.
   * @param command - The command name to type (e.g., 'Debrief: Load File')
   */
  async executeCommand(command: string): Promise<void> {
    // Open command palette with Ctrl+Shift+P
    await this.page.keyboard.press('Control+Shift+KeyP');
    await this.commandInput.waitFor({ state: 'visible', timeout: 5_000 });
    await this.commandInput.fill(command);

    // Wait for suggestions to appear, then select the first match
    await this.page.waitForTimeout(500);
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
    await this.page.waitForTimeout(2_000);
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
    await this.page.waitForTimeout(2_000);

    // Find the Activity Panel webview by probing frame content.
    // The Activity Panel renders .debrief-activity-panel as its root element.
    return this.findWebviewFrameByContent('.debrief-activity-panel', 20_000);
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
    // Ensure the Debrief sidebar is open
    await this.openDebriefSidebar();

    // Try to focus the Log Panel view via command palette
    await this.page.keyboard.press('Control+Shift+P');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.type('Debrief Log: Focus on Debrief Log View', { delay: 20 });
    await this.page.waitForTimeout(1_000);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2_000);

    // Find the Log Panel webview by probing frame content.
    // The Log Panel renders [data-testid="log-panel"] as its root element.
    return this.findWebviewFrameByContent('[data-testid="log-panel"]', 20_000);
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
      await this.page.waitForTimeout(1_000);
    }
    throw new Error(`Webview frame with content "${selector}" not found after ${timeoutMs}ms`);
  }

  /** Extract a unique identifier from a webview frame URL for locator targeting. */
  private extractFrameId(url: string): string {
    // Webview URLs contain a unique ID. Extract a substring for matching.
    const match = url.match(/vscode-webview:\/\/([^/]+)/);
    return match ? match[1].substring(0, 20) : '';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STAC Tree Helpers (private)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Focus the STAC Stores view via command palette. */
  private async focusStacView(): Promise<void> {
    await this.page.keyboard.press('Control+Shift+P');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.type('View: Focus on STAC Stores View', { delay: 20 });
    await this.page.waitForTimeout(1_000);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2_000);
  }

  /** Poll until the extension finishes loading stores. */
  private async waitForExtensionReady(timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const loadingVisible = await this.page
        .getByText('Loading stores')
        .isVisible()
        .catch(() => false);
      if (!loadingVisible) return true;
      await this.page.waitForTimeout(2_000);
    }
    return false;
  }

  /** Ensure the STAC STORES pane is expanded (not collapsed). */
  private async ensureStacPaneExpanded(): Promise<void> {
    const stacHeader = this.page.locator('.pane-header:has-text("STAC STORES")');
    await stacHeader.waitFor({ state: 'visible', timeout: 30_000 }).catch(async () => {
      await this.page.screenshot({ path: 'tests/e2e/evidence/debug-no-stac-pane.png' });
      throw new Error('STAC STORES pane header not visible after 30s');
    });

    const expanded = await stacHeader.getAttribute('aria-expanded');
    if (expanded === 'false') {
      await stacHeader.click();
      await this.page.waitForTimeout(1_500);
    } else if (expanded === null) {
      await stacHeader.click();
      await this.page.waitForTimeout(1_500);
      const hasRows = await this.page.locator('.monaco-list-row').count();
      if (hasRows === 0) {
        await stacHeader.click();
        await this.page.waitForTimeout(1_500);
      }
    }
  }

  /** Seed Debrief config via terminal and reload the window. */
  private async seedConfigAndReload(): Promise<void> {
    const page = this.page;

    // Open terminal
    await page.keyboard.press('Control+Backquote');
    await page.waitForTimeout(2_000);

    // Detect workspace path from the terminal's current directory.
    // code-server opens in the workspace root; openvscode-server may differ.
    // Use a relative path from wherever the workspace is mounted.
    const configCmd =
      'mkdir -p ~/.config/debrief && ' +
      'echo \'{"stores":[{"id":"local-store","path":"\'$(pwd)\'/local-store",' +
      '"displayName":"Test Maritime Data","status":"available"}],"preferences":{}}\' ' +
      '> ~/.config/debrief/config.json';
    await page.keyboard.type(configCmd, { delay: 5 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2_000);
    await page.keyboard.press('Control+Backquote'); // close terminal

    // Reload window
    await page.keyboard.press('Control+Shift+P');
    await page.waitForTimeout(500);
    await page.keyboard.type('Developer: Reload Window', { delay: 20 });
    await page.waitForTimeout(1_000);
    await page.keyboard.press('Enter');

    // Wait for reload
    await page.waitForTimeout(5_000);
    await page.locator('.monaco-workbench').waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(3_000);
  }
}
