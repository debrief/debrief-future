/**
 * NL → CQL2 prompt composition (#188 research §5).
 *
 * Concatenates five sections in a fixed order:
 *   1. Role framing (static)
 *   2. CQL2 schema description (derived from PROPERTY_MAP — decision 3A)
 *   3. Enum bundle (nationalities, exercises, tags, feature_tags, taxonomy)
 *   4. Worked examples (static, not drawn from the corpus)
 *   5. User phrase
 *
 * Stable/cacheable content is placed first and the user phrase last, matching
 * the prompt-caching-friendly convention. Total size is bounded by the enum
 * set only (FR-003) — SC-004 caps it at 20 KB and decision 15A asserts that
 * at harness time.
 */

import { schemaDescription } from "./schemaDescription";
import type { EnumBundle, VesselClassNode } from "./types";

const ROLE_FRAMING = [
  "You translate maritime analyst phrases into CQL2 JSON filters over a local",
  "STAC catalog. The analyst phrases are short (2–10 words, English) and",
  "describe what plots they want to see.",
  "",
  "Output exactly one JSON object with this shape:",
  "",
  "{",
  '  "cql2": { ... },            // CQL2-JSON object; empty {} = no filter (match all)',
  '  "lozenges": [               // Human-readable filter summary (one entry per dimension)',
  '    { "filterType": "<FilterType>", "value": "<string>" }',
  "  ],",
  '  "unrecognised_terms": [...]  // Terms that could not be mapped to an enum value',
  "}",
  "",
  "Rules:",
  "- NEVER emit CQL2 that references properties outside the schema below.",
  "- NEVER include unrecognised terms as predicate values in cql2. Put them",
  "  in `unrecognised_terms` and omit them from the filter.",
  "- For compound platform predicates (two or more fields on one platform",
  "  record — e.g. nationality + domain), use `array_filter(debrief:platforms,",
  "  and(...))`.",
  "- Output a single JSON object. No surrounding prose, no code fences.",
].join("\n");

const WORKED_EXAMPLES = [
  "Worked examples",
  "===============",
  "",
  'Example 1: "British author Smith"',
  'Phrase references two independent dimensions (author = "Smith" — scalar;',
  'nationality = "GB" — array-valued platform field). These are AND-ed at the',
  "top level, not inside an array_filter, because only one is a platform",
  "field.",
  "",
  "Output:",
  "{",
  '  "cql2": {',
  '    "op": "and",',
  '    "args": [',
  '      { "op": "=", "args": [{ "property": "debrief:author" }, "Smith"] },',
  '      { "op": "a_containedBy", "args": [["GB"], { "property": "debrief:platforms[*].nationality" }] }',
  "    ]",
  "  },",
  '  "lozenges": [',
  '    { "filterType": "author", "value": "Smith" },',
  '    { "filterType": "nationality", "value": "GB" }',
  "  ],",
  '  "unrecognised_terms": []',
  "}",
  "",
  'Example 2: "French frigates on ASW operations" (compound platform predicate)',
  'Phrase references two platform fields on the same platform (nationality +',
  'vessel_role) plus a plot-level tag. The platform part MUST use array_filter.',
  "",
  "Output:",
  "{",
  '  "cql2": {',
  '    "op": "and",',
  '    "args": [',
  '      {',
  '        "op": "array_filter",',
  '        "args": [',
  '          { "property": "debrief:platforms" },',
  '          {',
  '            "op": "and",',
  '            "args": [',
  '              { "op": "=", "args": [{ "property": "nationality" }, "FR"] },',
  '              { "op": "=", "args": [{ "property": "vessel_role" }, "frigate"] }',
  "            ]",
  "          }",
  "        ]",
  "      },",
  '      { "op": "a_containedBy", "args": [["ASW"], { "property": "debrief:tags" }] }',
  "    ]",
  "  },",
  '  "lozenges": [',
  '    { "filterType": "vessel-class", "value": "frigate" },',
  '    { "filterType": "nationality", "value": "FR" },',
  '    { "filterType": "tag", "value": "ASW" }',
  "  ],",
  '  "unrecognised_terms": []',
  "}",
].join("\n");

/**
 * Render the vessel-class tree as a compact nested indented list so the LLM
 * can map common names (e.g. "destroyer", "Type 23") to taxonomy paths.
 */
function renderVesselClassTree(
  tree: Readonly<Record<string, VesselClassNode>>,
): string {
  const lines: string[] = [];
  function walk(
    subtree: Readonly<Record<string, unknown>>,
    path: string,
    depth: number,
  ): void {
    for (const [key, value] of Object.entries(subtree)) {
      if (key === "_class") continue;
      if (typeof value !== "object" || value === null) continue;
      const obj = value as Record<string, unknown>;
      const classMeta = obj._class as { full_name?: string } | undefined;
      const label =
        classMeta && typeof classMeta.full_name === "string"
          ? classMeta.full_name
          : key;
      const fullPath = path ? `${path}/${key}` : key;
      const indent = "  ".repeat(depth);
      lines.push(`${indent}- ${key} (${label})  [path: ${fullPath}]`);
      // Recurse into children (non-_class keys)
      const children: Record<string, unknown> = {};
      for (const [childKey, childVal] of Object.entries(obj)) {
        if (childKey === "_class") continue;
        children[childKey] = childVal;
      }
      if (Object.keys(children).length > 0) {
        walk(children, fullPath, depth + 1);
      }
    }
  }
  walk(tree, "", 0);
  return lines.join("\n");
}

function renderEnumBlock(enums: EnumBundle): string {
  return [
    "Allowed enum values",
    "===================",
    "",
    "Nationalities (ISO 3166-1 alpha-2):",
    enums.nationalities.join(", "),
    "",
    "Exercise names (used as `title` substring match — operator `like`):",
    enums.exercise_names.join(", "),
    "",
    "Plot-level tags (filterType `tag`):",
    enums.tags.join(", "),
    "",
    "Feature-level tags (filterType `tag` — searches featureTags too):",
    enums.feature_tags.join(", "),
    "",
    "Vessel class taxonomy (use the leaf or parent id as filter value; the",
    "evaluator expands parent nodes to their descendants automatically — e.g.",
    '"submarine" expands to ssk + ssn + all their variants):',
    renderVesselClassTree(enums.vessel_class_tree),
  ].join("\n");
}

/**
 * Compose the full NL → CQL2 prompt for a given phrase and enum bundle.
 */
export function buildPrompt(phrase: string, enums: EnumBundle): string {
  return [
    ROLE_FRAMING,
    "",
    schemaDescription(),
    "",
    renderEnumBlock(enums),
    "",
    WORKED_EXAMPLES,
    "",
    `Phrase: ${phrase}`,
  ].join("\n");
}
