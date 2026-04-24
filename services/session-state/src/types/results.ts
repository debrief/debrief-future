/**
 * Results state types for session state management.
 * Feature: 109-unify-result-layer-lifecycle, 110-tool-level-undo-gap,
 * 204-rawgeojsonfeature-linkml (GeoJSONFeature unified to schema-rooted
 * RawGeoJSONFeature from @debrief/schemas).
 */

// #204: The previously hand-typed `GeoJSONFeature` interface in this file
// is superseded by the schema-generated `RawGeoJSONFeature` from
// `@debrief/schemas`. Re-exported here under the original in-package name
// so existing importers (e.g. store/slices/results.ts, loader IPC, web-shell
// tools) continue to compile without ripple changes. Follow-up cleanup to
// rename the in-package API boundary tracked separately.
export type { RawGeoJSONFeature as GeoJSONFeature } from '@debrief/schemas';
import type { RawGeoJSONFeature as GeoJSONFeature } from '@debrief/schemas';

/**
 * Record of the last tool execution, enabling single-step undo (#110).
 *
 * Schema equivalent: @debrief/schemas#LastToolExecution
 * Not migrated: generated LastToolExecution uses snake_case field names
 * (tool_id, source_feature_ids, result_layer_ids) while this type uses
 * camelCase (toolId, sourceFeatureIds, resultLayerIds).
 */
export interface LastToolExecution {
  /** Identifier of the tool that was executed */
  toolId: string;
  /** IDs of the source features the tool operated on */
  sourceFeatureIds: string[];
  /** IDs of the result layers produced by the tool */
  resultLayerIds: string[];
}

/**
 * Results state slice (FR-109, FR-110).
 *
 * Schema equivalent: @debrief/schemas#ResultsSlice
 * Not migrated: generated ResultsSlice uses snake_case field names
 * (result_layers, last_tool_execution) while this type uses camelCase.
 */
export interface ResultsSlice {
  /** Accumulated tool result features */
  resultLayers: GeoJSONFeature[];
  /** Last tool execution record for single-step undo (#110) */
  lastToolExecution: LastToolExecution | null;
}

/**
 * Default results state values.
 */
export const DEFAULT_RESULTS_SLICE: ResultsSlice = {
  resultLayers: [],
  lastToolExecution: null,
};

/**
 * Results slice actions for state updates.
 */
export interface ResultsActions {
  /** Append features to resultLayers */
  addResultLayers: (features: GeoJSONFeature[]) => void;
  /** Remove result layers by feature ID */
  removeResultLayers: (featureIds: string[]) => void;
  /** Clear all result layers */
  clearResultLayers: () => void;
  /** Record last tool execution for undo (#110) */
  setLastToolExecution: (execution: LastToolExecution) => void;
  /** Clear last tool execution record */
  clearLastToolExecution: () => void;
}
