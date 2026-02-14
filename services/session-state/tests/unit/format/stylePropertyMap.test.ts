/**
 * Style property map unit tests.
 * Feature: 097-feature-format-menu
 */

import { describe, it, expect } from 'vitest';
import {
  getEditableProperties,
  hasEditableProperties,
  STYLE_PROPERTY_MAP,
} from '../../../src/format/stylePropertyMap.js';

/** All known FeatureKindEnum values */
const ALL_KINDS = [
  'TRACK', 'POINT', 'NARRATIVE', 'CIRCLE', 'RECTANGLE',
  'LINE', 'TEXT', 'VECTOR', 'SYSTEM', 'POLY',
  'MULTI_POINT', 'MULTI_POLYGON', 'POSITION',
  'TIMETEXT', 'PERIODTEXT',
] as const;

describe('stylePropertyMap', () => {
  describe('TRACK kind', () => {
    it('returns 7 properties with correct IDs', () => {
      const properties = getEditableProperties('TRACK');
      expect(properties).toHaveLength(7);

      const ids = properties.map((p) => p.id);
      expect(ids).toEqual([
        'line.color',
        'line.weight',
        'line.opacity',
        'line.dash_array',
        'point.shape',
        'point.fill_color',
        'point.radius',
      ]);
    });

    it('has correct categories and value types', () => {
      const properties = getEditableProperties('TRACK');

      expect(properties[0]).toMatchObject({
        id: 'line.color',
        category: 'line',
        valueType: 'color',
      });

      expect(properties[4]).toMatchObject({
        id: 'point.shape',
        category: 'point',
        valueType: 'shape',
      });
    });
  });

  describe('POINT kind', () => {
    it('returns 6 properties with correct IDs', () => {
      const properties = getEditableProperties('POINT');
      expect(properties).toHaveLength(6);

      const ids = properties.map((p) => p.id);
      expect(ids).toEqual([
        'shape',
        'fill_color',
        'fill_opacity',
        'color',
        'weight',
        'radius',
      ]);
    });
  });

  describe('Polygon-like kinds', () => {
    const polygonKinds = ['CIRCLE', 'RECTANGLE', 'POLY', 'MULTI_POLYGON'] as const;

    polygonKinds.forEach((kind) => {
      it(`${kind} returns 6 properties with correct IDs`, () => {
        const properties = getEditableProperties(kind);
        expect(properties).toHaveLength(6);

        const ids = properties.map((p) => p.id);
        expect(ids).toEqual([
          'fill_color',
          'fill_opacity',
          'color',
          'weight',
          'opacity',
          'dash_array',
        ]);
      });
    });
  });

  describe('Line-like kinds', () => {
    const lineKinds = ['LINE', 'MULTI_POINT'] as const;

    lineKinds.forEach((kind) => {
      it(`${kind} returns 4 properties with correct IDs`, () => {
        const properties = getEditableProperties(kind);
        expect(properties).toHaveLength(4);

        const ids = properties.map((p) => p.id);
        expect(ids).toEqual(['color', 'weight', 'opacity', 'dash_array']);
      });
    });
  });

  describe('VECTOR kind', () => {
    it('returns 2 properties with correct IDs', () => {
      const properties = getEditableProperties('VECTOR');
      expect(properties).toHaveLength(2);

      const ids = properties.map((p) => p.id);
      expect(ids).toEqual(['color', 'weight']);
    });
  });

  describe('Non-editable kinds', () => {
    const nonEditableKinds = ['NARRATIVE', 'TEXT', 'SYSTEM'] as const;

    nonEditableKinds.forEach((kind) => {
      it(`${kind} returns empty array`, () => {
        const properties = getEditableProperties(kind);
        expect(properties).toEqual([]);
      });
    });
  });

  describe('hasEditableProperties', () => {
    it('returns true for TRACK', () => {
      expect(hasEditableProperties('TRACK')).toBe(true);
    });

    it('returns false for SYSTEM', () => {
      expect(hasEditableProperties('SYSTEM')).toBe(false);
    });

    it('returns true for POINT', () => {
      expect(hasEditableProperties('POINT')).toBe(true);
    });

    it('returns false for NARRATIVE', () => {
      expect(hasEditableProperties('NARRATIVE')).toBe(false);
    });

    it('returns false for TEXT', () => {
      expect(hasEditableProperties('TEXT')).toBe(false);
    });
  });

  describe('Unknown kind', () => {
    it('returns polygon defaults for unknown kind', () => {
      const properties = getEditableProperties('UNKNOWN_KIND');
      expect(properties.length).toBeGreaterThan(0);
      const ids = properties.map(p => p.id);
      expect(ids).toContain('fill_color');
      expect(ids).toContain('color');
    });

    it('returns mapped base kind properties for dynamic kinds', () => {
      const dynamicRect = getEditableProperties('DYNAMIC_RECT');
      const rectangle = getEditableProperties('RECTANGLE');
      expect(dynamicRect).toEqual(rectangle);

      const dynamicCircle = getEditableProperties('DYNAMIC_CIRCLE');
      const circle = getEditableProperties('CIRCLE');
      expect(dynamicCircle).toEqual(circle);
    });

    it('does not throw for unknown kind', () => {
      expect(() => getEditableProperties('INVALID')).not.toThrow();
    });
  });

  describe('Coverage of all FeatureKindEnum values', () => {
    it('has an entry for every FeatureKindEnum value', () => {
      for (const kind of ALL_KINDS) {
        // STYLE_PROPERTY_MAP is a ReadonlyMap — use .has()
        expect(STYLE_PROPERTY_MAP.has(kind)).toBe(true);
      }
    });

    it('only contains valid FeatureKindEnum values as keys', () => {
      const validKinds = new Set(ALL_KINDS);
      for (const key of STYLE_PROPERTY_MAP.keys()) {
        expect(validKinds.has(key as typeof ALL_KINDS[number])).toBe(true);
      }
    });
  });

  describe('Property ID format validation', () => {
    it('all property IDs use valid dot-path format', () => {
      const validIdPattern = /^[a-zA-Z0-9_.]+$/;

      for (const [, properties] of STYLE_PROPERTY_MAP) {
        for (const property of properties) {
          expect(property.id).toMatch(validIdPattern);
        }
      }
    });

    it('all property IDs are non-empty strings', () => {
      for (const [, properties] of STYLE_PROPERTY_MAP) {
        for (const property of properties) {
          expect(property.id).toBeTruthy();
          expect(typeof property.id).toBe('string');
          expect(property.id.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Property descriptors structure', () => {
    it('all properties have required fields', () => {
      for (const [, properties] of STYLE_PROPERTY_MAP) {
        for (const property of properties) {
          expect(property).toHaveProperty('id');
          expect(property).toHaveProperty('label');
          expect(property).toHaveProperty('category');
          expect(property).toHaveProperty('valueType');
        }
      }
    });

    it('all categories are valid', () => {
      const validCategories = new Set(['line', 'fill', 'point', 'stroke', 'visibility']);

      for (const [, properties] of STYLE_PROPERTY_MAP) {
        for (const property of properties) {
          expect(validCategories.has(property.category)).toBe(true);
        }
      }
    });

    it('all valueTypes are valid', () => {
      const validValueTypes = new Set(['color', 'number', 'shape', 'dashPattern', 'boolean']);

      for (const [, properties] of STYLE_PROPERTY_MAP) {
        for (const property of properties) {
          expect(validValueTypes.has(property.valueType)).toBe(true);
        }
      }
    });
  });
});
