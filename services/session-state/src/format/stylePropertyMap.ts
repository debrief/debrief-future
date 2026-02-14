/**
 * @file stylePropertyMap.ts
 * @description Maps FeatureKindEnum values to editable style properties.
 * Part of Feature 097 (Feature Format Menu).
 */

export type ValueType = 'color' | 'number' | 'shape' | 'dashPattern';
export type PropertyCategory = 'line' | 'fill' | 'point' | 'stroke';

export interface StylePropertyDescriptor {
  readonly id: string;      // Dot-path to property within properties.style (e.g., "line.color")
  readonly label: string;   // I18N key for display label
  readonly category: PropertyCategory;
  readonly valueType: ValueType;
}

/**
 * Internal map of feature kinds to their editable style properties.
 * Based on research in `.specify/097-feature-format-menu/research.md`.
 */
const PROPERTY_MAP: ReadonlyMap<string, readonly StylePropertyDescriptor[]> = new Map([
  // TRACK: Composite TrackStyle with line and point properties
  ['TRACK', [
    { id: 'line.color', label: 'format.line.color', category: 'line', valueType: 'color' },
    { id: 'line.weight', label: 'format.line.weight', category: 'line', valueType: 'number' },
    { id: 'line.opacity', label: 'format.line.opacity', category: 'line', valueType: 'number' },
    { id: 'line.dash_array', label: 'format.line.dashArray', category: 'line', valueType: 'dashPattern' },
    { id: 'point.shape', label: 'format.point.shape', category: 'point', valueType: 'shape' },
    { id: 'point.fill_color', label: 'format.point.fillColor', category: 'point', valueType: 'color' },
    { id: 'point.radius', label: 'format.point.radius', category: 'point', valueType: 'number' },
  ]],

  // POINT: Flat PointProperties structure
  ['POINT', [
    { id: 'shape', label: 'format.point.shape', category: 'point', valueType: 'shape' },
    { id: 'fill_color', label: 'format.point.fillColor', category: 'fill', valueType: 'color' },
    { id: 'fill_opacity', label: 'format.fill.opacity', category: 'fill', valueType: 'number' },
    { id: 'color', label: 'format.stroke.color', category: 'stroke', valueType: 'color' },
    { id: 'weight', label: 'format.stroke.weight', category: 'stroke', valueType: 'number' },
    { id: 'radius', label: 'format.point.radius', category: 'point', valueType: 'number' },
  ]],

  // CIRCLE, RECTANGLE, POLY, MULTI_POLYGON: Polygon-like features
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

  // LINE, MULTI_POINT: Line-like features
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

  // VECTOR: Simplified line properties
  ['VECTOR', [
    { id: 'color', label: 'format.line.color', category: 'line', valueType: 'color' },
    { id: 'weight', label: 'format.line.weight', category: 'line', valueType: 'number' },
  ]],

  // NARRATIVE, TEXT, SYSTEM: No editable properties
  ['NARRATIVE', []],
  ['TEXT', []],
  ['SYSTEM', []],
]);

/**
 * Export the full map for testing purposes.
 */
export const STYLE_PROPERTY_MAP = PROPERTY_MAP;

/**
 * Returns the editable style properties for a given feature kind.
 * @param featureKind - FeatureKindEnum value (e.g., "TRACK", "POINT")
 * @returns Array of style property descriptors (empty if none)
 */
export function getEditableProperties(featureKind: string): readonly StylePropertyDescriptor[] {
  return PROPERTY_MAP.get(featureKind) ?? [];
}

/**
 * Checks whether a feature kind has any editable style properties.
 * @param featureKind - FeatureKindEnum value
 * @returns true if the kind has at least one editable property
 */
export function hasEditableProperties(featureKind: string): boolean {
  const properties = PROPERTY_MAP.get(featureKind);
  return properties !== undefined && properties.length > 0;
}
