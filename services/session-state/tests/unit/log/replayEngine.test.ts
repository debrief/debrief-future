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
  overrides: Partial<LogEntry> & { activity_id: string }
): LogEntry {
  return {
    timestamp: '2026-02-01T00:00:00Z',
    was_generated_by: {
      tool: 'test-tool',
      tool_version: '1.0.0',
      parameters: {
        param1: { value: 10, default: false, tunable: true },
      },
    },
    used: ['feature-a'],
    generated: ['result-a'],
    execution_duration: 'PT1S',
    generated_result_id: null,
    tune: null,
    ...overrides,
  };
}

function makeDeps(overrides?: Partial<ReplayEngineDeps>): ReplayEngineDeps {
  return {
    execute_tool: vi
      .fn()
      .mockResolvedValue({ success: true, duration_ms: 100 }),
    load_snapshot: vi.fn().mockResolvedValue(null),
    resolve_tool_version: vi.fn().mockResolvedValue('1.0.0'),
    on_progress: vi.fn(),
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
        properties: { feature_id: 'feature-a' },
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
        makeEntry({ activity_id: 'act-1', timestamp: '2026-02-01T00:00:00Z' }),
        makeEntry({ activity_id: 'act-2', timestamp: '2026-02-01T01:00:00Z' }),
        makeEntry({ activity_id: 'act-3', timestamp: '2026-02-01T02:00:00Z' }),
      ];

      const tuneTarget: TuneTarget = {
        activity_id: 'act-2',
        parameter: 'param1',
        previous_value: 10,
        new_value: 20,
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
      expect(plan.entries[0].activity_id).toBe('act-2');
      expect(plan.entries[1].activity_id).toBe('act-3');
      expect(plan.tune_target).toEqual(tuneTarget);
    });

    it('skips deleted entries', () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activity_id: 'act-1', timestamp: '2026-02-01T00:00:00Z' }),
        makeEntry({ activity_id: 'act-2', timestamp: '2026-02-01T01:00:00Z' }),
        makeEntry({ activity_id: 'act-3', timestamp: '2026-02-01T02:00:00Z' }),
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
      expect(plan.entries[0].activity_id).toBe('act-1');
      expect(plan.entries[1].activity_id).toBe('act-3');
    });

    it('applies new parameter value on tune target entry', () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activity_id: 'act-1', timestamp: '2026-02-01T00:00:00Z' }),
      ];

      const tuneTarget: TuneTarget = {
        activity_id: 'act-1',
        parameter: 'param1',
        previous_value: 10,
        new_value: 42,
      };

      const plan = engine.buildPlan(
        timeline,
        tuneTarget,
        [],
        makeState(),
        null
      );

      expect(plan.entries[0].is_tune_target).toBe(true);
      expect(plan.entries[0].parameters.param1).toBe(42);
    });

    it('deep-clones currentState as preReplayState', () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const state = makeState();
      const timeline: LogEntry[] = [
        makeEntry({ activity_id: 'act-1' }),
      ];

      const plan = engine.buildPlan(timeline, null, [], state, null);

      // Should be equal in value but not same reference
      expect(plan.pre_replay_state).toEqual(state);
      expect(plan.pre_replay_state).not.toBe(state);
      expect(plan.pre_replay_state.features[0]).not.toBe(state.features[0]);
    });
  });

  describe('execute', () => {
    it('calls executeTool for each entry in order', async () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({
          activity_id: 'act-1',
          timestamp: '2026-02-01T00:00:00Z',
          was_generated_by: { tool: 'tool-a', tool_version: '1.0.0', parameters: {} },
        }),
        makeEntry({
          activity_id: 'act-2',
          timestamp: '2026-02-01T01:00:00Z',
          was_generated_by: { tool: 'tool-b', tool_version: '1.0.0', parameters: {} },
        }),
      ];

      const plan = engine.buildPlan(timeline, null, [], makeState(), null);
      await engine.execute(plan);

      expect(deps.execute_tool).toHaveBeenCalledTimes(2);
      // First call should be tool-a with its activityId and timestamp
      expect(deps.execute_tool).toHaveBeenNthCalledWith(
        1,
        'tool-a',
        expect.any(Array),
        expect.any(Object),
        'act-1',
        '2026-02-01T00:00:00Z'
      );
      // Second call should be tool-b with its activityId and timestamp
      expect(deps.execute_tool).toHaveBeenNthCalledWith(
        2,
        'tool-b',
        expect.any(Array),
        expect.any(Object),
        'act-2',
        '2026-02-01T01:00:00Z'
      );
    });

    it('reports progress for each entry', async () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activity_id: 'act-1', timestamp: '2026-02-01T00:00:00Z' }),
        makeEntry({ activity_id: 'act-2', timestamp: '2026-02-01T01:00:00Z' }),
      ];

      const plan = engine.buildPlan(timeline, null, [], makeState(), null);
      await engine.execute(plan);

      // Progress is reported for each entry (replaying phase) plus finalising
      const progressCalls = (deps.on_progress as ReturnType<typeof vi.fn>).mock
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
        resolve_tool_version: vi.fn().mockResolvedValue('2.0.0'), // different from entry's 1.0.0
      });
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activity_id: 'act-1' }),
      ];

      const plan = engine.buildPlan(timeline, null, [], makeState(), null);
      const result = await engine.execute(plan);

      expect(result.status).toBe('halted');
      expect(result.halt_reason).not.toBeNull();
      expect(result.halt_reason!.type).toBe('version-mismatch');
      expect(result.halt_reason!.entry_activity_id).toBe('act-1');
      expect(result.entries_replayed).toBe(0);
    });

    it('returns cancelled when AbortSignal is aborted', async () => {
      const controller = new AbortController();
      controller.abort(); // abort immediately

      const deps = makeDeps({ signal: controller.signal });
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activity_id: 'act-1' }),
      ];

      const plan = engine.buildPlan(timeline, null, [], makeState(), null);
      const result = await engine.execute(plan);

      expect(result.status).toBe('cancelled');
      expect(result.entries_replayed).toBe(0);
      expect(deps.execute_tool).not.toHaveBeenCalled();
    });

    it('creates tune annotation on completion when tuneTarget exists', async () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const tuneTarget: TuneTarget = {
        activity_id: 'act-1',
        parameter: 'param1',
        previous_value: 10,
        new_value: 20,
      };

      const timeline: LogEntry[] = [
        makeEntry({ activity_id: 'act-1' }),
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
      expect(result.tune_annotation).not.toBeNull();
      expect(result.tune_annotation!.parameter).toBe('param1');
      expect(result.tune_annotation!.previous_value).toBe(10);
      expect(result.tune_annotation!.new_value).toBe(20);
      expect(result.tune_annotation!.timestamp).toBeDefined();
    });

    it('halts on tool execution failure', async () => {
      const deps = makeDeps({
        execute_tool: vi
          .fn()
          .mockResolvedValue({ success: false, duration_ms: 50 }),
      });
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activity_id: 'act-1' }),
        makeEntry({ activity_id: 'act-2', timestamp: '2026-02-01T01:00:00Z' }),
      ];

      const plan = engine.buildPlan(timeline, null, [], makeState(), null);
      const result = await engine.execute(plan);

      expect(result.status).toBe('halted');
      expect(result.halt_reason).not.toBeNull();
      expect(result.halt_reason!.type).toBe('execution-error');
      expect(result.halt_reason!.entry_activity_id).toBe('act-1');
      expect(result.entries_replayed).toBe(0);
    });

    it('handles snapshot loading phase', async () => {
      const deps = makeDeps();
      const engine = createReplayEngine(deps);

      const timeline: LogEntry[] = [
        makeEntry({ activity_id: 'act-1' }),
      ];

      const plan = engine.buildPlan(
        timeline,
        null,
        [],
        makeState(),
        'snapshot-001.geojson'
      );

      expect(plan.start_from_snapshot).toBe('snapshot-001.geojson');

      const result = await engine.execute(plan);

      // Should report loading-snapshot phase
      const progressCalls = (deps.on_progress as ReturnType<typeof vi.fn>).mock
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
        makeEntry({ activity_id: 'act-1' }),
      ];

      const plan = engine.buildPlan(
        timeline,
        null,
        [],
        makeState(),
        'snapshot-abc.geojson'
      );

      expect(plan.start_from_snapshot).toBe('snapshot-abc.geojson');
    });
  });
});
