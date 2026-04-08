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
});
