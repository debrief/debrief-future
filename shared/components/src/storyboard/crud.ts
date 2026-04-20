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

import { produce, type Draft } from "immer";
import { ulid as generateUlid } from "ulid";

import type {
  GeoJSONPolygon,
  LogEntry,
  SceneProperties,
  StoryboardProperties,
  Viewport,
  WasGeneratedBy,
} from "@debrief/schemas";

import { formatDtg } from "./dtg";
import {
  DuplicateStoryboardNameError,
  DuplicateTimestampError,
  OrphanSceneError,
  ReservedSlotViolationError,
  ThumbnailDeepCopyFailedError,
  UnknownSceneError,
  UnknownStoryboardError,
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

function viewportToPolygon(viewport: Viewport): GeoJSONPolygon {
  // MVP: derive a minimal square around the center using a tiny delta in
  // degrees. Downstream specs (#217) will replace this with a true bbox
  // computation from zoom. We keep a non-degenerate polygon so schema
  // validation passes.
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

function findConflictingSceneTimestamp(
  plot: Plot,
  storyboardId: string,
  timestamp: string,
  excludeSceneId?: string,
): SceneFeature | null {
  for (const f of plot.features) {
    if (!isSceneFeature(f)) continue;
    if (f.properties.storyboard_id !== storyboardId) continue;
    if (excludeSceneId !== undefined && f.properties.id === excludeSceneId) continue;
    if (f.properties.timestamp === timestamp) return f;
  }
  return null;
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
    schema_version: 1,
    tags: [],
    provenance: [logEntry],
  };
  const feature: StoryboardFeature = {
    type: "Feature",
    id: newId,
    geometry: makeBoundingPolygon(0, 0, 0, 0),
    properties: props,
  };
  const nextPlot = produce(plot, (draft) => {
    draft.features.push(feature as unknown as Draft<PlotFeature>);
  });
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
  timestamp: string;
  visibleFeatureIds: string[];
  thumbnailAssetRef: string;
  transitionDurationMs?: number;
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
  const conflict = findConflictingSceneTimestamp(
    plot,
    input.storyboardId,
    input.timestamp,
  );
  if (conflict !== null) {
    throw new DuplicateTimestampError(
      input.timestamp,
      conflict.properties.id,
    );
  }
  const canonical = canonicaliseVisibleFeatureIds(input.visibleFeatureIds);
  const hash = await computeFeatureSetHash(canonical);
  const newId = input.idOverride ?? generateUlid();
  const now = input.now ?? defaultNow();
  const activityId = input.activityIdOverride ?? defaultUuid();
  const title = input.title ?? formatDtg(input.timestamp);
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
    tags: [],
    provenance: [logEntry],
  };
  const sceneFeature: SceneFeature = {
    type: "Feature",
    id: newId,
    geometry: viewportToPolygon(input.viewport),
    properties: props,
  };
  const nextPlot = produce(plot, (draft) => {
    draft.features.push(sceneFeature as unknown as Draft<PlotFeature>);
    recomputeStoryboardGeometry(draft, input.storyboardId);
  });
  return { plot: nextPlot, scene: sceneFeature };
}

export interface UpdateScenePatch {
  title?: string;
  description?: string;
  viewport?: Viewport;
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
  if (
    patch.timestamp !== undefined &&
    patch.timestamp !== existing.properties.timestamp
  ) {
    const conflict = findConflictingSceneTimestamp(
      plot,
      existing.properties.storyboard_id,
      patch.timestamp,
      existing.properties.id,
    );
    if (conflict !== null) {
      throw new DuplicateTimestampError(
        patch.timestamp,
        conflict.properties.id,
      );
    }
  }
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
  const nextPlot = produce(plot, (draft) => {
    const sc = draft.features[idx] as unknown as SceneFeature;
    if (patch.title !== undefined) sc.properties.title = patch.title;
    if (patch.description !== undefined) {
      sc.properties.description = patch.description;
    }
    if (patch.viewport !== undefined) {
      sc.properties.viewport = patch.viewport;
      sc.geometry = viewportToPolygon(patch.viewport);
    }
    if (patch.timestamp !== undefined) {
      sc.properties.timestamp = patch.timestamp;
    }
    if (canonical !== undefined) {
      sc.properties.visible_feature_ids = canonical;
      sc.properties.feature_set_hash = newHash as string;
    }
    if (patch.thumbnailAssetRef !== undefined) {
      sc.properties.thumbnail_asset_ref = patch.thumbnailAssetRef;
    }
    if (patch.transitionDurationMs !== undefined) {
      sc.properties.transition_duration_ms = patch.transitionDurationMs;
    }
    appendProvenance(sc.properties, logEntry);
    if (patch.viewport !== undefined) {
      recomputeStoryboardGeometry(draft, sc.properties.storyboard_id);
    }
  });
  return {
    plot: nextPlot,
    scene: nextPlot.features[idx] as unknown as SceneFeature,
  };
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
  if (input.newTimestamp === source.properties.timestamp) {
    throw new DuplicateTimestampError(
      input.newTimestamp,
      source.properties.id,
    );
  }
  const conflict = findConflictingSceneTimestamp(
    plot,
    source.properties.storyboard_id,
    input.newTimestamp,
  );
  if (conflict !== null) {
    throw new DuplicateTimestampError(
      input.newTimestamp,
      conflict.properties.id,
    );
  }
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
    provenance: [logEntry],
  };
  const duplicated: SceneFeature = {
    type: "Feature",
    id: newId,
    geometry: source.geometry,
    properties: props,
  };
  const nextPlot = produce(plot, (draft) => {
    draft.features.push(duplicated as unknown as Draft<PlotFeature>);
    recomputeStoryboardGeometry(draft, source.properties.storyboard_id);
  });
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
  const conflict = findConflictingSceneTimestamp(
    plot,
    input.destinationStoryboardId,
    newTimestamp,
  );
  if (conflict !== null) {
    throw new DuplicateTimestampError(newTimestamp, conflict.properties.id);
  }

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
    provenance: [logEntry],
  };
  const copied: SceneFeature = {
    type: "Feature",
    id: newId,
    geometry: source.geometry,
    properties: props,
  };
  const nextPlot = produce(plot, (draft) => {
    draft.features.push(copied as unknown as Draft<PlotFeature>);
    recomputeStoryboardGeometry(draft, input.destinationStoryboardId);
  });
  return { plot: nextPlot, scene: copied };
}

// Re-export the LogEntry type alias for downstream test clarity.
export type { LogEntry, WasGeneratedBy };
