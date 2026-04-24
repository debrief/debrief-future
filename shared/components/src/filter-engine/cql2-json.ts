/**
 * CQL2 JSON serialisation for FilterExpression (#126).
 *
 * Converts the internal filter model to OGC CQL2 JSON encoding and back.
 *
 * Scope additions in #188:
 *   - PROPERTY_MAP is promoted to an exported constant (decision 3A) so the
 *     NL→CQL2 prompt builder consumes the same source of truth as the
 *     evaluator.
 *   - `cql2JsonToFilterExpression` is the new full reverse parser (decision
 *     1A). `cql2JsonToArrayFilters` remains exported for backwards
 *     compatibility with #127's filter-bar imports; internally it delegates
 *     to the new parser.
 */

import type {
  ArrayFilterPredicate,
  CompoundPredicate,
  FilterExpression,
  FilterType,
  OrGroup,
  PlatformField,
  Predicate,
} from "./types";

/** CQL2 property name mapping for each filter type. Exported (#188 decision 3A). */
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
  // The platform filter type never emits a flat CQL2 leaf — chips serialise
  // directly to `array_filter` via arrayFilterToCql2. The entry exists only
  // to keep the enum-complete record type satisfied for downstream tooling.
  platform: "debrief:platforms",
};

/** Reverse lookup: CQL2 property path → FilterType. */
const PROPERTY_TO_FILTER_TYPE: ReadonlyMap<string, FilterType> = new Map(
  (Object.entries(PROPERTY_MAP) as [FilterType, string][]).map(
    ([filterType, property]) => [property, filterType],
  ),
);

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
type Cql2NodeArg = Cql2Node | { readonly property: string } | string | number | boolean;

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
    case "a_containedBy": {
      // #190: Haiku 4.5 frequently emits `a_containedBy([literals], prop)`
      // inside array_filter where the prompt asks for `=`. For scalar
      // platform fields this is semantically `prop = literal` (singleton)
      // or `or(prop = literal_i)` (multi). Normalise so real-world LLM
      // output lands in the demo instead of tripping the generation-failed
      // banner.
      const literals = args[0] as readonly string[];
      const propRef = args[1] as { readonly property: string };
      const field = propRef.property as PlatformField;
      if (!Array.isArray(literals) || literals.length === 0) {
        throw new Error(
          "a_containedBy inside array_filter requires a non-empty literal array",
        );
      }
      if (literals.length === 1) {
        return { kind: "comparison", field, value: literals[0] };
      }
      return {
        kind: "or",
        children: literals.map((value) => ({
          kind: "comparison" as const,
          field,
          value,
        })),
      };
    }
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
// Full reverse parser (#188 decision 1A)
// ---------------------------------------------------------------------------

/**
 * Error thrown by `cql2JsonToFilterExpression` when the input is not supported
 * by the evaluator.
 *
 * The generator's `parseResponse` catches this and surfaces it as a
 * `cql2-evaluation-failed` error reason (decision 8A) rather than letting it
 * crash the caller.
 */
export class Cql2ReverseParseError extends Error {
  public readonly code:
    | "unsupported-operator"
    | "bad-arg-arity"
    | "unknown-property"
    | "malformed-node";

  public constructor(
    code:
      | "unsupported-operator"
      | "bad-arg-arity"
      | "unknown-property"
      | "malformed-node",
    message: string,
  ) {
    super(message);
    this.name = "Cql2ReverseParseError";
    this.code = code;
  }
}

/** Leaf comparison: convert a top-level CQL2 expression into a Predicate. */
function parseTopLevelComparison(
  node: Cql2Node,
  negated: boolean,
): Predicate {
  const op = node.op;
  const args = node.args ?? [];

  if (op === "=") {
    if (args.length !== 2) {
      throw new Cql2ReverseParseError(
        "bad-arg-arity",
        `"=" requires exactly 2 args, got ${args.length}`,
      );
    }
    const propRef = args[0] as { property?: string };
    const value = args[1];
    if (!propRef || typeof propRef.property !== "string") {
      throw new Cql2ReverseParseError(
        "malformed-node",
        `"=" expected {property} as first arg`,
      );
    }
    const filterType = PROPERTY_TO_FILTER_TYPE.get(propRef.property);
    if (!filterType) {
      throw new Cql2ReverseParseError(
        "unknown-property",
        `Unknown property path: ${propRef.property}`,
      );
    }
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      throw new Cql2ReverseParseError(
        "malformed-node",
        `"=" expected scalar value, got ${typeof value}`,
      );
    }
    return { type: filterType, value: String(value), negated };
  }

  if (op === "like") {
    if (args.length !== 2) {
      throw new Cql2ReverseParseError(
        "bad-arg-arity",
        `"like" requires exactly 2 args, got ${args.length}`,
      );
    }
    const propRef = args[0] as { property?: string };
    const value = args[1];
    if (!propRef || typeof propRef.property !== "string") {
      throw new Cql2ReverseParseError(
        "malformed-node",
        `"like" expected {property} as first arg`,
      );
    }
    const filterType = PROPERTY_TO_FILTER_TYPE.get(propRef.property);
    if (!filterType) {
      throw new Cql2ReverseParseError(
        "unknown-property",
        `Unknown property path: ${propRef.property}`,
      );
    }
    if (typeof value !== "string") {
      throw new Cql2ReverseParseError(
        "malformed-node",
        `"like" expected string pattern, got ${typeof value}`,
      );
    }
    // Strip leading/trailing % wildcards to recover the original value
    const inner = value.replace(/^%/, "").replace(/%$/, "");
    return { type: filterType, value: inner, negated };
  }

  if (op === "a_containedBy") {
    if (args.length !== 2) {
      throw new Cql2ReverseParseError(
        "bad-arg-arity",
        `"a_containedBy" requires exactly 2 args, got ${args.length}`,
      );
    }
    const valueList = args[0];
    const propRef = args[1] as { property?: string };
    if (!Array.isArray(valueList) || valueList.length === 0) {
      throw new Cql2ReverseParseError(
        "malformed-node",
        `"a_containedBy" expected non-empty value array as first arg`,
      );
    }
    if (!propRef || typeof propRef.property !== "string") {
      throw new Cql2ReverseParseError(
        "malformed-node",
        `"a_containedBy" expected {property} as second arg`,
      );
    }
    const filterType = PROPERTY_TO_FILTER_TYPE.get(propRef.property);
    if (!filterType) {
      throw new Cql2ReverseParseError(
        "unknown-property",
        `Unknown property path: ${propRef.property}`,
      );
    }
    const first = valueList[0];
    if (typeof first !== "string") {
      throw new Cql2ReverseParseError(
        "malformed-node",
        `"a_containedBy" values must be strings, got ${typeof first}`,
      );
    }
    return { type: filterType, value: first, negated };
  }

  throw new Cql2ReverseParseError(
    "unsupported-operator",
    `Unsupported top-level operator: ${op ?? "<undefined>"}`,
  );
}

/**
 * Top-level dispatch: reduce a CQL2 node into parts of a FilterExpression.
 * Handles `array_filter` (with optional NOT wrapper) separately from leaf
 * comparisons; recurses into `and` so mixed trees flatten correctly.
 *
 * OR wrapping: we only recognise an OR at the top level as a single OrGroup
 * whose children are themselves leaf predicates (matches what
 * `filterExpressionToCql2Json` emits for an `orGroups` entry).
 */
function absorbNode(
  node: Cql2Node,
  out: {
    predicates: Predicate[];
    orGroups: OrGroup[];
    arrayFilters: ArrayFilterPredicate[];
  },
  negated: boolean,
): void {
  const op = node.op;

  if (op === "and") {
    const args = node.args ?? [];
    for (const child of args) {
      if (typeof child !== "object" || child === null || Array.isArray(child)) {
        throw new Cql2ReverseParseError(
          "malformed-node",
          `"and" child must be an object node`,
        );
      }
      absorbNode(child as Cql2Node, out, negated);
    }
    return;
  }

  if (op === "or") {
    const args = node.args ?? [];
    const orPredicates: Predicate[] = [];
    for (const child of args) {
      if (typeof child !== "object" || child === null || Array.isArray(child)) {
        throw new Cql2ReverseParseError(
          "malformed-node",
          `"or" child must be an object node`,
        );
      }
      orPredicates.push(parseTopLevelComparison(child as Cql2Node, false));
    }
    out.orGroups.push({ predicates: orPredicates });
    return;
  }

  if (op === "not") {
    const args = node.args ?? [];
    if (args.length !== 1) {
      throw new Cql2ReverseParseError(
        "bad-arg-arity",
        `"not" requires exactly 1 arg, got ${args.length}`,
      );
    }
    const inner = args[0] as Cql2Node;
    if (inner?.op === "array_filter") {
      absorbArrayFilter(inner, out.arrayFilters, !negated);
      return;
    }
    // Leaf predicate negation
    out.predicates.push(parseTopLevelComparison(inner, !negated));
    return;
  }

  if (op === "array_filter") {
    absorbArrayFilter(node, out.arrayFilters, negated);
    return;
  }

  // Leaf comparison
  out.predicates.push(parseTopLevelComparison(node, negated));
}

function absorbArrayFilter(
  node: Cql2Node,
  arrayFilters: ArrayFilterPredicate[],
  negated: boolean,
): void {
  const args = node.args ?? [];
  if (args.length !== 2) {
    throw new Cql2ReverseParseError(
      "bad-arg-arity",
      `"array_filter" requires exactly 2 args, got ${args.length}`,
    );
  }
  const arrayRef = args[0] as { property?: string };
  if (!arrayRef || arrayRef.property !== "debrief:platforms") {
    throw new Cql2ReverseParseError(
      "malformed-node",
      `"array_filter" first arg must reference debrief:platforms`,
    );
  }
  const predicateNode = args[1] as Cql2Node;
  if (typeof predicateNode !== "object" || predicateNode === null) {
    throw new Cql2ReverseParseError(
      "malformed-node",
      `"array_filter" second arg must be a predicate node`,
    );
  }
  arrayFilters.push({
    array: "platforms",
    predicate: parseCql2Predicate(predicateNode),
    negated: negated === true ? true : false,
  });
}

/** Result of attempting to reconstruct a platform-chip attribute map (#186) */
export interface PlatformAttributeReconstruction {
  readonly attributes: Readonly<Partial<Record<PlatformField, string>>>;
  readonly negated: boolean;
}

/** Fields the filter-bar platform chip UI exposes (#186). */
const PLATFORM_UI_FIELDS: ReadonlySet<PlatformField> = new Set([
  'id',
  'name',
  'nationality',
  'vessel_class',
  'vessel_type',
  'vessel_role',
  'domain',
]);

/**
 * Reconstruct a platform-chip attribute map from an ArrayFilterPredicate,
 * or return null if the predicate shape cannot be represented in the UI
 * (OR sub-predicates, nested ANDs, unsupported fields).
 *
 * The FilterBar restore path calls this for each `array_filter` node to
 * decide whether a saved filter can be reconstructed losslessly. Failures
 * surface as a non-blocking error banner per `contracts/cql2-roundtrip.md`.
 */
export function arrayFilterToPlatformAttributes(
  af: ArrayFilterPredicate,
): PlatformAttributeReconstruction | null {
  const attrs: Partial<Record<PlatformField, string>> = {};
  const pred = af.predicate;

  const collect = (node: CompoundPredicate): boolean => {
    if (node.kind === 'comparison') {
      if (!PLATFORM_UI_FIELDS.has(node.field)) return false;
      attrs[node.field] = node.value;
      return true;
    }
    if (node.kind === 'and') {
      for (const child of node.children) {
        if (child.kind !== 'comparison') return false;
        if (!collect(child)) return false;
      }
      return true;
    }
    // 'or' or any unhandled shape is unsupported in the UI
    return false;
  };

  const ok = collect(pred);
  if (!ok) return null;

  const hasAny = Object.keys(attrs).length > 0;
  if (!hasAny) return null;
  return { attributes: attrs, negated: af.negated === true };
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
export function cql2JsonToFilterExpression(
  cql2: Record<string, unknown>,
): FilterExpression {
  // Empty object → match all (no-op filter)
  if (Object.keys(cql2).length === 0) {
    return { predicates: [], orGroups: [], arrayFilters: [] };
  }

  const out = {
    predicates: [] as Predicate[],
    orGroups: [] as OrGroup[],
    arrayFilters: [] as ArrayFilterPredicate[],
  };

  absorbNode(cql2 as Cql2Node, out, false);

  return {
    predicates: out.predicates,
    orGroups: out.orGroups,
    arrayFilters: out.arrayFilters,
  };
}
