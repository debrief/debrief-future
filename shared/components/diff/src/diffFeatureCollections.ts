/**
 * Compute differences between two GeoJSON FeatureCollections.
 *
 * Features are matched by their `id` property (or `properties.id` as fallback).
 * A feature is "modified" if its JSON serialisation differs between old and new.
 */

export interface GeoJSONFeature {
  type: "Feature";
  id?: string | number;
  geometry: unknown;
  properties: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

export interface ModifiedEntry {
  /** Feature ID */
  id: string;
  /** The updated feature from the new FeatureCollection */
  feature: GeoJSONFeature;
}

export interface FeatureCollectionDiff {
  /** Features present in new FC but not old */
  added: GeoJSONFeature[];
  /** Feature IDs present in old FC but not new */
  removed: string[];
  /** Features present in both but changed */
  modified: ModifiedEntry[];
}

function getFeatureId(feature: GeoJSONFeature): string {
  if (feature.id != null) return String(feature.id);
  if (feature.properties?.id != null) return String(feature.properties.id);
  return "";
}

export function diffFeatureCollections(
  oldFC: GeoJSONFeatureCollection,
  newFC: GeoJSONFeatureCollection,
): FeatureCollectionDiff {
  const oldMap = new Map<string, GeoJSONFeature>();
  for (const f of oldFC.features) {
    const id = getFeatureId(f);
    if (id) oldMap.set(id, f);
  }

  const newMap = new Map<string, GeoJSONFeature>();
  for (const f of newFC.features) {
    const id = getFeatureId(f);
    if (id) newMap.set(id, f);
  }

  const added: GeoJSONFeature[] = [];
  const modified: ModifiedEntry[] = [];
  const removed: string[] = [];

  // Find added and modified
  for (const [id, newFeature] of newMap) {
    const oldFeature = oldMap.get(id);
    if (!oldFeature) {
      added.push(newFeature);
    } else if (JSON.stringify(oldFeature) !== JSON.stringify(newFeature)) {
      modified.push({ id, feature: newFeature });
    }
  }

  // Find removed
  for (const id of oldMap.keys()) {
    if (!newMap.has(id)) {
      removed.push(id);
    }
  }

  return { added, removed, modified };
}
