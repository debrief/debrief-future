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
    // Navigate to code-server
    await this.page.goto('/');

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
}
