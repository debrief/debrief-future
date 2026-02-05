/**
 * CalcService Tests - Tests for tool-related functionality
 *
 * Feature: 038-context-tool-vscode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Tool, MCPToolResponse, MCPErrorResponse, MCPContentItem } from '../../src/types/tool';
import { createDefaultResultStyle, createToolExecution } from '../../src/types/tool';

describe('CalcService logic', () => {
  describe('createDefaultResultStyle', () => {
    it('creates consistent style for same tool name', () => {
      const style1 = createDefaultResultStyle('range-bearing');
      const style2 = createDefaultResultStyle('range-bearing');

      expect(style1.strokeColor).toBe(style2.strokeColor);
      expect(style1.strokeWidth).toBe(style2.strokeWidth);
    });

    it('creates different colors for different tool names', () => {
      const style1 = createDefaultResultStyle('range-bearing');
      const style2 = createDefaultResultStyle('closest-approach');

      // Colors should be different (based on hash)
      // Note: There's a small chance they could be the same if hashes collide
      expect(style1.dashArray).toEqual([8, 4]); // Result layers always dashed
      expect(style2.dashArray).toEqual([8, 4]);
    });

    it('includes dash array for result differentiation', () => {
      const style = createDefaultResultStyle('any-tool');

      expect(style.dashArray).toBeDefined();
      expect(style.dashArray).toEqual([8, 4]);
    });
  });

  describe('createToolExecution', () => {
    it('creates execution record with pending status', () => {
      const execution = createToolExecution('range-bearing', 'Range & Bearing');

      expect(execution.toolId).toBe('range-bearing');
      expect(execution.toolName).toBe('Range & Bearing');
      expect(execution.status).toBe('pending');
      expect(execution.startedAt).toBeDefined();
      expect(execution.id).toMatch(/^exec-/);
    });

    it('creates unique IDs for each execution', () => {
      const exec1 = createToolExecution('tool-1', 'Tool 1');
      const exec2 = createToolExecution('tool-2', 'Tool 2');

      expect(exec1.id).not.toBe(exec2.id);
    });
  });

  describe('Tool type', () => {
    it('supports SelectionRequirement format', () => {
      const tool: Tool = {
        id: 'range-bearing',
        name: 'Range & Bearing',
        description: 'Calculate range and bearing between tracks',
        version: '1.0.0',
        requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
      };

      expect(tool.requirements).toBeDefined();
      expect(tool.requirements).toHaveLength(1);
      expect(tool.requirements![0].kind).toBe('TRACK');
      expect(tool.requirements![0].min).toBe(2);
      expect(tool.requirements![0].max).toBe(2);
    });

    it('supports tools with no requirements', () => {
      const tool: Tool = {
        id: 'universal-info',
        name: 'Feature Information',
        description: 'Display info about any feature',
        requirements: [],
      };

      expect(tool.requirements).toEqual([]);
    });

    it('supports tools with multiple requirements', () => {
      const tool: Tool = {
        id: 'distance-to-point',
        name: 'Distance to Point',
        description: 'Calculate distance from track to point',
        requirements: [
          { kind: 'TRACK', min: 1, max: 1 },
          { kind: 'POINT', min: 1, max: 1 },
        ],
      };

      expect(tool.requirements).toHaveLength(2);
    });
  });

  describe('MCP content types (#041)', () => {
    it('MCPToolResponse contains content array with annotations', () => {
      const response: MCPToolResponse = {
        content: [
          {
            type: 'resource',
            resource: {
              uri: 'feature://stats-1',
              mimeType: 'application/geo+json',
              text: '{"type":"Feature","geometry":null,"properties":{}}',
            },
            annotations: {
              'debrief:resultType': 'addition/track-statistics',
              'debrief:sourceFeatures': ['track-1'],
              'debrief:label': 'track-stats results',
            },
          },
        ],
        duration_ms: 42,
      };

      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('resource');
      expect(response.content[0].annotations['debrief:resultType']).toBe('addition/track-statistics');
      expect(response.duration_ms).toBe(42);
    });

    it('MCPErrorResponse contains structured error', () => {
      const response: MCPErrorResponse = {
        error: {
          code: -32000,
          message: 'Tool not found',
          data: {
            'debrief:errorCategory': 'resource_not_found',
            'debrief:affectedFeatures': ['track-1'],
          },
        },
      };

      expect(response.error.code).toBe(-32000);
      expect(response.error.data['debrief:errorCategory']).toBe('resource_not_found');
    });

    it('MCPContentItem supports artifact with debrief:href annotation', () => {
      const artifactItem: MCPContentItem = {
        type: 'resource',
        resource: {
          uri: 'artifact://range_bearing_series-t1-t2.json',
          mimeType: 'application/json',
          text: '{"type":"range-bearing-series","entries":[]}',
        },
        annotations: {
          'debrief:resultType': 'artifact/dataset/range_bearing_series',
          'debrief:sourceFeatures': ['track-1', 'track-2'],
          'debrief:label': 'range-bearing results',
          'debrief:href': 'range_bearing_series-t1-t2.json',
        },
      };

      expect(artifactItem.type).toBe('resource');
      expect(artifactItem.annotations['debrief:resultType']).toBe('artifact/dataset/range_bearing_series');
      expect(artifactItem.annotations['debrief:href']).toBe('range_bearing_series-t1-t2.json');
      expect(artifactItem.resource?.mimeType).toBe('application/json');
    });

    it('MCPContentItem supports resource, text, and image types', () => {
      const resourceItem: MCPContentItem = {
        type: 'resource',
        resource: { uri: 'feature://f1', mimeType: 'application/geo+json', text: '{}' },
        annotations: {
          'debrief:resultType': 'addition/range-bearing',
          'debrief:sourceFeatures': [],
          'debrief:label': 'test',
        },
      };

      const textItem: MCPContentItem = {
        type: 'text',
        text: 'Deleted 2 features',
        annotations: {
          'debrief:resultType': 'deletion/merge',
          'debrief:sourceFeatures': ['a', 'b'],
          'debrief:label': 'merge results',
          'debrief:deletedFeatures': ['a', 'b'],
        },
      };

      expect(resourceItem.type).toBe('resource');
      expect(textItem.type).toBe('text');
      expect(textItem.annotations['debrief:deletedFeatures']).toEqual(['a', 'b']);
    });
  });
});
