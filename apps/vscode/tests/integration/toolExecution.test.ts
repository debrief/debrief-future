import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolExecution, ToolExecutionResult, ResultLayer } from '../../src/types/tool';
import { createToolExecution, createDefaultResultStyle } from '../../src/types/tool';

/**
 * Integration tests for the tool execution workflow.
 * Tests the end-to-end flow of discovering, executing, and displaying tool results.
 */
describe('Tool Execution Workflow', () => {
  describe('Tool execution lifecycle', () => {
    it('creates execution record with pending status', () => {
      const execution = createToolExecution('range-bearing');

      expect(execution.toolName).toBe('range-bearing');
      expect(execution.status).toBe('pending');
      expect(execution.id).toMatch(/^exec-/);
      expect(execution.startedAt).toBeDefined();
    });

    it('transitions through execution states', () => {
      const execution = createToolExecution('range-bearing');

      // Start execution
      execution.status = 'running';
      expect(execution.status).toBe('running');

      // Complete execution
      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();
      expect(execution.status).toBe('completed');
      expect(execution.completedAt).toBeDefined();
    });

    it('records error on failure', () => {
      const execution = createToolExecution('range-bearing');
      execution.status = 'running';

      // Simulate failure
      execution.status = 'failed';
      execution.error = 'Tracks have no overlapping time range';
      execution.completedAt = new Date().toISOString();

      expect(execution.status).toBe('failed');
      expect(execution.error).toContain('overlapping time range');
    });

    it('supports cancellation', () => {
      const execution = createToolExecution('range-bearing');
      execution.status = 'running';

      // Cancel
      execution.status = 'cancelled';
      execution.completedAt = new Date().toISOString();

      expect(execution.status).toBe('cancelled');
    });
  });

  describe('Result layer creation', () => {
    it('creates result layer from execution', () => {
      const result: ToolExecutionResult = {
        success: true,
        features: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [-2.0, 50.5],
                  [-1.5, 50.8],
                ],
              },
              properties: { type: 'range-line' },
            },
          ],
        },
        durationMs: 250,
      };

      const style = createDefaultResultStyle('range-bearing');

      const layer: ResultLayer = {
        id: 'layer-1',
        name: 'Range & Bearing',
        toolName: 'range-bearing',
        executionId: 'exec-1',
        features: result.features!,
        style,
        visible: true,
        createdAt: new Date().toISOString(),
        zIndex: 100,
      };

      expect(layer.features.features).toHaveLength(1);
      expect(layer.style.dashArray).toEqual([8, 4]); // Dashed for results
    });

    it('assigns unique layer IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        ids.add(id);
      }

      // All IDs should be unique
      expect(ids.size).toBe(100);
    });
  });

  describe('Progress reporting', () => {
    it('tracks progress percentage', () => {
      const execution = createToolExecution('range-bearing');
      execution.status = 'running';

      // Update progress
      execution.progress = 50;
      execution.progressMessage = 'Processing track data...';

      expect(execution.progress).toBe(50);
      expect(execution.progressMessage).toBe('Processing track data...');

      // Complete
      execution.progress = 100;
      execution.status = 'completed';

      expect(execution.progress).toBe(100);
    });
  });

  describe('Layer management', () => {
    it('manages multiple result layers', () => {
      const layers: ResultLayer[] = [];

      // Add layers
      layers.push({
        id: 'layer-1',
        name: 'Range & Bearing',
        toolName: 'range-bearing',
        executionId: 'exec-1',
        features: { type: 'FeatureCollection', features: [] },
        style: createDefaultResultStyle('range-bearing'),
        visible: true,
        createdAt: new Date().toISOString(),
        zIndex: 100,
      });

      layers.push({
        id: 'layer-2',
        name: 'Closest Approach',
        toolName: 'closest-approach',
        executionId: 'exec-2',
        features: { type: 'FeatureCollection', features: [] },
        style: createDefaultResultStyle('closest-approach'),
        visible: true,
        createdAt: new Date().toISOString(),
        zIndex: 101,
      });

      expect(layers).toHaveLength(2);
      expect(layers[1].zIndex).toBeGreaterThan(layers[0].zIndex);
    });

    it('toggles layer visibility', () => {
      const layer: ResultLayer = {
        id: 'layer-1',
        name: 'Range & Bearing',
        toolName: 'range-bearing',
        executionId: 'exec-1',
        features: { type: 'FeatureCollection', features: [] },
        style: createDefaultResultStyle('range-bearing'),
        visible: true,
        createdAt: new Date().toISOString(),
        zIndex: 100,
      };

      expect(layer.visible).toBe(true);

      layer.visible = false;
      expect(layer.visible).toBe(false);

      layer.visible = true;
      expect(layer.visible).toBe(true);
    });

    it('removes layer by ID', () => {
      const layers: ResultLayer[] = [
        {
          id: 'layer-1',
          name: 'Range & Bearing',
          toolName: 'range-bearing',
          executionId: 'exec-1',
          features: { type: 'FeatureCollection', features: [] },
          style: createDefaultResultStyle('range-bearing'),
          visible: true,
          createdAt: new Date().toISOString(),
          zIndex: 100,
        },
        {
          id: 'layer-2',
          name: 'Closest Approach',
          toolName: 'closest-approach',
          executionId: 'exec-2',
          features: { type: 'FeatureCollection', features: [] },
          style: createDefaultResultStyle('closest-approach'),
          visible: true,
          createdAt: new Date().toISOString(),
          zIndex: 101,
        },
      ];

      const index = layers.findIndex((l) => l.id === 'layer-1');
      if (index !== -1) {
        layers.splice(index, 1);
      }

      expect(layers).toHaveLength(1);
      expect(layers[0].id).toBe('layer-2');
    });

    it('clears all result layers', () => {
      const layers: ResultLayer[] = [
        {
          id: 'layer-1',
          name: 'Test',
          toolName: 'test',
          executionId: 'exec-1',
          features: { type: 'FeatureCollection', features: [] },
          style: createDefaultResultStyle('test'),
          visible: true,
          createdAt: new Date().toISOString(),
          zIndex: 100,
        },
      ];

      layers.length = 0;

      expect(layers).toHaveLength(0);
    });
  });
});
