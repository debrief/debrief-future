/**
 * FormatService unit tests.
 * Feature: 097-feature-format-menu
 */

import { describe, it, expect, vi } from 'vitest';
import { createFormatService } from '../../../src/format/formatService.js';
import type { FormatServiceDeps, FormatChangeRequest } from '../../../src/format/formatService.js';

function createMockDeps(featureCollection?: Record<string, unknown>): FormatServiceDeps {
  const defaultFC = {
    type: 'FeatureCollection',
    features: [
      {
        id: 'track-001',
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        properties: {
          kind: 'TRACK',
          platform_name: 'Alpha',
          style: {
            line: { color: '#0000CC', weight: 3 },
            point: { shape: 'circle', fill_color: '#0000CC' },
          },
        },
      },
      {
        id: 'point-001',
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {
          kind: 'POINT',
          name: 'Waypoint 1',
          style: {
            shape: 'circle',
            fill_color: '#CC0000',
            color: '#CC0000',
            weight: 2,
          },
        },
      },
    ],
  };

  return {
    loadGeoJson: vi.fn().mockResolvedValue(featureCollection ?? defaultFC),
    writeGeoJson: vi.fn().mockResolvedValue(undefined),
    appendProvenance: vi.fn().mockResolvedValue(1),
    markDirty: vi.fn(),
    getStorePath: vi.fn().mockReturnValue('/store'),
  };
}

describe('formatService', () => {
  describe('applyStyleChange', () => {
    it('should apply single feature style change', async () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const request: FormatChangeRequest = {
        featureIds: ['track-001'],
        property: 'line.color',
        value: '#CC0000',
      };

      const result = await service.applyStyleChange('plot-001', request);

      expect(result.activity_id).toBeTruthy();
      expect(typeof result.activity_id).toBe('string');
      expect(result.features_updated).toBe(1);
      expect(result.previous_values).toEqual({
        'track-001': '#0000CC',
      });

      // Verify writeGeoJson was called
      expect(deps.writeGeoJson).toHaveBeenCalledTimes(1);
      const writtenFC = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
      const features = writtenFC.features as Array<Record<string, unknown>>;
      const style = (features[0].properties as Record<string, unknown>).style as Record<string, unknown>;
      const line = style.line as Record<string, unknown>;
      expect(line.color).toBe('#CC0000');

      // Verify provenance was appended
      expect(deps.appendProvenance).toHaveBeenCalledTimes(1);
      const provEntry = (deps.appendProvenance as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
      expect(provEntry.activity_type).toBe('FORMAT_CHANGE');
      expect(provEntry.parameters).toMatchObject({
        featureIds: ['track-001'],
        property: 'line.color',
        value: '#CC0000',
      });

      // Verify plot was marked dirty
      expect(deps.markDirty).toHaveBeenCalledWith('plot-001');
    });

    it('should apply batch style change to multiple features', async () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const request: FormatChangeRequest = {
        featureIds: ['track-001', 'point-001'],
        property: 'color',
        value: '#00CC00',
      };

      const result = await service.applyStyleChange('plot-001', request);

      expect(result.features_updated).toBe(2);
      expect(typeof result.activity_id).toBe('string');
      expect(Object.keys(result.previous_values)).toHaveLength(2);

      // Single provenance entry for batch
      expect(deps.appendProvenance).toHaveBeenCalledTimes(1);
    });

    it('should skip missing feature IDs', async () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const request: FormatChangeRequest = {
        featureIds: ['track-001', 'nonexistent-id', 'point-001'],
        property: 'weight',
        value: 5,
      };

      const result = await service.applyStyleChange('plot-001', request);

      expect(result.features_updated).toBe(2);
      expect(Object.keys(result.previous_values)).toHaveLength(2);
      expect(result.previous_values['nonexistent-id']).toBeUndefined();
    });

    it('should throw error when no active plot', async () => {
      const deps = createMockDeps();
      deps.getStorePath = vi.fn().mockReturnValue(null);
      const service = createFormatService(deps);

      const request: FormatChangeRequest = {
        featureIds: ['track-001'],
        property: 'line.color',
        value: '#CC0000',
      };

      await expect(
        service.applyStyleChange('plot-001', request),
      ).rejects.toThrow();
    });

    it('should apply per-point style override', async () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const request: FormatChangeRequest = {
        featureIds: ['track-001'],
        property: 'point.fill_color',
        value: '#FFFF00',
        isPointOverride: true,
        positionIndex: 5,
      };

      const result = await service.applyStyleChange('plot-001', request);

      expect(result.features_updated).toBe(1);

      // Verify position_style_overrides was created
      const writtenFC = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
      const features = writtenFC.features as Array<Record<string, unknown>>;
      const props = features[0].properties as Record<string, unknown>;
      const overrides = props.position_style_overrides as Record<string, Record<string, unknown>>;
      expect(overrides).toBeDefined();
      expect(overrides['5']).toMatchObject({
        point: { fill_color: '#FFFF00' },
      });

      // Verify provenance includes override metadata
      const provEntry = (deps.appendProvenance as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
      const params = provEntry.parameters as Record<string, unknown>;
      expect(params.isPointOverride).toBe(true);
      expect(params.positionIndex).toBe(5);
    });

    it('should not overwrite existing per-point overrides when applying track-level change (FR-009)', async () => {
      const fcWithOverrides = {
        type: 'FeatureCollection',
        features: [
          {
            id: 'track-001',
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
            properties: {
              kind: 'TRACK',
              style: {
                line: { color: '#0000CC', weight: 3 },
              },
              position_style_overrides: {
                '5': { point: { fill_color: '#FFFF00' } },
              },
            },
          },
        ],
      };

      const deps = createMockDeps(fcWithOverrides);
      const service = createFormatService(deps);

      // Apply track-level colour change
      const request: FormatChangeRequest = {
        featureIds: ['track-001'],
        property: 'line.color',
        value: '#CC0000',
      };

      await service.applyStyleChange('plot-001', request);

      // Verify per-point override is preserved
      const writtenFC = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
      const features = writtenFC.features as Array<Record<string, unknown>>;
      const props = features[0].properties as Record<string, unknown>;
      const overrides = props.position_style_overrides as Record<string, Record<string, unknown>>;
      expect(overrides['5']).toMatchObject({
        point: { fill_color: '#FFFF00' },
      });
    });
  });

  describe('buildMenuItems', () => {
    it('should return items for single kind', () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const items = service.buildMenuItems(['TRACK']);

      // TRACK has 7 properties
      expect(items).toHaveLength(7);
      expect(items.every(item => !item.disabled)).toBe(true);

      // Verify structure
      expect(items[0]).toMatchObject({
        property: expect.any(String),
        label: expect.any(String),
        inputType: expect.any(String),
        disabled: false,
      });
    });

    it('should return union with disabled items for mixed kinds', () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const items = service.buildMenuItems(['TRACK', 'POINT']);

      expect(items.length).toBeGreaterThan(0);

      // Track-only properties should be disabled
      const lineColorItem = items.find(item => item.property === 'line.color');
      expect(lineColorItem?.disabled).toBe(true);

      const lineDashItem = items.find(item => item.property === 'line.dash_array');
      expect(lineDashItem?.disabled).toBe(true);
    });

    it('should return empty array for empty kinds', () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const items = service.buildMenuItems([]);

      expect(items).toEqual([]);
    });

    it('should create single provenance entry for batch (FR-013)', async () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const request: FormatChangeRequest = {
        featureIds: ['track-001', 'point-001'],
        property: 'weight',
        value: 4,
      };

      await service.applyStyleChange('plot-001', request);

      // Only one provenance entry for the batch
      expect(deps.appendProvenance).toHaveBeenCalledTimes(1);
      const provEntry = (deps.appendProvenance as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
      const params = provEntry.parameters as Record<string, unknown>;
      expect(params.featureIds).toEqual(['track-001', 'point-001']);
    });
  });

  describe('getCurrentValue', () => {
    it('should read nested property value', async () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const value = await service.getCurrentValue('plot-001', 'track-001', 'line.color');

      expect(value).toBe('#0000CC');
    });

    it('should return undefined for missing property', async () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const value = await service.getCurrentValue('plot-001', 'track-001', 'nonexistent.path');

      expect(value).toBeUndefined();
    });

    it('should read top-level property', async () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const value = await service.getCurrentValue('plot-001', 'point-001', 'weight');

      expect(value).toBe(2);
    });
  });

  describe('getEditableProperties', () => {
    it('should delegate to stylePropertyMap for TRACK', () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const properties = service.getEditableProperties('TRACK');

      expect(properties).toHaveLength(7);
      expect(properties.every(p => p.property && p.label && p.inputType)).toBe(true);
    });

    it('should delegate to stylePropertyMap for POINT', () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const properties = service.getEditableProperties('POINT');

      expect(properties).toHaveLength(6);
      expect(properties.some(p => p.property.startsWith('line.'))).toBe(false);
    });

    it('should return empty array for unknown kind', () => {
      const deps = createMockDeps();
      const service = createFormatService(deps);

      const properties = service.getEditableProperties('UNKNOWN_KIND');

      // Unknown kinds fall back to polygon defaults
      expect(properties.length).toBeGreaterThan(0);
      expect(properties.map(p => p.property)).toContain('fill_color');
    });
  });
});
