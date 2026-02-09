/**
 * Timeline assembly unit tests.
 * Feature: 071-log-recording-service
 */

import { assembleTimeline } from '../../../src/log/timeline.js';

describe('assembleTimeline', () => {
  it('returns empty array for empty FeatureCollection', () => {
    const result = assembleTimeline({ features: [] });
    expect(result).toEqual([]);
  });

  it('returns empty array when no features have provenance', () => {
    const result = assembleTimeline({
      features: [
        { type: 'Feature', properties: {} },
        { type: 'Feature', properties: { name: 'track-1' } },
      ],
    });
    expect(result).toEqual([]);
  });

  it('collects entries from multiple features', () => {
    const result = assembleTimeline({
      features: [
        {
          type: 'Feature',
          properties: {
            provenance: [
              { activityId: 'act-1', timestamp: '2026-02-09T10:00:00Z', wasGeneratedBy: { tool: 'tool-a' } },
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            provenance: [
              { activityId: 'act-2', timestamp: '2026-02-09T11:00:00Z', wasGeneratedBy: { tool: 'tool-b' } },
            ],
          },
        },
      ],
    });

    expect(result).toHaveLength(2);
    expect(result[0].activityId).toBe('act-1');
    expect(result[1].activityId).toBe('act-2');
  });

  it('deduplicates on activityId (first occurrence wins)', () => {
    const result = assembleTimeline({
      features: [
        {
          type: 'Feature',
          properties: {
            provenance: [
              { activityId: 'shared-act', timestamp: '2026-02-09T10:00:00Z', wasGeneratedBy: { tool: 'tool-a' } },
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            provenance: [
              { activityId: 'shared-act', timestamp: '2026-02-09T10:00:00Z', wasGeneratedBy: { tool: 'tool-a' } },
            ],
          },
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].activityId).toBe('shared-act');
  });

  it('sorts by timestamp ascending', () => {
    const result = assembleTimeline({
      features: [
        {
          type: 'Feature',
          properties: {
            provenance: [
              { activityId: 'act-late', timestamp: '2026-02-09T15:00:00Z' },
              { activityId: 'act-early', timestamp: '2026-02-09T08:00:00Z' },
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            provenance: [
              { activityId: 'act-mid', timestamp: '2026-02-09T12:00:00Z' },
            ],
          },
        },
      ],
    });

    expect(result).toHaveLength(3);
    expect(result[0].activityId).toBe('act-early');
    expect(result[1].activityId).toBe('act-mid');
    expect(result[2].activityId).toBe('act-late');
  });

  it('handles features with null properties', () => {
    const result = assembleTimeline({
      features: [
        { type: 'Feature', properties: null },
        {
          type: 'Feature',
          properties: {
            provenance: [
              { activityId: 'act-1', timestamp: '2026-02-09T10:00:00Z' },
            ],
          },
        },
      ],
    });

    expect(result).toHaveLength(1);
  });

  it('handles legacy single-object provenance (normalised by caller)', () => {
    // assembleTimeline expects normalised arrays, but should handle objects too
    const result = assembleTimeline({
      features: [
        {
          type: 'Feature',
          properties: {
            provenance: { activityId: 'legacy-act', timestamp: '2026-01-01T00:00:00Z' },
          },
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].activityId).toBe('legacy-act');
  });

  it('skips entries without activityId', () => {
    const result = assembleTimeline({
      features: [
        {
          type: 'Feature',
          properties: {
            provenance: [
              { timestamp: '2026-02-09T10:00:00Z' }, // no activityId
              { activityId: 'valid', timestamp: '2026-02-09T11:00:00Z' },
            ],
          },
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].activityId).toBe('valid');
  });
});
