/**
 * Parameter type inference for chip rendering.
 *
 * Priority chain: tool schema → heuristic → fallback (null).
 *
 * Feature: 176-log-panel-ux
 */

import type { ParamType, ParameterSchemaEntry } from './types';

/** Colour name patterns for heuristic detection. */
const COLOUR_NAMES = new Set([
  'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'black', 'white',
  'cyan', 'magenta', 'grey', 'gray', 'brown', 'navy', 'teal', 'lime', 'olive',
  'maroon', 'aqua', 'fuchsia', 'silver', 'gold', 'coral', 'salmon', 'khaki',
  'indigo', 'violet', 'crimson', 'turquoise', 'plum', 'chartreuse',
]);

const HEX_COLOUR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Infer the ParamType from a tool schema entry, if available.
 * Returns null if the schema provides no type hint.
 */
export function inferFromSchema(schema: ParameterSchemaEntry): ParamType | null {
  // Schema paramType field is authoritative when present
  if (schema.paramType) {
    const mapped = SCHEMA_TYPE_MAP[schema.paramType];
    if (mapped) return mapped;
  }

  // Infer from schema structural properties
  if (schema.type === 'boolean') return 'boolean';
  if (schema.choices && schema.choices.length > 0) return 'enum';
  if (schema.type === 'number') {
    if (schema.minimum != null && schema.maximum != null) return 'range';
    return 'number';
  }

  return null;
}

/** Map from schema paramType strings to our ParamType union. */
const SCHEMA_TYPE_MAP: Record<string, ParamType> = {
  colour: 'colour',
  color: 'colour',
  number: 'number',
  boolean: 'boolean',
  range: 'range',
  enum: 'enum',
};

/**
 * Infer the ParamType from a raw parameter value using heuristics.
 * Used when no tool schema is available.
 */
export function inferFromValue(name: string, value: unknown): ParamType | null {
  if (typeof value === 'boolean') return 'boolean';

  if (typeof value === 'number') return 'number';

  if (typeof value === 'string') {
    // Check for colour values
    if (HEX_COLOUR_RE.test(value)) return 'colour';
    if (COLOUR_NAMES.has(value.toLowerCase())) return 'colour';

    // Check for boolean-like strings
    if (value === 'true' || value === 'false') return 'boolean';

    // Check for numeric strings
    if (/^-?\d+(\.\d+)?$/.test(value)) return 'number';

    // Check for colour-hinted parameter names
    if (/colou?r/i.test(name)) return 'colour';
  }

  return null;
}

/**
 * Infer ParamType using the priority chain: schema → heuristic → null.
 *
 * @param name - Parameter name
 * @param value - Raw parameter value
 * @param schema - Tool schema entry (optional, takes priority)
 */
export function inferParamType(
  name: string,
  value: unknown,
  schema?: ParameterSchemaEntry | null
): ParamType | null {
  // Priority 1: schema-based inference
  if (schema) {
    const schemaType = inferFromSchema(schema);
    if (schemaType) return schemaType;
  }

  // Priority 2: heuristic-based inference
  return inferFromValue(name, value);
}
