/**
 * Prompt composition for the NL → CQL2 generator (#188 T016).
 *
 * Concatenates role framing → schema description → enum bundle → worked
 * examples → user phrase, in the fixed order from research.md §5. The worked
 * examples are deliberately NOT drawn from the corpus so corpus passes test
 * generalisation rather than memorisation.
 */

import { schemaDescription } from "./schemaDescription";
import type { EnumBundle } from "./types";

/**
 * Current prompt template version. Bump manually when the prompt changes in
 * a way that would invalidate recorded fixtures. `RecordedLLMClient` compares
 * hashes (not versions) to detect drift, but this string travels with the
 * diagnostics for debugging.
 */
export const PROMPT_VERSION = "2026-04-14.1";

const ROLE_FRAMING = `You translate short maritime-analyst phrases into CQL2-JSON filters over a local STAC catalog.

Respond with ONE JSON object on a single line. No prose, no code fences, no trailing commentary. The response MUST match this shape exactly:

{
  "cql2": <CQL2-JSON object — use {} for an empty/no-op filter>,
  "lozenges": [
    { "filterType": <filter-type string>, "value": <string>, "negated": <boolean, optional> }
  ],
  "unrecognisedTerms": [<string>, ...]
}

Rules:
- "cql2" MUST reference only property paths listed in the Filter schema below. Never invent property names.
- "lozenges" summarises the human-visible filter dimensions — one entry per predicate, in the order they appear in the CQL2.
- "unrecognisedTerms" lists any tokens from the user phrase that do not map to a known enum value (nationalities, vessel_classes, tags, feature_tags, exercise_names). Use lowercase, trimmed.
- If a token is unrecognised, DO NOT fabricate a filter predicate for it. Omit it from "cql2" and "lozenges".
- If the phrase is empty or unresolvable, return {"cql2": {}, "lozenges": [], "unrecognisedTerms": []}.`;

const WORKED_EXAMPLES = `Worked examples (these phrases are illustrative only; analyst phrases will differ):

Example 1 (single-dimension filter):
Phrase: "reports authored by Alice"
Response: {"cql2":{"op":"=","args":[{"property":"debrief:author"},"Alice"]},"lozenges":[{"filterType":"author","value":"Alice"}],"unrecognisedTerms":[]}

Example 2 (compound platform predicate — use array_filter):
Phrase: "French surface ships"
Response: {"cql2":{"op":"array_filter","args":[{"property":"debrief:platforms"},{"op":"and","args":[{"op":"=","args":[{"property":"nationality"},"FR"]},{"op":"=","args":[{"property":"domain"},"surface"]}]}]},"lozenges":[{"filterType":"nationality","value":"FR"},{"filterType":"vessel-class","value":"surface"}],"unrecognisedTerms":[]}`;

function formatEnumBundle(enums: EnumBundle): string {
  const lines: string[] = ["Allowed enum values (use these tokens verbatim in CQL2 and lozenges):"];
  lines.push(`- nationalities: ${JSON.stringify(enums.nationalities)}`);
  lines.push(`- exercise_names: ${JSON.stringify(enums.exercise_names)}`);
  lines.push(`- tags: ${JSON.stringify(enums.tags)}`);
  lines.push(`- feature_tags: ${JSON.stringify(enums.feature_tags)}`);
  lines.push(`- vessel_class_tree (hierarchical tree of allowed vessel_class tokens): ${JSON.stringify(enums.vessel_class_tree)}`);
  return lines.join("\n");
}

/**
 * Build the full prompt for a given phrase + enum bundle.
 *
 * Order (research.md §5, decision 2A/3A):
 *   1. Role framing
 *   2. CQL2 schema description (derived from PROPERTY_MAP)
 *   3. Enum bundle
 *   4. Worked examples (not from corpus)
 *   5. User phrase
 */
export function buildPrompt(phrase: string, enums: EnumBundle): string {
  return [
    ROLE_FRAMING,
    "",
    schemaDescription(),
    "",
    formatEnumBundle(enums),
    "",
    WORKED_EXAMPLES,
    "",
    `Phrase: ${phrase}`,
  ].join("\n");
}
