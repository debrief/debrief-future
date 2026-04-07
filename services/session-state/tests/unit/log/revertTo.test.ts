/**
 * LogService.revertTo unit tests.
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
      {
        type: 'Feature',
        geometry: null,
        properties: {
          feature_id: 'track-beta',
          provenance: [
            {
              activity_id: 'act-001',
              timestamp: '2026-02-01T10:00:00Z',
              was_generated_by: {
                tool: 'calc-range',
                tool_version: '1.0.0',
                parameters: {},
              },
              used: ['track-beta'],
              generated: ['result-001'],
              execution_duration: 'PT0.5S',
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
              used: ['track-beta'],
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

describe('LogService.revertTo', () => {
  it('removes provenance entries after target from all features', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    await service.revertTo('/store', 'item.json', 'act-001');

    expect(deps.writeGeoJson).toHaveBeenCalledTimes(1);
    const writtenFc = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock
      .calls[0][2] as { features: Array<Record<string, unknown>> };

    // track-alpha: originally had act-001, act-002, act-003. After revert to act-001, only act-001 remains.
    const alphaProps = writtenFc.features[0].properties as Record<
      string,
      unknown
    >;
    const alphaProv = alphaProps.provenance as Array<
      Record<string, unknown>
    >;
    expect(alphaProv).toHaveLength(1);
    expect(alphaProv[0].activity_id).toBe('act-001');

    // track-beta: originally had act-001, act-003. After revert to act-001, only act-001 remains.
    const betaProps = writtenFc.features[1].properties as Record<
      string,
      unknown
    >;
    const betaProv = betaProps.provenance as Array<Record<string, unknown>>;
    expect(betaProv).toHaveLength(1);
    expect(betaProv[0].activity_id).toBe('act-001');
  });

  it('keeps the target entry itself', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    await service.revertTo('/store', 'item.json', 'act-002');

    const writtenFc = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock
      .calls[0][2] as { features: Array<Record<string, unknown>> };

    const alphaProps = writtenFc.features[0].properties as Record<
      string,
      unknown
    >;
    const alphaProv = alphaProps.provenance as Array<
      Record<string, unknown>
    >;
    // Should keep act-001 and act-002, remove act-003
    expect(alphaProv).toHaveLength(2);
    expect(alphaProv.map((e) => e.activity_id)).toEqual([
      'act-001',
      'act-002',
    ]);
  });

  it('calls writeGeoJson with updated features', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    await service.revertTo('/store', 'item.json', 'act-001');

    expect(deps.writeGeoJson).toHaveBeenCalledWith(
      '/store',
      'item.json',
      expect.objectContaining({
        features: expect.any(Array),
      })
    );
  });

  it('marks dirty', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    await service.revertTo('/store', 'item.json', 'act-001');

    expect(deps.markDirty).toHaveBeenCalled();
  });

  it('throws if entry not found', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    await expect(
      service.revertTo('/store', 'item.json', 'act-nonexistent')
    ).rejects.toThrow('not found');
  });

  it('revert to last entry is effectively a no-op (no entries removed)', async () => {
    const deps = makeDeps();
    const service = createLogService(deps);

    // act-003 is the last entry (timestamp 2026-02-01T10:10:00Z)
    await service.revertTo('/store', 'item.json', 'act-003');

    const writtenFc = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock
      .calls[0][2] as { features: Array<Record<string, unknown>> };

    // track-alpha: all 3 entries should remain
    const alphaProps = writtenFc.features[0].properties as Record<
      string,
      unknown
    >;
    const alphaProv = alphaProps.provenance as Array<
      Record<string, unknown>
    >;
    expect(alphaProv).toHaveLength(3);

    // track-beta: both entries should remain
    const betaProps = writtenFc.features[1].properties as Record<
      string,
      unknown
    >;
    const betaProv = betaProps.provenance as Array<Record<string, unknown>>;
    expect(betaProv).toHaveLength(2);
  });
});
