import { ArrayFilterPredicate, FilterExpression, FilterType } from './types';

/**
 * CQL2 property name mapping for each filter type.
 *
 * Exported so the NL → CQL2 prompt builder can derive its schema description
 * from the same table the evaluator uses (single source of truth; decision 3A).
 */
export declare const PROPERTY_MAP: Readonly<Record<FilterType, string>>;
/**
 * Serialise a FilterExpression to CQL2 JSON.
 *
 * - Empty expression → `{}` (match all)
 * - Single predicate → the predicate's CQL2 expression
 * - Multiple predicates → `{"op": "and", "args": [...]}`
 * - OR groups → nested `{"op": "or", "args": [...]}` inside AND
 */
export declare function filterExpressionToCql2Json(expression: FilterExpression): Record<string, unknown>;
/**
 * Extract ArrayFilterPredicate[] from a CQL2 JSON tree.
 *
 * Walks the tree looking for `array_filter` function calls
 * (optionally wrapped in `not`).
 */
export declare function cql2JsonToArrayFilters(cql2: Record<string, unknown>): ArrayFilterPredicate[];
/**
 * Error thrown by `cql2JsonToFilterExpression` when the input uses an
 * operator, property, or arg arity the filter-engine does not support.
 *
 * Callers (the NL → CQL2 parse pipeline) surface this via the
 * `cql2-evaluation-failed` generation-error reason (decision 8A/10A).
 */
export declare class Cql2ParseError extends Error {
    constructor(message: string);
}
/**
 * Reverse of `filterExpressionToCql2Json`: walk a CQL2-JSON tree and build
 * the internal `FilterExpression` model.
 *
 * Throws `Cql2ParseError` on unknown operators, bad arg arity, or property
 * references missing from `PROPERTY_MAP`.
 *
 * - `{}` → empty expression (match-all).
 * - A single comparison / `like` / `a_containedBy` node → one predicate.
 * - An `array_filter` (optionally negated) → one arrayFilter.
 * - `and` at top level → collect children into predicates / orGroups / arrayFilters.
 * - `or` at top level → single orGroup.
 */
export declare function cql2JsonToFilterExpression(cql2: Record<string, unknown>): FilterExpression;
//# sourceMappingURL=cql2-json.d.ts.map