/**
 * recompute.mjs — given the chip set after a removal, build a CQL2 JSON
 * expression equivalent to the remaining chips.
 *
 * This is the simplest possible re-serialisation: every chip becomes one
 * predicate, all chips AND together, and platform-scoped chips
 * (nationality / vessel-class / domain / vessel-type) are wrapped in an
 * `array_filter()` over `debrief:platforms` so they evaluate per-element. This
 * matches the shape 188's hand-authored fixtures emit.
 *
 * It's deliberately not a faithful round-trip of the original LLM CQL2 — that
 * would require the full reverse parser. For chip removal in the demo, an
 * equivalent expression that filters the same way is all that matters.
 */

const PLATFORM_FIELDS = new Set([
  "nationality",
  "vessel_class",
  "vessel_type",
  "vessel_role",
  "domain",
  "id",
  "name",
]);

/**
 * Map a chip's filterType to the per-element platform field name (used inside
 * an `array_filter`). Returns null for chips that filter on `debrief:platforms`
 * via the top-level `a_containedBy` operator instead — those are converted
 * separately via `topLevelArrayFor`.
 */
function platformFieldFor(filterType) {
  switch (filterType) {
    case "vessel_type":
      return "vessel_type";
    case "vessel_role":
      return "vessel_role";
    case "domain":
      return "domain";
    default:
      return null;
  }
}

/**
 * Map a chip's filterType to a top-level `a_containedBy` property path.
 * Used for filter types where the engine has hierarchical / case-insensitive
 * matchers (vessel-class needs descendant expansion via the taxonomy;
 * nationality is case-insensitive; tag merges debrief:tags + feature_tags).
 */
function topLevelArrayFor(filterType) {
  switch (filterType) {
    case "nationality":
      return "debrief:platforms[*].nationality";
    case "vessel-class":
    case "vessel_class":
      return "debrief:platforms[*].vessel_class";
    case "track-name":
      return "debrief:platforms[*].name";
    case "tag":
      return "debrief:tags";
    default:
      return null;
  }
}

/** Build a single platform comparison node, optionally negated. */
function comparisonNode(field, value, negated) {
  const eq = { op: "=", args: [{ property: field }, value] };
  return negated ? { op: "not", args: [eq] } : eq;
}

/** Build an `array_filter(debrief:platforms, predicate)` node. */
function arrayFilterNode(predicate) {
  return {
    op: "array_filter",
    args: [{ property: "debrief:platforms" }, predicate],
  };
}

/**
 * Build a top-level `a_containedBy` node — the form the filter-engine reverse
 * parser turns into a `Predicate` (with descendant expansion + case folding).
 */
function aContainedByNode(property, value, negated) {
  const node = { op: "a_containedBy", args: [[value], { property }] };
  return negated ? { op: "not", args: [node] } : node;
}

/**
 * Project a chip onto its top-level CQL2 expression. The output shape
 * intentionally mirrors what 188's hand-authored fixtures produce so the
 * filter-engine can apply the same matcher logic (descendant expansion,
 * case-insensitive comparisons) when a chip is removed.
 */
function chipToTopLevel(chip) {
  const value = String(chip.value ?? "");
  const negated = Boolean(chip.negated);

  // 1. Hierarchical / array-typed top-level chips → a_containedBy.
  const topLevelProperty = topLevelArrayFor(chip.filterType);
  if (topLevelProperty) {
    return aContainedByNode(topLevelProperty, value, negated);
  }

  // 2. Per-platform compound chips → array_filter(debrief:platforms, …).
  const platformField = platformFieldFor(chip.filterType);
  if (platformField) {
    return arrayFilterNode(comparisonNode(platformField, value, negated));
  }

  // 3. Scalar fallback — emit a top-level equality on the property name.
  return comparisonNode(chip.filterType, value, negated);
}

/**
 * @param {Array<{filterType: string, value: unknown, negated?: boolean}>} chips
 * @returns {Record<string, unknown> | null}  null when chips is empty.
 */
export function cql2FromChips(chips) {
  if (!Array.isArray(chips) || chips.length === 0) return null;
  const parts = chips.map(chipToTopLevel);
  if (parts.length === 1) return parts[0];
  return { op: "and", args: parts };
}

export const _internals = { platformFieldFor, PLATFORM_FIELDS };
