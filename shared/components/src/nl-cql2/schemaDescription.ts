/**
 * CQL2 schema description for the NL → CQL2 prompt (#188 T015).
 *
 * Derives the schema block from `PROPERTY_MAP` in the filter-engine so the
 * prompt cannot drift away from the evaluator (decision 3A). The compile-time
 * `never`-default guarantees exhaustiveness: if a new `FilterType` is added
 * without a description here, TypeScript fails.
 */

import { PROPERTY_MAP } from "../filter-engine";
import type { FilterType } from "../filter-engine";

/** Human-readable description of the value space for each filter type. */
function describe(filterType: FilterType): string {
  switch (filterType) {
    case "vessel-class":
      return "platform vessel class token (e.g. submarine, frigate)";
    case "tag":
      return "plot-level tag string";
    case "author":
      return "plot author login";
    case "duration":
      return "duration bucket: <6H, <24H, <72H, <10D, >10D";
    case "modified":
      return "recency bucket: <6H, <24H, <7D, <1M, >1M";
    case "title":
      return "title substring (used with like/%)";
    case "filename":
      return "source filename substring (used with like/%)";
    case "plot-contents":
      return "plot contents substring (used with like/%)";
    case "track-name":
      return "platform name, e.g. HMS Victory";
    case "nationality":
      return "platform nationality code, e.g. GB, US, FR, DE";
    case "collection":
      return "STAC collection id";
    default: {
      // Exhaustiveness: TypeScript errors if a new FilterType is missing here.
      const _never: never = filterType;
      return _never;
    }
  }
}

/** CQL2 operator hints for each filter type, used by the prompt schema block. */
function operatorHint(filterType: FilterType): string {
  switch (filterType) {
    case "vessel-class":
    case "tag":
    case "track-name":
    case "nationality":
      return "a_containedBy (array-valued)";
    case "title":
    case "filename":
    case "plot-contents":
      return "like with %wildcards%";
    case "author":
    case "duration":
    case "modified":
    case "collection":
      return "= (scalar)";
    default: {
      const _never: never = filterType;
      return _never;
    }
  }
}

/**
 * Build the schema description block. Emits one line per `FilterType` pairing
 * its logical name, CQL2 property path, CQL2 operator, and value-space notes.
 *
 * Intended to be dropped into the prompt verbatim.
 */
export function schemaDescription(): string {
  const types = Object.keys(PROPERTY_MAP) as FilterType[];
  const lines: string[] = [
    "Filter schema — each row is a logical filter type, its CQL2 property path, the CQL2 operator to use, and the expected value space:",
  ];
  for (const filterType of types) {
    const property = PROPERTY_MAP[filterType];
    const op = operatorHint(filterType);
    const notes = describe(filterType);
    lines.push(`- ${filterType} → property "${property}" via ${op}; ${notes}`);
  }
  lines.push(
    "",
    "Compound platform predicates combining multiple platform fields (e.g. nationality AND domain) use array_filter over {property: \"debrief:platforms\"} with an inner {op:\"and\"|\"or\", args:[...]} tree whose leaves are {op:\"=\", args:[{property:<platform field>}, <value>]}. Platform fields: id, name, nationality, vessel_class, vessel_type, vessel_role, domain.",
    "Use not() to negate. Combine predicates at the top level with {op:\"and\", args:[...]} or {op:\"or\", args:[...]}.",
  );
  return lines.join("\n");
}
