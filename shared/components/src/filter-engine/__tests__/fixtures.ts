/**
 * Test fixture helpers for the CQL2 filter engine (#126).
 *
 * Loads the 100 mock STAC items from #125 fixtures and converts
 * them to StacBrowserItem[] for integration testing.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { StacBrowserItem, VesselTaxonomyNode } from "../types";
import { parseTaxonomy, type RawTaxonomy } from "../taxonomy";

const FIXTURES_DIR = path.resolve(
  __dirname,
  "../../../../schemas/fixtures/stac-browser",
);

interface StacItemJson {
  id: string;
  bbox: [number, number, number, number] | null;
  properties: {
    title: string;
    datetime: string | null;
    start_datetime?: string | null;
    end_datetime?: string | null;
    "debrief:vessel_classes"?: string[];
    "debrief:tags"?: string[];
    "debrief:feature_tags"?: string[];
    "debrief:author"?: string | null;
    "debrief:track_names"?: string[];
    "debrief:nationalities"?: string[];
  };
  collection?: string;
}

function stacJsonToItem(json: StacItemJson, itemPath: string): StacBrowserItem {
  const props = json.properties;
  return {
    id: json.id,
    title: props.title,
    itemPath,
    bbox: json.bbox,
    datetime: props.datetime,
    startDatetime: props.start_datetime ?? null,
    endDatetime: props.end_datetime ?? null,
    vesselClasses: props["debrief:vessel_classes"] ?? [],
    tags: props["debrief:tags"] ?? [],
    featureTags: props["debrief:feature_tags"] ?? [],
    author: props["debrief:author"] ?? null,
    trackNames: props["debrief:track_names"] ?? [],
    nationalities: props["debrief:nationalities"] ?? [],
    collection: json.collection ?? null,
  };
}

let cachedItems: StacBrowserItem[] | null = null;

/** Load all mock items from #125 fixtures */
export function loadMockItems(): StacBrowserItem[] {
  if (cachedItems) return cachedItems;

  const entries = fs.readdirSync(FIXTURES_DIR, { withFileTypes: true });
  const items: StacBrowserItem[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const itemPath = path.join(FIXTURES_DIR, entry.name, "item.json");
    if (!fs.existsSync(itemPath)) continue;
    const raw = JSON.parse(fs.readFileSync(itemPath, "utf-8")) as StacItemJson;
    items.push(stacJsonToItem(raw, itemPath));
  }

  cachedItems = items;
  return items;
}

let cachedTaxonomy: VesselTaxonomyNode[] | null = null;

/** Load vessel taxonomy from #125 fixtures */
export function loadTaxonomy(): VesselTaxonomyNode[] {
  if (cachedTaxonomy) return cachedTaxonomy;
  const raw = JSON.parse(
    fs.readFileSync(path.join(FIXTURES_DIR, "vessel-taxonomy.json"), "utf-8"),
  ) as RawTaxonomy;
  cachedTaxonomy = parseTaxonomy(raw.taxonomy);
  return cachedTaxonomy;
}
