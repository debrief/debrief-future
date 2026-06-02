/**
 * Pure trail-display helpers for the briefing renderer (#280).
 *
 * The standalone briefing renderer must honour each Scene's captured
 * `display_mode` (Full / Trail). In Trail mode a time-stamped track grows
 * from its start up to the current playback time — a snail-trail — instead
 * of always showing the full LineString. These two pure functions carry all
 * the logic; `BriefingMap` wires them to the active Scene and the playback
 * clock.
 *
 * - {@link classifyTemporalTrack} narrows a briefing feature to a track via
 *   the canonical `isTrackFeature` guard and reads the schema-typed
 *   `properties.positions` (parallel to `geometry.coordinates`) — the same
 *   source the main application's `extractTemporalData` uses. It returns a
 *   small render read-model or `null`; it never throws, so a malformed track
 *   falls back to its full line with no error (FR-007). The trail and the
 *   moving dot share this one classification (a track shows both or neither —
 *   FR-004 / FR-007).
 * - {@link displayCoords} computes the coordinates to draw at a given time.
 *   In Trail mode it delegates to `@debrief/utils`'s canonical
 *   `sliceTrackToTime`, guaranteeing the exported briefing's trail is
 *   visually identical to the main app's (FR-008 — parity by construction).
 */

import { sliceTrackToTime } from '@debrief/utils';
import { isTrackFeature, type DebriefFeature } from '@debrief/components';

/** Default stroke colour for a track without an explicit line colour. */
export const DEFAULT_TRACK_COLOR = '#1f77b4';

/**
 * A time-stamped track promoted to the renderer-local read-model shared by
 * the growing trail and the moving dot. Derived (never persisted) from a
 * canonical {@link DebriefFeature} track that passes the validity gate.
 */
export interface TemporalTrack {
  /** `feature.id ?? properties.platform_id` — stable Polyline key source. */
  id: string;
  /** Ordered `[lon, lat]` vertices (`geometry.coordinates`). */
  coords: [number, number][];
  /** Per-vertex epoch-ms times, parallel to `coords` (from `positions[].time`). */
  epochsMs: number[];
  /** Stroke colour (`properties.style.line.color ?? DEFAULT_TRACK_COLOR`). */
  colour: string;
  /** Display name (`display_name ?? platform_name ?? ''`). */
  name: string;
}

/**
 * Classify a briefing feature as a {@link TemporalTrack}, or `null` if it
 * does not participate in time-driven rendering.
 *
 * A feature qualifies only when `isTrackFeature` holds, its geometry is a
 * simple `LineString`, its `properties.positions` are parallel to the
 * coordinates (same length, ≥ 2), and every `positions[i].time` parses to a
 * finite epoch. Non-track features, compound (`MultiLineString`) tracks, and
 * malformed tracks return `null` and render in full via the existing layers
 * in both modes (FR-007, FR-009). This never throws.
 */
export function classifyTemporalTrack(feature: DebriefFeature): TemporalTrack | null {
  if (!isTrackFeature(feature)) return null;

  const geometry = feature.geometry;
  if (geometry.type !== 'LineString') return null;

  // Schema types coordinates as number[][]; the runtime shape is [lon, lat][].
  const coords = geometry.coordinates as unknown as [number, number][];
  const positions = feature.properties.positions;
  if (
    !Array.isArray(positions) ||
    positions.length !== coords.length ||
    coords.length < 2
  ) {
    return null;
  }

  const epochsMs = positions.map((p) => Date.parse(p.time));
  if (epochsMs.some((e) => Number.isNaN(e))) return null;

  const props = feature.properties;
  return {
    id: String(feature.id ?? props.platform_id ?? ''),
    coords,
    epochsMs,
    colour: props.style?.line?.color ?? DEFAULT_TRACK_COLOR,
    name: props.display_name ?? props.platform_name ?? '',
  };
}

/**
 * Compute the coordinates to draw for a track at the current playback time.
 *
 * - Full mode (`isTrail === false`): the whole track, unchanged, at every
 *   time (FR-002 / FR-003 — also the safe default for absent/unrecognised
 *   modes, which the caller maps to `false`).
 * - Trail mode (`isTrail === true`): `sliceTrackToTime` — empty before the
 *   track starts, growing to the nearest sample as time advances, the full
 *   track at/after the last recorded time (FR-001).
 */
export function displayCoords(
  coords: [number, number][],
  epochsMs: number[],
  isTrail: boolean,
  nowMs: number,
): [number, number][] {
  if (!isTrail) return coords;
  return sliceTrackToTime(coords, epochsMs, nowMs);
}
