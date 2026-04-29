import { Tool, SelectionRequirement } from '../../../schemas/src/generated/typescript/index.ts';

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
 */
export interface ToolParameter {
    /** Parameter identifier */
    name: string;
    /** Value type: string, number, boolean, enum, duration */
    valueType: 'string' | 'number' | 'boolean' | 'enum' | 'duration';
    /** Human-readable description */
    description: string;
    /** Whether parameter is required */
    required?: boolean;
    /** Default value */
    defaultValue?: unknown;
    /** Explicit choices (for enum type) */
    choices?: string[];
    /** Schema-defined parameter type name (from x-debrief-param-type) */
    paramType?: string;
}
/**
 * Creates a Selection map from an array of feature kinds.
 *
 * @param kinds - Array of feature kinds from selected features
 * @returns Selection map with counts per kind
 */
export declare function createSelection(kinds: string[]): Selection;
/**
 * Creates a Selection map from an object with kind keys and count values.
 *
 * @param counts - Object mapping kinds to counts
 * @returns Selection map
 */
export declare function createSelectionFromCounts(counts: Record<string, number>): Selection;
//# sourceMappingURL=types.d.ts.map