/**
 * Shared Type Definitions for @debrief/utils
 */

// T020: Import PositionStyle, PositionStyleOverride from @debrief/schemas instead of defining locally
import type { PositionStyle, PositionStyleOverride } from '@debrief/schemas';
import { PointShapeEnum } from '@debrief/schemas';

// Re-export for consumers that import from @debrief/utils
export type { PositionStyle, PositionStyleOverride };

/**
 * Template-literal derivation of the permissible point-marker shapes from
 * the canonical schema enum. The single place where a TypeScript union over
 * marker shapes is named; consumed by `ResolvedPositionStyle.symbol`, by
 * every `switch (symbol)` in the renderers, and by the VS Code track-styling
 * tool's parameter type. Adding a new value to `PointShapeEnum` in LinkML
 * widens this union automatically after schema regeneration.
 */
export type PointShape = `${PointShapeEnum}`;

/**
 * Bounds type: [minLon, minLat, maxLon, maxLat]
 */
export type Bounds = [number, number, number, number];

// #212: The hand-written `SafeGeometry` / `SafeFeature` / `SafeFeatureCollection`
// types were removed (Article II — no schema-adjacent hand-written types). The
// permissive ingress/parse boundary now uses the schema-derived
// `IngressFeature` / `IngressFeatureCollection` from `@debrief/schemas`
// (`Omit<RawGeoJSONFeature,'geometry'> & { geometry: …| null }`); result-carrying
// surfaces use the generated `RawGeoJSONFeature`. A definition-level guard
// (`scripts/check-no-geojson-feature.sh`) blocks reintroduction.

/**
 * Resolved position style for rendering a single track position after the
 * default-style → interval-rules → per-position-override cascade has been
 * applied. `labelText` is null when no label should be displayed, or a
 * formatted timestamp when a label should be shown but no custom text was
 * supplied by the override.
 */
export interface ResolvedPositionStyle {
  showSymbol: boolean;
  symbol: PointShape;
  showLabel: boolean;
  labelText: string | null;
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
