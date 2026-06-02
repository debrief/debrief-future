/**
 * T042: Test web-shell ToolResponse structure matches VS Code format.
 *
 * Validates that executeTool() returns responses in the standard MCP
 * ToolResponse envelope format, matching the structure used by the
 * Python MCP backend (debrief-calc).
 */

import { describe, it, expect } from 'vitest';
import type { IngressFeature } from '@debrief/schemas';
import { executeTool } from '../toolService';

/**
 * Create a minimal track feature for testing tool execution.
 */
function makeTrackFeature(id = 'track-001'): IngressFeature & { properties: Record<string, unknown> } {
  return {
    type: 'Feature' as const,
    id,
    geometry: {
      type: 'LineString',
      coordinates: [
        [-1.0, 50.0],
        [-1.1, 50.1],
      ],
    },
    properties: {
      kind: 'TRACK',
      platform_id: 'VESSEL-A',
      platform_name: 'Vessel Alpha',
      track_type: 'SURFACE',
      start_time: '2024-01-01T00:00:00Z',
      end_time: '2024-01-01T01:00:00Z',
      positions: [
        { time: '2024-01-01T00:00:00Z', coordinates: [-1.0, 50.0] },
        { time: '2024-01-01T01:00:00Z', coordinates: [-1.1, 50.1] },
      ],
      style: {
        line: { stroke: true, color: '#3388ff', weight: 3, opacity: 1.0 },
        point: {
          shape: 'circle',
          radius: 4,
          fill: true,
          fill_color: '#3388ff',
          fill_opacity: 0.8,
          stroke: true,
          color: '#ffffff',
          weight: 1,
          opacity: 1.0,
        },
      },
      default_position_style: {
        show_symbol: true,
        symbol: 'circle',
        show_label: false,
      },
    },
  };
}

describe('executeTool response structure (T042)', () => {
  describe('MCPToolResponse envelope', () => {
    it('returns an object with content array', () => {
      const feature = makeTrackFeature();
      const response = executeTool('set-track-color', [feature], { color: '#FF0000' });

      expect(response).toBeDefined();
      expect(response).toHaveProperty('content');
      expect(Array.isArray(response.content)).toBe(true);
    });

    it('content array has at least one item', () => {
      const feature = makeTrackFeature();
      const response = executeTool('set-track-color', [feature], { color: '#FF0000' });

      expect(response.content.length).toBeGreaterThanOrEqual(1);
    });

    it('includes duration_ms as a number', () => {
      const feature = makeTrackFeature();
      const response = executeTool('set-track-color', [feature], { color: '#FF0000' });

      expect(response).toHaveProperty('duration_ms');
      expect(typeof response.duration_ms).toBe('number');
      expect(response.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('MCPContentItem structure', () => {
    it('content item has type "resource"', () => {
      const feature = makeTrackFeature();
      const response = executeTool('set-track-color', [feature], { color: '#FF0000' });
      const item = response.content[0];

      expect(item.type).toBe('resource');
    });

    it('content item has resource with uri, mimeType, and text', () => {
      const feature = makeTrackFeature();
      const response = executeTool('set-track-color', [feature], { color: '#FF0000' });
      const item = response.content[0];

      expect(item.resource).toBeDefined();
      expect(item.resource!.uri).toBeTruthy();
      expect(item.resource!.uri).toContain('debrief://tool-result/set-track-color/');
      expect(item.resource!.mimeType).toBe('application/geo+json');
      expect(item.resource!.text).toBeTruthy();
    });

    it('resource text is valid JSON containing a FeatureCollection', () => {
      const feature = makeTrackFeature();
      const response = executeTool('set-track-color', [feature], { color: '#FF0000' });
      const item = response.content[0];

      const parsed = JSON.parse(item.resource!.text);
      expect(parsed.type).toBe('FeatureCollection');
      expect(Array.isArray(parsed.features)).toBe(true);
      expect(parsed.features.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DebriefAnnotations on content items', () => {
    it('content item has annotations object', () => {
      const feature = makeTrackFeature();
      const response = executeTool('set-track-color', [feature], { color: '#FF0000' });
      const item = response.content[0];

      expect(item.annotations).toBeDefined();
    });

    it('annotations include debrief:resultType', () => {
      const feature = makeTrackFeature();
      const response = executeTool('set-track-color', [feature], { color: '#FF0000' });
      const annotations = response.content[0].annotations;

      expect(annotations['debrief:resultType']).toBeTruthy();
      expect(typeof annotations['debrief:resultType']).toBe('string');
    });

    it('debrief:resultType matches the tool outputKind', () => {
      const feature = makeTrackFeature();
      const response = executeTool('set-track-color', [feature], { color: '#FF0000' });
      const annotations = response.content[0].annotations;

      // set-track-color outputKind is 'mutation/track/styled'
      expect(annotations['debrief:resultType']).toBe('mutation/track/styled');
    });

    it('annotations include debrief:sourceFeatures as string array', () => {
      const feature = makeTrackFeature('track-001');
      const response = executeTool('set-track-color', [feature], { color: '#FF0000' });
      const annotations = response.content[0].annotations;

      expect(annotations['debrief:sourceFeatures']).toBeDefined();
      expect(Array.isArray(annotations['debrief:sourceFeatures'])).toBe(true);
      expect(annotations['debrief:sourceFeatures']).toContain('track-001');
    });

    it('annotations include debrief:label as string', () => {
      const feature = makeTrackFeature();
      const response = executeTool('set-track-color', [feature], { color: '#FF0000' });
      const annotations = response.content[0].annotations;

      expect(annotations['debrief:label']).toBeTruthy();
      expect(typeof annotations['debrief:label']).toBe('string');
    });
  });

  describe('response format consistency across tools', () => {
    it('apply-symbol-style returns same envelope structure', () => {
      const feature = makeTrackFeature();
      const response = executeTool('apply-symbol-style', [feature], { symbol: 'square' });

      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('resource');
      expect(response.content[0].resource!.mimeType).toBe('application/geo+json');
      expect(response.content[0].annotations['debrief:resultType']).toBe('mutation/track/styled');
      expect(response.content[0].annotations['debrief:sourceFeatures']).toContain('track-001');
      expect(response.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('label-interval returns same envelope structure', () => {
      const feature = makeTrackFeature();
      const response = executeTool('label-interval', [feature], { interval: 'PT5M' });

      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('resource');
      expect(response.content[0].resource!.mimeType).toBe('application/geo+json');
      expect(response.content[0].annotations['debrief:resultType']).toBe('mutation/track/styled');
      expect(response.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('symbol-interval returns same envelope structure', () => {
      const feature = makeTrackFeature();
      const response = executeTool('symbol-interval', [feature], { interval: 'PT10M' });

      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('resource');
      expect(response.content[0].resource!.mimeType).toBe('application/geo+json');
      expect(response.content[0].annotations['debrief:resultType']).toBe('mutation/track/styled');
      expect(response.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('throws on unknown tool ID', () => {
      const feature = makeTrackFeature();
      expect(() => executeTool('unknown-tool', [feature], {})).toThrow('Unknown tool: unknown-tool');
    });

    it('former Python-only analysis tools are now executable in the web-shell (no "Unknown tool")', () => {
      // track-stats / range-bearing / area-summary gained TypeScript
      // implementations and are now registered in toolService, so executeTool
      // no longer rejects them as unknown. (The empty-params call may still
      // throw a tool-specific validation error — we only assert it is NOT the
      // "Unknown tool" rejection.)
      const feature = makeTrackFeature();
      expect(() => executeTool('track-stats', [feature], {})).not.toThrow('Unknown tool');
    });

    it('propagates tool execution errors', () => {
      const feature = makeTrackFeature();
      // set-track-color requires a color param
      expect(() => executeTool('set-track-color', [feature], {})).toThrow(
        'color parameter is required',
      );
    });

    it('propagates error for non-track features', () => {
      const nonTrack = makeTrackFeature();
      nonTrack.properties.kind = 'ZONE';
      expect(() => executeTool('set-track-color', [nonTrack], { color: '#FF0000' })).toThrow(
        'No track features found in input',
      );
    });
  });

  describe('source feature provenance', () => {
    it('tracks multiple source feature IDs', () => {
      const feature1 = makeTrackFeature('track-001');
      const feature2 = makeTrackFeature('track-002');
      feature2.properties.platform_id = 'VESSEL-B';

      const response = executeTool('set-track-color', [feature1, feature2], { color: '#FF0000' });
      const sourceFeatures = response.content[0].annotations['debrief:sourceFeatures'];

      expect(sourceFeatures).toContain('track-001');
      expect(sourceFeatures).toContain('track-002');
      expect(sourceFeatures).toHaveLength(2);
    });

    it('modified features appear in the response GeoJSON', () => {
      const feature = makeTrackFeature('track-001');
      const response = executeTool('set-track-color', [feature], { color: '#00FF00' });

      const parsed = JSON.parse(response.content[0].resource!.text);
      expect(parsed.features[0].properties.style.line.color).toBe('#00FF00');
    });
  });
});
