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
          (f) => (f as Record<string, unknown>).id === prov.featureId
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
      toolId: 'calculate-range',
      durationMs: 342,
      resultType: 'addition/range-result',
      sourceFeatureIds: ['track-alpha', 'track-bravo'],
      features: {
        type: 'FeatureCollection',
        features: [],
      },
    };

    const expanded: ExpandedToolResultFields = {
      toolVersion: '1.2.0',
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

    expect(result.activityId).toBeTruthy();
    expect(result.featuresUpdated).toBe(2);
    expect(result.entries).toHaveLength(1);
    expect(markDirty).toHaveBeenCalledOnce();

    // Verify provenance was appended to input features
    const alpha = store.features.find((f) => (f as Record<string, unknown>).id === 'track-alpha');
    const alphaProps = (alpha as Record<string, unknown>).properties as Record<string, unknown>;
    expect(alphaProps.provenance).toHaveLength(1);
    const entry = (alphaProps.provenance as unknown[])[0] as Record<string, unknown>;
    expect(entry.activityId).toBe(result.activityId);
    expect(entry.wasGeneratedBy).toEqual(
      expect.objectContaining({ tool: 'calculate-range', toolVersion: '1.2.0' })
    );

    // Assemble timeline
    const timeline = await logService.getTimeline(
      '/store',
      'items/plot-001/plot-001.json'
    );

    // Both features share the same activityId, so dedup produces 1 entry
    expect(timeline).toHaveLength(1);
    expect(timeline[0].activityId).toBe(result.activityId);
    expect(timeline[0].used).toEqual(['track-alpha', 'track-bravo']);
    expect(timeline[0].executionDuration).toMatch(/^PT/);
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
        toolId: 'calculate-range',
        durationMs: 100,
        sourceFeatureIds: ['track-001'],
        features: { type: 'FeatureCollection', features: [] },
      },
      { toolVersion: '1.0.0' },
      '/store',
      'items/plot/plot.json'
    );

    // Second tool execution (same feature)
    const result2 = await logService.recordToolResult(
      {
        success: true,
        toolId: 'calculate-bearing',
        durationMs: 200,
        sourceFeatureIds: ['track-001'],
        features: { type: 'FeatureCollection', features: [] },
      },
      { toolVersion: '2.0.0' },
      '/store',
      'items/plot/plot.json'
    );

    // Both IDs should be different
    expect(result1.activityId).not.toBe(result2.activityId);

    // Feature should have 2 provenance entries (append-only)
    const feature = store.features[0] as Record<string, unknown>;
    const props = feature.properties as Record<string, unknown>;
    expect(props.provenance).toHaveLength(2);

    // Timeline should show both, sorted by timestamp
    const timeline = await logService.getTimeline('/store', 'items/plot/plot.json');
    expect(timeline).toHaveLength(2);
    expect(timeline[0].wasGeneratedBy.tool).toBe('calculate-range');
    expect(timeline[1].wasGeneratedBy.tool).toBe('calculate-bearing');
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
        toolId: 'calculate-range',
        durationMs: 50,
        sourceFeatureIds: ['track-001'],
      },
      undefined,
      '/store',
      'items/plot/plot.json'
    );

    expect(result.activityId).toBe('');
    expect(result.featuresUpdated).toBe(0);
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
        toolId: 'calculate-range',
        durationMs: 150,
        sourceFeatureIds: ['track-input'],
        features: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              id: 'output-1',
              properties: {
                provenance: [{ activityId: pythonActivityId }],
              },
              geometry: null,
            },
          ],
        },
      },
      { toolVersion: '1.0.0' },
      '/store',
      'items/plot/plot.json'
    );

    // Should reuse the Python-generated activityId
    expect(result.activityId).toBe(pythonActivityId);

    // Input feature should have provenance with same activityId
    const timeline = await logService.getTimeline('/store', 'items/plot/plot.json');
    expect(timeline).toHaveLength(1);
    expect(timeline[0].activityId).toBe(pythonActivityId);
  });
});
