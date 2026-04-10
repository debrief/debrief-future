/**
 * Shared Type Definitions for @debrief/utils
 */

// T020: Import PositionStyle, PositionStyleOverride from @debrief/schemas instead of defining locally
import type { PositionStyle, PositionStyleOverride } from '@debrief/schemas';

// Re-export for consumers that import from @debrief/utils
export type { PositionStyle, PositionStyleOverride };

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
 * Safe GeoJSON geometry — maximally permissive coordinates for cross-boundary use.
 * Use this at service/MCP boundaries where coordinate shape is unknown.
 */
export interface SafeGeometry {
  type: string;
  coordinates: unknown;
}

/**
 * Safe GeoJSON Feature — avoids `any` from the geojson package.
 * Canonical definition for use at JSON.parse() boundaries and MCP calls.
 */
export interface SafeFeature {
  type: 'Feature';
  id?: string | number;
  geometry: SafeGeometry | null;
  properties: Record<string, unknown> | null;
}

/**
 * Safe GeoJSON FeatureCollection — avoids `any` from the geojson package.
 */
export interface SafeFeatureCollection {
  type: 'FeatureCollection';
  features: SafeFeature[];
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

/**
 * Axis definition for chart dataset metadata.
 * Mirrors `shared/components/src/ChartRenderer/types.ts#AxisDefinition`.
 *
 * Feature: 178-vscode-tabular-results — DatasetEnvelope lives in @debrief/utils
 * so both shared components and service-side code (VS Code host, web-shell
 * mocks) can reference it without a cycle through components.
 */
export interface AxisDefinition {
  label: string;
  type: 'nominal' | 'ordinal' | 'quantitative' | 'temporal';
  units?: string;
}

/**
 * Dataset metadata (axis configuration).
 */
export interface DatasetMetadata {
  xAxis: AxisDefinition;
  yAxis: AxisDefinition;
}

/**
 * Named data series for multi-series charts.
 */
export interface DataSeries {
  name: string;
  data: Record<string, unknown>[];
}

/**
 * Standard envelope describing a tool result dataset ready for rendering
 * as a chart or a table.  The shared ChartPanelWrapper in
 * `@debrief/components` accepts this shape at runtime.
 */
export interface DatasetEnvelope {
  type: string;
  title: string;
  metadata: DatasetMetadata;
  data?: Record<string, unknown>[];
  series?: DataSeries[];
  displayHint?: 'table' | 'chart';
}
