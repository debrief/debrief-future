/**
 * colour.mjs — map a `LozengeSeed.filterType` (or platform-field name from a
 * compound predicate) to a chip colour from the E10 prototype palette.
 *
 * See data-model.md §"Derivation rules" and research.md §2.
 */

const COLOUR_MAP = Object.freeze({
  nationality: "nationality",
  "vessel-class": "vessel",
  vessel_class: "vessel",
  vessel_type: "vessel",
  vessel_role: "vessel",
  "track-name": "vessel",
  domain: "domain",
  exercise: "exercise",
  tag: "tag",
  tags: "tag",
  feature_tags: "tag",
  year: "year",
});

/**
 * @param {string} filterType
 * @returns {"nationality"|"vessel"|"exercise"|"tag"|"year"|"domain"}
 */
export function colourFor(filterType) {
  if (typeof filterType !== "string") return "tag";
  const direct = COLOUR_MAP[filterType];
  if (direct) return direct;
  // Default any unknown filter type to the most neutral palette slot.
  return "tag";
}

/** All chip colours in the palette — exported for tests. */
export const ALL_CHIP_COLOURS = Object.freeze([
  "nationality",
  "vessel",
  "exercise",
  "tag",
  "year",
  "domain",
]);
