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
 *
 * The compound `platform` filter type is intentionally excluded from the flat
 * schema table because it is not a leaf dimension — the prompt documents it
 * separately via the `array_filter` paragraph below. Keeping it out of the
 * flat table preserves the recorded LLM-fixture prompt hash (#186).
 */
export declare function schemaDescription(): string;
//# sourceMappingURL=schemaDescription.d.ts.map