/**
 * Pure trail-display helpers for the briefing renderer (#280).
 *
 * The standalone briefing renderer must honour each Scene's captured
 * `display_mode` (Full / Trail). In Trail mode a time-stamped track grows
 * from its start up to the current playback time — a snail-trail — instead
 * of always showing the full LineString. These two pure functions carry
 * all the logic; `BriefingMap` wires them to the active Scene and the
 * playback clock.
 *
 * - {@link classifyTemporalTrack} decides which features participate in
 *   time-driven rendering. It applies the SAME validity gate the moving
 *   position dot already uses, so a track shows both a growing trail and a
 *   dot, or neither (FR-004 / FR-007 consistency).
 * - {@link displayCoords} computes the coordinates to draw at a given time.
 *   In Trail mode it delegates to `@debrief/utils`'s canonical
 *   `sliceTrackToTime`, guaranteeing the exported briefing's trail is
 *   visually identical to the main app's (FR-008 — parity by construction).
 */

import { sliceTrackToTime } from '@debrief/utils';

/** Default stroke colour for a track without an explicit `colour`. */
export const DEFAULT_TRACK_COLOR = '#1f77b4';

/**
 * A time-stamped track promoted to the renderer-local read-model shared by
 * the growing trail and the moving dot. Derived (never persisted) from a
 * briefing `LineString` feature that passes the validity gate.
 */
export interface TemporalTrack {
  /** `properties.id ?? feature.id` — stable Polyline key source. */
  id: string;
  /** Ordered `[lon, lat]` vertices. */
  coords: [number, number][];
  /** Per-vertex epoch-ms times, parallel to `coords`. */
  epochsMs: number[];
  /** Stroke colour (`properties.colour ?? DEFAULT_TRACK_COLOR`). */
  colour: string;
  /** Display name (`properties.name ?? ''`). */
  name: string;
}

/** Minimal structural view of a briefing feature we need to classify. */
interface FeatureLike {
  id?: unknown;
  geometry?: { type?: string; coordinates?: unknown } | null;
  properties?:
    | {
        id?: unknown;
        name?: unknown;
        colour?: unknown;
        timestamps?: unknown;
        [k: string]: unknown;
      }
    | null;
}

/**
 * Classify a briefing feature as a {@link TemporalTrack}, or `null` if it
 * does not participate in time-driven rendering.
 *
 * Validity gate (all must hold): `geometry.type === 'LineString'`,
 * `properties.timestamps` is an array, its length equals the coordinate
 * count, there are ≥ 2 coordinates, and every timestamp parses to a finite
 * epoch. A feature failing the gate — and every non-LineString line/area
 * feature or point — renders in full via the existing layers in both modes
 * (FR-007, FR-009).
 */
export function classifyTemporalTrack(feature: unknown): TemporalTrack | null {
  const f = feature as FeatureLike;
  if (f.geometry?.type !== 'LineString') return null;

  const coords = f.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const timestamps = f.properties?.timestamps;
  if (!Array.isArray(timestamps) || timestamps.length !== coords.length) return null;

  const epochsMs = timestamps.map((iso) => Date.parse(iso as string));
  if (epochsMs.some((e) => Number.isNaN(e))) return null;

  const props = f.properties ?? {};
  const id = (props.id ?? f.id) as string | undefined;
  if (id == null) return null;

  return {
    id,
    coords: coords as [number, number][],
    epochsMs,
    colour: typeof props.colour === 'string' ? props.colour : DEFAULT_TRACK_COLOR,
    name: typeof props.name === 'string' ? props.name : '',
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
