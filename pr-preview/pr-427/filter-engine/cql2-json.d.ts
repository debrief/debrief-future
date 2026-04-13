import { FilterExpression } from './types';

/**
 * Serialise a FilterExpression to CQL2 JSON.
 *
 * - Empty expression → `{}` (match all)
 * - Single predicate → the predicate's CQL2 expression
 * - Multiple predicates → `{"op": "and", "args": [...]}`
 * - OR groups → nested `{"op": "or", "args": [...]}` inside AND
 */
export declare function filterExpressionToCql2Json(expression: FilterExpression): Record<string, unknown>;
//# sourceMappingURL=cql2-json.d.ts.map