/**
 * Sample GeoJSON features for the ToolMatchHarness.
 *
 * These simplified features are used for demonstration and testing.
 * They have minimal properties to focus on selection and tool matching.
 */

export interface SimpleFeature {
  id: string;
  kind: string;
  name: string;
}

/**
 * Sample features grouped by kind.
 */
export const sampleFeatures: SimpleFeature[] = [
  // Tracks
  { id: 'track-1', kind: 'TRACK', name: 'HMS Victory' },
  { id: 'track-2', kind: 'TRACK', name: 'USS Constitution' },
  { id: 'track-3', kind: 'TRACK', name: 'Contact Alpha' },

  // Reference locations (POINT kind)
  { id: 'ref-1', kind: 'POINT', name: 'Waypoint Alpha' },
  { id: 'ref-2', kind: 'POINT', name: 'Waypoint Bravo' },

  // Narrative entries
  { id: 'narrative-1', kind: 'NARRATIVE', name: 'Log Entry 1' },
  { id: 'narrative-2', kind: 'NARRATIVE', name: 'Log Entry 2' },
];

/**
 * Get features grouped by kind.
 */
export function getFeaturesByKind(): Map<string, SimpleFeature[]> {
  const grouped = new Map<string, SimpleFeature[]>();
  for (const feature of sampleFeatures) {
    const existing = grouped.get(feature.kind) ?? [];
    grouped.set(feature.kind, [...existing, feature]);
  }
  return grouped;
}

/**
 * Get feature by ID.
 */
export function getFeatureById(id: string): SimpleFeature | undefined {
  return sampleFeatures.find((f) => f.id === id);
}

/**
 * Get human-readable label for a kind.
 */
export function getKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    TRACK: 'Tracks',
    POINT: 'Reference Points',
    NARRATIVE: 'Narratives',
  };
  return labels[kind] ?? kind;
}
