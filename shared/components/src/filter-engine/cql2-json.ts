/**
 * CQL2 JSON serialisation for FilterExpression (#126).
 *
 * Converts the internal filter model to OGC CQL2 JSON encoding.
 */

import type { ArrayFilterPredicate, CompoundPredicate, FilterExpression, FilterType, PlatformField, Predicate } from "./types";

/** CQL2 property name mapping for each filter type */
const PROPERTY_MAP: Record<FilterType, string> = {
  "vessel-class": "debrief:platforms[*].vessel_class",
  tag: "debrief:tags",
  author: "debrief:author",
  duration: "duration",
  modified: "updated",
  title: "title",
  filename: "debrief:filename",
  "plot-contents": "debrief:plot_contents",
  "track-name": "debrief:platforms[*].name",
  nationality: "debrief:platforms[*].nationality",
  collection: "collection",
};

/** Array-valued filter types that use a_containedBy operator */
const ARRAY_TYPES: ReadonlySet<FilterType> = new Set([
  "vessel-class",
  "tag",
  "track-name",
  "nationality",
]);

/** Convert a single predicate to a CQL2 JSON comparison expression */
function predicateToCql2(predicate: Predicate): Record<string, unknown> {
  const property = PROPERTY_MAP[predicate.type];

  let expr: Record<string, unknown>;

  // Title and plot-contents use LIKE with wildcards (free-text substring match)
  if (predicate.type === "title" || predicate.type === "filename" || predicate.type === "plot-contents") {
    expr = {
      op: "like",
      args: [{ property }, `%${predicate.value}%`],
    };
  } else if (ARRAY_TYPES.has(predicate.type)) {
    // Array-valued properties use a_containedBy
    expr = {
      op: "a_containedBy",
      args: [[predicate.value], { property }],
    };
  } else {
    // Scalar properties use equality
    expr = {
      op: "=",
      args: [{ property }, predicate.value],
    };
  }

  // Wrap in NOT if negated
  if (predicate.negated) {
    return { op: "not", args: [expr] };
  }
  return expr;
}

/**
 * Serialise a FilterExpression to CQL2 JSON.
 *
 * - Empty expression → `{}` (match all)
 * - Single predicate → the predicate's CQL2 expression
 * - Multiple predicates → `{"op": "and", "args": [...]}`
 * - OR groups → nested `{"op": "or", "args": [...]}` inside AND
 */
export function filterExpressionToCql2Json(
  expression: FilterExpression,
): Record<string, unknown> {
  const allParts: Record<string, unknown>[] = [];

  // Top-level AND predicates
  for (const predicate of expression.predicates) {
    allParts.push(predicateToCql2(predicate));
  }

  // OR groups (each becomes an "or" node AND'd with the rest)
  for (const group of expression.orGroups) {
    if (group.predicates.length === 1) {
      const first = group.predicates[0];
      if (first) allParts.push(predicateToCql2(first));
    } else if (group.predicates.length > 1) {
      allParts.push({
        op: "or",
        args: group.predicates.map(predicateToCql2),
      });
    }
  }

  // Array filter predicates
  for (const af of expression.arrayFilters ?? []) {
    allParts.push(arrayFilterToCql2(af));
  }

  if (allParts.length === 0) return {};
  if (allParts.length === 1) return allParts[0]!;
  return { op: "and", args: allParts };
}

/** Convert a CompoundPredicate to CQL2 JSON */
function compoundPredicateToCql2(pred: CompoundPredicate): Record<string, unknown> {
  switch (pred.kind) {
    case "comparison":
      return { op: "=", args: [{ property: pred.field }, pred.value] };
    case "and": {
      if (pred.children.length === 1) return compoundPredicateToCql2(pred.children[0]!);
      return { op: "and", args: pred.children.map(compoundPredicateToCql2) };
    }
    case "or": {
      if (pred.children.length === 1) return compoundPredicateToCql2(pred.children[0]!);
      return { op: "or", args: pred.children.map(compoundPredicateToCql2) };
    }
  }
}

/** Convert an ArrayFilterPredicate to CQL2 JSON */
function arrayFilterToCql2(af: ArrayFilterPredicate): Record<string, unknown> {
  const expr: Record<string, unknown> = {
    op: "array_filter",
    args: [
      { property: "debrief:platforms" },
      compoundPredicateToCql2(af.predicate),
    ],
  };
  if (af.negated) {
    return { op: "not", args: [expr] };
  }
  return expr;
}

/** Shape of a CQL2 JSON node used in array_filter parsing */
interface Cql2Node {
  readonly op?: string;
  readonly args?: readonly Cql2NodeArg[];
}

/** A CQL2 JSON arg can be a node, a property ref, or a scalar */
type Cql2NodeArg = Cql2Node | { readonly property: string } | string;

/** Parse a CQL2 JSON node into a CompoundPredicate */
function parseCql2Predicate(node: Cql2Node): CompoundPredicate {
  const op = node.op;
  const args = node.args ?? [];

  switch (op) {
    case "=": {
      const propRef = args[0] as { readonly property: string };
      const value = args[1] as string;
      return { kind: "comparison", field: propRef.property as PlatformField, value };
    }
    case "and":
      return {
        kind: "and",
        children: (args as readonly Cql2Node[]).map(parseCql2Predicate),
      };
    case "or":
      return {
        kind: "or",
        children: (args as readonly Cql2Node[]).map(parseCql2Predicate),
      };
    default:
      throw new Error(`Unsupported CQL2 operator in array_filter: ${op}`);
  }
}

/**
 * Extract ArrayFilterPredicate[] from a CQL2 JSON tree.
 *
 * Walks the tree looking for `array_filter` function calls
 * (optionally wrapped in `not`).
 */
export function cql2JsonToArrayFilters(
  cql2: Record<string, unknown>,
): ArrayFilterPredicate[] {
  const results: ArrayFilterPredicate[] = [];
  walkCql2(cql2 as Cql2Node, results);
  return results;
}

function walkCql2(
  node: Cql2Node,
  results: ArrayFilterPredicate[],
): void {
  const op = node.op;
  if (!op) return;

  if (op === "array_filter") {
    const args = node.args ?? [];
    const predicateNode = args[1] as Cql2Node;
    results.push({
      array: "platforms",
      predicate: parseCql2Predicate(predicateNode),
      negated: false,
    });
    return;
  }

  if (op === "not") {
    const args = node.args ?? [];
    const inner = args[0] as Cql2Node | undefined;
    if (inner?.op === "array_filter") {
      const innerArgs = inner.args ?? [];
      const predicateNode = innerArgs[1] as Cql2Node;
      results.push({
        array: "platforms",
        predicate: parseCql2Predicate(predicateNode),
        negated: true,
      });
      return;
    }
  }

  // Walk into AND/OR children
  if (op === "and" || op === "or") {
    const args = node.args ?? [];
    for (const child of args) {
      walkCql2(child as Cql2Node, results);
    }
  }
}
