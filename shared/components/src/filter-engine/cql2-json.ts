/**
 * CQL2 JSON serialisation for FilterExpression (#126).
 *
 * Converts the internal filter model to OGC CQL2 JSON encoding.
 */

import type { FilterExpression, FilterType, Predicate } from "./types";

/** CQL2 property name mapping for each filter type */
const PROPERTY_MAP: Record<FilterType, string> = {
  "vessel-class": "debrief:vessel_classes",
  tag: "debrief:tags",
  author: "debrief:author",
  duration: "duration",
  modified: "updated",
  title: "title",
  filename: "debrief:filename",
  "plot-contents": "debrief:plot_contents",
  "track-name": "debrief:track_names",
  nationality: "debrief:nationalities",
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

  if (allParts.length === 0) return {};
  if (allParts.length === 1) return allParts[0]!;
  return { op: "and", args: allParts };
}
