/**
 * Unit tests for the thinned summary builder + token probe (#284, T026 / US3).
 */

import { describe, it, expect } from 'vitest';
import {
  buildPlotSummary,
  toInventoryEntry,
  approximateTokens,
  INVENTORY_CAP,
} from '../../../src/copilot/summarize';
import { trackFixture, pointFixture } from './harness';

describe('summarize', () => {
  it('thins a track to an inventory entry (no geometry)', () => {
    const entry = toInventoryEntry(trackFixture());
    expect(entry).toEqual({
      id: 'track-1',
      name: 'HMS Nelson',
      type: 'TRACK',
      platform: 'HMS Nelson',
      timeSpan: { start: '2026-03-01T00:00:00Z', end: '2026-03-01T06:00:00Z' },
      pointCount: 3,
    });
    expect(entry).not.toHaveProperty('geometry');
  });

  it('thins a point to a label-named entry with no platform/time', () => {
    const entry = toInventoryEntry(pointFixture());
    expect(entry.name).toBe('Datum A');
    expect(entry.type).toBe('POINT');
    expect(entry.platform).toBeNull();
    expect(entry.timeSpan).toBeNull();
  });

  it('caps the inventory and flags truncation', () => {
    const many = Array.from({ length: INVENTORY_CAP + 5 }, (_, i) =>
      trackFixture({ id: `t-${i}` }),
    );
    const summary = buildPlotSummary({
      plotId: 'stac://s/i',
      title: 'Big Plot',
      timeSpan: null,
      features: many,
      openPlots: [],
    });
    expect(summary.truncated).toBe(true);
    expect(summary.features).toHaveLength(INVENTORY_CAP);
  });

  it('does not flag truncation under the cap', () => {
    const summary = buildPlotSummary({
      plotId: 'stac://s/i',
      title: 'Small Plot',
      timeSpan: null,
      features: [trackFixture()],
      openPlots: [],
    });
    expect(summary.truncated).toBe(false);
  });

  it('populates a positive approxTokens probe (FR-025)', () => {
    const summary = buildPlotSummary({
      plotId: 'stac://s/i',
      title: 'Plot',
      timeSpan: null,
      features: [trackFixture(), pointFixture()],
      openPlots: [],
    });
    expect(summary.approxTokens).toBeGreaterThan(0);
    expect(approximateTokens({ a: 'bcd' })).toBeGreaterThan(0);
  });
});
