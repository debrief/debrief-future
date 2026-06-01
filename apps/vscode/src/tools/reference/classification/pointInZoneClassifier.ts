/**
 * Point-in-Zone Classifier tool implementation.
 *
 * Classifies reference points by buffer zone membership using ray-casting
 * point-in-polygon testing. Step 4 of the E03 buffer zone analysis chain.
 */

import type { IngressFeature } from '@debrief/schemas';
import type { MCPToolDefinition } from '../../../types/tool';

/** Default color for points outside all zones. */
const DEFAULT_COLOR = '#666666';
const DEFAULT_ZONE = 'none';

interface PointMetadataEntry {
  index: number;
  name: string;
  zone?: string;
  color?: string;
  [key: string]: unknown;
}

interface ZoneMetadata {
  name: string;
  detection_likelihood_pct: number;
  buffer_distance_nm: number;
  style: { fill_color?: string; color?: string };
}

export const toolDefinition: MCPToolDefinition = {
  name: 'point-in-zone-classifier',
  description:
    'Classify reference points by detection zone membership. Tests each coordinate against concentric zone polygons (innermost first) and updates per-point metadata with zone name and color.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' } },
      params: {
        type: 'object',
        properties: {},
      },
    },
  },
  annotations: {
    'debrief:selectionRequirements': [
      { kind: 'POINT', min: 1, max: 1 },
      { kind: 'ZONE', min: 1, max: 1 },
    ],
    'debrief:category': 'reference/classification',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'mutation/reference/classified_points',
    'debrief:uiCategory': 'calc',
  },
};

/**
 * Ray-casting point-in-polygon test.
 *
 * Casts a horizontal ray to the right from (px, py) and counts edge crossings.
 * Odd count = inside, even count = outside.
 */
function pointInPolygon(px: number, py: number, ring: number[][]): boolean {
  let inside = false;
  const n = ring.length;
  let j = n - 1;

  for (let i = 0; i < n; i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;

    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }

    j = i;
  }

  return inside;
}

/** Extract color from zone metadata, preferring fill_color over color. */
function getZoneColor(zoneInfo: ZoneMetadata): string {
  return zoneInfo.style.fill_color ?? zoneInfo.style.color ?? DEFAULT_COLOR;
}

export function execute(
  features: IngressFeature[],
  _params: Record<string, unknown>,
): IngressFeature[] {
  // Find reference and zone features
  let refFeature: IngressFeature | null = null;
  let zoneFeature: IngressFeature | null = null;

  for (const feature of features) {
    const props = feature.properties;
    if (!props) {
      continue;
    }
    const kind = props['kind'] as string | undefined;
    if (kind === 'POINT' && props['locationType'] === 'REFERENCE' && !refFeature) {
      refFeature = feature;
    } else if (kind === 'ZONE' && !zoneFeature) {
      zoneFeature = feature;
    }
  }

  // Validate inputs
  if (!refFeature) {
    throw new Error('No reference point feature found');
  }
  if (!zoneFeature) {
    throw new Error('No zone feature found');
  }

  if (!refFeature.geometry) {
    throw new Error('Reference feature has no geometry');
  }
  if (!zoneFeature.geometry) {
    throw new Error('Zone feature has no geometry');
  }

  if (refFeature.geometry.type !== 'MultiPoint') {
    throw new Error('Reference feature must have MultiPoint geometry');
  }
  if (zoneFeature.geometry.type !== 'MultiPolygon') {
    throw new Error('Zone feature must have MultiPolygon geometry');
  }

  if (!refFeature.properties) {
    throw new Error('Reference feature has no properties');
  }
  if (!zoneFeature.properties) {
    throw new Error('Zone feature has no properties');
  }

  const coordinates = refFeature.geometry.coordinates as number[][];
  const metadata = (refFeature.properties['pointMetadata'] ?? []) as PointMetadataEntry[];
  const zonePolygons = zoneFeature.geometry.coordinates as number[][][][];
  const zoneInfoList = (zoneFeature.properties['zones'] ?? []) as ZoneMetadata[];

  if (metadata.length !== coordinates.length) {
    throw new Error('pointMetadata length must match coordinates length');
  }

  // Handle empty coordinates
  if (coordinates.length === 0) {
    const classified = JSON.parse(JSON.stringify(refFeature)) as IngressFeature;
    if (!classified.properties) {
      classified.properties = {};
    }
    classified.properties['pointMetadata'] = [];
    classified.properties['pointColors'] = [];
    return [classified];
  }

  // Classify each point
  const pointColors: string[] = [];
  const newMetadata: PointMetadataEntry[] = [];

  for (let i = 0; i < coordinates.length; i++) {
    const px = coordinates[i]![0]!; // longitude
    const py = coordinates[i]![1]!; // latitude

    let assignedZone = DEFAULT_ZONE;
    let assignedColor = DEFAULT_COLOR;

    // Test zones innermost first (index 0 = highest likelihood)
    for (let z = 0; z < zonePolygons.length; z++) {
      if (z < zoneInfoList.length) {
        const ring = zonePolygons[z]![0]!; // outer ring of this polygon
        if (pointInPolygon(px, py, ring)) {
          assignedZone = zoneInfoList[z]!.name;
          assignedColor = getZoneColor(zoneInfoList[z]!);
          break; // innermost match wins
        }
      }
    }

    // Copy and update metadata entry (preserve existing fields)
    const entry: PointMetadataEntry = { ...metadata[i]! };
    entry.zone = assignedZone;
    entry.color = assignedColor;
    newMetadata.push(entry);
    pointColors.push(assignedColor);
  }

  // Build classified feature (deep copy of original with updated metadata)
  const classified = JSON.parse(JSON.stringify(refFeature)) as IngressFeature;
  if (!classified.properties) {
    classified.properties = {};
  }
  classified.properties['pointMetadata'] = newMetadata;
  classified.properties['pointColors'] = pointColors;

  // Assign a new unique ID so the classified result doesn't collide with the
  // original reference-points layer in the feature list / visibility toggle.
  const baseId = String(refFeature.id ?? 'ref-points');
  classified.id = `${baseId}-classified`;
  classified.properties['name'] = `${String(classified.properties['name'] ?? 'Reference Points')} (classified)`;

  return [classified];
}
