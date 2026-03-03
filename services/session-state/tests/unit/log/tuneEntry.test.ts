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
          featureId: 'track-alpha',
          provenance: [
            {
              activityId: 'act-001',
              timestamp: '2026-02-01T10:00:00Z',
              wasGeneratedBy: {
                tool: 'calc-range',
                toolVersion: '1.0.0',
                parameters: {
                  interval: { value: 'PT60S', default: true, tunable: true },
                },
              },
              used: ['track-alpha'],
              generated: ['result-001'],
              executionDuration: 'PT0.5S',
              generatedResultId: null,
              tune: null,
            },
            {
              activityId: 'act-002',
              timestamp: '2026-02-01T10:05:00Z',
              wasGeneratedBy: {
                tool: 'calc-bearing',
                toolVersion: '1.0.0',
                parameters: {},
              },
              used: ['track-alpha'],
              generated: ['result-002'],
              executionDuration: 'PT0.3S',
              generatedResultId: null,
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
      .mockResolvedValue({ success: true, durationMs: 100 }),
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
    expect(result.entriesReplayed).toBe(2);
    expect(result.totalEntries).toBe(2);
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
    expect(result.entriesReplayed).toBe(0);
    expect(result.totalEntries).toBe(0);
    expect(result.tuneAnnotation).toBeNull();
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
      (e: Record<string, unknown>) => e.activityId === 'act-001'
    );
    expect(targetEntry).toBeDefined();
    expect(targetEntry!.tune).not.toBeNull();
    const tune = targetEntry!.tune as {
      parameter: string;
      previousValue: unknown;
      newValue: unknown;
    };
    expect(tune.parameter).toBe('interval');
    expect(tune.previousValue).toBe('PT60S');
    expect(tune.newValue).toBe('PT30S');
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
      (e: Record<string, unknown>) => e.activityId === 'act-001'
    );
    const wgb = targetEntry!.wasGeneratedBy as {
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
