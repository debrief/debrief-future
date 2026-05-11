import { ParamType, ParameterSchemaEntry } from './types';

/**
 * Infer the ParamType from a tool schema entry, if available.
 * Returns null if the schema provides no type hint.
 */
export declare function inferFromSchema(schema: ParameterSchemaEntry): ParamType | null;
/**
 * Infer the ParamType from a raw parameter value using heuristics.
 * Used when no tool schema is available.
 */
export declare function inferFromValue(name: string, value: unknown): ParamType | null;
/**
 * Infer ParamType using the priority chain: schema → heuristic → null.
 *
 * @param name - Parameter name
 * @param value - Raw parameter value
 * @param schema - Tool schema entry (optional, takes priority)
 */
export declare function inferParamType(name: string, value: unknown, schema?: ParameterSchemaEntry | null): ParamType | null;
//# sourceMappingURL=paramTypeInference.d.ts.map