/**
 * Tests for ViewMode migration from legacy PresentationMode globalState.
 *
 * Gap 2: Stale globalState — verifies that old PresentationMode values
 * ('compact', 'normal', 'detailed') are correctly migrated to the new
 * unified ViewMode, and that unknown/corrupt values fall back to 'timeline'.
 *
 * Feature: 176-log-panel-ux
 */

import { describe, it, expect } from 'vitest';
import { VALID_VIEW_MODES } from '../types';
import type { ViewMode } from '../types';

/**
 * Migration logic extracted from logPanelView.ts for unit testing.
 * This mirrors the extension's globalState migration code.
 */
function migrateViewMode(
  newKey: string | undefined,
  legacyKey: string | undefined
): ViewMode {
  let mode = newKey;

  if (!mode) {
    // Migration from legacy PresentationMode
    if (legacyKey === 'compact') mode = 'compact';
    else if (legacyKey === 'detailed') mode = 'detailed';
    else mode = 'timeline'; // 'normal' or undefined maps to default
  }

  // Validate against known values
  if (!VALID_VIEW_MODES.includes(mode as ViewMode)) {
    mode = 'timeline';
  }

  return mode as ViewMode;
}

describe('ViewMode migration (Gap 2: stale globalState)', () => {
  it('uses new key when present', () => {
    expect(migrateViewMode('by-feature', undefined)).toBe('by-feature');
    expect(migrateViewMode('compact', undefined)).toBe('compact');
    expect(migrateViewMode('detailed', undefined)).toBe('detailed');
    expect(migrateViewMode('timeline', undefined)).toBe('timeline');
  });

  it('migrates legacy "compact" to "compact"', () => {
    expect(migrateViewMode(undefined, 'compact')).toBe('compact');
  });

  it('migrates legacy "detailed" to "detailed"', () => {
    expect(migrateViewMode(undefined, 'detailed')).toBe('detailed');
  });

  it('migrates legacy "normal" to "timeline" (default)', () => {
    expect(migrateViewMode(undefined, 'normal')).toBe('timeline');
  });

  it('falls back to "timeline" when both keys are undefined', () => {
    expect(migrateViewMode(undefined, undefined)).toBe('timeline');
  });

  it('rejects unknown/corrupt new key values', () => {
    expect(migrateViewMode('garbage', undefined)).toBe('timeline');
    expect(migrateViewMode('normal', undefined)).toBe('timeline'); // 'normal' is not a valid ViewMode
    expect(migrateViewMode('', undefined)).toBe('timeline');
  });

  it('VALID_VIEW_MODES contains all 4 valid modes', () => {
    expect(VALID_VIEW_MODES).toEqual(['timeline', 'by-feature', 'compact', 'detailed']);
  });
});
