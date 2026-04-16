/**
 * Schema description block for the NL → CQL2 prompt (#188 decision 3A).
 *
 * Derives the allowed-property table from `PROPERTY_MAP` in
 * `filter-engine/cql2-json.ts`. This is the single source of truth: if a new
 * `FilterType` is added upstream, the prompt automatically reflects it, and
 * the exhaustiveness check below forces a compile error if the mapping falls
 * out of sync.
 */

import { PROPERTY_MAP } from "../filter-engine";
import type { FilterType } from "../filter-engine";

/**
 * Operator table aligned with the forward serialiser in `cql2-json.ts`:
 *
 * - Array-valued filter types (vessel-class, tag, track-name, nationality)
 *   use `a_containedBy`.
 * - Free-text filter types (title, filename, plot-contents) use `like` with
 *   `%…%` wildcards.
 * - Scalar filter types (author, duration, modified, collection) use `=`.
 *
 * The prompt exposes the same mapping so the LLM produces CQL2 the reverse
 * parser accepts.
 */
const OPERATOR_BY_FILTER_TYPE: Readonly<Record<FilterType, string>> = {
  "vessel-class": "a_containedBy",
  tag: "a_containedBy",
  "track-name": "a_containedBy",
  nationality: "a_containedBy",
  title: "like",
  filename: "like",
  "plot-contents": "like",
  author: "=",
  duration: "=",
  modified: "=",
  collection: "=",
};

/**
 * Compile-time exhaustiveness: if a new `FilterType` is added without
 * extending `OPERATOR_BY_FILTER_TYPE`, this lookup will produce a TypeScript
 * error (missing index) at build time. Called once from `schemaDescription`
 * below to keep the reference live under `noUnusedLocals`.
 */
function operatorFor(t: FilterType): string {
  // Narrowing by switch forces every FilterType case.
  switch (t) {
    case "vessel-class":
    case "tag":
    case "track-name":
    case "nationality":
    case "title":
    case "filename":
    case "plot-contents":
    case "author":
    case "duration":
    case "modified":
    case "collection":
      return OPERATOR_BY_FILTER_TYPE[t];
    default: {
      const _never: never = t;
      return _never;
    }
  }
}

/**
 * Emit the CQL2 schema description block for the prompt. Derives every line
 * from `PROPERTY_MAP` so the description cannot drift from the evaluator.
 */
export function schemaDescription(): string {
  const entries = (Object.entries(PROPERTY_MAP) as [FilterType, string][])
    .map(([filterType, property]) => {
      const op = operatorFor(filterType);
      return `- filterType "${filterType}": CQL2 property "${property}", operator "${op}"`;
    })
    .join("\n");

  return [
    "CQL2 schema (allowed filter dimensions)",
    "======================================",
    "",
    "Each filter dimension maps to exactly one CQL2 property path and one",
    "operator. Your generated CQL2 MUST use these property paths verbatim;",
    "inventing new paths will fail validation.",
    "",
    entries,
    "",
    "Compound platform predicates (two or more fields on debrief:platforms)",
    "MUST use `array_filter(debrief:platforms, <predicate>)` so the predicate",
    "is evaluated per-platform rather than across the item. The predicate body",
    "uses bare property references (e.g. `nationality`, `domain`,",
    "`vessel_type`, `vessel_role`, `vessel_class`) and `=` comparisons, joined",
    "by `and`/`or` as needed.",
  ].join("\n");
}
