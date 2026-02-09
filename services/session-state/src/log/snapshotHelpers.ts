/**
 * Pure helper functions for snapshot operations.
 * Feature: 074-snapshots
 */

import type { GeoJsonFeatureCollection, GeoJsonFeature } from './types.js';

const SYSTEM_FEATURE_TYPE = 'system';

/** Normalise a provenance value to an array. */
export function normaliseProvenance(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return [raw];
  return [];
}

/** Find the system record in a FeatureCollection. */
export function findSystemRecord(fc: GeoJsonFeatureCollection): GeoJsonFeature | null {
  return fc.features.find(f => f.properties?.featureType === SYSTEM_FEATURE_TYPE) ?? null;
}

/** Create a minimal system record feature. */
export function createSystemRecord(): GeoJsonFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [] },
    properties: {
      featureType: 'system',
      snapshotLinks: null,
      branches: [],
      provenance: [],
    },
  };
}

/**
 * Strip provenance from spatial features (NOT system record).
 * Returns a deep copy.
 */
export function stripSpatialProvenance(fc: GeoJsonFeatureCollection): GeoJsonFeatureCollection {
  const cleanFeatures = fc.features.map(f => {
    const clone: GeoJsonFeature = JSON.parse(JSON.stringify(f));
    if (clone.properties && clone.properties.featureType !== SYSTEM_FEATURE_TYPE) {
      clone.properties.provenance = [];
    }
    return clone;
  });
  return { type: 'FeatureCollection', features: cleanFeatures };
}

/**
 * Count unique Log entries across all spatial features.
 * Deduplicates on activityId. Excludes system record.
 */
export function countLogEntries(fc: GeoJsonFeatureCollection): number {
  const seen = new Set<string>();
  for (const f of fc.features) {
    if (f.properties?.featureType === SYSTEM_FEATURE_TYPE) continue;
    const prov = normaliseProvenance(f.properties?.provenance);
    for (const entry of prov) {
      const e = entry as Record<string, unknown>;
      const activityId = e.activityId;
      if (typeof activityId === 'string' && activityId.length > 0) {
        seen.add(activityId);
      }
    }
  }
  return seen.size;
}

/**
 * Generate a snapshot filename from a timestamp.
 * Format: plot-snap-{ISO-timestamp-with-hyphens}.geojson
 */
export function generateSnapshotFilename(timestamp: Date = new Date()): string {
  const iso = timestamp.toISOString()
    .replace(/:/g, '-')
    .replace(/\.\d{3}Z$/, '');
  return `plot-snap-${iso}.geojson`;
}

/**
 * Trim provenance arrays on spatial features to keep only entries AFTER a given activityId.
 * The entry matching the activityId is removed (it belongs to the snapshot).
 * Returns a modified (in-place) FeatureCollection.
 */
export function trimProvenanceAfterEntry(
  fc: GeoJsonFeatureCollection,
  entryId: string
): { trimmed: GeoJsonFeatureCollection; entriesBefore: number; entriesAfter: number } {
  // First, find the timestamp of the entry to split on
  let splitTimestamp: string | null = null;
  for (const f of fc.features) {
    if (f.properties?.featureType === SYSTEM_FEATURE_TYPE) continue;
    const prov = normaliseProvenance(f.properties?.provenance);
    for (const entry of prov) {
      const e = entry as Record<string, unknown>;
      if (e.activityId === entryId) {
        splitTimestamp = e.timestamp as string;
        break;
      }
    }
    if (splitTimestamp) break;
  }

  if (!splitTimestamp) {
    throw new Error(`Entry with activityId "${entryId}" not found in any feature`);
  }

  // Count unique entries before and after the split
  const beforeIds = new Set<string>();
  const afterIds = new Set<string>();

  for (const f of fc.features) {
    if (f.properties?.featureType === SYSTEM_FEATURE_TYPE) continue;
    const prov = normaliseProvenance(f.properties?.provenance);
    for (const entry of prov) {
      const e = entry as Record<string, unknown>;
      const aid = e.activityId as string;
      const ts = e.timestamp as string;
      if (!aid) continue;
      if (ts <= splitTimestamp!) {
        beforeIds.add(aid);
      } else {
        afterIds.add(aid);
      }
    }
  }

  // Trim: keep only entries with timestamp > splitTimestamp
  for (const f of fc.features) {
    if (f.properties?.featureType === SYSTEM_FEATURE_TYPE) continue;
    if (!f.properties) continue;
    const prov = normaliseProvenance(f.properties.provenance);
    f.properties.provenance = prov.filter((entry) => {
      const e = entry as Record<string, unknown>;
      const ts = e.timestamp as string;
      return ts > splitTimestamp!;
    });
  }

  return { trimmed: fc, entriesBefore: beforeIds.size, entriesAfter: afterIds.size };
}
