/**
 * @file stylePropertyMap.ts
 * @description Maps feature kind values to editable style properties.
 * This is a components-level copy of the static mapping data so FormatMenu
 * can resolve featureKinds → StylePropertyDescriptor[] without depending
 * on the session-state service.
 */

import type { StylePropertyDescriptor } from './formatMenuItems';

/**
 * Internal map of feature kinds to their editable style properties.
 */
const PROPERTY_MAP: ReadonlyMap<string, readonly StylePropertyDescriptor[]> = new Map([
  ['TRACK', [
    { id: 'line.color', label: 'format.line.color', category: 'line', valueType: 'color' },
    { id: 'line.weight', label: 'format.line.weight', category: 'line', valueType: 'number' },
    { id: 'line.opacity', label: 'format.line.opacity', category: 'line', valueType: 'number' },
    { id: 'line.dash_array', label: 'format.line.dashArray', category: 'line', valueType: 'dashPattern' },
    { id: 'point.shape', label: 'format.point.shape', category: 'point', valueType: 'shape' },
    { id: 'point.fill_color', label: 'format.point.fillColor', category: 'point', valueType: 'color' },
    { id: 'point.radius', label: 'format.point.radius', category: 'point', valueType: 'number' },
  ]],

  ['POINT', [
    { id: 'shape', label: 'format.point.shape', category: 'point', valueType: 'shape' },
    { id: 'fill_color', label: 'format.point.fillColor', category: 'fill', valueType: 'color' },
    { id: 'fill_opacity', label: 'format.fill.opacity', category: 'fill', valueType: 'number' },
    { id: 'color', label: 'format.stroke.color', category: 'stroke', valueType: 'color' },
    { id: 'weight', label: 'format.stroke.weight', category: 'stroke', valueType: 'number' },
    { id: 'radius', label: 'format.point.radius', category: 'point', valueType: 'number' },
  ]],

  ['CIRCLE', [
    { id: 'fill_color', label: 'format.fill.color', category: 'fill', valueType: 'color' },
    { id: 'fill_opacity', label: 'format.fill.opacity', category: 'fill', valueType: 'number' },
    { id: 'color', label: 'format.stroke.color', category: 'stroke', valueType: 'color' },
    { id: 'weight', label: 'format.stroke.weight', category: 'stroke', valueType: 'number' },
    { id: 'opacity', label: 'format.stroke.opacity', category: 'stroke', valueType: 'number' },
    { id: 'dash_array', label: 'format.stroke.dashArray', category: 'stroke', valueType: 'dashPattern' },
  ]],

  ['RECTANGLE', [
    { id: 'fill_color', label: 'format.fill.color', category: 'fill', valueType: 'color' },
    { id: 'fill_opacity', label: 'format.fill.opacity', category: 'fill', valueType: 'number' },
    { id: 'color', label: 'format.stroke.color', category: 'stroke', valueType: 'color' },
    { id: 'weight', label: 'format.stroke.weight', category: 'stroke', valueType: 'number' },
    { id: 'opacity', label: 'format.stroke.opacity', category: 'stroke', valueType: 'number' },
    { id: 'dash_array', label: 'format.stroke.dashArray', category: 'stroke', valueType: 'dashPattern' },
  ]],

  ['POLY', [
    { id: 'fill_color', label: 'format.fill.color', category: 'fill', valueType: 'color' },
    { id: 'fill_opacity', label: 'format.fill.opacity', category: 'fill', valueType: 'number' },
    { id: 'color', label: 'format.stroke.color', category: 'stroke', valueType: 'color' },
    { id: 'weight', label: 'format.stroke.weight', category: 'stroke', valueType: 'number' },
    { id: 'opacity', label: 'format.stroke.opacity', category: 'stroke', valueType: 'number' },
    { id: 'dash_array', label: 'format.stroke.dashArray', category: 'stroke', valueType: 'dashPattern' },
  ]],

  ['MULTI_POLYGON', [
    { id: 'fill_color', label: 'format.fill.color', category: 'fill', valueType: 'color' },
    { id: 'fill_opacity', label: 'format.fill.opacity', category: 'fill', valueType: 'number' },
    { id: 'color', label: 'format.stroke.color', category: 'stroke', valueType: 'color' },
    { id: 'weight', label: 'format.stroke.weight', category: 'stroke', valueType: 'number' },
    { id: 'opacity', label: 'format.stroke.opacity', category: 'stroke', valueType: 'number' },
    { id: 'dash_array', label: 'format.stroke.dashArray', category: 'stroke', valueType: 'dashPattern' },
  ]],

  ['LINE', [
    { id: 'color', label: 'format.line.color', category: 'line', valueType: 'color' },
    { id: 'weight', label: 'format.line.weight', category: 'line', valueType: 'number' },
    { id: 'opacity', label: 'format.line.opacity', category: 'line', valueType: 'number' },
    { id: 'dash_array', label: 'format.line.dashArray', category: 'line', valueType: 'dashPattern' },
  ]],

  ['MULTI_POINT', [
    { id: 'color', label: 'format.line.color', category: 'line', valueType: 'color' },
    { id: 'weight', label: 'format.line.weight', category: 'line', valueType: 'number' },
    { id: 'opacity', label: 'format.line.opacity', category: 'line', valueType: 'number' },
    { id: 'dash_array', label: 'format.line.dashArray', category: 'line', valueType: 'dashPattern' },
  ]],

  ['VECTOR', [
    { id: 'color', label: 'format.line.color', category: 'line', valueType: 'color' },
    { id: 'weight', label: 'format.line.weight', category: 'line', valueType: 'number' },
  ]],

  // POSITION: per-point overrides when formatting individual track positions
  ['POSITION', [
    { id: 'shape', label: 'format.point.shape', category: 'point', valueType: 'shape' },
    { id: 'fill_color', label: 'format.point.fillColor', category: 'point', valueType: 'color' },
    { id: 'fill_opacity', label: 'format.fill.opacity', category: 'point', valueType: 'number' },
    { id: 'stroke_color', label: 'format.stroke.color', category: 'stroke', valueType: 'color' },
    { id: 'radius', label: 'format.point.radius', category: 'point', valueType: 'number' },
  ]],

  ['NARRATIVE', []],
  ['TEXT', []],
  ['SYSTEM', []],
]);

/**
 * Returns the editable style properties for a given feature kind.
 */
export function getPropertiesForKind(featureKind: string): readonly StylePropertyDescriptor[] {
  return PROPERTY_MAP.get(featureKind) ?? [];
}

/**
 * Resolves an array of feature kinds into a unified list of style property descriptors.
 * For mixed-kind selections, returns the union of all properties.
 */
export function resolvePropertiesForKinds(featureKinds: readonly string[]): readonly StylePropertyDescriptor[] {
  if (featureKinds.length === 0) return [];
  if (featureKinds.length === 1) return getPropertiesForKind(featureKinds[0]!);

  // Union: collect all unique property IDs across kinds
  const seen = new Set<string>();
  const result: StylePropertyDescriptor[] = [];

  for (const kind of featureKinds) {
    for (const prop of getPropertiesForKind(kind)) {
      if (!seen.has(prop.id)) {
        seen.add(prop.id);
        result.push(prop);
      }
    }
  }

  return result;
}
