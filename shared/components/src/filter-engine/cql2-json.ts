/**
 * CQL2 JSON serialisation for FilterExpression (#126).
 *
 * Converts the internal filter model to OGC CQL2 JSON encoding.
 */

import type { ArrayFilterPredicate, CompoundPredicate, FilterExpression, FilterType, OrGroup, PlatformField, Predicate } from "./types";

/**
 * CQL2 property name mapping for each filter type.
 *
 * Exported so the NL → CQL2 prompt builder can derive its schema description
 * from the same table the evaluator uses (single source of truth; decision 3A).
 */
export const PROPERTY_MAP: Readonly<Record<FilterType, string>> = {
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

// ---------------------------------------------------------------------------
// Reverse parser: CQL2-JSON → FilterExpression (#188, decision 1A)
// ---------------------------------------------------------------------------

/**
 * Error thrown by `cql2JsonToFilterExpression` when the input uses an
 * operator, property, or arg arity the filter-engine does not support.
 *
 * Callers (the NL → CQL2 parse pipeline) surface this via the
 * `cql2-evaluation-failed` generation-error reason (decision 8A/10A).
 */
export class Cql2ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Cql2ParseError";
  }
}

/** Reverse of PROPERTY_MAP — property string → FilterType. Built lazily. */
let PROPERTY_TO_FILTER_TYPE: ReadonlyMap<string, FilterType> | null = null;
function propertyToFilterType(): ReadonlyMap<string, FilterType> {
  if (PROPERTY_TO_FILTER_TYPE === null) {
    const map = new Map<string, FilterType>();
    const entries = Object.entries(PROPERTY_MAP) as [FilterType, string][];
    for (const [filterType, property] of entries) {
      map.set(property, filterType);
    }
    PROPERTY_TO_FILTER_TYPE = map;
  }
  return PROPERTY_TO_FILTER_TYPE;
}

/** Narrow an unknown value to an object with `.property: string`. */
function asPropertyRef(value: unknown): { property: string } | null {
  if (
    value !== null &&
    typeof value === "object" &&
    "property" in value &&
    typeof (value as { property: unknown }).property === "string"
  ) {
    return { property: (value as { property: string }).property };
  }
  return null;
}

/** Narrow an unknown value to a CQL2 node (`.op` + optional `.args`). */
function asCql2Node(value: unknown): Cql2Node | null {
  if (
    value !== null &&
    typeof value === "object" &&
    "op" in value &&
    typeof (value as { op: unknown }).op === "string"
  ) {
    return value as Cql2Node;
  }
  return null;
}

/** Look up the FilterType for a CQL2 property reference, throw if unknown. */
function resolveFilterType(property: string): FilterType {
  const filterType = propertyToFilterType().get(property);
  if (filterType === undefined) {
    throw new Cql2ParseError(
      `CQL2 references property "${property}" not in PROPERTY_MAP`,
    );
  }
  return filterType;
}

/**
 * Parse a single leaf comparison node (`=`, `like`, `a_containedBy`) into
 * a Predicate. Throws on arity / shape errors.
 */
function parseComparison(node: Cql2Node): Predicate {
  const args = node.args ?? [];
  const op = node.op;

  if (op === "=") {
    if (args.length !== 2) {
      throw new Cql2ParseError(
        `CQL2 "=" requires exactly 2 args, got ${args.length}`,
      );
    }
    const propRef = asPropertyRef(args[0]);
    if (propRef === null) {
      throw new Cql2ParseError(`CQL2 "=" expects first arg to be a property ref`);
    }
    const rawValue = args[1];
    if (typeof rawValue !== "string") {
      throw new Cql2ParseError(
        `CQL2 "=" on "${propRef.property}" expects a string value, got ${typeof rawValue}`,
      );
    }
    return {
      type: resolveFilterType(propRef.property),
      value: rawValue,
    };
  }

  if (op === "like") {
    if (args.length !== 2) {
      throw new Cql2ParseError(
        `CQL2 "like" requires exactly 2 args, got ${args.length}`,
      );
    }
    const propRef = asPropertyRef(args[0]);
    if (propRef === null) {
      throw new Cql2ParseError(`CQL2 "like" expects first arg to be a property ref`);
    }
    const pattern = args[1];
    if (typeof pattern !== "string") {
      throw new Cql2ParseError(
        `CQL2 "like" on "${propRef.property}" expects a string pattern`,
      );
    }
    // Forward path wraps values in %value% — strip those wildcards on reverse.
    let value = pattern;
    if (value.startsWith("%")) value = value.slice(1);
    if (value.endsWith("%")) value = value.slice(0, -1);
    return {
      type: resolveFilterType(propRef.property),
      value,
    };
  }

  if (op === "a_containedBy") {
    if (args.length !== 2) {
      throw new Cql2ParseError(
        `CQL2 "a_containedBy" requires exactly 2 args, got ${args.length}`,
      );
    }
    const valueArray = args[0];
    const propRef = asPropertyRef(args[1]);
    if (propRef === null) {
      throw new Cql2ParseError(
        `CQL2 "a_containedBy" expects second arg to be a property ref`,
      );
    }
    if (!Array.isArray(valueArray) || valueArray.length !== 1) {
      throw new Cql2ParseError(
        `CQL2 "a_containedBy" on "${propRef.property}" expects a single-element value array`,
      );
    }
    const firstValue = (valueArray as readonly unknown[])[0];
    if (typeof firstValue !== "string") {
      throw new Cql2ParseError(
        `CQL2 "a_containedBy" on "${propRef.property}" expects a string value`,
      );
    }
    return {
      type: resolveFilterType(propRef.property),
      value: firstValue,
    };
  }

  throw new Cql2ParseError(
    `Unsupported CQL2 operator "${op ?? "<missing>"}" in reverse parser`,
  );
}

/** Walk a `not(...)` wrapper and return the negated Predicate or ArrayFilterPredicate. */
function parseNot(
  node: Cql2Node,
): { kind: "predicate"; predicate: Predicate } | { kind: "arrayFilter"; af: ArrayFilterPredicate } {
  const args = node.args ?? [];
  if (args.length !== 1) {
    throw new Cql2ParseError(
      `CQL2 "not" requires exactly 1 arg, got ${args.length}`,
    );
  }
  const inner = asCql2Node(args[0]);
  if (inner === null) {
    throw new Cql2ParseError(`CQL2 "not" expects a node arg`);
  }
  if (inner.op === "array_filter") {
    const af = parseArrayFilter(inner);
    return { kind: "arrayFilter", af: { ...af, negated: true } };
  }
  const predicate = parseComparison(inner);
  return { kind: "predicate", predicate: { ...predicate, negated: true } };
}

/** Parse an `array_filter(platforms, <compound>)` node. */
function parseArrayFilter(node: Cql2Node): ArrayFilterPredicate {
  const args = node.args ?? [];
  if (args.length !== 2) {
    throw new Cql2ParseError(
      `CQL2 "array_filter" requires exactly 2 args, got ${args.length}`,
    );
  }
  const propRef = asPropertyRef(args[0]);
  if (propRef === null || propRef.property !== "debrief:platforms") {
    throw new Cql2ParseError(
      `CQL2 "array_filter" expects first arg to be {property: "debrief:platforms"}`,
    );
  }
  const predicateNode = asCql2Node(args[1]);
  if (predicateNode === null) {
    throw new Cql2ParseError(`CQL2 "array_filter" expects second arg to be a predicate node`);
  }
  return {
    array: "platforms",
    predicate: parseCql2Predicate(predicateNode),
    negated: false,
  };
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
export function cql2JsonToFilterExpression(
  cql2: Record<string, unknown>,
): FilterExpression {
  // Empty object = match all
  if (cql2 === null || typeof cql2 !== "object" || Object.keys(cql2).length === 0) {
    return { predicates: [], orGroups: [], arrayFilters: [] };
  }

  const node = asCql2Node(cql2);
  if (node === null) {
    throw new Cql2ParseError(
      `CQL2 reverse parser: expected a node with "op", got ${JSON.stringify(cql2)}`,
    );
  }

  const predicates: Predicate[] = [];
  const orGroups: OrGroup[] = [];
  const arrayFilters: ArrayFilterPredicate[] = [];

  absorb(node);

  function absorb(n: Cql2Node): void {
    const op = n.op;
    if (op === "and") {
      const args = n.args ?? [];
      for (const child of args) {
        const childNode = asCql2Node(child);
        if (childNode === null) {
          throw new Cql2ParseError(`CQL2 "and" expects all args to be nodes`);
        }
        absorb(childNode);
      }
      return;
    }

    if (op === "or") {
      const args = n.args ?? [];
      const groupPredicates: Predicate[] = [];
      for (const child of args) {
        const childNode = asCql2Node(child);
        if (childNode === null) {
          throw new Cql2ParseError(`CQL2 "or" expects all args to be nodes`);
        }
        if (childNode.op === "not") {
          const unwrapped = parseNot(childNode);
          if (unwrapped.kind !== "predicate") {
            throw new Cql2ParseError(
              `CQL2 "or" over array_filter not supported`,
            );
          }
          groupPredicates.push(unwrapped.predicate);
        } else {
          groupPredicates.push(parseComparison(childNode));
        }
      }
      orGroups.push({ predicates: groupPredicates });
      return;
    }

    if (op === "array_filter") {
      arrayFilters.push(parseArrayFilter(n));
      return;
    }

    if (op === "not") {
      const unwrapped = parseNot(n);
      if (unwrapped.kind === "predicate") {
        predicates.push(unwrapped.predicate);
      } else {
        arrayFilters.push(unwrapped.af);
      }
      return;
    }

    // Leaf comparison
    predicates.push(parseComparison(n));
  }

  return { predicates, orGroups, arrayFilters };
}
