/**
 * Results state types for session state management.
 * Feature: 109-unify-result-layer-lifecycle, 110-tool-level-undo-gap
 */

/**
 * GeoJSON Feature representation for result layers.
 */
export interface GeoJSONFeature {
  type: 'Feature';
  id?: string | number;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown> | null;
}

/**
 * Record of the last tool execution, enabling single-step undo (#110).
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
