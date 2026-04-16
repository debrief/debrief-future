import { ArrayFilterPredicate, FilterExpression, FilterType } from './types';

/** CQL2 property name mapping for each filter type. Exported (#188 decision 3A). */
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
 * Error thrown by `cql2JsonToFilterExpression` when the input is not supported
 * by the evaluator.
 *
 * The generator's `parseResponse` catches this and surfaces it as a
 * `cql2-evaluation-failed` error reason (decision 8A) rather than letting it
 * crash the caller.
 */
export declare class Cql2ReverseParseError extends Error {
    readonly code: "unsupported-operator" | "bad-arg-arity" | "unknown-property" | "malformed-node";
    constructor(code: "unsupported-operator" | "bad-arg-arity" | "unknown-property" | "malformed-node", message: string);
}
/**
 * Reverse of `filterExpressionToCql2Json`. Accepts a CQL2-JSON object and
 * returns a typed `FilterExpression`. Empty input `{}` yields an empty
 * FilterExpression (match-all).
 *
 * Throws `Cql2ReverseParseError` for unsupported operators, bad arg arity,
 * unknown property paths, or malformed nodes. Callers in #188's generator
 * pipeline catch this and surface it as a `cql2-evaluation-failed` error
 * reason rather than letting it raise.
 */
export declare function cql2JsonToFilterExpression(cql2: Record<string, unknown>): FilterExpression;
//# sourceMappingURL=cql2-json.d.ts.map