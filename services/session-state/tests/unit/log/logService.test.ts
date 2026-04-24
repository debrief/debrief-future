/**
 * LogService unit tests.
 * Feature: 071-log-recording-service
 */

import { createLogService } from '../../../src/log/logService.js';
import type { LogServiceDeps } from '../../../src/log/logService.js';
import type { ToolResultForLog, ExpandedToolResultFields } from '../../../src/log/types.js';

function createMockDeps(overrides?: Partial<LogServiceDeps>): LogServiceDeps {
  return {
    appendProvenance: vi.fn().mockResolvedValue(2),
    loadGeoJson: vi.fn().mockResolvedValue({
      features: [
        {
          type: 'Feature',
          id: 'track-1',
          properties: {
            provenance: [
              { activity_id: 'act-1', timestamp: '2026-02-09T10:00:00Z', was_generated_by: { tool: 'tool-a', tool_version: '1.0.0', parameters: {} }, used: [], generated: [], execution_duration: 'PT0.1S', tune: null },
            ],
          },
        },
        {
          type: 'Feature',
          id: 'track-2',
          properties: {
            provenance: [
              { activity_id: 'act-1', timestamp: '2026-02-09T10:00:00Z', was_generated_by: { tool: 'tool-a', tool_version: '1.0.0', parameters: {} }, used: [], generated: [], execution_duration: 'PT0.1S', tune: null },
              { activity_id: 'act-2', timestamp: '2026-02-09T11:00:00Z', was_generated_by: { tool: 'tool-b', tool_version: '1.0.0', parameters: {} }, used: [], generated: [], execution_duration: 'PT0.2S', tune: null },
            ],
          },
        },
      ],
    }),
    markDirty: vi.fn(),
    ...overrides,
  };
}

describe('createLogService', () => {
  describe('recordToolResult', () => {
    it('does not record entries for failed executions (FR-009)', async () => {
      const deps = createMockDeps();
      const service = createLogService(deps);

      const result = await service.recordToolResult(
        { success: false, duration_ms: 100, tool_id: 'test-tool' },
        undefined,
        '/store',
        'item.json'
      );

      expect(result.activity_id).toBe('');
      expect(result.features_updated).toBe(0);
      expect(result.entries).toHaveLength(0);
      expect(deps.appendProvenance).not.toHaveBeenCalled();
      expect(deps.markDirty).not.toHaveBeenCalled();
    });

    it('records entries for successful executions', async () => {
      const deps = createMockDeps();
      const service = createLogService(deps);

      const toolResult: ToolResultForLog = {
        success: true,
        duration_ms: 300,
        tool_id: 'calculate-range',
        source_feature_ids: ['track-1', 'track-2'],
        features: {
          type: 'FeatureCollection',
          features: [
            { id: 'result-1', type: 'Feature', properties: { provenance: [{ activity_id: 'from-python' }] } },
          ],
        },
      };

      const result = await service.recordToolResult(
        toolResult,
        undefined,
        '/store',
        'item.json'
      );

      expect(result.activity_id).toBe('from-python');
      expect(result.entries).toHaveLength(1);
      expect(deps.appendProvenance).toHaveBeenCalledWith(
        '/store',
        'item.json',
        expect.arrayContaining([
          expect.objectContaining({ feature_id: 'track-1' }),
          expect.objectContaining({ feature_id: 'track-2' }),
        ])
      );
      expect(deps.markDirty).toHaveBeenCalled();
    });

    it('calls markDirty after writing provenance', async () => {
      const deps = createMockDeps();
      const service = createLogService(deps);

      await service.recordToolResult(
        { success: true, duration_ms: 100, tool_id: 'test', source_feature_ids: ['f1'] },
        undefined,
        '/store',
        'item.json'
      );

      expect(deps.markDirty).toHaveBeenCalled();
    });

    it('passes expanded fields to the entry builder', async () => {
      const deps = createMockDeps();
      const service = createLogService(deps);

      const expanded: ExpandedToolResultFields = {
        tool_version: '2.0.0',
        parameters: { threshold: { value: 0.5, default: true, tunable: true } },
      };

      const result = await service.recordToolResult(
        { success: true, duration_ms: 200, tool_id: 'fancy-tool', source_feature_ids: ['f1'] },
        expanded,
        '/store',
        'item.json'
      );

      expect(result.entries[0].was_generated_by.tool_version).toBe('2.0.0');
      expect(result.entries[0].was_generated_by.parameters).toEqual({
        threshold: { value: 0.5, default: true, tunable: true },
      });
    });

    it('handles tool result with no input features', async () => {
      const deps = createMockDeps();
      const service = createLogService(deps);

      const result = await service.recordToolResult(
        {
          success: true,
          duration_ms: 100,
          tool_id: 'create-tool',
          features: {
            type: 'FeatureCollection',
            features: [{ id: 'new-1', type: 'Feature', properties: {} }],
          },
        },
        undefined,
        '/store',
        'item.json'
      );

      // No input features to update, but output features exist
      expect(deps.appendProvenance).not.toHaveBeenCalled();
      expect(deps.markDirty).toHaveBeenCalled(); // still dirty because of output features
    });
  });

  describe('getTimeline', () => {
    it('returns sorted, deduplicated entries', async () => {
      const deps = createMockDeps();
      const service = createLogService(deps);

      const timeline = await service.getTimeline('/store', 'item.json');

      expect(timeline).toHaveLength(2); // act-1 and act-2 (deduplicated)
      expect(timeline[0].activity_id).toBe('act-1');
      expect(timeline[1].activity_id).toBe('act-2');
      expect(deps.loadGeoJson).toHaveBeenCalledWith('/store', 'item.json');
    });

    it('returns empty array when GeoJSON not found', async () => {
      const deps = createMockDeps({ loadGeoJson: vi.fn().mockResolvedValue(null) });
      const service = createLogService(deps);

      const timeline = await service.getTimeline('/store', 'item.json');
      expect(timeline).toEqual([]);
    });
  });

  describe('Phase 4-6: missing replay deps', () => {
    it('tuneEntry throws when replay deps not provided', async () => {
      const service = createLogService(createMockDeps());
      await expect(service.tuneEntry('/store', 'item.json', 'act-1', 'param', 42)).rejects.toThrow('not available');
    });

    it('revertTo throws when writeGeoJson dep not provided', async () => {
      const service = createLogService(createMockDeps());
      await expect(service.revertTo('/store', 'item.json', 'act-1')).rejects.toThrow('not available');
    });

    it('revertThis throws when replay deps not provided', async () => {
      const service = createLogService(createMockDeps());
      await expect(service.revertThis('/store', 'item.json', 'act-1')).rejects.toThrow('not available');
    });

    it('createSnapshot throws with redirect to SnapshotService', async () => {
      const service = createLogService(createMockDeps());
      await expect(service.createSnapshot()).rejects.toThrow('SnapshotService');
    });

    it('branchFrom throws with redirect to BranchService', async () => {
      const service = createLogService(createMockDeps());
      await expect(service.branchFrom('act-1')).rejects.toThrow('BranchService');
    });
  });

  describe('recordFileSaved (Feature: 178)', () => {
    it('appends a FileSavedEvent linked to the parent ToolRunEvent', async () => {
      const deps = createMockDeps();
      const service = createLogService(deps);

      const result = await service.recordFileSaved(
        '/store',
        'item.json',
        'act-2',
        'assets/track-stats--2026-04-07T10-00-00.csv',
        '2026-04-07T10:00:00.000Z',
      );

      expect(result.activity_id).toBeTruthy();
      expect(deps.appendProvenance).toHaveBeenCalledTimes(1);
      const call = (deps.appendProvenance as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
      expect(call).toBeDefined();
      const provArg = call![2] as Array<{ feature_id: string; entry: Record<string, unknown> }>;
      // Parent (act-2) is on track-2 only → attach there
      expect(provArg).toHaveLength(1);
      expect(provArg[0]!.feature_id).toBe('track-2');
      const entry = provArg[0]!.entry;
      const wgb = entry.was_generated_by as Record<string, unknown>;
      expect(wgb.tool).toBe('debrief.fileSave');
      expect(entry.used).toEqual(['act-2']);
      expect(entry.generated).toEqual(['assets/track-stats--2026-04-07T10-00-00.csv']);
      expect(deps.markDirty).toHaveBeenCalled();
    });

    it('throws when filename does not begin with "assets/"', async () => {
      const deps = createMockDeps();
      const service = createLogService(deps);
      await expect(
        service.recordFileSaved(
          '/store',
          'item.json',
          'act-1',
          'outside/foo.csv',
          '2026-04-07T10:00:00.000Z',
        ),
      ).rejects.toThrow('assets/');
      expect(deps.appendProvenance).not.toHaveBeenCalled();
    });

    it('throws when the timestamp is not ISO-8601', async () => {
      const deps = createMockDeps();
      const service = createLogService(deps);
      await expect(
        service.recordFileSaved(
          '/store',
          'item.json',
          'act-1',
          'assets/foo.csv',
          'not-a-timestamp',
        ),
      ).rejects.toThrow('ISO-8601');
    });

    it('falls back to the first feature when no parent match exists', async () => {
      const deps = createMockDeps();
      const service = createLogService(deps);

      await service.recordFileSaved(
        '/store',
        'item.json',
        'act-nonexistent',
        'assets/orphan.csv',
        '2026-04-07T10:00:00.000Z',
      );

      const call = (deps.appendProvenance as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
      const provArg = call![2] as Array<{ feature_id: string }>;
      expect(provArg).toHaveLength(1);
      expect(provArg[0]!.feature_id).toBe('track-1');
    });

    it('sentinel tool name is exactly "debrief.fileSave"', async () => {
      const deps = createMockDeps();
      const service = createLogService(deps);
      await service.recordFileSaved(
        '/store',
        'item.json',
        'act-1',
        'assets/foo.csv',
        '2026-04-07T10:00:00.000Z',
      );
      const call = (deps.appendProvenance as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
      const provArg = call![2] as Array<{ entry: Record<string, unknown> }>;
      const wgb = provArg[0]!.entry.was_generated_by as Record<string, unknown>;
      expect(wgb.tool).toBe('debrief.fileSave');
    });
  });

  describe('recordStoryboardEdit (Feature: 218)', () => {
    const baseInput = {
      storePath: '/store',
      itemPath: 'item.json',
      storyboardId: 'sb-1',
      sceneId: 'scene-a',
      thumbnailAssetRef: 'scene-thumbnail-scene-a',
      actor: 'alice',
      summary: 'rename scene "Old" → "New"',
      timestamp: '2026-04-24T12:00:00Z',
      underlyingActivityId: 'underlying-1',
      pairActivityId: null,
    } as const;

    it("produces a LogEntry tagged with the storyboard-edit sentinel", async () => {
      const deps = createMockDeps({
        loadGeoJson: vi.fn().mockResolvedValue({
          features: [
            { type: 'Feature', id: 'scene-a', properties: { provenance: [] } },
          ],
        }),
      });
      const service = createLogService(deps);
      const result = await service.recordStoryboardEdit({ ...baseInput, op: 'rename' });

      expect(result.activity_id).not.toBe('');
      const call = (deps.appendProvenance as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
      const provArg = call![2] as Array<{ entry: Record<string, unknown> }>;
      const wgb = provArg[0]!.entry.was_generated_by as Record<string, unknown>;
      expect(wgb.tool).toBe('debrief.storyboardEdit');
      const params = wgb.parameters as Record<string, { value: unknown }>;
      expect(params.op?.value).toBe('rename');
      expect(params.sceneId?.value).toBe('scene-a');
      expect(params.storyboardId?.value).toBe('sb-1');
      expect(params.underlyingActivityId?.value).toBe('underlying-1');
      expect(params.pairActivityId?.value).toBeNull();
    });

    it('returns { activity_id: "" } (skipped) when loadGeoJson returns null (FR-EDIT-021)', async () => {
      const deps = createMockDeps({
        loadGeoJson: vi.fn().mockResolvedValue(null),
      });
      const service = createLogService(deps);
      const result = await service.recordStoryboardEdit({ ...baseInput, op: 'rename' });
      expect(result.activity_id).toBe('');
      expect(deps.appendProvenance).not.toHaveBeenCalled();
    });

    it.each([
      'create', 'rename', 'describe', 'delete', 'restore', 'update-to-current',
      'duplicate', 'copy-in', 'copy-out', 'refresh-thumbnail', 'refresh-all-stale',
      'insert-middle',
    ] as const)('parametrised: op=%s round-trips through the recorder', async (op) => {
      const deps = createMockDeps({
        loadGeoJson: vi.fn().mockResolvedValue({
          features: [
            { type: 'Feature', id: 'scene-a', properties: { provenance: [] } },
          ],
        }),
      });
      const service = createLogService(deps);
      const result = await service.recordStoryboardEdit({ ...baseInput, op });
      expect(result.activity_id).not.toBe('');
      const call = (deps.appendProvenance as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
      const provArg = call![2] as Array<{ entry: Record<string, unknown> }>;
      const params = (provArg[0]!.entry.was_generated_by as Record<string, unknown>).parameters as Record<string, { value: unknown }>;
      expect(params.op?.value).toBe(op);
    });

    it('carries pairActivityId for paired copy-out / copy-in entries (review 3A)', async () => {
      const deps = createMockDeps({
        loadGeoJson: vi.fn().mockResolvedValue({
          features: [
            { type: 'Feature', id: 'scene-a', properties: { provenance: [] } },
            { type: 'Feature', id: 'scene-b', properties: { provenance: [] } },
          ],
        }),
      });
      const service = createLogService(deps);
      const PAIR = 'pair-uuid-123';
      await service.recordStoryboardEdit({ ...baseInput, op: 'copy-out', pairActivityId: PAIR });
      await service.recordStoryboardEdit({ ...baseInput, op: 'copy-in', sceneId: 'scene-b', pairActivityId: PAIR });
      const calls = (deps.appendProvenance as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      expect(calls).toHaveLength(2);
      const getPair = (c: unknown[]): unknown => {
        const arg = c[2] as Array<{ entry: Record<string, unknown> }>;
        const wgb = arg[0]!.entry.was_generated_by as Record<string, unknown>;
        const p = wgb.parameters as Record<string, { value: unknown }>;
        return p.pairActivityId?.value;
      };
      expect(getPair(calls[0]!)).toBe(PAIR);
      expect(getPair(calls[1]!)).toBe(PAIR);
    });

    it('propagates errors from appendProvenance to the caller', async () => {
      const err = new Error('disk full');
      const deps = createMockDeps({
        appendProvenance: vi.fn().mockRejectedValue(err),
        loadGeoJson: vi.fn().mockResolvedValue({
          features: [
            { type: 'Feature', id: 'scene-a', properties: { provenance: [] } },
          ],
        }),
      });
      const service = createLogService(deps);
      await expect(
        service.recordStoryboardEdit({ ...baseInput, op: 'rename' }),
      ).rejects.toBe(err);
    });
  });
});
