import { ArrayFilterPredicate, FilterExpression } from './types';

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
//# sourceMappingURL=cql2-json.d.ts.map