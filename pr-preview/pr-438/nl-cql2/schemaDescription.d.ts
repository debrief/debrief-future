/**
 * Schema description block for the NL → CQL2 prompt (#188 decision 3A).
 *
 * Derives the allowed-property table from `PROPERTY_MAP` in
 * `filter-engine/cql2-json.ts`. This is the single source of truth: if a new
 * `FilterType` is added upstream, the prompt automatically reflects it, and
 * the exhaustiveness check below forces a compile error if the mapping falls
 * out of sync.
 */
/**
 * Emit the CQL2 schema description block for the prompt. Derives every line
 * from `PROPERTY_MAP` so the description cannot drift from the evaluator.
 */
export declare function schemaDescription(): string;
//# sourceMappingURL=schemaDescription.d.ts.map