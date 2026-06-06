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
import type { SensorData, SensorContact } from '@debrief/schemas';
import {
  isTrackFeature,
  isMultiPointFeature,
  isMultiPolygonFeature,
  isExpandableFeature,
} from '../utils/types';
import { isStoryboardFeature, isSceneFeature } from '../storyboard/types';

// ─── Types ──────────────────────────────────────────────────────────

export type DisplayItemType =
  | 'feature'
  | 'storyboard'
  | 'position'
  | 'point'
  | 'polygon'
  | 'segment'
  | 'group'
  | 'sensor'
  | 'contact';

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
  /**
   * Scene count for `'storyboard'` rows (Spec #258 / FR-013). Always
   * present on storyboard rows (including empty storyboards, which carry
   * `childCount: 0` and `isExpandable: false`). Absent on every other row
   * type.
   */
  childCount?: number;
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
    parts.push(`${Math.round(position.course).toString().padStart(3, '0')}\u00B0`);
  }
  if (position.speed !== undefined && position.speed !== null) {
    parts.push(`${position.speed.toFixed(1)}kts`);
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

function formatBearing(bearing: number, ambiguousBearing?: number): string {
  const primary = Math.round(bearing).toString().padStart(3, '0') + '\u00B0';
  if (ambiguousBearing !== undefined && ambiguousBearing !== null) {
    const secondary = Math.round(ambiguousBearing).toString().padStart(3, '0') + '\u00B0';
    return `${primary} / ${secondary}`;
  }
  return primary;
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

  // Spec #258 / FR-010 — bucket STORYBOARD_SCENE features under their
  // matching STORYBOARD parent. Build a sceneId-set up front so the main
  // loop can skip scenes whose parent is present (consumed by the
  // storyboard branch below). Scenes whose `storyboard_id` matches no
  // STORYBOARD feature fall back to top-level rendering with a
  // `console.warn` (Article I.3 — no silent failure).
  const storyboardIds = new Set<string>();
  for (const f of features) {
    const sbTest = f as unknown as Parameters<typeof isStoryboardFeature>[0];
    if (isStoryboardFeature(sbTest)) {
      storyboardIds.add(sbTest.properties.id);
    }
  }
  const consumedSceneIds = new Set<string>();

  for (const feature of features) {
    const featureId = feature.id;
    const sceneTest = feature as unknown as Parameters<typeof isSceneFeature>[0];
    const sbTest = feature as unknown as Parameters<typeof isStoryboardFeature>[0];

    // Storyboard parent row — Spec #258 / US4 (FR-010, FR-013, NEW-C).
    if (isStoryboardFeature(sbTest)) {
      const storyboardId = sbTest.properties.id;
      const children: typeof features = [];
      for (const candidate of features) {
        const ct = candidate as unknown as Parameters<typeof isSceneFeature>[0];
        if (!isSceneFeature(ct)) continue;
        if (ct.properties.storyboard_id !== storyboardId) continue;
        children.push(candidate);
        consumedSceneIds.add(candidate.id);
      }
      // Stable order: scenes ordered by timestamp ascending (their
      // canonical playback order).
      children.sort((a, b) => {
        const at = (a as unknown as { properties: { timestamp: string } }).properties.timestamp;
        const bt = (b as unknown as { properties: { timestamp: string } }).properties.timestamp;
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });

      const childCount = children.length;
      const isExpandable = childCount > 0;
      const isExpanded = isExpandable && expandedIds.has(featureId);
      items.push({
        type: 'storyboard',
        id: featureId,
        label: '',
        sublabel: null,
        depth: 0,
        parentId: null,
        isExpandable,
        feature,
        index: null,
        childCount,
      });

      if (!isExpanded) continue;
      for (const child of children) {
        items.push({
          type: 'feature',
          id: child.id,
          label: '',
          sublabel: null,
          depth: 1,
          parentId: featureId,
          isExpandable: false,
          feature: child,
          index: null,
        });
      }
      continue;
    }

    // Scene already consumed by a storyboard parent — skip the duplicate
    // top-level emission.
    if (isSceneFeature(sceneTest) && consumedSceneIds.has(feature.id)) {
      continue;
    }

    // Orphan scene fallback — emit at top level and log a warning.
    if (isSceneFeature(sceneTest) && !storyboardIds.has(sceneTest.properties.storyboard_id)) {
      // eslint-disable-next-line no-console
      console.warn(
        'Scene with orphan storyboard_id',
        feature.id,
        sceneTest.properties.storyboard_id,
      );
    }

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
  const hasSensors = (props.sensors?.length ?? 0) > 0;
  const segmentCount = props.segments?.length ?? 0;

  if (!hasSensors && segmentCount <= 1) {
    // Case A: no sensors, single or no segments — unchanged legacy path
    flattenPositionsDirect(items, props.positions, featureId, props.position_style_overrides, 1);
  } else if (!hasSensors && segmentCount > 1) {
    // Case B: no sensors, multiple segments — wrap in Track Segments group
    const groupId = `${featureId}/segments`;
    items.push({
      type: 'group',
      id: groupId,
      label: `Track Segments (${segmentCount})`,
      sublabel: null,
      depth: 1,
      parentId: featureId,
      isExpandable: true,
      feature: null,
      index: null,
    });
    if (expandedIds.has(groupId)) {
      flattenSegments(items, props.segments!, featureId, props.position_style_overrides, expandedIds, 2);
    }
  } else if (hasSensors && segmentCount <= 1) {
    // Case C: sensors, single or no segments — Positions + Sensors groups
    const posCount = props.positions?.length ?? 0;
    const posGroupId = `${featureId}/positions`;
    items.push({
      type: 'group',
      id: posGroupId,
      label: `Positions (${posCount})`,
      sublabel: null,
      depth: 1,
      parentId: featureId,
      isExpandable: true,
      feature: null,
      index: null,
    });
    if (expandedIds.has(posGroupId)) {
      flattenPositionsDirect(items, props.positions, featureId, props.position_style_overrides, 2);
    }
    flattenSensorsGroup(items, props.sensors!, featureId, expandedIds);
  } else {
    // Case D: sensors + multiple segments — Track Segments + Sensors groups
    const segGroupId = `${featureId}/segments`;
    items.push({
      type: 'group',
      id: segGroupId,
      label: `Track Segments (${segmentCount})`,
      sublabel: null,
      depth: 1,
      parentId: featureId,
      isExpandable: true,
      feature: null,
      index: null,
    });
    if (expandedIds.has(segGroupId)) {
      flattenSegments(items, props.segments!, featureId, props.position_style_overrides, expandedIds, 2);
    }
    flattenSensorsGroup(items, props.sensors!, featureId, expandedIds);
  }
}

function flattenPositionsDirect(
  items: DisplayItem[],
  positions: TimestampedPosition[] | undefined,
  featureId: string,
  overrides: PositionStyleOverride[] | undefined,
  depth: number,
): void {
  if (!positions || positions.length === 0) {
    items.push({
      type: 'position',
      id: `${featureId}/positions/empty`,
      label: 'No child items',
      sublabel: null,
      depth,
      parentId: featureId,
      isExpandable: false,
      feature: null,
      index: null,
    });
    return;
  }

  for (let i = 0; i < positions.length; i++) {
    items.push({
      type: 'position',
      id: `${featureId}/positions/${i}`,
      label: getPositionLabel(positions[i]!, i, overrides),
      sublabel: getPositionSublabel(positions[i]!),
      depth,
      parentId: featureId,
      isExpandable: false,
      feature: null,
      index: i,
    });
  }
}

function flattenSensorsGroup(
  items: DisplayItem[],
  sensors: SensorData[],
  featureId: string,
  expandedIds: Set<string>,
): void {
  const sensorsGroupId = `${featureId}/sensors`;
  items.push({
    type: 'group',
    id: sensorsGroupId,
    label: `Sensors (${sensors.length})`,
    sublabel: null,
    depth: 1,
    parentId: featureId,
    isExpandable: true,
    feature: null,
    index: null,
  });

  if (!expandedIds.has(sensorsGroupId)) return;

  for (const sensor of sensors) {
    const sensorId = `${featureId}/sensors/${sensor.name}`;
    const contactCount = sensor.contacts.length;
    items.push({
      type: 'sensor',
      id: sensorId,
      label: sensor.name,
      sublabel: `${contactCount} contact${contactCount !== 1 ? 's' : ''}`,
      depth: 2,
      parentId: sensorsGroupId,
      isExpandable: true,
      feature: null,
      index: null,
    });

    if (!expandedIds.has(sensorId)) continue;

    flattenContacts(items, sensor.contacts, sensorId);
  }
}

function flattenContacts(
  items: DisplayItem[],
  contacts: SensorContact[],
  sensorId: string,
): void {
  if (contacts.length === 0) {
    items.push({
      type: 'contact',
      id: `${sensorId}/contacts/empty`,
      label: 'No contacts',
      sublabel: null,
      depth: 3,
      parentId: sensorId,
      isExpandable: false,
      feature: null,
      index: null,
    });
    return;
  }

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]!;
    items.push({
      type: 'contact',
      id: `${sensorId}/contacts/${i}`,
      label: formatTime(contact.time),
      sublabel: formatBearing(contact.bearing, contact.ambiguous_bearing),
      depth: 3,
      parentId: sensorId,
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
  baseDepth: number = 1,
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
      depth: baseDepth,
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
          depth: baseDepth + 1,
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
 * Extract the root feature ID from any path in the DisplayItem ID scheme.
 * E.g., 'track-001/sensors/TOWED/contacts/3' → 'track-001'
 */
export function getRootFeatureId(path: string): string {
  const slashIndex = path.indexOf('/');
  return slashIndex === -1 ? path : path.slice(0, slashIndex);
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
