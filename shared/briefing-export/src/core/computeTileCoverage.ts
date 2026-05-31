/**
 * computeTileCoverage — pure function (no I/O) that returns the minimal
 * set of (z, x, y) tile coordinates the briefing SPA needs at playback
 * time. Implements the algorithm in `contracts/tile-coverage.md`.
 *
 * Uses the standard Web Mercator (EPSG:3857) tiling scheme — the same
 * projection Leaflet's `TileLayer` uses by default.
 */

import { isTimeRangeScene } from '@debrief/components/storyboard';
import type { SceneFeature } from '@debrief/components/storyboard';

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export interface TileCoverageInput {
  scenes: readonly SceneFeature[];
  /** Padding in tiles around each viewport's bounding box (default 1). */
  tilePadding?: number;
  /**
   * Samples per time-range Scene's interpolation path. When 0 (default),
   * the formula `max(8, ceil(transition_duration_ms / 1000))` is used.
   * Explicitly setting >0 overrides the formula.
   */
  interpolationSamples?: number;
  /** Optional explicit zoom cap (defaults to the max captured zoom + padding). */
  maxZoomCap?: number;
}

export interface TileCoverageOutput {
  tiles: readonly TileCoord[];
  maxZoom: number;
  approxBytes: number;
}

interface Viewport {
  center: [number, number]; // [lon, lat]
  zoom: number;
}

const APPROX_BYTES_PER_TILE = 5_000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function lonToTileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, z));
}

function latToTileY(lat: number, z: number): number {
  const rad = toRadians(lat);
  const n = Math.pow(2, z);
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  );
}

function viewportTileBox(
  viewport: Viewport,
  z: number,
  padding: number,
): { xMin: number; xMax: number; yMin: number; yMax: number } {
  // The viewport's center is at zoom `viewport.zoom`. We compute the
  // tile that contains the center at zoom `z`, then expand by `padding`
  // tiles in all directions. This is an approximation (we don't compute
  // the exact bounding box) — sufficient for the briefing use case where
  // we want a safety margin around what the user actually viewed.
  const cx = lonToTileX(viewport.center[0], z);
  const cy = latToTileY(viewport.center[1], z);
  const maxTile = Math.pow(2, z) - 1;
  // The visible area at the *Scene's* captured zoom typically spans
  // roughly 2-3 tiles per axis. We add a base expansion of 2 then the
  // user-supplied padding.
  const base = 2;
  const xMin = Math.max(0, cx - base - padding);
  const xMax = Math.min(maxTile, cx + base + padding);
  const yMin = Math.max(0, cy - base - padding);
  const yMax = Math.min(maxTile, cy + base + padding);
  return { xMin, xMax, yMin, yMax };
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

function lerpLongitude(a: number, b: number, f: number): number {
  // Antimeridian-aware lon lerp. If the diff > 180, go the short way
  // around the antimeridian.
  let diff = b - a;
  if (diff > 180) {diff -= 360;}
  if (diff < -180) {diff += 360;}
  let result = a + diff * f;
  if (result > 180) {result -= 360;}
  if (result < -180) {result += 360;}
  return result;
}

function roundedLerp(za: number, zb: number, f: number): number {
  return Math.round(za + (zb - za) * f);
}

function viewportOf(scene: SceneFeature): Viewport {
  const v = scene.properties.viewport as { center?: unknown; zoom?: unknown } | undefined;
  if (!v) {
    return { center: [0, 0], zoom: 0 };
  }
  const center = (v.center as [number, number] | undefined) ?? [0, 0];
  const zoom = (v.zoom as number | undefined) ?? 0;
  return { center, zoom };
}

function viewportEndOf(scene: SceneFeature): Viewport | null {
  const ve = (scene.properties as { viewport_end?: { center?: unknown; zoom?: unknown } })
    .viewport_end;
  if (!ve) {return null;}
  const center = (ve.center as [number, number] | undefined) ?? [0, 0];
  const zoom = (ve.zoom as number | undefined) ?? 0;
  return { center, zoom };
}

function autoInterpolationSamples(scene: SceneFeature): number {
  const dur = (scene.properties as { transition_duration_ms?: unknown }).transition_duration_ms;
  const ms = typeof dur === 'number' ? dur : 1000;
  return Math.max(8, Math.ceil(ms / 1000));
}

export function computeTileCoverage(input: TileCoverageInput): TileCoverageOutput {
  const padding = input.tilePadding ?? 1;
  const explicitSamples = input.interpolationSamples ?? 0;

  const tileSet = new Set<string>();
  let observedMaxZoom = 0;

  const addCoverage = (viewport: Viewport, z: number): void => {
    if (z < 0 || z > 22) {return;} // sanity bounds; Leaflet caps at 22
    observedMaxZoom = Math.max(observedMaxZoom, z);
    const box = viewportTileBox(viewport, z, padding);
    for (let x = box.xMin; x <= box.xMax; x++) {
      for (let y = box.yMin; y <= box.yMax; y++) {
        tileSet.add(`${z}/${x}/${y}`);
      }
    }
  };

  for (const scene of input.scenes) {
    if (!isTimeRangeScene(scene)) {
      const v = viewportOf(scene);
      addCoverage(v, v.zoom);
      continue;
    }

    // Time-range Scene — cover start, end, interpolation samples, and
    // every integer zoom between start and end zoom levels.
    const vStart = viewportOf(scene);
    const vEnd = viewportEndOf(scene);
    if (!vEnd) {
      // Defensive — flavourCheck() should have rejected this. Treat as instant.
      addCoverage(vStart, vStart.zoom);
      continue;
    }

    addCoverage(vStart, vStart.zoom);
    addCoverage(vEnd, vEnd.zoom);

    const samples = explicitSamples > 0 ? explicitSamples : autoInterpolationSamples(scene);
    for (let i = 1; i < samples; i++) {
      const f = i / samples;
      const v: Viewport = {
        center: [lerpLongitude(vStart.center[0], vEnd.center[0], f), lerp(vStart.center[1], vEnd.center[1], f)],
        zoom: lerp(vStart.zoom, vEnd.zoom, f),
      };
      const z = roundedLerp(vStart.zoom, vEnd.zoom, f);
      addCoverage(v, z);
    }

    // Cover every integer zoom between start and end (so a zoom-in
    // tween shows tiles at intermediate levels, not just start/end).
    const zMin = Math.min(vStart.zoom, vEnd.zoom);
    const zMax = Math.max(vStart.zoom, vEnd.zoom);
    for (let z = zMin; z <= zMax; z++) {
      addCoverage(vStart, z);
      addCoverage(vEnd, z);
    }
  }

  const tiles: TileCoord[] = Array.from(tileSet)
    .map((key) => {
      const parts = key.split('/').map((n) => Number(n));
      return { z: parts[0]!, x: parts[1]!, y: parts[2]! };
    })
    .sort((a, b) => (a.z !== b.z ? a.z - b.z : a.x !== b.x ? a.x - b.x : a.y - b.y));

  const cappedMaxZoom = input.maxZoomCap ?? observedMaxZoom;

  return {
    tiles,
    maxZoom: cappedMaxZoom,
    approxBytes: tiles.length * APPROX_BYTES_PER_TILE,
  };
}
