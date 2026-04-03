/**
 * Log Service integration test.
 * Feature: 071-log-recording-service (E02, Phase 1)
 *
 * Exercises the full flow: record tool result → provenance appended →
 * dirty tracked → timeline assembled from provenance data.
 */

import { describe, it, expect, vi } from 'vitest';
import { createLogService } from '../../src/log/logService.js';
import type {
  ToolResultForLog,
  ExpandedToolResultFields,
  FeatureProvenance,
} from '../../src/log/types.js';

/**
 * In-memory GeoJSON store for integration testing.
 * Simulates stacService reading/writing provenance to disk files.
 */
function createInMemoryStore() {
  const data: Record<string, unknown>[] = [];

  return {
    features: data,

    /** Seed features into the store */
    seed(features: Array<{ id: string; properties: Record<string, unknown> }>) {
      data.length = 0;
      for (const f of features) {
        data.push({
          type: 'Feature',
          id: f.id,
          properties: { ...f.properties },
          geometry: null,
        });
      }
    },

    /** appendProvenance: find features by id, append entries */
    async appendProvenance(
      _storePath: string,
      _itemPath: string,
      provenance: FeatureProvenance[]
    ): Promise<number> {
      let count = 0;
      for (const prov of provenance) {
        const feature = data.find(
          (f) => (f as Record<string, unknown>).id === prov.feature_id
        );
        if (!feature) continue;
        const props = (feature as Record<string, unknown>)
          .properties as Record<string, unknown>;
        if (!Array.isArray(props.provenance)) {
          props.provenance = [];
        }
        (props.provenance as unknown[]).push(prov.entry);
        count++;
      }
      return count;
    },

    /** loadGeoJson: return the in-memory feature collection */
    async loadGeoJson(
      _storePath: string,
      _itemPath: string
    ): Promise<{ features: Array<Record<string, unknown>> }> {
      return { features: [...data] };
    },
  };
}

describe('Log Service Integration', () => {
  it('records tool result and assembles timeline round-trip', async () => {
    const store = createInMemoryStore();
    const markDirty = vi.fn();

    // Seed two input features
    store.seed([
      { id: 'track-alpha', properties: { name: 'Alpha' } },
      { id: 'track-bravo', properties: { name: 'Bravo' } },
    ]);

    const logService = createLogService({
      appendProvenance: store.appendProvenance.bind(store),
      loadGeoJson: store.loadGeoJson.bind(store),
      markDirty,
    });

    // Simulate a tool result with two input features
    const toolResult: ToolResultForLog = {
      success: true,
      tool_id: 'calculate-range',
      duration_ms: 342,
      result_type: 'addition/range-result',
      source_feature_ids: ['track-alpha', 'track-bravo'],
      features: {
        type: 'FeatureCollection',
        features: [],
      },
    };

    const expanded: ExpandedToolResultFields = {
      tool_version: '1.2.0',
      parameters: {
        units: { value: 'nautical_miles', default: true, tunable: true },
      },
    };

    // Record
    const result = await logService.recordToolResult(
      toolResult,
      expanded,
      '/store',
      'items/plot-001/plot-001.json'
    );

    expect(result.activity_id).toBeTruthy();
    expect(result.features_updated).toBe(2);
    expect(result.entries).toHaveLength(1);
    expect(markDirty).toHaveBeenCalledOnce();

    // Verify provenance was appended to input features
    const alpha = store.features.find((f) => (f as Record<string, unknown>).id === 'track-alpha');
    const alphaProps = (alpha as Record<string, unknown>).properties as Record<string, unknown>;
    expect(alphaProps.provenance).toHaveLength(1);
    const entry = (alphaProps.provenance as unknown[])[0] as Record<string, unknown>;
    expect(entry.activity_id).toBe(result.activity_id);
    expect(entry.was_generated_by).toEqual(
      expect.objectContaining({ tool: 'calculate-range', tool_version: '1.2.0' })
    );

    // Assemble timeline
    const timeline = await logService.getTimeline(
      '/store',
      'items/plot-001/plot-001.json'
    );

    // Both features share the same activityId, so dedup produces 1 entry
    expect(timeline).toHaveLength(1);
    expect(timeline[0].activity_id).toBe(result.activity_id);
    expect(timeline[0].used).toEqual(['track-alpha', 'track-bravo']);
    expect(timeline[0].execution_duration).toMatch(/^PT/);
  });

  it('handles multiple sequential tool executions', async () => {
    const store = createInMemoryStore();
    const markDirty = vi.fn();

    store.seed([
      { id: 'track-001', properties: {} },
    ]);

    const logService = createLogService({
      appendProvenance: store.appendProvenance.bind(store),
      loadGeoJson: store.loadGeoJson.bind(store),
      markDirty,
    });

    // First tool execution
    const result1 = await logService.recordToolResult(
      {
        success: true,
        tool_id: 'calculate-range',
        duration_ms: 100,
        source_feature_ids: ['track-001'],
        features: { type: 'FeatureCollection', features: [] },
      },
      { tool_version: '1.0.0' },
      '/store',
      'items/plot/plot.json'
    );

    // Second tool execution (same feature)
    const result2 = await logService.recordToolResult(
      {
        success: true,
        tool_id: 'calculate-bearing',
        duration_ms: 200,
        source_feature_ids: ['track-001'],
        features: { type: 'FeatureCollection', features: [] },
      },
      { tool_version: '2.0.0' },
      '/store',
      'items/plot/plot.json'
    );

    // Both IDs should be different
    expect(result1.activity_id).not.toBe(result2.activity_id);

    // Feature should have 2 provenance entries (append-only)
    const feature = store.features[0] as Record<string, unknown>;
    const props = feature.properties as Record<string, unknown>;
    expect(props.provenance).toHaveLength(2);

    // Timeline should show both, sorted by timestamp
    const timeline = await logService.getTimeline('/store', 'items/plot/plot.json');
    expect(timeline).toHaveLength(2);
    expect(timeline[0].was_generated_by.tool).toBe('calculate-range');
    expect(timeline[1].was_generated_by.tool).toBe('calculate-bearing');
    expect(markDirty).toHaveBeenCalledTimes(2);
  });

  it('skips recording for failed tool executions', async () => {
    const store = createInMemoryStore();
    const markDirty = vi.fn();

    store.seed([{ id: 'track-001', properties: {} }]);

    const logService = createLogService({
      appendProvenance: store.appendProvenance.bind(store),
      loadGeoJson: store.loadGeoJson.bind(store),
      markDirty,
    });

    const result = await logService.recordToolResult(
      {
        success: false,
        tool_id: 'calculate-range',
        duration_ms: 50,
        source_feature_ids: ['track-001'],
      },
      undefined,
      '/store',
      'items/plot/plot.json'
    );

    expect(result.activity_id).toBe('');
    expect(result.features_updated).toBe(0);
    expect(result.entries).toHaveLength(0);
    expect(markDirty).not.toHaveBeenCalled();

    // Feature should have no provenance
    const feature = store.features[0] as Record<string, unknown>;
    const props = feature.properties as Record<string, unknown>;
    expect(props.provenance).toBeUndefined();
  });

  it('reuses activityId from Python output features', async () => {
    const store = createInMemoryStore();
    const markDirty = vi.fn();

    store.seed([{ id: 'track-input', properties: {} }]);

    const pythonActivityId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    const logService = createLogService({
      appendProvenance: store.appendProvenance.bind(store),
      loadGeoJson: store.loadGeoJson.bind(store),
      markDirty,
    });

    const result = await logService.recordToolResult(
      {
        success: true,
        tool_id: 'calculate-range',
        duration_ms: 150,
        source_feature_ids: ['track-input'],
        features: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              id: 'output-1',
              properties: {
                provenance: [{ activity_id: pythonActivityId }],
              },
              geometry: null,
            },
          ],
        },
      },
      { tool_version: '1.0.0' },
      '/store',
      'items/plot/plot.json'
    );

    // Should reuse the Python-generated activityId
    expect(result.activity_id).toBe(pythonActivityId);

    // Input feature should have provenance with same activityId
    const timeline = await logService.getTimeline('/store', 'items/plot/plot.json');
    expect(timeline).toHaveLength(1);
    expect(timeline[0].activity_id).toBe(pythonActivityId);
  });
});
