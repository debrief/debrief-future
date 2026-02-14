/**
 * Preset palette definitions for the FormatMenu component.
 *
 * These presets provide standard values for styling geometric features
 * (points, lines, polygons) in maritime tactical analysis scenarios.
 */

export interface PresetValue {
  readonly id: string;
  readonly label: string;
  readonly value: string | number;
  readonly swatch?: string;
}

/**
 * Standard colour palette aligned with naval tactical conventions.
 * Includes primary colours, darker variants, and grayscale options.
 */
export const COLOUR_PALETTE: readonly PresetValue[] = [
  { id: 'red', label: 'Red', value: '#CC0000', swatch: '#CC0000' },
  { id: 'dark-red', label: 'Dark Red', value: '#800000', swatch: '#800000' },
  { id: 'blue', label: 'Blue', value: '#0000CC', swatch: '#0000CC' },
  { id: 'dark-blue', label: 'Dark Blue', value: '#000080', swatch: '#000080' },
  { id: 'green', label: 'Green', value: '#00CC00', swatch: '#00CC00' },
  { id: 'dark-green', label: 'Dark Green', value: '#006400', swatch: '#006400' },
  { id: 'yellow', label: 'Yellow', value: '#FFD700', swatch: '#FFD700' },
  { id: 'orange', label: 'Orange', value: '#FF8C00', swatch: '#FF8C00' },
  { id: 'purple', label: 'Purple', value: '#800080', swatch: '#800080' },
  { id: 'cyan', label: 'Cyan', value: '#00BFFF', swatch: '#00BFFF' },
  { id: 'magenta', label: 'Magenta', value: '#FF00FF', swatch: '#FF00FF' },
  { id: 'brown', label: 'Brown', value: '#8B4513', swatch: '#8B4513' },
  { id: 'white', label: 'White', value: '#FFFFFF', swatch: '#FFFFFF' },
  { id: 'light-grey', label: 'Light Grey', value: '#C0C0C0', swatch: '#C0C0C0' },
  { id: 'dark-grey', label: 'Dark Grey', value: '#404040', swatch: '#404040' },
  { id: 'black', label: 'Black', value: '#000000', swatch: '#000000' },
] as const;

/**
 * Line weight presets (stroke width in pixels).
 * Range from fine lines suitable for detail to bold lines for emphasis.
 */
export const LINE_WEIGHT_PRESETS: readonly PresetValue[] = [
  { id: 'weight-1', label: '1 px', value: 1 },
  { id: 'weight-2', label: '2 px', value: 2 },
  { id: 'weight-3', label: '3 px', value: 3 },
  { id: 'weight-4', label: '4 px', value: 4 },
  { id: 'weight-5', label: '5 px', value: 5 },
  { id: 'weight-8', label: '8 px', value: 8 },
] as const;

/**
 * Opacity presets (alpha channel values).
 * Range from translucent overlays to fully opaque.
 */
export const OPACITY_PRESETS: readonly PresetValue[] = [
  { id: 'opacity-25', label: '25%', value: 0.25 },
  { id: 'opacity-50', label: '50%', value: 0.5 },
  { id: 'opacity-75', label: '75%', value: 0.75 },
  { id: 'opacity-100', label: '100%', value: 1.0 },
] as const;

/**
 * Point marker radius presets (in pixels).
 * Suitable for map markers at typical zoom levels.
 */
export const RADIUS_PRESETS: readonly PresetValue[] = [
  { id: 'radius-3', label: '3 px', value: 3 },
  { id: 'radius-5', label: '5 px', value: 5 },
  { id: 'radius-7', label: '7 px', value: 7 },
  { id: 'radius-10', label: '10 px', value: 10 },
  { id: 'radius-15', label: '15 px', value: 15 },
] as const;

/**
 * Dash pattern presets (SVG dashArray format).
 * Empty string = solid line; comma-separated values = dash/gap lengths.
 */
export const DASH_PATTERN_PRESETS: readonly PresetValue[] = [
  { id: 'solid', label: 'Solid', value: '' },
  { id: 'dashed', label: 'Dashed', value: '10, 5' },
  { id: 'dotted', label: 'Dotted', value: '2, 5' },
  { id: 'dash-dot', label: 'Dash-Dot', value: '10, 5, 2, 5' },
  { id: 'long-dash', label: 'Long Dash', value: '20, 10' },
] as const;

/**
 * Point shape presets.
 * Matches PointShapeEnum values from schema.
 */
export const SHAPE_PRESETS: readonly PresetValue[] = [
  { id: 'circle', label: 'Circle', value: 'circle' },
  { id: 'square', label: 'Square', value: 'square' },
  { id: 'triangle', label: 'Triangle', value: 'triangle' },
  { id: 'diamond', label: 'Diamond', value: 'diamond' },
  { id: 'cross', label: 'Cross', value: 'cross' },
] as const;
