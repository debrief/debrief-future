/**
 * Timeline assembly unit tests.
 * Feature: 071-log-recording-service
 */

import { assembleTimeline, normaliseEntry } from '../../../src/log/timeline.js';

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

  it('normalises snake_case provenance from Python importers', () => {
    const result = assembleTimeline({
      features: [
        {
          type: 'Feature',
          properties: {
            provenance: [
              {
                activity_id: 'import-act-1',
                timestamp: '2026-03-21T10:15:04.186Z',
                was_generated_by: {
                  tool: 'rep-parser',
                  tool_version: '1.0.0',
                  parameters: [],
                },
                used: [],
                generated: ['feat-1'],
                execution_duration: 'PT0S',
              },
            ],
          },
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].activityId).toBe('import-act-1');
    expect(result[0].wasGeneratedBy.tool).toBe('rep-parser');
    expect(result[0].wasGeneratedBy.toolVersion).toBe('1.0.0');
    expect(result[0].executionDuration).toBe('PT0S');
    expect(result[0].generated).toEqual(['feat-1']);
  });

  it('handles mixed camelCase and snake_case provenance', () => {
    const result = assembleTimeline({
      features: [
        {
          type: 'Feature',
          properties: {
            provenance: [
              {
                activity_id: 'python-act',
                timestamp: '2026-03-21T10:00:00Z',
                was_generated_by: { tool: 'rep-parser', tool_version: '1.0.0', parameters: [] },
                used: [],
                generated: [],
                execution_duration: 'PT0S',
              },
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            provenance: [
              {
                activityId: 'ts-act',
                timestamp: '2026-03-21T11:00:00Z',
                wasGeneratedBy: { tool: 'move-track', toolVersion: '2.0.0', parameters: {} },
                used: ['feat-1'],
                generated: ['feat-2'],
                executionDuration: 'PT1.5S',
              },
            ],
          },
        },
      ],
    });

    expect(result).toHaveLength(2);
    expect(result[0].activityId).toBe('python-act');
    expect(result[1].activityId).toBe('ts-act');
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

describe('normaliseEntry', () => {
  it('passes through camelCase entries unchanged', () => {
    const input = {
      activityId: 'act-1',
      timestamp: '2026-01-01T00:00:00Z',
      wasGeneratedBy: { tool: 'test', toolVersion: '1.0', parameters: {} },
    };
    const result = normaliseEntry(input);
    expect(result).toBe(input); // same reference — no copy
  });

  it('converts snake_case Python entry to camelCase', () => {
    const result = normaliseEntry({
      activity_id: 'py-act',
      timestamp: '2026-03-21T10:00:00Z',
      was_generated_by: { tool: 'rep-parser', tool_version: '1.0.0', parameters: [] },
      used: [],
      generated: ['feat-1'],
      execution_duration: 'PT0.5S',
    });
    expect(result.activityId).toBe('py-act');
    expect(result.timestamp).toBe('2026-03-21T10:00:00Z');
    const wgb = result.wasGeneratedBy as { tool: string; toolVersion: string };
    expect(wgb.tool).toBe('rep-parser');
    expect(wgb.toolVersion).toBe('1.0.0');
    expect(result.executionDuration).toBe('PT0.5S');
    expect(result.generated).toEqual(['feat-1']);
  });

  it('returns entry unchanged when neither activityId nor activity_id present', () => {
    const input = { timestamp: '2026-01-01T00:00:00Z' };
    const result = normaliseEntry(input);
    expect(result).toBe(input);
  });
});
