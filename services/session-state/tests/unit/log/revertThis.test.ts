/**
 * LogService.revertThis and restoreEntry unit tests.
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
                parameters: {},
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
            {
              activity_id: 'act-003',
              timestamp: '2026-02-01T10:10:00Z',
              was_generated_by: {
                tool: 'calc-speed',
                tool_version: '1.0.0',
                parameters: {},
              },
              used: ['track-alpha'],
              generated: ['result-003'],
              execution_duration: 'PT0.2S',
              generated_result_id: null,
              tune: null,
            },
          ],
        },
      },
    ],
  };
}

/** Feature collection with act-002 already marked as deleted. */
function makeFeatureCollectionWithDeleted() {
  const fc = makeFeatureCollection();
  const prov = (
    fc.features[0].properties as Record<string, unknown>
  ).provenance as Array<Record<string, unknown>>;
  const entry = prov.find((e) => e.activity_id === 'act-002');
  if (entry) {
    entry.deleted = true;
  }
  return fc;
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

describe('LogService.revertThis', () => {
  it('marks entry as deleted, replays subsequent entries', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    const result = await service.revertThis('/store', 'item.json', 'act-002');

    // Replay should run from act-002 onward, skipping deleted act-002
    // The remaining timeline from act-002 index is [act-002, act-003]
    // act-002 is deleted so only act-003 is replayed
    expect(result.status).toBe('completed');
    expect(result.entries_replayed).toBe(1); // only act-003
    expect(deps.executeTool).toHaveBeenCalled();
  });

  it('returns completed result', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    const result = await service.revertThis('/store', 'item.json', 'act-002');

    expect(result.status).toBe('completed');
    expect(result.halt_reason).toBeNull();
  });

  it('halts when tool execution fails', async () => {
    const deps = makeDeps({
      executeTool: vi
        .fn()
        .mockResolvedValue({ success: false, duration_ms: 50 }),
    });
    const service = createLogService(deps);

    const result = await service.revertThis('/store', 'item.json', 'act-002');

    expect(result.status).toBe('halted');
    expect(result.halt_reason).not.toBeNull();
    expect(result.halt_reason!.type).toBe('execution-error');
  });
});

describe('LogService.restoreEntry', () => {
  it('removes deleted flag, replays including restored entry', async () => {
    const deps = makeDeps({
      loadGeoJson: vi
        .fn()
        .mockResolvedValue(makeFeatureCollectionWithDeleted()),
    });
    const service = createLogService(deps);

    const result = await service.restoreEntry(
      '/store',
      'item.json',
      'act-002'
    );

    expect(result.status).toBe('completed');
    // Replay from act-002 onward: act-002 (restored, not deleted) and act-003
    expect(result.entries_replayed).toBe(2);
    expect(deps.executeTool).toHaveBeenCalledTimes(2);
  });

  it('returns completed result', async () => {
    const deps = makeDeps({
      loadGeoJson: vi
        .fn()
        .mockResolvedValue(makeFeatureCollectionWithDeleted()),
    });
    const service = createLogService(deps);

    const result = await service.restoreEntry(
      '/store',
      'item.json',
      'act-002'
    );

    expect(result.status).toBe('completed');
    expect(result.halt_reason).toBeNull();
    expect(result.entries_replayed).toBeGreaterThan(0);
  });
});
