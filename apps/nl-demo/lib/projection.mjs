/**
 * projection.mjs — project a `StacBrowserItem` (camelCased shape from
 * filter-engine) into a flattened `CardProjection` for the demo's card grid.
 *
 * See data-model.md §"CardProjection".
 */

const MAX_TAGS = 3;
const DESC_BUDGET_CHARS = 200;

/**
 * Truncate `text` at the nearest word boundary at or before `budget` chars.
 * Adds an ellipsis. If `text` already fits, returns it unchanged.
 *
 * @param {string} text
 * @param {number} [budget]
 * @returns {string}
 */
export function truncateDescription(text, budget = DESC_BUDGET_CHARS) {
  if (typeof text !== "string") return "";
  if (text.length <= budget) return text;
  // Find the last whitespace at or before `budget`, so we don't truncate
  // mid-word.
  const slice = text.slice(0, budget);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 0 ? lastSpace : budget;
  return slice.slice(0, cut).trimEnd() + "…";
}

/**
 * Resolve a nationality code to a display label using the platform registry.
 * Today we just upper-case the raw code (e.g. GB → "GB"); the registry has no
 * top-level nationality dictionary, so showing the ISO code is the most
 * faithful representation. Customers asked for "UK" specifically — handle that
 * one alias here.
 *
 * @param {string|undefined|null} code
 * @returns {string}
 */
export function resolveNationality(code) {
  if (!code) return "";
  const upper = String(code).toUpperCase();
  if (upper === "GB") return "UK";
  return upper;
}

/**
 * Build a `vessel_type → display_name` lookup table from the platform registry.
 * Walks the vessel_classes tree and indexes every node that has a `_class`
 * entry by its key (the short code, e.g. "type23").
 *
 * Exported so the demo can build it once at startup.
 *
 * @param {{vessel_classes?: Record<string, unknown>}} registry
 * @returns {Map<string, string>}
 */
export function buildVesselTypeIndex(registry) {
  const index = new Map();
  const root = registry?.vessel_classes;
  if (!root) return index;

  function walk(subtree) {
    for (const [key, value] of Object.entries(subtree)) {
      if (key === "_class") continue;
      if (!value || typeof value !== "object") continue;
      const node = value;
      const classMeta = node._class;
      if (classMeta && typeof classMeta === "object" && classMeta.full_name) {
        index.set(key, classMeta.full_name);
      }
      walk(node);
    }
  }
  walk(root);
  return index;
}

/**
 * Resolve a vessel-type code (e.g. "type23") to a registry-provided
 * display name (e.g. "Type 23 (Duke-class)"). Falls back to the raw code.
 *
 * @param {string|undefined|null} code
 * @param {Map<string,string>} index
 * @returns {string}
 */
export function resolveVesselType(code, index) {
  if (!code) return "";
  const direct = index.get(code);
  if (direct) return direct;
  return String(code);
}

/**
 * Project a `StacBrowserItem` into a `CardProjection`.
 *
 * @param {object} item — StacBrowserItem (camelCase from filter-engine)
 * @param {object} registry — { vesselTypeIndex: Map<string,string> }
 * @returns {object}
 */
export function projectCard(item, registry) {
  const id = String(item?.id ?? "");
  const title = item?.title ?? id;
  const description = truncateDescription(extractDescription(item) ?? "");
  const year = extractYear(item);
  const vesselTypeIndex = registry?.vesselTypeIndex ?? new Map();

  // De-duplicate badges so we don't render five "UK" pills for a fleet of
  // British ships.
  const nationalityBadges = uniq(
    (item?.platforms ?? [])
      .map((p) => resolveNationality(p?.nationality))
      .filter(Boolean),
  );
  const vesselBadges = uniq(
    (item?.platforms ?? [])
      .map((p) => resolveVesselType(p?.vessel_type, vesselTypeIndex))
      .filter(Boolean),
  );

  const tagBadges = uniq([
    ...(item?.tags ?? []),
    ...(item?.featureTags ?? []),
  ]).slice(0, MAX_TAGS);

  return {
    id,
    title,
    year,
    description,
    nationalityBadges,
    vesselBadges,
    tagBadges,
  };
}

/**
 * @param {Iterable<string>} items
 * @returns {string[]}
 */
function uniq(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function extractDescription(item) {
  // CatalogOverviewItem doesn't include description; fall back to raw STAC
  // properties when present (the demo loads raw item.json).
  const props = item?.properties ?? item?.rawProperties;
  if (props && typeof props.description === "string") return props.description;
  if (typeof item?.description === "string") return item.description;
  return "";
}

function extractYear(item) {
  const dt = item?.startDatetime ?? item?.datetime;
  if (!dt) return "";
  const yr = String(dt).slice(0, 4);
  return /^\d{4}$/.test(yr) ? yr : "";
}
