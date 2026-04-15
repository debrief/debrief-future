/**
 * CQL2 schema description for the NL → CQL2 prompt (#188 T015).
 *
 * Derives the schema block from `PROPERTY_MAP` in the filter-engine so the
 * prompt cannot drift away from the evaluator (decision 3A). The compile-time
 * `never`-default guarantees exhaustiveness: if a new `FilterType` is added
 * without a description here, TypeScript fails.
 */
/**
 * Build the schema description block. Emits one line per `FilterType` pairing
 * its logical name, CQL2 property path, CQL2 operator, and value-space notes.
 *
 * Intended to be dropped into the prompt verbatim.
 */
export declare function schemaDescription(): string;
//# sourceMappingURL=schemaDescription.d.ts.map