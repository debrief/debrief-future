/**
 * LogService.tuneEntry unit tests.
 * Feature: 076-replay-tune
 */

import { describe, it, expect, vi } from 'vitest';
import { createLogService } from '../../../src/log/logService.js';
import type { LogServiceDeps } from '../../../src/log/logService.js';

function makeFeatureCollection() {
  return {
    features: [
      {
        type: 'Feature',
        geometry: null,
        properties: {
          feature_id: 'track-alpha',
          provenance: [
            {
              activity_id: 'act-001',
              timestamp: '2026-02-01T10:00:00Z',
              was_generated_by: {
                tool: 'calc-range',
                tool_version: '1.0.0',
                parameters: {
                  interval: { value: 'PT60S', default: true, tunable: true },
                },
              },
              used: ['track-alpha'],
              generated: ['result-001'],
              execution_duration: 'PT0.5S',
              generated_result_id: null,
              tune: null,
            },
            {
              activity_id: 'act-002',
              timestamp: '2026-02-01T10:05:00Z',
              was_generated_by: {
                tool: 'calc-bearing',
                tool_version: '1.0.0',
                parameters: {},
              },
              used: ['track-alpha'],
              generated: ['result-002'],
              execution_duration: 'PT0.3S',
              generated_result_id: null,
              tune: null,
            },
          ],
        },
      },
    ],
  };
}

function makeDeps(overrides?: Partial<LogServiceDeps>): LogServiceDeps {
  return {
    appendProvenance: vi.fn().mockResolvedValue(0),
    loadGeoJson: vi.fn().mockResolvedValue(makeFeatureCollection()),
    markDirty: vi.fn(),
    writeGeoJson: vi.fn().mockResolvedValue(undefined),
    executeTool: vi
      .fn()
      .mockResolvedValue({ success: true, duration_ms: 100 }),
    loadSnapshot: vi.fn().mockResolvedValue(null),
    resolveToolVersion: vi.fn().mockResolvedValue('1.0.0'),
    ...overrides,
  };
}

describe('LogService.tuneEntry', () => {
  it('tunes parameter and returns completed result with entriesReplayed > 0', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    const result = await service.tuneEntry(
      '/store',
      'item.json',
      'act-001',
      'interval',
      'PT30S'
    );

    expect(result.status).toBe('completed');
    // act-001 and act-002 should both be replayed (from tune target onward)
    expect(result.entries_replayed).toBe(2);
    expect(result.total_entries).toBe(2);
  });

  it('tuning to same value returns result with 0 entries (no-op)', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    // Current value of 'interval' is 'PT60S' (wrapped as { value: 'PT60S', ... })
    const result = await service.tuneEntry(
      '/store',
      'item.json',
      'act-001',
      'interval',
      'PT60S'
    );

    expect(result.status).toBe('completed');
    expect(result.entries_replayed).toBe(0);
    expect(result.total_entries).toBe(0);
    expect(result.tune_annotation).toBeNull();
  });

  it('appends TuneAnnotation to provenance via writeGeoJson', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    await service.tuneEntry(
      '/store',
      'item.json',
      'act-001',
      'interval',
      'PT30S'
    );

    expect(deps.writeGeoJson).toHaveBeenCalledTimes(1);
    // Verify the written data has a tune annotation on the target entry
    const writtenFc = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock
      .calls[0][2] as { features: Array<Record<string, unknown>> };
    const props = writtenFc.features[0].properties as Record<string, unknown>;
    const prov = props.provenance as Array<Record<string, unknown>>;
    const targetEntry = prov.find(
      (e: Record<string, unknown>) => e.activity_id === 'act-001'
    );
    expect(targetEntry).toBeDefined();
    expect(targetEntry!.tune).not.toBeNull();
    const tune = targetEntry!.tune as {
      parameter: string;
      previous_value: unknown;
      new_value: unknown;
    };
    expect(tune.parameter).toBe('interval');
    expect(tune.previous_value).toBe('PT60S');
    expect(tune.new_value).toBe('PT30S');
  });

  it('updates parameter value in provenance after tune', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    await service.tuneEntry(
      '/store',
      'item.json',
      'act-001',
      'interval',
      'PT30S'
    );

    // The written provenance should have the tuned value, not the original
    const writtenFc = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock
      .calls[0][2] as { features: Array<Record<string, unknown>> };
    const props = writtenFc.features[0].properties as Record<string, unknown>;
    const prov = props.provenance as Array<Record<string, unknown>>;
    const targetEntry = prov.find(
      (e: Record<string, unknown>) => e.activity_id === 'act-001'
    );
    const wgb = targetEntry!.was_generated_by as {
      parameters: Record<string, { value: unknown }>;
    };
    expect(wgb.parameters.interval.value).toBe('PT30S');
  });

  it('calls executeTool during replay', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    await service.tuneEntry(
      '/store',
      'item.json',
      'act-001',
      'interval',
      'PT30S'
    );

    // executeTool should have been called for each entry in the replay plan
    expect(deps.executeTool).toHaveBeenCalled();
    expect(
      (deps.executeTool as ReturnType<typeof vi.fn>).mock.calls.length
    ).toBeGreaterThanOrEqual(1);
  });

  it('marks dirty on completion', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    await service.tuneEntry(
      '/store',
      'item.json',
      'act-001',
      'interval',
      'PT30S'
    );

    expect(deps.markDirty).toHaveBeenCalled();
  });

  it('removes generated features by activityId before replay (not stale IDs)', async () => {
    // Simulate additive tool output: a generated feature whose provenance
    // has the original activityId stamped (by the replay engine).
    // On the second tune, the cleanup should find it by activityId even
    // though the feature ID is different from the original `generated` list.
    const fc = {
      features: [
        {
          type: 'Feature',
          id: 'rect-1',
          geometry: null,
          properties: {
            id: 'rect-1',
            provenance: [
              {
                activity_id: 'act-move',
                timestamp: '2026-03-01T10:00:00Z',
                was_generated_by: {
                  tool: 'move-shape',
                  tool_version: '1.0.0',
                  parameters: {
                    direction: { value: 90, default: true, tunable: true },
                  },
                },
                used: ['rect-1'],
                generated: [],
                execution_duration: 'PT0.1S',
                generated_result_id: null,
                tune: null,
              },
              {
                activity_id: 'act-gen',
                timestamp: '2026-03-01T10:01:00Z',
                was_generated_by: {
                  tool: 'generate-reference-points',
                  tool_version: '1.0.0',
                  parameters: {},
                },
                used: ['rect-1'],
                generated: ['old-point-id'],
                execution_duration: 'PT0.1S',
                generated_result_id: null,
                tune: null,
              },
            ],
          },
        },
        // This feature was created by a PREVIOUS replay — its ID is different
        // from 'old-point-id' (the original generated list), but its
        // provenance has the stamped activityId 'act-gen'.
        {
          type: 'Feature',
          id: 'new-point-xyz',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: {
            id: 'new-point-xyz',
            provenance: [
              {
                activity_id: 'act-gen',
                timestamp: '2026-03-01T10:01:00Z',
                was_generated_by: {
                  tool: 'generate-reference-points',
                  tool_version: '1.0.0',
                  parameters: {},
                },
                used: ['rect-1'],
                generated: [],
                execution_duration: 'PT0.1S',
                generated_result_id: null,
                tune: null,
              },
            ],
          },
        },
      ],
    };

    const writeGeoJson = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
      writeGeoJson,
    });
    const service = createLogService(deps);

    await service.tuneEntry('/store', 'item.json', 'act-move', 'direction', 180);

    // The generated feature (new-point-xyz) should have been removed before
    // replay, despite its ID not matching 'old-point-id' in the generated list.
    // The first writeGeoJson call is the cleanup pass.
    const cleanupCall = writeGeoJson.mock.calls[0];
    const cleanedFc = cleanupCall[2] as { features: Array<Record<string, unknown>> };
    const remainingIds = cleanedFc.features.map(
      (f) => (f.properties as Record<string, unknown>)?.id
    );
    expect(remainingIds).toContain('rect-1');
    expect(remainingIds).not.toContain('new-point-xyz');
  });

  it('throws if replay deps not provided', async () => {
    // Create deps without replay dependencies
    const deps: LogServiceDeps = {
      appendProvenance: vi.fn().mockResolvedValue(0),
      loadGeoJson: vi.fn().mockResolvedValue(makeFeatureCollection()),
      markDirty: vi.fn(),
      // No writeGeoJson, executeTool, loadSnapshot, resolveToolVersion
    };
    const service = createLogService(deps);

    await expect(
      service.tuneEntry('/store', 'item.json', 'act-001', 'interval', 'PT30S')
    ).rejects.toThrow('not available');
  });
});
