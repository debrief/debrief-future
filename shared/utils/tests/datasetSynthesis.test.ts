/**
 * Tests for synthesizeTableDataset.
 * Feature: 178-vscode-tabular-results (R6)
 */

import { describe, it, expect } from 'vitest';
import { synthesizeTableDataset } from '../src/datasetSynthesis.js';

describe('synthesizeTableDataset', () => {
  it('returns null when statistics is absent', () => {
    expect(synthesizeTableDataset('track-stats', {}, 'Alpha')).toBeNull();
  });

  it('returns null when statistics is not an object', () => {
    expect(
      synthesizeTableDataset('track-stats', { statistics: 'invalid' }, 'Alpha'),
    ).toBeNull();
  });

  it('returns null when statistics has no renderable entries', () => {
    expect(
      synthesizeTableDataset(
        'track-stats',
        { statistics: { nested: { bad: true }, fn: () => 1 } },
        'Alpha',
      ),
    ).toBeNull();
  });

  it('builds a table DatasetEnvelope from numeric statistics', () => {
    const result = synthesizeTableDataset(
      'track-stats',
      {
        statistics: {
          total_distance_nm: 12.5,
          average_speed_kn: 8.3,
        },
      },
      'Alpha',
    );

    expect(result).not.toBeNull();
    expect(result?.type).toBe('track-stats_statistics');
    expect(result?.displayHint).toBe('table');
    expect(result?.metadata.xAxis.label).toBe('Metric');
    expect(result?.metadata.yAxis.label).toBe('Value');
    expect(result?.data).toEqual([
      { metric: 'total distance nm', value: 12.5 },
      { metric: 'average speed kn', value: 8.3 },
    ]);
  });

  it('uses properties.name as the title when present', () => {
    const result = synthesizeTableDataset(
      'track-stats',
      {
        name: 'Track Bravo Stats',
        statistics: { count: 42 },
      },
      'Bravo',
    );
    expect(result?.title).toBe('Track Bravo Stats');
  });

  it('falls back to "<label> Results" when name is missing', () => {
    const result = synthesizeTableDataset(
      'track-stats',
      { statistics: { count: 42 } },
      'Alpha',
    );
    expect(result?.title).toBe('Alpha Results');
  });

  it('filters out non-scalar values but keeps string values', () => {
    const result = synthesizeTableDataset(
      'track-stats',
      {
        statistics: {
          name: 'Alpha',
          count: 5,
          bogus: { nested: 1 },
        },
      },
      'Alpha',
    );
    expect(result?.data).toEqual([
      { metric: 'name', value: 'Alpha' },
      { metric: 'count', value: 5 },
    ]);
  });
});
