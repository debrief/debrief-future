/**
 * TimeController component object for Playwright tests.
 *
 * Encapsulates interactions with the TimeController UI component.
 */

import type { Page, Locator } from '@playwright/test';

export type TimeControllerState = 'empty' | 'loading' | 'ready';

/**
 * Component object for the TimeController.
 *
 * The TimeController displays temporal information and playback controls
 * when time-based data is loaded.
 */
export class TimeController {
  readonly page: Page;
  readonly root: Locator;

  constructor(page: Page, root?: Locator) {
    this.page = page;
    this.root = root ?? page.locator('.debrief-time-controller');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // State Queries
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the current UI state of the TimeController.
   */
  async getState(): Promise<TimeControllerState> {
    if (await this.root.locator('.debrief-time-controller--empty').count() > 0) {
      return 'empty';
    }
    if (await this.root.locator('.debrief-time-controller--loading').count() > 0) {
      return 'loading';
    }
    if (await this.root.locator('.debrief-time-controller--ready').count() > 0) {
      return 'ready';
    }
    // Check class on root element itself
    const className = await this.root.getAttribute('class') ?? '';
    if (className.includes('--empty')) return 'empty';
    if (className.includes('--loading')) return 'loading';
    if (className.includes('--ready')) return 'ready';
    return 'empty';
  }

  /**
   * Check if the TimeController has valid time data loaded.
   */
  async hasTimeData(): Promise<boolean> {
    return (await this.getState()) === 'ready';
  }

  /**
   * Check if the TimeController is showing the empty state.
   */
  async isEmpty(): Promise<boolean> {
    return (await this.getState()) === 'empty';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Time Display
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the time display element.
   */
  get timeDisplay(): Locator {
    return this.root.locator('.debrief-time-controller__row--display');
  }

  /**
   * Get the displayed time text.
   */
  async getDisplayedTime(): Promise<string> {
    const timeDisplay = this.root.locator('.debrief-time-display');
    return await timeDisplay.textContent() ?? '';
  }

  /**
   * Get the empty state message.
   */
  async getEmptyMessage(): Promise<string> {
    const emptyMessage = this.root.locator('.debrief-time-controller__empty-message');
    return await emptyMessage.textContent() ?? '';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Playback Controls
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the playback controls row.
   */
  get controlsRow(): Locator {
    return this.root.locator('.debrief-time-controller__row--controls');
  }

  /**
   * Get the play/pause button.
   */
  get playPauseButton(): Locator {
    return this.root.locator('.debrief-playback-controls button');
  }

  /**
   * Click the play/pause button.
   */
  async togglePlayback(): Promise<void> {
    await this.playPauseButton.click();
  }

  /**
   * Check if playback is currently playing.
   */
  async isPlaying(): Promise<boolean> {
    const button = this.playPauseButton;
    const ariaLabel = await button.getAttribute('aria-label');
    return ariaLabel === 'Pause';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Time Scrubber
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the time scrubber element.
   */
  get scrubber(): Locator {
    return this.root.locator('.debrief-time-scrubber');
  }

  /**
   * Get the scrubber input (range slider).
   */
  get scrubberInput(): Locator {
    return this.root.locator('.debrief-time-scrubber input[type="range"]');
  }

  /**
   * Get the current scrubber position (0-100 percentage).
   */
  async getScrubberPosition(): Promise<number> {
    const value = await this.scrubberInput.inputValue();
    const min = await this.scrubberInput.getAttribute('min') ?? '0';
    const max = await this.scrubberInput.getAttribute('max') ?? '100';
    const minVal = parseFloat(min);
    const maxVal = parseFloat(max);
    const currentVal = parseFloat(value);
    return ((currentVal - minVal) / (maxVal - minVal)) * 100;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Display Mode
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the display mode toggle.
   */
  get displayModeToggle(): Locator {
    return this.root.locator('.debrief-display-mode-toggle');
  }

  /**
   * Get the current display mode ('full' or 'trail').
   */
  async getDisplayMode(): Promise<'full' | 'trail'> {
    const fullButton = this.root.locator('.debrief-display-mode-toggle button').first();
    const isFullActive = await fullButton.getAttribute('aria-pressed');
    return isFullActive === 'true' ? 'full' : 'trail';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Speed Selector
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the speed selector.
   */
  get speedSelector(): Locator {
    return this.root.locator('.debrief-speed-selector');
  }

  /**
   * Get the current playback speed.
   */
  async getSpeed(): Promise<number> {
    const speedText = await this.speedSelector.textContent() ?? '1x';
    const match = speedText.match(/(\d+)x/);
    return match ? parseInt(match[1], 10) : 1;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Assertions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Wait for the TimeController to be in the ready state.
   */
  async waitForReady(options?: { timeout?: number }): Promise<void> {
    await this.root.locator('.debrief-time-controller--ready, [class*="--ready"]').waitFor({
      state: 'visible',
      timeout: options?.timeout ?? 10000,
    });
  }

  /**
   * Wait for time data to be displayed (non-empty time display).
   */
  async waitForTimeData(options?: { timeout?: number }): Promise<void> {
    await this.waitForReady(options);
    // Wait for time display to have content
    await this.root.locator('.debrief-time-display').waitFor({
      state: 'visible',
      timeout: options?.timeout ?? 10000,
    });
  }
}
