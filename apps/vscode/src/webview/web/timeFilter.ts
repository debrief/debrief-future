/**
 * Time Filter - Filters tracks based on time range
 */

import type { TrackRenderer } from './trackRenderer';

export class TimeFilter {
  private trackRenderer: TrackRenderer;
  private dataStart: string = '';
  private dataEnd: string = '';
  private currentStart: string = '';
  private currentEnd: string = '';

  constructor(trackRenderer: TrackRenderer) {
    this.trackRenderer = trackRenderer;
  }

  /**
   * Initialize with data time extent
   */
  initialize(start: string, end: string): void {
    this.dataStart = start;
    this.dataEnd = end;
    this.currentStart = start;
    this.currentEnd = end;
  }

  /**
   * Set time range filter
   */
  setRange(start: string, end: string): void {
    this.currentStart = start;
    this.currentEnd = end;

    // Note: Track filtering would need to be implemented
    // by filtering track points and re-rendering
    // This is a simplified placeholder
  }

  /**
   * Reset to full range
   */
  resetToFullRange(): void {
    this.currentStart = this.dataStart;
    this.currentEnd = this.dataEnd;
  }

  /**
   * Get current time range
   */
  getCurrentRange(): { start: string; end: string } | null {
    if (!this.currentStart || !this.currentEnd) {
      return null;
    }

    return {
      start: this.currentStart,
      end: this.currentEnd,
    };
  }

  /**
   * Get full data range
   */
  getDataRange(): { start: string; end: string } | null {
    if (!this.dataStart || !this.dataEnd) {
      return null;
    }

    return {
      start: this.dataStart,
      end: this.dataEnd,
    };
  }

  /**
   * Check if current range equals full range
   */
  isFullRange(): boolean {
    return (
      this.currentStart === this.dataStart && this.currentEnd === this.dataEnd
    );
  }
}
