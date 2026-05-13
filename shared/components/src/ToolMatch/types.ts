/**
 * Types for the ToolMatch module.
 *
 * This module re-exports schema types and defines additional types
 * needed for tool matching.
 */

import type { Tool, SelectionRequirement, ToolParameter as ToolParameterSchema } from '@debrief/schemas';

// Re-export schema types for convenience
export type { Tool, SelectionRequirement };

/**
 * Represents the current selection of features, grouped by kind.
 * Keys are feature kinds (e.g., "TRACK", "POINT"), values are counts.
 */
export type Selection = Map<string, number>;

/**
 * Result of matching a single tool against a selection.
 */
export interface MatchResult {
  /** The tool being matched */
  tool: Tool;
  /** Whether the tool is active for the current selection */
  isActive: boolean;
  /** Human-readable explanation if the tool is inactive */
  explanation: string;
}

/**
 * A configurable parameter for a tool, extracted from MCP annotations.
 *
 * Schema-rooted on `ToolParameter` from `@debrief/schemas` (LinkML
 * `tool.yaml`) and narrowed with the camelCase view-layer field names
 * used by the ToolMatch picker (`valueType`, `defaultValue`, `paramType`).
 * The schema base contributes `name`, `description`, `required`, and the
 * new `choices` slot (added under spec 222 P2 to collapse the drift
 * cluster — audit §3.2 rows 37 and 86). Per FR-004 (R4 import-based
 * schema rooting) the audit treats this file as schema-rooted.
 */
export type ToolParameter = Omit<ToolParameterSchema, 'type' | 'default_value' | 'param_type'> & {
  /** Value type: string, number, boolean, enum, duration */
  valueType: 'string' | 'number' | 'boolean' | 'enum' | 'duration';
  /** Default value */
  defaultValue?: unknown;
  /** Schema-defined parameter type name (from x-debrief-param-type) */
  paramType?: string;
};

/**
 * Creates a Selection map from an array of feature kinds.
 *
 * @param kinds - Array of feature kinds from selected features
 * @returns Selection map with counts per kind
 */
export function createSelection(kinds: string[]): Selection {
  const selection: Selection = new Map();
  for (const kind of kinds) {
    selection.set(kind, (selection.get(kind) ?? 0) + 1);
  }
  return selection;
}

/**
 * Creates a Selection map from an object with kind keys and count values.
 *
 * @param counts - Object mapping kinds to counts
 * @returns Selection map
 */
export function createSelectionFromCounts(counts: Record<string, number>): Selection {
  return new Map(Object.entries(counts));
}
