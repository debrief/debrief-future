/**
 * ReplayEngine unit tests.
 * Feature: 076-replay-tune
 */

import { describe, it, expect, vi } from 'vitest';
import { createReplayEngine } from '../../../src/log/replayEngine.js';
import type {
  LogEntry,
  ReplayEngineDeps,
  GeoJsonFeatureCollection,
  TuneTarget,
} from '../../../src/log/types.js';

function makeEntry(
  overrides: Partial<LogEntry> & { activityId: string }
): LogEntry {
  return {
    timestamp: '2026-02-01T00:00:00Z',
    wasGeneratedBy: {
      tool: 'test-tool',
      toolVersion: '1.0.0',
      parameters: {
        param1: { value: 10, default: false, tunable: true },
      },
    },
    used: ['feature-a'],
    generated: ['result-a'],
    executionDuration: 'PT1S',
    generatedResultId: null,
    tune: null,
    ...overrides,
  };
}

function makeDeps(overrides?: Partial<ReplayEngineDeps>): ReplayEngineDeps {
  return {
    executeTool: vi
      .fn()
      .mockResolvedValue({ success: true, durationMs: 100 }),
    loadSnapshot: vi.fn().mockResolvedValue(null),
    resolveToolVersion: vi.fn().mockResolvedValue('1.0.0'),
    onProgress: vi.fn(),
    signal: new AbortController().signal,
    ...overrides,
  };
}

function makeState(): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: null,
        properties: { featureId: 'feature-a' },
      },
    ],
  };
}

describe('createReplayEngine', () => {
  describe('buildPlan', () => {
    it('constructs plan with correct entries from tune target onward', () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activityId: 'act-1', timestamp: '2026-02-01T00:00:00Z' }),
        makeEntry({ activityId: 'act-2', timestamp: '2026-02-01T01:00:00Z' }),
        makeEntry({ activityId: 'act-3', timestamp: '2026-02-01T02:00:00Z' }),
      ];

      const tuneTarget: TuneTarget = {
        activityId: 'act-2',
        parameter: 'param1',
        previousValue: 10,
        newValue: 20,
      };

      const plan = engine.buildPlan(
        timeline,
        tuneTarget,
        [],
        makeState(),
        null
      );

      // Should include entries from act-2 onward (act-2, act-3)
      expect(plan.entries).toHaveLength(2);
      expect(plan.entries[0].activityId).toBe('act-2');
      expect(plan.entries[1].activityId).toBe('act-3');
      expect(plan.tuneTarget).toEqual(tuneTarget);
    });

    it('skips deleted entries', () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activityId: 'act-1', timestamp: '2026-02-01T00:00:00Z' }),
        makeEntry({ activityId: 'act-2', timestamp: '2026-02-01T01:00:00Z' }),
        makeEntry({ activityId: 'act-3', timestamp: '2026-02-01T02:00:00Z' }),
      ];

      const plan = engine.buildPlan(
        timeline,
        null,
        ['act-2'], // act-2 is deleted
        makeState(),
        null
      );

      // Should skip act-2
      expect(plan.entries).toHaveLength(2);
      expect(plan.entries[0].activityId).toBe('act-1');
      expect(plan.entries[1].activityId).toBe('act-3');
    });

    it('applies new parameter value on tune target entry', () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activityId: 'act-1', timestamp: '2026-02-01T00:00:00Z' }),
      ];

      const tuneTarget: TuneTarget = {
        activityId: 'act-1',
        parameter: 'param1',
        previousValue: 10,
        newValue: 42,
      };

      const plan = engine.buildPlan(
        timeline,
        tuneTarget,
        [],
        makeState(),
        null
      );

      expect(plan.entries[0].isTuneTarget).toBe(true);
      expect(plan.entries[0].parameters.param1).toBe(42);
    });

    it('deep-clones currentState as preReplayState', () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const state = makeState();
      const timeline: LogEntry[] = [
        makeEntry({ activityId: 'act-1' }),
      ];

      const plan = engine.buildPlan(timeline, null, [], state, null);

      // Should be equal in value but not same reference
      expect(plan.preReplayState).toEqual(state);
      expect(plan.preReplayState).not.toBe(state);
      expect(plan.preReplayState.features[0]).not.toBe(state.features[0]);
    });
  });

  describe('execute', () => {
    it('calls executeTool for each entry in order', async () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({
          activityId: 'act-1',
          timestamp: '2026-02-01T00:00:00Z',
          wasGeneratedBy: { tool: 'tool-a', toolVersion: '1.0.0', parameters: {} },
        }),
        makeEntry({
          activityId: 'act-2',
          timestamp: '2026-02-01T01:00:00Z',
          wasGeneratedBy: { tool: 'tool-b', toolVersion: '1.0.0', parameters: {} },
        }),
      ];

      const plan = engine.buildPlan(timeline, null, [], makeState(), null);
      await engine.execute(plan);

      expect(deps.executeTool).toHaveBeenCalledTimes(2);
      // First call should be tool-a
      expect(deps.executeTool).toHaveBeenNthCalledWith(
        1,
        'tool-a',
        expect.any(Array),
        expect.any(Object)
      );
      // Second call should be tool-b
      expect(deps.executeTool).toHaveBeenNthCalledWith(
        2,
        'tool-b',
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('reports progress for each entry', async () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activityId: 'act-1', timestamp: '2026-02-01T00:00:00Z' }),
        makeEntry({ activityId: 'act-2', timestamp: '2026-02-01T01:00:00Z' }),
      ];

      const plan = engine.buildPlan(timeline, null, [], makeState(), null);
      await engine.execute(plan);

      // Progress is reported for each entry (replaying phase) plus finalising
      const progressCalls = (deps.onProgress as ReturnType<typeof vi.fn>).mock
        .calls;
      expect(progressCalls.length).toBeGreaterThanOrEqual(3);

      // Check replaying phase entries
      const replayingCalls = progressCalls.filter(
        (c: unknown[]) => (c[0] as { phase: string }).phase === 'replaying'
      );
      expect(replayingCalls).toHaveLength(2);
      expect(replayingCalls[0][0].current).toBe(1);
      expect(replayingCalls[1][0].current).toBe(2);

      // Check finalising phase
      const finalisingCalls = progressCalls.filter(
        (c: unknown[]) => (c[0] as { phase: string }).phase === 'finalising'
      );
      expect(finalisingCalls).toHaveLength(1);
    });

    it('halts on version mismatch', async () => {
      const deps = makeDeps({
        resolveToolVersion: vi.fn().mockResolvedValue('2.0.0'), // different from entry's 1.0.0
      });
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activityId: 'act-1' }),
      ];

      const plan = engine.buildPlan(timeline, null, [], makeState(), null);
      const result = await engine.execute(plan);

      expect(result.status).toBe('halted');
      expect(result.haltReason).not.toBeNull();
      expect(result.haltReason!.type).toBe('version-mismatch');
      expect(result.haltReason!.entryActivityId).toBe('act-1');
      expect(result.entriesReplayed).toBe(0);
    });

    it('returns cancelled when AbortSignal is aborted', async () => {
      const controller = new AbortController();
      controller.abort(); // abort immediately

      const deps = makeDeps({ signal: controller.signal });
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activityId: 'act-1' }),
      ];

      const plan = engine.buildPlan(timeline, null, [], makeState(), null);
      const result = await engine.execute(plan);

      expect(result.status).toBe('cancelled');
      expect(result.entriesReplayed).toBe(0);
      expect(deps.executeTool).not.toHaveBeenCalled();
    });

    it('creates tune annotation on completion when tuneTarget exists', async () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const tuneTarget: TuneTarget = {
        activityId: 'act-1',
        parameter: 'param1',
        previousValue: 10,
        newValue: 20,
      };

      const timeline: LogEntry[] = [
        makeEntry({ activityId: 'act-1' }),
      ];

      const plan = engine.buildPlan(
        timeline,
        tuneTarget,
        [],
        makeState(),
        null
      );
      const result = await engine.execute(plan);

      expect(result.status).toBe('completed');
      expect(result.tuneAnnotation).not.toBeNull();
      expect(result.tuneAnnotation!.parameter).toBe('param1');
      expect(result.tuneAnnotation!.previousValue).toBe(10);
      expect(result.tuneAnnotation!.newValue).toBe(20);
      expect(result.tuneAnnotation!.timestamp).toBeDefined();
    });

    it('halts on tool execution failure', async () => {
      const deps = makeDeps({
        executeTool: vi
          .fn()
          .mockResolvedValue({ success: false, durationMs: 50 }),
      });
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activityId: 'act-1' }),
        makeEntry({ activityId: 'act-2', timestamp: '2026-02-01T01:00:00Z' }),
      ];

      const plan = engine.buildPlan(timeline, null, [], makeState(), null);
      const result = await engine.execute(plan);

      expect(result.status).toBe('halted');
      expect(result.haltReason).not.toBeNull();
      expect(result.haltReason!.type).toBe('execution-error');
      expect(result.haltReason!.entryActivityId).toBe('act-1');
      expect(result.entriesReplayed).toBe(0);
    });

    it('handles snapshot loading phase', async () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activityId: 'act-1' }),
      ];

      const plan = engine.buildPlan(
        timeline,
        null,
        [],
        makeState(),
        'snapshot-001.geojson'
      );

      expect(plan.startFromSnapshot).toBe('snapshot-001.geojson');

      const result = await engine.execute(plan);

      // Should report loading-snapshot phase
      const progressCalls = (deps.onProgress as ReturnType<typeof vi.fn>).mock
        .calls;
      const loadingCalls = progressCalls.filter(
        (c: unknown[]) =>
          (c[0] as { phase: string }).phase === 'loading-snapshot'
      );
      expect(loadingCalls).toHaveLength(1);
      expect(result.status).toBe('completed');
    });
  });

  describe('cross-snapshot', () => {
    it('sets startFromSnapshot when snapshotAsset provided', () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activityId: 'act-1' }),
      ];

      const plan = engine.buildPlan(
        timeline,
        null,
        [],
        makeState(),
        'snapshot-abc.geojson'
      );

      expect(plan.startFromSnapshot).toBe('snapshot-abc.geojson');
    });
  });
});
