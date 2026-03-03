/**
 * Entry builder unit tests.
 * Feature: 071-log-recording-service
 */

import {
  buildLogEntry,
  msToIsoDuration,
  generateActivityId,
  extractActivityIdFromOutputFeatures,
  extractParametersFromOutputFeatures,
} from '../../../src/log/entryBuilder.js';
import type { ToolResultForLog, ExpandedToolResultFields } from '../../../src/log/types.js';

describe('msToIsoDuration', () => {
  it('converts 0 ms to PT0S', () => {
    expect(msToIsoDuration(0)).toBe('PT0S');
  });

  it('converts 300 ms to PT0.3S', () => {
    expect(msToIsoDuration(300)).toBe('PT0.3S');
  });

  it('converts 1500 ms to PT1.5S', () => {
    expect(msToIsoDuration(1500)).toBe('PT1.5S');
  });

  it('converts 60000 ms to PT60S', () => {
    expect(msToIsoDuration(60000)).toBe('PT60S');
  });

  it('converts 123 ms to PT0.123S', () => {
    expect(msToIsoDuration(123)).toBe('PT0.123S');
  });
});

describe('generateActivityId', () => {
  it('returns a non-empty string', () => {
    const id = generateActivityId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateActivityId()));
    expect(ids.size).toBe(100);
  });
});

describe('extractActivityIdFromOutputFeatures', () => {
  it('returns activityId from last provenance entry', () => {
    const features: Array<Record<string, unknown>> = [
      {
        type: 'Feature',
        properties: {
          provenance: [
            { activityId: 'old-id', timestamp: '2026-01-01T00:00:00Z' },
            { activityId: 'new-id', timestamp: '2026-02-09T00:00:00Z' },
          ],
        },
      },
    ];
    expect(extractActivityIdFromOutputFeatures(features)).toBe('new-id');
  });

  it('returns undefined when no provenance exists', () => {
    const features: Array<Record<string, unknown>> = [{ type: 'Feature', properties: {} }];
    expect(extractActivityIdFromOutputFeatures(features)).toBeUndefined();
  });

  it('returns undefined when properties is null', () => {
    const features: Array<Record<string, unknown>> = [{ type: 'Feature', properties: null }];
    expect(extractActivityIdFromOutputFeatures(features)).toBeUndefined();
  });

  it('returns undefined when provenance is empty array', () => {
    const features: Array<Record<string, unknown>> = [{ type: 'Feature', properties: { provenance: [] } }];
    expect(extractActivityIdFromOutputFeatures(features)).toBeUndefined();
  });
});

describe('buildLogEntry', () => {
  const baseToolResult: ToolResultForLog = {
    success: true,
    durationMs: 300,
    toolId: 'calculate-range',
    sourceFeatureIds: ['track-1', 'track-2'],
    features: {
      type: 'FeatureCollection',
      features: [{ id: 'result-1', type: 'Feature', properties: {} }],
    },
  };

  it('creates a valid Log entry with basic fields', () => {
    const entry = buildLogEntry(baseToolResult, undefined);

    expect(entry.activityId).toBeTruthy();
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.wasGeneratedBy.tool).toBe('calculate-range');
    expect(entry.wasGeneratedBy.toolVersion).toBe('0.0.0'); // fallback
    expect(entry.wasGeneratedBy.parameters).toEqual({});
    expect(entry.used).toEqual(['track-1', 'track-2']);
    expect(entry.generated).toEqual(['result-1']);
    expect(entry.executionDuration).toBe('PT0.3S');
    expect(entry.tune).toBeNull();
  });

  it('uses provided activityId', () => {
    const entry = buildLogEntry(baseToolResult, undefined, 'my-activity-id');
    expect(entry.activityId).toBe('my-activity-id');
  });

  it('uses expanded fields when available', () => {
    const expanded: ExpandedToolResultFields = {
      toolVersion: '2.1.0',
      parameters: {
        threshold: { value: 0.5, default: true, tunable: true },
      },
      createdFeatures: ['feat-new-1'],
      createdAssets: [{ resultId: 'bt_001', path: './results/bt_001.json' }],
    };

    const entry = buildLogEntry(baseToolResult, expanded);

    expect(entry.wasGeneratedBy.toolVersion).toBe('2.1.0');
    expect(entry.wasGeneratedBy.parameters).toEqual({
      threshold: { value: 0.5, default: true, tunable: true },
    });
    expect(entry.generated).toContain('feat-new-1');
    expect(entry.generated).toContain('./results/bt_001.json');
    expect(entry.generatedResultId).toBe('bt_001');
  });

  it('falls back to output feature IDs when no createdFeatures', () => {
    const entry = buildLogEntry(baseToolResult, undefined);
    expect(entry.generated).toEqual(['result-1']);
  });

  it('falls back to modifiedFeatures for used when no sourceFeatureIds', () => {
    const result: ToolResultForLog = {
      success: true,
      durationMs: 100,
      toolId: 'some-tool',
    };
    const expanded: ExpandedToolResultFields = {
      modifiedFeatures: [
        { featureId: 'f1', changedProperties: {} },
        { featureId: 'f2', changedProperties: {} },
      ],
    };

    const entry = buildLogEntry(result, expanded);
    expect(entry.used).toEqual(['f1', 'f2']);
  });

  it('uses unknown-tool when toolId not provided', () => {
    const result: ToolResultForLog = {
      success: true,
      durationMs: 50,
    };
    const entry = buildLogEntry(result, undefined);
    expect(entry.wasGeneratedBy.tool).toBe('unknown-tool');
  });

  it('includes artifact href in generated', () => {
    const result: ToolResultForLog = {
      success: true,
      durationMs: 200,
      toolId: 'generate-plot',
      artifactHref: 'results/plot_001.png',
    };
    const entry = buildLogEntry(result, undefined);
    expect(entry.generated).toContain('results/plot_001.png');
  });

  it('always sets tune to null in Phase 1', () => {
    const entry = buildLogEntry(baseToolResult, undefined);
    expect(entry.tune).toBeNull();
  });

  it('extracts parameters from Python provenance when expanded.parameters missing', () => {
    const pythonParams = {
      direction: { value: 90, default: false, tunable: true },
      distance_km: { value: 5, default: false, tunable: true },
    };
    const result: ToolResultForLog = {
      success: true,
      durationMs: 100,
      toolId: 'move-shape',
      sourceFeatureIds: ['rect-1'],
      features: {
        type: 'FeatureCollection',
        features: [{
          id: 'rect-1',
          type: 'Feature',
          properties: {
            provenance: [{
              activityId: 'act-123',
              wasGeneratedBy: {
                tool: 'move-shape',
                toolVersion: '1.0.0',
                parameters: pythonParams,
              },
            }],
          },
        }],
      },
    };

    const entry = buildLogEntry(result, { toolVersion: '1.0.0' }, 'act-123');
    expect(entry.wasGeneratedBy.parameters).toEqual(pythonParams);
    expect(entry.wasGeneratedBy.parameters.direction.tunable).toBe(true);
    expect(entry.wasGeneratedBy.parameters.distance_km.tunable).toBe(true);
  });

  it('prefers expanded.parameters over Python provenance extraction', () => {
    const expandedParams = {
      direction: { value: 45, default: false, tunable: true },
    };
    const result: ToolResultForLog = {
      success: true,
      durationMs: 100,
      toolId: 'move-shape',
      features: {
        type: 'FeatureCollection',
        features: [{
          id: 'rect-1',
          type: 'Feature',
          properties: {
            provenance: [{
              activityId: 'act-456',
              wasGeneratedBy: {
                tool: 'move-shape',
                parameters: { direction: { value: 90, default: false, tunable: true } },
              },
            }],
          },
        }],
      },
    };

    const entry = buildLogEntry(result, { parameters: expandedParams }, 'act-456');
    expect(entry.wasGeneratedBy.parameters).toEqual(expandedParams);
  });
});

describe('extractParametersFromOutputFeatures', () => {
  it('extracts parameters matching activityId', () => {
    const features: Array<Record<string, unknown>> = [{
      type: 'Feature',
      properties: {
        provenance: [{
          activityId: 'act-1',
          wasGeneratedBy: {
            tool: 'move-shape',
            parameters: {
              direction: { value: 90, default: false, tunable: true },
            },
          },
        }],
      },
    }];
    const params = extractParametersFromOutputFeatures(features, 'act-1');
    expect(params).toBeDefined();
    expect(params!.direction).toEqual({ value: 90, default: false, tunable: true });
  });

  it('returns undefined when no matching activityId', () => {
    const features: Array<Record<string, unknown>> = [{
      type: 'Feature',
      properties: {
        provenance: [{
          activityId: 'act-other',
          wasGeneratedBy: { tool: 'x', parameters: { a: { value: 1 } } },
        }],
      },
    }];
    expect(extractParametersFromOutputFeatures(features, 'act-1')).toBeUndefined();
  });

  it('returns undefined when no provenance', () => {
    const features: Array<Record<string, unknown>> = [{
      type: 'Feature',
      properties: {},
    }];
    expect(extractParametersFromOutputFeatures(features, 'act-1')).toBeUndefined();
  });

  it('returns undefined when parameters are empty', () => {
    const features: Array<Record<string, unknown>> = [{
      type: 'Feature',
      properties: {
        provenance: [{
          activityId: 'act-1',
          wasGeneratedBy: { tool: 'x', parameters: {} },
        }],
      },
    }];
    expect(extractParametersFromOutputFeatures(features, 'act-1')).toBeUndefined();
  });
});
