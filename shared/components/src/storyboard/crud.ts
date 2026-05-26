/**
 * Storyboard CRUD operations.
 *
 * Every mutation op:
 *   1. Validates preconditions, throws a typed StoryboardError if not met
 *   2. Uses `immer.produce` for structural sharing (unmodified Features
 *      remain reference-equal across input and output FeatureCollections)
 *   3. Appends exactly one LogEntry to the target Feature's inherited
 *      `provenance[]` slot via `buildStoryboardCrudLogEntry`
 *   4. Returns the new plot + affected entity object(s) — the module never
 *      mutates the input plot in place
 *
 * Async — Web Crypto's `subtle.digest` is async, and the API is async-
 * first for consistency (R11). Pure queries live in `queries.ts` and
 * `ordering.ts` — they stay sync.
 */

import {
  produce,
  setAutoFreeze,
  setUseStrictShallowCopy,
  type Draft,
} from "immer";
import { ulid as generateUlid } from "ulid";

// Performance tuning for very large plot FeatureCollections (FR-TEST-024
// targets p95 < 10 ms at 100k positions):
//   - autoFreeze off: structural sharing is the goal; freezing every
//     emitted Feature roughly doubles the cost on large plots.
//     Consumers treat returned plots as immutable by convention.
//   - useStrictShallowCopy off: drafts skip the slow path that copies
//     non-enumerable properties + symbols; our Features are plain JSON
//     objects so the loose path is safe.
setAutoFreeze(false);
setUseStrictShallowCopy(false);

import type {
  GeoJSONPolygon,
  LogEntry,
  PolygonSource,
  SceneProperties,
  StoryboardProperties,
  TimeRange,
  Viewport,
  WasGeneratedBy,
} from "@debrief/schemas";

import { formatDtg } from "./dtg";
import {
  DuplicateStoryboardNameError,
  OrphanSceneError,
  ReservedSlotViolationError,
  SceneFlavourXorViolationError,
  SceneTimeRangeEndNotAfterStartError,
  ThumbnailDeepCopyFailedError,
  UnknownSceneError,
  UnknownStoryboardError,
  CreationOrderOutOfRangeError,
} from "./errors";
import {
  canonicaliseVisibleFeatureIds,
  computeFeatureSetHash,
} from "./hash";
import { buildStoryboardCrudLogEntry } from "./provenance";
import type {
  Plot,
  PlotFeature,
  SceneFeature,
  StoryboardFeature,
} from "./types";
import { isSceneFeature, isStoryboardFeature } from "./types";

const CRUD_SUMMARY_LIMIT = 140;

function defaultUuid(): string {
  // Prefer platform UUID v4 — Node 18+, every evergreen browser.
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  // Fallback — should never happen in supported envs.
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;
}

function defaultNow(): string {
  return new Date().toISOString();
}

function truncateSummary(s: string): string {
  return s.length > CRUD_SUMMARY_LIMIT
    ? `${s.slice(0, CRUD_SUMMARY_LIMIT - 1)}…`
    : s;
}

function makeBoundingPolygon(
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
): GeoJSONPolygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat],
      ],
    ],
  };
}

/**
 * Structural bounds-shape used by Spec #258 scene capture. Keeps `crud.ts`
 * platform-agnostic — callers convert Leaflet's `LatLngBounds` (or any other
 * source) to this POJO before invoking `createScene` / `updateScene`.
 */
export interface SceneBounds {
  /** Western longitude in degrees (-180 to 180). */
  readonly west: number;
  /** Southern latitude in degrees (-90 to 90). */
  readonly south: number;
  /** Eastern longitude in degrees (-180 to 180). */
  readonly east: number;
  /** Northern latitude in degrees (-90 to 90). */
  readonly north: number;
}

/**
 * Convert a four-corner bounding box to a closed GeoJSON Polygon ring
 * `[SW, NW, NE, SE, SW]`. The `source` value is informational — callers
 * persist it on the scene's `_polygon_source` slot for render-side
 * provenance (Spec #258 / FR-006).
 */
export function bboxToPolygon(
  bounds: SceneBounds,
  source: PolygonSource,
): GeoJSONPolygon {
  // `source` is part of the helper's contract — callers always tell us why
  // they're computing the polygon — but the geometry itself is the same;
  // the provenance value is persisted separately on `_polygon_source` by
  // the caller. Reference it in a no-op so TypeScript's noUnusedParameters
  // is satisfied while keeping the param on the surface (intent signalling).
  void source;
  return makeBoundingPolygon(bounds.west, bounds.south, bounds.east, bounds.north);
}

/**
 * Legacy fallback when callers do not supply real bounds (e.g. headless
 * callers that only have a `Viewport`). Synthesises a non-degenerate ~100m
 * square around the viewport centre — schema-valid but visually misleading.
 * Spec #258 / FR-006 expects render-side consumers to recompute the polygon
 * when `_polygon_source !== 'bounds'`, so this fallback is no longer the
 * audience-facing rectangle.
 */
function placeholderPolygonFromViewport(viewport: Viewport): GeoJSONPolygon {
  const lon = viewport.center[0];
  const lat = viewport.center[1];
  if (lon === undefined || lat === undefined) {
    throw new ReservedSlotViolationError("viewport.center", viewport.center);
  }
  const delta = 0.001;
  return makeBoundingPolygon(lon - delta, lat - delta, lon + delta, lat + delta);
}

function hullPolygon(polygons: GeoJSONPolygon[]): GeoJSONPolygon {
  if (polygons.length === 0) {
    // No Scenes yet — produce a degenerate-but-valid polygon at (0,0).
    return makeBoundingPolygon(0, 0, 0, 0);
  }
  let minLon = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const poly of polygons) {
    const rings = poly.coordinates ?? [];
    for (const ring of rings) {
      for (const position of ring) {
        const lon = position[0];
        const lat = position[1];
        if (lon === undefined || lat === undefined) continue;
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  return makeBoundingPolygon(minLon, minLat, maxLon, maxLat);
}

function findStoryboardIndex(plot: Plot, storyboardId: string): number {
  return plot.features.findIndex(
    (f: PlotFeature) =>
      isStoryboardFeature(f) && f.properties.id === storyboardId,
  );
}

function findSceneIndex(plot: Plot, sceneId: string): number {
  return plot.features.findIndex(
    (f: PlotFeature) =>
      isSceneFeature(f) && f.properties.id === sceneId,
  );
}

function findStoryboardIdByName(
  plot: Plot,
  name: string,
): string | null {
  for (const f of plot.features) {
    if (isStoryboardFeature(f) && f.properties.name === name) {
      return f.properties.id;
    }
  }
  return null;
}

/**
 * Compute the next monotonic `creation_order` for a new Scene in the given
 * Storyboard (per-Storyboard scope, FR-004 / FR-005). Returns 0 for an
 * empty Storyboard, otherwise `max(existing creation_order) + 1`. Always
 * appends to the tail — never reuses gaps left by deletions, since that
 * would break FR-011 (new Scenes appear after existing tied-group members).
 */
function nextCreationOrder(plot: Plot, storyboardId: string): number {
  let max = -1;
  for (const f of plot.features) {
    if (!isSceneFeature(f)) continue;
    if (f.properties.storyboard_id !== storyboardId) continue;
    const co = f.properties.creation_order;
    if (co > max) max = co;
  }
  return max + 1;
}

function assertViewportBearingZero(viewport: Viewport): void {
  if (viewport.bearing !== 0) {
    throw new ReservedSlotViolationError(
      "viewport.bearing",
      viewport.bearing,
    );
  }
}

function appendProvenance(
  properties: StoryboardProperties | SceneProperties,
  entry: LogEntry,
): void {
  if (!Array.isArray(properties.provenance)) {
    (properties as { provenance: LogEntry[] }).provenance = [];
  }
  (properties.provenance as LogEntry[]).push(entry);
}

function recomputeStoryboardGeometry(
  draft: Draft<Plot>,
  storyboardId: string,
): void {
  const idx = draft.features.findIndex(
    (f) => isStoryboardFeature(f) && f.properties.id === storyboardId,
  );
  if (idx === -1) return;
  const scenePolys: GeoJSONPolygon[] = [];
  for (const f of draft.features) {
    if (isSceneFeature(f) && f.properties.storyboard_id === storyboardId) {
      const geom = f.geometry as GeoJSONPolygon | undefined;
      if (geom?.type === "Polygon") {
        scenePolys.push(geom);
      }
    }
  }
  const sb = draft.features[idx] as unknown as StoryboardFeature;
  sb.geometry = hullPolygon(scenePolys);
}

/**
 * Fast-path "shallow-spread" plot copy that bypasses immer for ops which
 * only append a new Feature and recompute the parent Storyboard's hull.
 *
 * Trade-off: immer would auto-wrap every Feature into a draft proxy, which
 * is O(n) in `plot.features.length` and dominates p95 latency at 100k+
 * positions (FR-TEST-024). When we know the op is purely additive, we can
 * avoid that overhead entirely while preserving structural sharing
 * (FR-MODULE-022) — every untouched Feature in `plot.features` is the same
 * reference in the returned plot.
 */
function appendFeatureAndRecomputeHull(
  plot: Plot,
  newFeature: PlotFeature,
  storyboardId: string,
): Plot {
  const sbIdx = plot.features.findIndex(
    (f) => isStoryboardFeature(f) && f.properties.id === storyboardId,
  );
  if (sbIdx === -1) {
    // Storyboard absent (orphan-create path) — append unconditionally.
    return {
      ...plot,
      features: [...plot.features, newFeature],
    };
  }
  // Compute the new hull including the appended Feature
  const scenePolys: GeoJSONPolygon[] = [];
  for (const f of plot.features) {
    if (isSceneFeature(f) && f.properties.storyboard_id === storyboardId) {
      const geom = f.geometry as GeoJSONPolygon | undefined;
      if (geom?.type === "Polygon") scenePolys.push(geom);
    }
  }
  if (isSceneFeature(newFeature)) {
    const geom = newFeature.geometry as GeoJSONPolygon | undefined;
    if (geom?.type === "Polygon") scenePolys.push(geom);
  }
  const newHull = hullPolygon(scenePolys);
  const oldSb = plot.features[sbIdx] as unknown as StoryboardFeature;
  const newSb: StoryboardFeature = { ...oldSb, geometry: newHull };
  const newFeatures = plot.features.slice();
  newFeatures[sbIdx] = newSb as unknown as PlotFeature;
  newFeatures.push(newFeature);
  return { ...plot, features: newFeatures };
}

// ---------------------------------------------------------------------------
// Storyboard CRUD
// ---------------------------------------------------------------------------

export interface CreateStoryboardInput {
  name: string;
  description?: string;
  actor: string;
  now?: string;
  idOverride?: string;
  activityIdOverride?: string;
  rationale?: string;
}

export async function createStoryboard(
  plot: Plot,
  input: CreateStoryboardInput,
): Promise<{ plot: Plot; storyboard: StoryboardFeature }> {
  if (input.name.trim() === "") {
    throw new ReservedSlotViolationError("name", input.name);
  }
  const existingId = findStoryboardIdByName(plot, input.name);
  if (existingId !== null) {
    throw new DuplicateStoryboardNameError(input.name, existingId);
  }
  const newId = input.idOverride ?? generateUlid();
  const now = input.now ?? defaultNow();
  const activityId = input.activityIdOverride ?? defaultUuid();
  const logEntry = buildStoryboardCrudLogEntry({
    op: "create",
    actor: input.actor,
    now,
    summary: truncateSummary(`create storyboard "${input.name}"`),
    used: [],
    generated: [newId],
    activityId,
    rationale: input.rationale,
  });
  const props: StoryboardProperties = {
    kind: "STORYBOARD",
    id: newId,
    name: input.name,
    description: input.description,
    schema_version: 2,
    tags: [],
    provenance: [logEntry],
  };
  const feature: StoryboardFeature = {
    type: "Feature",
    id: newId,
    geometry: makeBoundingPolygon(0, 0, 0, 0),
    properties: props,
  };
  const nextPlot: Plot = {
    ...plot,
    features: [...plot.features, feature as unknown as PlotFeature],
  };
  return { plot: nextPlot, storyboard: feature };
}

export interface RenameStoryboardInput {
  storyboardId: string;
  newName: string;
  actor: string;
  now?: string;
  activityIdOverride?: string;
  rationale?: string;
}

export async function renameStoryboard(
  plot: Plot,
  input: RenameStoryboardInput,
): Promise<{ plot: Plot; storyboard: StoryboardFeature }> {
  const idx = findStoryboardIndex(plot, input.storyboardId);
  if (idx === -1) throw new UnknownStoryboardError(input.storyboardId);
  if (input.newName.trim() === "") {
    throw new ReservedSlotViolationError("name", input.newName);
  }
  const conflictId = findStoryboardIdByName(plot, input.newName);
  if (conflictId !== null && conflictId !== input.storyboardId) {
    throw new DuplicateStoryboardNameError(input.newName, conflictId);
  }
  const now = input.now ?? defaultNow();
  const activityId = input.activityIdOverride ?? defaultUuid();
  const existing = plot.features[idx] as unknown as StoryboardFeature;
  const logEntry = buildStoryboardCrudLogEntry({
    op: "rename",
    actor: input.actor,
    now,
    summary: truncateSummary(
      `rename storyboard "${existing.properties.name}" → "${input.newName}"`,
    ),
    used: [],
    generated: [input.storyboardId],
    activityId,
    rationale: input.rationale,
  });
  const nextPlot = produce(plot, (draft) => {
    const sb = draft.features[idx] as unknown as StoryboardFeature;
    sb.properties.name = input.newName;
    appendProvenance(sb.properties, logEntry);
  });
  const updated = nextPlot.features[idx] as unknown as StoryboardFeature;
  return { plot: nextPlot, storyboard: updated };
}

export interface DeleteStoryboardInput {
  storyboardId: string;
  actor: string;
  now?: string;
  activityIdOverride?: string;
  rationale?: string;
}

export async function deleteStoryboard(
  plot: Plot,
  input: DeleteStoryboardInput,
): Promise<{ plot: Plot; removedSceneIds: string[] }> {
  const idx = findStoryboardIndex(plot, input.storyboardId);
  if (idx === -1) throw new UnknownStoryboardError(input.storyboardId);
  const now = input.now ?? defaultNow();
  const activityId = input.activityIdOverride ?? defaultUuid();
  const removedSceneIds: string[] = [];
  for (const f of plot.features) {
    if (isSceneFeature(f) && f.properties.storyboard_id === input.storyboardId) {
      removedSceneIds.push(f.properties.id);
    }
  }
  const logEntry = buildStoryboardCrudLogEntry({
    op: "delete",
    actor: input.actor,
    now,
    summary: truncateSummary(
      `delete storyboard (cascade ${removedSceneIds.length} scene${
        removedSceneIds.length === 1 ? "" : "s"
      })`,
    ),
    used: removedSceneIds,
    generated: [input.storyboardId],
    activityId,
    rationale: input.rationale,
  });
  const nextPlot = produce(plot, (draft) => {
    const sb = draft.features[idx] as unknown as StoryboardFeature;
    appendProvenance(sb.properties, logEntry);
    // Remove Storyboard + all cascaded Scenes atomically. immer's Draft<Plot>
    // accepts a filtered replacement as a fresh array assignment.
    const keep: Draft<PlotFeature>[] = [];
    for (const f of draft.features) {
      if (isStoryboardFeature(f) && f.properties.id === input.storyboardId) {
        continue;
      }
      if (
        isSceneFeature(f) &&
        f.properties.storyboard_id === input.storyboardId
      ) {
        continue;
      }
      keep.push(f);
    }
    draft.features = keep;
  });
  return { plot: nextPlot, removedSceneIds };
}

// ---------------------------------------------------------------------------
// Scene CRUD
// ---------------------------------------------------------------------------

export interface CreateSceneInput {
  storyboardId: string;
  title?: string;
  description?: string;
  viewport: Viewport;
  /**
   * Real map bounds at capture time (Spec #258 / FR-004). When supplied, the
   * scene's stored polygon is `bboxToPolygon(bounds, polygonSource ?? 'bounds')`
   * and `_polygon_source` is recorded so the renderer trusts the on-disk
   * geometry. When omitted, the scene falls back to the pre-#258 placeholder
   * polygon and `_polygon_source` defaults to `'placeholder'` — the renderer
   * then recomputes the rectangle from `(viewport, map dimensions)` at draw
   * time (FR-006).
   */
  bounds?: SceneBounds;
  /** Polygon provenance — defaults to `'bounds'` when `bounds` is provided,
   *  `'placeholder'` otherwise. Explicit override permitted for restore /
   *  migrate paths that preserve historical provenance. */
  polygonSource?: PolygonSource;
  /** Time-controller display mode at capture time (Spec #258 / FR-001).
   *  Optional — legacy capture call sites omit it; readers tolerate the
   *  slot being absent on playback (FR-003). */
  displayMode?: SceneProperties["display_mode"];
  timestamp: string;
  visibleFeatureIds: string[];
  thumbnailAssetRef: string;
  transitionDurationMs?: number;
  /**
   * Time-range flavour pair (#263). MUST be supplied together or both omitted:
   *
   * - **Instant flavour** (default): omit both `timeRange` and `viewportEnd`.
   *   The captured Scene has `time_range = undefined` and
   *   `viewport_end = undefined`. Behaviour identical to #215.
   * - **Time-range flavour**: supply both `timeRange` (with
   *   `timeRange.end > timeRange.start`) and `viewportEnd`. The captured
   *   Scene records both slots and plays back as a synchronised viewport +
   *   slider scrub (per #263 FR-PLAY-001..006).
   *
   * Mixed-presence inputs (`timeRange` without `viewportEnd` or vice versa)
   * throw `SceneFlavourXorViolationError`. Reversed/zero ranges throw
   * `SceneTimeRangeEndNotAfterStartError`. Both errors fire before any
   * mutation, so the plot is left untouched on rejection.
   */
  timeRange?: TimeRange;
  viewportEnd?: Viewport;
  actor: string;
  now?: string;
  idOverride?: string;
  activityIdOverride?: string;
  rationale?: string;
}

function describesInsertMiddle(
  plot: Plot,
  storyboardId: string,
  timestamp: string,
): boolean {
  let hasEarlier = false;
  let hasLater = false;
  for (const f of plot.features) {
    if (!isSceneFeature(f)) continue;
    if (f.properties.storyboard_id !== storyboardId) continue;
    const t = f.properties.timestamp;
    if (t < timestamp) hasEarlier = true;
    if (t > timestamp) hasLater = true;
  }
  return hasEarlier && hasLater;
}

export async function createScene(
  plot: Plot,
  input: CreateSceneInput,
): Promise<{ plot: Plot; scene: SceneFeature }> {
  const sbIdx = findStoryboardIndex(plot, input.storyboardId);
  if (sbIdx === -1) {
    throw new OrphanSceneError("<new-scene>", input.storyboardId);
  }
  assertViewportBearingZero(input.viewport);
  // #263 — Scene flavour XOR (input-side). Reject before any mutation so the
  // plot is untouched on rejection. The `idOverride ?? "<new-scene>"` shape
  // mirrors the OrphanSceneError above (an id may not yet exist).
  const sceneIdForError = input.idOverride ?? "<new-scene>";
  const trPresent = input.timeRange !== undefined;
  const vePresent = input.viewportEnd !== undefined;
  if (trPresent !== vePresent) {
    throw new SceneFlavourXorViolationError(
      sceneIdForError,
      trPresent,
      vePresent,
    );
  }
  if (input.timeRange !== undefined && input.viewportEnd !== undefined) {
    assertViewportBearingZero(input.viewportEnd);
    if (!(input.timeRange.end > input.timeRange.start)) {
      throw new SceneTimeRangeEndNotAfterStartError(
        sceneIdForError,
        input.timeRange.start,
        input.timeRange.end,
      );
    }
  }
  const canonical = canonicaliseVisibleFeatureIds(input.visibleFeatureIds);
  const hash = await computeFeatureSetHash(canonical);
  const newId = input.idOverride ?? generateUlid();
  const now = input.now ?? defaultNow();
  const activityId = input.activityIdOverride ?? defaultUuid();
  const title = input.title ?? formatDtg(input.timestamp);
  const creationOrder = nextCreationOrder(plot, input.storyboardId);
  const op = describesInsertMiddle(plot, input.storyboardId, input.timestamp)
    ? "insert-middle"
    : "create";
  const logEntry = buildStoryboardCrudLogEntry({
    op,
    actor: input.actor,
    now,
    summary: truncateSummary(`${op} scene @ ${input.timestamp}`),
    used: [],
    generated: [newId],
    activityId,
    rationale: input.rationale,
  });
  const polygonSource: PolygonSource =
    input.polygonSource ?? (input.bounds !== undefined ? "bounds" : "placeholder");
  const geometry =
    input.bounds !== undefined
      ? bboxToPolygon(input.bounds, polygonSource)
      : placeholderPolygonFromViewport(input.viewport);
  const props: SceneProperties = {
    kind: "STORYBOARD_SCENE",
    id: newId,
    storyboard_id: input.storyboardId,
    title,
    description: input.description,
    viewport: input.viewport,
    timestamp: input.timestamp,
    visible_feature_ids: canonical,
    feature_set_hash: hash,
    thumbnail_asset_ref: input.thumbnailAssetRef,
    transition_duration_ms: input.transitionDurationMs ?? 500,
    creation_order: creationOrder,
    ...(input.displayMode !== undefined && { display_mode: input.displayMode }),
    // #263 — time-range flavour pair. Either both present or both omitted;
    // the input-side XOR check above guarantees this is well-formed.
    ...(input.timeRange !== undefined && { time_range: input.timeRange }),
    ...(input.viewportEnd !== undefined && { viewport_end: input.viewportEnd }),
    _polygon_source: polygonSource,
    tags: [],
    provenance: [logEntry],
  };
  const sceneFeature: SceneFeature = {
    type: "Feature",
    id: newId,
    geometry,
    properties: props,
  };
  const nextPlot = appendFeatureAndRecomputeHull(
    plot,
    sceneFeature as unknown as PlotFeature,
    input.storyboardId,
  );
  return { plot: nextPlot, scene: sceneFeature };
}

export interface UpdateScenePatch {
  title?: string;
  description?: string;
  viewport?: Viewport;
  /** Spec #258 — see {@link CreateSceneInput.bounds}. When supplied alongside
   *  a viewport change, the polygon is regenerated from these bounds and
   *  `_polygon_source` is set to `'bounds'`. */
  bounds?: SceneBounds;
  polygonSource?: PolygonSource;
  /** Spec #258 — see {@link CreateSceneInput.displayMode}. */
  displayMode?: SceneProperties["display_mode"];
  timestamp?: string;
  visibleFeatureIds?: string[];
  thumbnailAssetRef?: string;
  transitionDurationMs?: number;
}

export interface UpdateSceneInput {
  sceneId: string;
  patch: UpdateScenePatch;
  actor: string;
  now?: string;
  activityIdOverride?: string;
  rationale?: string;
}

export async function updateScene(
  plot: Plot,
  input: UpdateSceneInput,
): Promise<{ plot: Plot; scene: SceneFeature }> {
  const idx = findSceneIndex(plot, input.sceneId);
  if (idx === -1) throw new UnknownSceneError(input.sceneId);
  const existing = plot.features[idx] as unknown as SceneFeature;
  const { patch } = input;
  if (patch.viewport !== undefined) {
    assertViewportBearingZero(patch.viewport);
  }
  // #259 — timestamp equality no longer rejected. updateScene preserves the
  // existing Scene's creation_order; reorder operations live in
  // reorderSceneInTiedGroup (see Phase 6).
  let newHash: string | undefined;
  let canonical: string[] | undefined;
  if (patch.visibleFeatureIds !== undefined) {
    canonical = canonicaliseVisibleFeatureIds(patch.visibleFeatureIds);
    newHash = await computeFeatureSetHash(canonical);
  }
  const now = input.now ?? defaultNow();
  const activityId = input.activityIdOverride ?? defaultUuid();
  const visibleChanged = canonical !== undefined;
  const op: "update-to-current" | "describe" = visibleChanged
    ? "update-to-current"
    : "describe";
  const logEntry = buildStoryboardCrudLogEntry({
    op,
    actor: input.actor,
    now,
    summary: truncateSummary(`${op} scene ${existing.properties.id}`),
    used: [],
    generated: [existing.properties.id],
    activityId,
    rationale: input.rationale,
  });
  // Fast path: shallow-copy the target Scene + Storyboard (if hull changed)
  // and reuse every other Feature reference. This bypasses immer's per-
  // Feature draft proxy creation, which dominates p95 at 100k+ positions
  // (FR-TEST-024).
  let nextPolygonSource: PolygonSource | undefined;
  let nextGeometry: GeoJSONPolygon | undefined;
  if (patch.viewport !== undefined) {
    nextPolygonSource =
      patch.polygonSource ?? (patch.bounds !== undefined ? "bounds" : "placeholder");
    nextGeometry =
      patch.bounds !== undefined
        ? bboxToPolygon(patch.bounds, nextPolygonSource)
        : placeholderPolygonFromViewport(patch.viewport);
  }
  const nextScene: SceneFeature = {
    ...existing,
    properties: {
      ...existing.properties,
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.viewport !== undefined && { viewport: patch.viewport }),
      ...(patch.timestamp !== undefined && { timestamp: patch.timestamp }),
      ...(canonical !== undefined && {
        visible_feature_ids: canonical,
        feature_set_hash: newHash as string,
      }),
      ...(patch.thumbnailAssetRef !== undefined && {
        thumbnail_asset_ref: patch.thumbnailAssetRef,
      }),
      ...(patch.transitionDurationMs !== undefined && {
        transition_duration_ms: patch.transitionDurationMs,
      }),
      ...(patch.displayMode !== undefined && { display_mode: patch.displayMode }),
      ...(nextPolygonSource !== undefined && { _polygon_source: nextPolygonSource }),
      provenance: [...(existing.properties.provenance ?? []), logEntry],
    },
    ...(nextGeometry !== undefined && { geometry: nextGeometry }),
  };
  const newFeatures = plot.features.slice();
  newFeatures[idx] = nextScene as unknown as PlotFeature;
  let nextPlot: Plot = { ...plot, features: newFeatures };
  if (patch.viewport !== undefined) {
    // Recompute hull only if viewport changed
    nextPlot = produce(nextPlot, (draft) => {
      recomputeStoryboardGeometry(draft, nextScene.properties.storyboard_id);
    });
  }
  return { plot: nextPlot, scene: nextScene };
}

export interface DeleteSceneInput {
  sceneId: string;
  actor: string;
  now?: string;
  activityIdOverride?: string;
  rationale?: string;
}

export async function deleteScene(
  plot: Plot,
  input: DeleteSceneInput,
): Promise<{ plot: Plot }> {
  const idx = findSceneIndex(plot, input.sceneId);
  if (idx === -1) throw new UnknownSceneError(input.sceneId);
  const existing = plot.features[idx] as unknown as SceneFeature;
  const now = input.now ?? defaultNow();
  const activityId = input.activityIdOverride ?? defaultUuid();
  const logEntry = buildStoryboardCrudLogEntry({
    op: "delete",
    actor: input.actor,
    now,
    summary: truncateSummary(`delete scene ${existing.properties.id}`),
    used: [],
    generated: [existing.properties.id],
    activityId,
    rationale: input.rationale,
  });
  const nextPlot = produce(plot, (draft) => {
    // Append the LogEntry BEFORE removal so a downstream undo buffer (#218)
    // can replay the provenance on restore.
    const sc = draft.features[idx] as unknown as SceneFeature;
    appendProvenance(sc.properties, logEntry);
    const keep: Draft<PlotFeature>[] = [];
    for (const f of draft.features) {
      if (isSceneFeature(f) && f.properties.id === input.sceneId) continue;
      keep.push(f);
    }
    draft.features = keep;
    recomputeStoryboardGeometry(draft, existing.properties.storyboard_id);
  });
  return { plot: nextPlot };
}

export interface DuplicateSceneInput {
  sceneId: string;
  newTimestamp: string;
  actor: string;
  now?: string;
  idOverride?: string;
  activityIdOverride?: string;
  rationale?: string;
}

export async function duplicateScene(
  plot: Plot,
  input: DuplicateSceneInput,
): Promise<{ plot: Plot; scene: SceneFeature }> {
  const idx = findSceneIndex(plot, input.sceneId);
  if (idx === -1) throw new UnknownSceneError(input.sceneId);
  const source = plot.features[idx] as unknown as SceneFeature;
  // #259 — timestamp equality no longer rejected. The duplicate always
  // receives a fresh creation_order so FC-I4 stays intact within the
  // source Storyboard even when newTimestamp === source.timestamp.
  const canonical = canonicaliseVisibleFeatureIds(
    source.properties.visible_feature_ids,
  );
  const hash = await computeFeatureSetHash(canonical);
  const newId = input.idOverride ?? generateUlid();
  const now = input.now ?? defaultNow();
  const activityId = input.activityIdOverride ?? defaultUuid();
  const logEntry = buildStoryboardCrudLogEntry({
    op: "duplicate",
    actor: input.actor,
    now,
    summary: truncateSummary(
      `duplicate scene ${source.properties.id} → ${newId} @ ${input.newTimestamp}`,
    ),
    used: [source.properties.id],
    generated: [newId],
    activityId,
    rationale: input.rationale,
  });
  const props: SceneProperties = {
    ...source.properties,
    id: newId,
    timestamp: input.newTimestamp,
    title: formatDtg(input.newTimestamp),
    visible_feature_ids: canonical,
    feature_set_hash: hash,
    creation_order: nextCreationOrder(plot, source.properties.storyboard_id),
    provenance: [logEntry],
  };
  const duplicated: SceneFeature = {
    type: "Feature",
    id: newId,
    geometry: source.geometry,
    properties: props,
  };
  const nextPlot = appendFeatureAndRecomputeHull(
    plot,
    duplicated as unknown as PlotFeature,
    source.properties.storyboard_id,
  );
  return { plot: nextPlot, scene: duplicated };
}

export interface CopySceneToOtherStoryboardInput {
  sceneId: string;
  destinationStoryboardId: string;
  newTimestamp?: string;
  deepCopyThumbnail: (
    sourceAssetRef: string,
    destStoryboardId: string,
  ) => Promise<string>;
  actor: string;
  now?: string;
  idOverride?: string;
  activityIdOverride?: string;
  rationale?: string;
}

export async function copySceneToOtherStoryboard(
  plot: Plot,
  input: CopySceneToOtherStoryboardInput,
): Promise<{ plot: Plot; scene: SceneFeature }> {
  const srcIdx = findSceneIndex(plot, input.sceneId);
  if (srcIdx === -1) throw new UnknownSceneError(input.sceneId);
  const source = plot.features[srcIdx] as unknown as SceneFeature;
  const destIdx = findStoryboardIndex(plot, input.destinationStoryboardId);
  if (destIdx === -1) {
    throw new UnknownStoryboardError(input.destinationStoryboardId);
  }
  const newTimestamp = input.newTimestamp ?? source.properties.timestamp;
  // #259 — timestamp equality on the destination Storyboard is no longer
  // rejected. Fresh creation_order is assigned for the destination scope
  // (see props composition below).

  // Run the deep copy BEFORE entering the immer draft. If it rejects, the
  // caller's plot is byte-identical (we haven't started drafting). Wrap the
  // rejection in ThumbnailDeepCopyFailed so callers can pattern-match on code.
  let copiedAssetRef: string;
  try {
    copiedAssetRef = await input.deepCopyThumbnail(
      source.properties.thumbnail_asset_ref,
      input.destinationStoryboardId,
    );
  } catch (err) {
    throw new ThumbnailDeepCopyFailedError(err);
  }

  const canonical = canonicaliseVisibleFeatureIds(
    source.properties.visible_feature_ids,
  );
  const hash = await computeFeatureSetHash(canonical);
  const newId = input.idOverride ?? generateUlid();
  const now = input.now ?? defaultNow();
  const activityId = input.activityIdOverride ?? defaultUuid();
  const logEntry = buildStoryboardCrudLogEntry({
    op: "copy-in",
    actor: input.actor,
    now,
    summary: truncateSummary(
      `copy scene ${source.properties.id} → storyboard ${input.destinationStoryboardId}`,
    ),
    used: [source.properties.id],
    generated: [newId],
    activityId,
    rationale: input.rationale,
  });
  const props: SceneProperties = {
    ...source.properties,
    id: newId,
    storyboard_id: input.destinationStoryboardId,
    timestamp: newTimestamp,
    title: formatDtg(newTimestamp),
    visible_feature_ids: canonical,
    feature_set_hash: hash,
    thumbnail_asset_ref: copiedAssetRef,
    creation_order: nextCreationOrder(plot, input.destinationStoryboardId),
    provenance: [logEntry],
  };
  const copied: SceneFeature = {
    type: "Feature",
    id: newId,
    geometry: source.geometry,
    properties: props,
  };
  const nextPlot = appendFeatureAndRecomputeHull(
    plot,
    copied as unknown as PlotFeature,
    input.destinationStoryboardId,
  );
  return { plot: nextPlot, scene: copied };
}

// ---------------------------------------------------------------------------
// #218 additive extensions — kept inside the CRUD module so every write path
// continues to flow through one boundary (FR-EDIT-022 / SC-009).
// ---------------------------------------------------------------------------

/**
 * Storyboard-level `describe` mutation — mirrors `renameStoryboard` in
 * shape and invariant. Added alongside #218's edit suite so
 * `StoryboardEditService.describeStoryboard` can delegate rather than
 * directly edit a Storyboard Feature from extension code (preserves
 * FR-EDIT-022 + SC-009; analyze patch I1).
 */
export interface DescribeStoryboardInput {
  storyboardId: string;
  description: string | null;
  actor: string;
  now?: string;
  activityIdOverride?: string;
  rationale?: string;
}

export async function describeStoryboard(
  plot: Plot,
  input: DescribeStoryboardInput,
): Promise<{ plot: Plot; storyboard: StoryboardFeature }> {
  const idx = findStoryboardIndex(plot, input.storyboardId);
  if (idx === -1) throw new UnknownStoryboardError(input.storyboardId);
  const now = input.now ?? defaultNow();
  const activityId = input.activityIdOverride ?? defaultUuid();
  const existing = plot.features[idx] as unknown as StoryboardFeature;
  const logEntry = buildStoryboardCrudLogEntry({
    op: "describe",
    actor: input.actor,
    now,
    summary: truncateSummary(
      `describe storyboard "${existing.properties.name}"`,
    ),
    used: [],
    generated: [input.storyboardId],
    activityId,
    rationale: input.rationale,
  });
  const nextPlot = produce(plot, (draft) => {
    const sb = draft.features[idx] as unknown as StoryboardFeature;
    if (input.description === null) {
      delete (sb.properties as { description?: string }).description;
    } else {
      sb.properties.description = input.description;
    }
    appendProvenance(sb.properties, logEntry);
  });
  const updated = nextPlot.features[idx] as unknown as StoryboardFeature;
  return { plot: nextPlot, storyboard: updated };
}

/**
 * `restoreScene` — byte-identical recreation of a previously-deleted Scene,
 * used exclusively by `StoryboardEditService.undoDeleteScene`. Strict
 * superset of `createScene`: behaves identically when `preservedProvenance`
 * is empty, and is the only function permitted to accept a pre-built
 * `provenance[]`. The restore entry is appended on top of the preserved
 * tail so `provenance[last].timestamp ≥ provenance[second-last].timestamp`
 * remains the module's monotonicity invariant (FR-EDIT-004, SC-003).
 */
export interface RestoreSceneInput extends CreateSceneInput {
  /** Full provenance[] from the pre-delete Scene, including the `{op:
   *  "delete"}` tail entry that #215's `deleteScene` appended before
   *  removal (crud.ts appends-before-remove — see `deleteScene`). */
  preservedProvenance: readonly LogEntry[];
}

export async function restoreScene(
  plot: Plot,
  input: RestoreSceneInput,
): Promise<{ plot: Plot; scene: SceneFeature }> {
  const sbIdx = findStoryboardIndex(plot, input.storyboardId);
  if (sbIdx === -1) {
    throw new OrphanSceneError(
      input.idOverride ?? "<restore-scene>",
      input.storyboardId,
    );
  }
  assertViewportBearingZero(input.viewport);
  // #259 — timestamp equality no longer rejected. The restored Scene gets a
  // fresh creation_order from the current Storyboard tail rather than
  // honouring the original; mid-sequence collision with Scenes captured
  // after the original deletion would otherwise violate FC-I4.
  const canonical = canonicaliseVisibleFeatureIds(input.visibleFeatureIds);
  const hash = await computeFeatureSetHash(canonical);
  const newId = input.idOverride ?? generateUlid();
  const now = input.now ?? defaultNow();
  const activityId = input.activityIdOverride ?? defaultUuid();
  const title = input.title ?? formatDtg(input.timestamp);
  const restoreCreationOrder = nextCreationOrder(plot, input.storyboardId);
  const restoreEntry = buildStoryboardCrudLogEntry({
    op: "restore",
    actor: input.actor,
    now,
    summary: truncateSummary(`restore scene @ ${input.timestamp}`),
    used: [],
    generated: [newId],
    activityId,
    rationale: input.rationale,
  });
  // `restoreScene` is a byte-identical recreation of a previously-deleted
  // Scene; honour the input's `polygonSource` provenance verbatim if given,
  // else fall back to the same defaults as `createScene`.
  const restorePolygonSource: PolygonSource =
    input.polygonSource ?? (input.bounds !== undefined ? "bounds" : "placeholder");
  const restoreGeometry =
    input.bounds !== undefined
      ? bboxToPolygon(input.bounds, restorePolygonSource)
      : placeholderPolygonFromViewport(input.viewport);
  const props: SceneProperties = {
    kind: "STORYBOARD_SCENE",
    id: newId,
    storyboard_id: input.storyboardId,
    title,
    description: input.description,
    viewport: input.viewport,
    timestamp: input.timestamp,
    visible_feature_ids: canonical,
    feature_set_hash: hash,
    thumbnail_asset_ref: input.thumbnailAssetRef,
    transition_duration_ms: input.transitionDurationMs ?? 500,
    creation_order: restoreCreationOrder,
    ...(input.displayMode !== undefined && { display_mode: input.displayMode }),
    _polygon_source: restorePolygonSource,
    tags: [],
    provenance: [...input.preservedProvenance, restoreEntry],
  };
  const sceneFeature: SceneFeature = {
    type: "Feature",
    id: newId,
    geometry: restoreGeometry,
    properties: props,
  };
  const nextPlot = appendFeatureAndRecomputeHull(
    plot,
    sceneFeature as unknown as PlotFeature,
    input.storyboardId,
  );
  return { plot: nextPlot, scene: sceneFeature };
}

// ---------------------------------------------------------------------------
// #259 — reorderSceneInTiedGroup
// ---------------------------------------------------------------------------

export interface ReorderSceneInTiedGroupInput {
  sceneId: string;
  /** 0-based position within the tied-timestamp group. */
  newPositionInGroup: number;
}

/**
 * Re-sequence the `creation_order` of Scenes in a tied-timestamp group so
 * the target Scene lands at `newPositionInGroup` (FR-007). The tied group
 * is "all Scenes in the same Storyboard sharing the target's timestamp"
 * — the target is always one of them, so `tied_group_size >= 1`.
 *
 * Algorithm:
 *   1. Locate the target Scene; collect the tied group sorted by current
 *      `creation_order`.
 *   2. Bounds-check `newPositionInGroup ∈ [0, tied_group_size)`.
 *   3. Capture `groupMin = min(creation_order)` of the tied group.
 *   4. Remove the target from the sorted list; re-insert at the new
 *      position.
 *   5. Re-assign `creation_order = groupMin + i` to the i-th member of
 *      the new list. Non-group Scenes are untouched (their values may sit
 *      below `groupMin` or above `groupMax` — the re-sequencing only
 *      permutes existing values within the group).
 *
 * Sync, pure — no provenance entry is emitted (the operation is a pure
 * ordering rearrangement; consumers that need an audit trail should log
 * separately via `buildStoryboardCrudLogEntry`).
 */
export function reorderSceneInTiedGroup(
  plot: Plot,
  input: ReorderSceneInTiedGroupInput,
): { plot: Plot } {
  const idx = findSceneIndex(plot, input.sceneId);
  if (idx === -1) throw new UnknownSceneError(input.sceneId);
  const target = plot.features[idx] as unknown as SceneFeature;
  const storyboardId = target.properties.storyboard_id;
  const timestamp = target.properties.timestamp;

  // Collect the tied group sorted by creation_order ASC.
  const tied: SceneFeature[] = [];
  for (const f of plot.features) {
    if (!isSceneFeature(f)) continue;
    if (f.properties.storyboard_id !== storyboardId) continue;
    if (f.properties.timestamp !== timestamp) continue;
    tied.push(f);
  }
  tied.sort((a, b) => a.properties.creation_order - b.properties.creation_order);

  if (
    input.newPositionInGroup < 0 ||
    input.newPositionInGroup >= tied.length
  ) {
    throw new CreationOrderOutOfRangeError(
      storyboardId,
      input.sceneId,
      input.newPositionInGroup,
      tied.length,
    );
  }

  // Single-Scene tied group: only newPositionInGroup === 0 is permitted
  // (already enforced by the bounds check above); it's a no-op.
  if (tied.length === 1) {
    return { plot };
  }

  // Capture group_min before mutation.
  const firstScene = tied[0];
  if (firstScene === undefined) {
    return { plot };
  }
  const groupMin = firstScene.properties.creation_order;

  // Build the new sorted list: remove target, insert at newPositionInGroup.
  const withoutTarget = tied.filter(
    (s) => s.properties.id !== input.sceneId,
  );
  withoutTarget.splice(input.newPositionInGroup, 0, target);

  // Map sceneId -> new creation_order.
  const reassignments = new Map<string, number>();
  for (let i = 0; i < withoutTarget.length; i++) {
    const scene = withoutTarget[i];
    if (scene === undefined) continue;
    reassignments.set(scene.properties.id, groupMin + i);
  }

  // Apply by shallow-copying only the affected Scenes — preserves
  // structural sharing for all other Features (FR-MODULE-022).
  const newFeatures = plot.features.map((f) => {
    if (!isSceneFeature(f)) return f;
    const newCo = reassignments.get(f.properties.id);
    if (newCo === undefined) return f;
    if (newCo === f.properties.creation_order) return f;
    const nextScene: SceneFeature = {
      ...f,
      properties: {
        ...f.properties,
        creation_order: newCo,
      },
    };
    return nextScene as unknown as PlotFeature;
  });

  return { plot: { ...plot, features: newFeatures } };
}

// Re-export the LogEntry type alias for downstream test clarity.
export type { LogEntry, WasGeneratedBy };
