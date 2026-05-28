import { FieldSpec } from './types';

/**
 * Resolve a single JSON Schema property entry (from a parent object's
 * `properties` map) to the corresponding `FieldSpec`.
 *
 * Falls back to `{ kind: 'unsupported' }` when the shape is not recognised —
 * the form renders these as disabled, with the reason as a tooltip.
 */
export declare function resolveFieldSpec(jsonSchemaProperty: unknown, key: string): FieldSpec;
//# sourceMappingURL=schemaResolver.d.ts.map