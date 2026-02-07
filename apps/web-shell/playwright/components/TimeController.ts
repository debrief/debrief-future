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
    // Check class on root element itself (not child elements)
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
   * The PlaybackControls component renders a button directly in the controls row.
   */
  get playPauseButton(): Locator {
    // Find button by aria-label (Play or Pause)
    return this.controlsRow.locator('button[aria-label="Play"], button[aria-label="Pause"]');
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
   * Get the scrubber track element (the clickable area).
   */
  get scrubberTrack(): Locator {
    return this.root.locator('.debrief-time-scrubber__track');
  }

  /**
   * Get the scrubber thumb element.
   */
  get scrubberThumb(): Locator {
    return this.root.locator('.debrief-time-scrubber__thumb');
  }

  /**
   * Get the current scrubber position (0-100 percentage).
   * The scrubber uses aria-valuenow/min/max attributes for position.
   */
  async getScrubberPosition(): Promise<number> {
    const min = await this.scrubber.getAttribute('aria-valuemin') ?? '0';
    const max = await this.scrubber.getAttribute('aria-valuemax') ?? '100';
    const current = await this.scrubber.getAttribute('aria-valuenow') ?? '0';
    const minVal = parseFloat(min);
    const maxVal = parseFloat(max);
    const currentVal = parseFloat(current);
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
   * The SpeedSelector uses vscrui Dropdown which renders as div.vscrui-dropdown
   */
  get speedSelector(): Locator {
    return this.controlsRow.locator('.vscrui-dropdown');
  }

  /**
   * Get the current playback speed.
   * The vscrui Dropdown shows the current value in the trigger button's span.
   */
  async getSpeed(): Promise<number> {
    const triggerSpan = this.speedSelector.locator('button span');
    const text = await triggerSpan.textContent() ?? '1x';
    const match = text.match(/(\d+)x/);
    return match ? parseInt(match[1], 10) : 1;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Assertions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Wait for the TimeController to be in the ready state.
   * Waits for the scrubber to be visible, which only appears in ready state.
   */
  async waitForReady(options?: { timeout?: number }): Promise<void> {
    // The scrubber only appears when TimeController is in ready state
    await this.scrubber.waitFor({
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
