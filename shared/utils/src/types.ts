/**
 * Shared Type Definitions for @debrief/utils
 */

/**
 * GeoJSON Feature type
 */
export interface GeoJSONFeature {
  type: 'Feature';
  id?: string;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, unknown> | null;
}

/**
 * GeoJSON FeatureCollection
 */
export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/**
 * Bounds type: [minLon, minLat, maxLon, maxLat]
 */
export type Bounds = [number, number, number, number];

/**
 * Position style configuration (matches schema PositionStyle)
 */
export interface PositionStyle {
  show_symbol: boolean;
  symbol: 'circle' | 'square' | 'triangle';
  show_label: boolean;
}

/**
 * Position style override (matches schema PositionStyleOverride)
 */
export interface PositionStyleOverride {
  show_symbol?: boolean;
  symbol?: 'circle' | 'square' | 'triangle';
  show_label?: boolean;
  label?: string;
}

/**
 * Resolved position style for rendering
 */
export interface ResolvedPositionStyle {
  showSymbol: boolean;
  symbol: 'circle' | 'square' | 'triangle';
  showLabel: boolean;
  label: string | null;
}
