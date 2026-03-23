/**
 * flattenFeatures — compute a flat array of DisplayItem rows from
 * features + expansion state, for use with the virtualizer.
 *
 * Feature: 094-show-points-in-layers
 */

import type {
  DebriefFeature,
  TimestampedPosition,
  PositionStyleOverride,
  SegmentMetadata,
} from '../utils/types';
import {
  isTrackFeature,
  isMultiPointFeature,
  isMultiPolygonFeature,
  isExpandableFeature,
} from '../utils/types';

// ─── Types ──────────────────────────────────────────────────────────

export type DisplayItemType = 'feature' | 'position' | 'point' | 'polygon' | 'segment';

export interface DisplayItem {
  /** Discriminator for the row kind */
  type: DisplayItemType;
  /** Selection path for this item (e.g., 'track-001' or 'track-001/positions/4') */
  id: string;
  /** Display label for the row */
  label: string;
  /** Secondary info (e.g., course/speed for positions, coordinates for points) */
  sublabel: string | null;
  /** Nesting depth (0 = top-level, 1 = child of feature, 2 = child of segment) */
  depth: number;
  /** Feature ID of the parent (null for top-level features) */
  parentId: string | null;
  /** Whether this item can be expanded to show children */
  isExpandable: boolean;
  /** Reference to the original feature (only for type 'feature') */
  feature: DebriefFeature | null;
  /** Child index within parent (null for top-level features) */
  index: number | null;
}

// ─── Label helpers ──────────────────────────────────────────────────

function formatTime(isoTime: string): string {
  try {
    return new Date(isoTime).toLocaleTimeString();
  } catch {
    return isoTime;
  }
}

function getPositionLabel(
  position: TimestampedPosition,
  index: number,
  overrides?: PositionStyleOverride[],
): string {
  const override = overrides?.[index];
  if (override && 'label' in override && override.label) {
    return override.label;
  }
  if (position.time) {
    return formatTime(position.time);
  }
  return `Position ${index + 1}`;
}

function getPositionSublabel(position: TimestampedPosition): string | null {
  const parts: string[] = [];
  if (position.course !== undefined && position.course !== null) {
    parts.push(`${Math.round(position.course)}\u00B0`);
  }
  if (position.speed !== undefined && position.speed !== null) {
    parts.push(`${position.speed.toFixed(1)}kts`);
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

function formatCoordinate(coord: number[]): string {
  if (coord.length >= 2) {
    return `[${coord[0]!.toFixed(4)}, ${coord[1]!.toFixed(4)}]`;
  }
  return `[${coord.join(', ')}]`;
}

// ─── Flattening ─────────────────────────────────────────────────────

/**
 * Flatten features + expansion state into a flat array of display items.
 * This is a pure function — no side effects.
 */
export function flattenFeatures(
  features: DebriefFeature[],
  expandedIds: Set<string>,
): DisplayItem[] {
  const items: DisplayItem[] = [];

  for (const feature of features) {
    const featureId = feature.id;
    const expandable = isExpandableFeature(feature);
    const isExpanded = expandable && expandedIds.has(featureId);

    items.push({
      type: 'feature',
      id: featureId,
      label: '',
      sublabel: null,
      depth: 0,
      parentId: null,
      isExpandable: expandable,
      feature,
      index: null,
    });

    if (!isExpanded) continue;

    if (isTrackFeature(feature)) {
      flattenTrackChildren(items, feature, featureId, expandedIds);
    } else if (isMultiPointFeature(feature)) {
      flattenMultiPointChildren(items, feature, featureId);
    } else if (isMultiPolygonFeature(feature)) {
      flattenMultiPolygonChildren(items, feature, featureId);
    }
  }

  return items;
}

function flattenTrackChildren(
  items: DisplayItem[],
  feature: import('@debrief/schemas').TrackFeature,
  featureId: string,
  expandedIds: Set<string>,
): void {
  const props = feature.properties;

  if (props.segments && props.segments.length > 0) {
    flattenSegments(items, props.segments, featureId, props.position_style_overrides, expandedIds);
    return;
  }

  const positions = props.positions;
  if (!positions || positions.length === 0) {
    items.push({
      type: 'position',
      id: `${featureId}/positions/empty`,
      label: 'No child items',
      sublabel: null,
      depth: 1,
      parentId: featureId,
      isExpandable: false,
      feature: null,
      index: null,
    });
    return;
  }

  const overrides = props.position_style_overrides;
  for (let i = 0; i < positions.length; i++) {
    items.push({
      type: 'position',
      id: `${featureId}/positions/${i}`,
      label: getPositionLabel(positions[i]!, i, overrides),
      sublabel: getPositionSublabel(positions[i]!),
      depth: 1,
      parentId: featureId,
      isExpandable: false,
      feature: null,
      index: i,
    });
  }
}

function flattenSegments(
  items: DisplayItem[],
  segments: SegmentMetadata[],
  featureId: string,
  _overrides: PositionStyleOverride[] | undefined,
  expandedIds: Set<string>,
): void {
  for (const segment of segments) {
    const segmentName = segment.name ?? segment.segment_type;
    const segmentPath = `${featureId}/segments/${segmentName}`;
    const hasPositions = segment.positions && segment.positions.length > 0;
    const isSegmentExpanded = hasPositions && expandedIds.has(segmentPath);

    items.push({
      type: 'segment',
      id: segmentPath,
      label: segmentName,
      sublabel: segment.segment_type !== segmentName ? segment.segment_type : null,
      depth: 1,
      parentId: featureId,
      isExpandable: hasPositions,
      feature: null,
      index: null,
    });

    if (isSegmentExpanded && segment.positions) {
      for (let i = 0; i < segment.positions.length; i++) {
        items.push({
          type: 'position',
          id: `${segmentPath}/positions/${i}`,
          label: getPositionLabel(segment.positions[i]!, i),
          sublabel: getPositionSublabel(segment.positions[i]!),
          depth: 2,
          parentId: segmentPath,
          isExpandable: false,
          feature: null,
          index: i,
        });
      }
    }
  }
}

function flattenMultiPointChildren(
  items: DisplayItem[],
  feature: import('@debrief/schemas').MultiPointFeature,
  featureId: string,
): void {
  // Schema types coordinates as number[] but runtime data is number[][] (Position[])
  // eslint-disable-next-line no-restricted-syntax
  const coords = feature.geometry.coordinates as unknown as number[][];
  if (!coords || coords.length === 0) {
    items.push({
      type: 'point',
      id: `${featureId}/points/empty`,
      label: 'No child items',
      sublabel: null,
      depth: 1,
      parentId: featureId,
      isExpandable: false,
      feature: null,
      index: null,
    });
    return;
  }

  for (let i = 0; i < coords.length; i++) {
    items.push({
      type: 'point',
      id: `${featureId}/points/${i}`,
      label: `Point ${i + 1}`,
      sublabel: formatCoordinate(coords[i]!),
      depth: 1,
      parentId: featureId,
      isExpandable: false,
      feature: null,
      index: i,
    });
  }
}

function flattenMultiPolygonChildren(
  items: DisplayItem[],
  feature: import('@debrief/schemas').MultiPolygonFeature,
  featureId: string,
): void {
  // Schema types coordinates as number[] but runtime data is number[][][][] (Position[][][])
  // eslint-disable-next-line no-restricted-syntax
  const coords = feature.geometry.coordinates as unknown as number[][][][];
  if (!coords || coords.length === 0) {
    items.push({
      type: 'polygon',
      id: `${featureId}/polygons/empty`,
      label: 'No child items',
      sublabel: null,
      depth: 1,
      parentId: featureId,
      isExpandable: false,
      feature: null,
      index: null,
    });
    return;
  }

  for (let i = 0; i < coords.length; i++) {
    const outerRing = coords[i]![0];
    const vertexCount = outerRing ? outerRing.length : 0;
    items.push({
      type: 'polygon',
      id: `${featureId}/polygons/${i}`,
      label: `Polygon ${i + 1}`,
      sublabel: `${vertexCount} vertices`,
      depth: 1,
      parentId: featureId,
      isExpandable: false,
      feature: null,
      index: i,
    });
  }
}

/**
 * Check if any selected ID is a child of the given feature.
 * Uses simple string prefix matching — no path parsing required.
 */
export function hasChildSelected(featureId: string, selectedIds: Set<string>): boolean {
  const prefix = featureId + '/';
  for (const id of selectedIds) {
    if (id.startsWith(prefix)) return true;
  }
  return false;
}
