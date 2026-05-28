/**
 * Capture Scene command handler (Feature 216).
 *
 * Orchestration only — every domain rule (canonicalisation, duplicate
 * detection, provenance append, DTG formatter) lives in #215's CRUD module.
 * This file wires the VS Code surface to that module + the per-Scene
 * thumbnail writer + the MapPanel feature-setter.
 *
 * Control flow matches `contracts/capture-command.md §3-§5` 1:1.
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ulid } from 'ulid';
import {
  createStoryboard,
  createScene,
  getActiveStoryboardDefault,
  getPlotFeatureId,
  DuplicateStoryboardNameError,
  type StoryboardPlot,
  type SceneFeature,
  type SceneBounds,
  type CreateSceneInput,
} from '@debrief/components';
type StoryboardPlotFeature = StoryboardPlot['features'][number];
import { calculateViewportCenter } from '@debrief/utils';
import type {
  SessionStoreApi,
  SessionStoreWithUndo,
} from '@debrief/session-state';
import type { MapPanel } from '../webview/mapPanel';
import type { DebriefFeature } from '@debrief/components';
import {
  writeSceneThumbnail,
  type WriteSceneThumbnailResult,
} from '../services/sceneThumbnailService';
import type {
  CollisionBannerResolution,
  NamingRowResolution,
} from '../views/storyboardPanelView';

/**
 * Panel-prompt surface the capture command needs (#235). The real
 * implementation is the storyboard panel view; tests can stub it with
 * resolved Promises.
 */
export interface CapturePanelSurface {
  promptStoryboardName(args: {
    readonly defaultName: string;
    readonly knownNames: readonly string[];
  }): Promise<NamingRowResolution>;
  promptCollisionResolution(state: {
    readonly visible: boolean;
    readonly conflictingSceneId: string;
    readonly conflictingSceneTitle: string;
    readonly originalTimestamp: string;
    readonly proposedTimestamp: string;
    readonly offsetCount: number;
    readonly offsetWouldExceedTimeRange: boolean;
    readonly cause: 'capture' | 'update-to-current';
  }): Promise<CollisionBannerResolution>;
}

/** Dependencies the capture handler pulls from the activation composition root. */
export interface CaptureCommandContext {
  readonly mapPanel: MapPanel;
  readonly sessionStore: SessionStoreApi;
  readonly stacItemPath: string;
  readonly actor: string;
  readonly trigger:
    | { readonly source: 'keybinding' }
    | { readonly source: 'panelButton' }
    | { readonly source: 'programmatic' };
  /** #235 — panel-driven naming + collision prompts. */
  readonly panelView: CapturePanelSurface;
}

/**
 * Override points for unit tests — real implementations default to VS Code
 * APIs + the on-disk thumbnail service.
 *
 * #235: the first-capture name and the duplicate-timestamp resolution are
 * gathered through the inline panel rows (see `panelView` on the context),
 * NOT through host-level prompts that would occlude the map. SC-009's
 * grep-test asserts the legacy quick-pick / modal call sites are gone.
 */
export interface CaptureCommandDeps {
  readonly showErrorMessage?: typeof vscode.window.showErrorMessage;
  readonly setStatusBarMessage?: typeof vscode.window.setStatusBarMessage;
  readonly executeCommand?: typeof vscode.commands.executeCommand;
  readonly writeSceneThumbnail?: (
    stacItemPath: string,
    sceneId: string,
    largePngBase64: string,
    smallPngBase64: string,
  ) => Promise<WriteSceneThumbnailResult>;
  readonly writeFeatureCollection?: (
    stacItemPath: string,
    features: DebriefFeature[],
  ) => Promise<void>;
  readonly generateUlid?: () => string;
  readonly now?: () => string;
  readonly logError?: (line: string) => void;
}

export type CaptureResult =
  | { readonly status: 'captured'; readonly scene: SceneFeature }
  | {
      readonly status: 'cancelled';
      readonly reason: 'name-prompt' | 'duplicate-prompt' | 'in-flight';
    }
  | {
      readonly status: 'rejected';
      readonly reason:
        | 'viewport-unavailable'
        | 'currenttime-unavailable'
        | 'currenttime-out-of-range'
        | 'thumbnail-failed'
        | 'duplicate-offset-limit-exceeded'
        | 'unexpected';
      readonly error?: unknown;
    };

interface ResolvedDeps {
  showErrorMessage: NonNullable<CaptureCommandDeps['showErrorMessage']>;
  setStatusBarMessage: NonNullable<CaptureCommandDeps['setStatusBarMessage']>;
  executeCommand: NonNullable<CaptureCommandDeps['executeCommand']>;
  writeSceneThumbnail: NonNullable<CaptureCommandDeps['writeSceneThumbnail']>;
  writeFeatureCollection: NonNullable<CaptureCommandDeps['writeFeatureCollection']>;
  generateUlid: () => string;
  now: () => string;
  logError: (line: string) => void;
}

async function defaultWriteFeatureCollection(
  stacItemPath: string,
  features: DebriefFeature[],
): Promise<void> {
  const fc = { type: 'FeatureCollection' as const, features };
  await fs.writeFile(
    path.join(stacItemPath, 'features.geojson'),
    `${JSON.stringify(fc, null, 2)}\n`,
  );
}

/**
 * Spec #258 / FR-004 — derive a {@link SceneBounds} from the session-state
 * `ViewportPolygon` (four corners in `[NW, NE, SE, SW]` order). Returns
 * `undefined` if the viewport is missing or has no corners (the caller then
 * falls back to the legacy placeholder path and records
 * `_polygon_source: 'placeholder'`).
 */
function sceneBoundsFromViewport(
  viewport: SessionStoreWithUndo['viewport'],
): SceneBounds | undefined {
  if (viewport === null) {
    return undefined;
  }
  const corners = viewport.coordinates;
  if (corners === null || corners === undefined || corners.length === 0) {
    return undefined;
  }
  let west = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  for (const c of corners) {
    if (c.longitude < west) {
      west = c.longitude;
    }
    if (c.longitude > east) {
      east = c.longitude;
    }
    if (c.latitude < south) {
      south = c.latitude;
    }
    if (c.latitude > north) {
      north = c.latitude;
    }
  }
  if (
    !Number.isFinite(west) ||
    !Number.isFinite(east) ||
    !Number.isFinite(south) ||
    !Number.isFinite(north)
  ) {
    return undefined;
  }
  return { west, south, east, north };
}

function resolveDeps(input: CaptureCommandDeps | undefined): ResolvedDeps {
  const i = input ?? {};
  return {
    showErrorMessage: i.showErrorMessage ?? vscode.window.showErrorMessage,
    setStatusBarMessage:
      i.setStatusBarMessage ?? vscode.window.setStatusBarMessage,
    executeCommand: i.executeCommand ?? vscode.commands.executeCommand,
    writeSceneThumbnail: i.writeSceneThumbnail ?? writeSceneThumbnail,
    writeFeatureCollection:
      i.writeFeatureCollection ?? defaultWriteFeatureCollection,
    generateUlid: i.generateUlid ?? ((): string => ulid()),
    now: i.now ?? ((): string => new Date().toISOString()),
    logError: i.logError ?? ((line: string): void => console.error(line)),
  };
}

/**
 * Module-scoped in-flight guard (R6b). Reset via `finally` so a throw in the
 * command body never leaves the guard stuck on.
 */
let captureInFlight = false;

export interface CaptureInFlightSink {
  readonly setCaptureInFlight: (inFlight: boolean) => void;
}

function packagePlot(features: DebriefFeature[]): StoryboardPlot {
  return {
    type: 'FeatureCollection',
    // eslint-disable-next-line no-restricted-syntax -- #216: DebriefFeature ↔ StoryboardPlotFeature boundary; both are GeoJSON Features, schemas intentionally keep the typings separate (see ADR-019).
    features: features as unknown as StoryboardPlotFeature[],
  };
}

export async function captureScene(
  context: CaptureCommandContext,
  sink: CaptureInFlightSink | null = null,
  depsInput?: CaptureCommandDeps,
): Promise<CaptureResult> {
  if (captureInFlight) {
    const deps = resolveDeps(depsInput);
    deps.setStatusBarMessage('Capture already in progress…', 2000);
    return { status: 'cancelled', reason: 'in-flight' };
  }
  captureInFlight = true;
  sink?.setCaptureInFlight(true);
  const deps = resolveDeps(depsInput);
  try {
    return await captureSceneInner(context, deps);
  } finally {
    captureInFlight = false;
    sink?.setCaptureInFlight(false);
  }
}

async function captureSceneInner(
  context: CaptureCommandContext,
  deps: ResolvedDeps,
): Promise<CaptureResult> {
  const { mapPanel, sessionStore, stacItemPath, actor } = context;

  // PR #625 — drain any in-flight viewport-debounce so the read of
  // `state.viewport` below sees the analyst's latest pan/zoom. Without
  // this, a fresh pan that hasn't yet cleared the 100 ms
  // `handleViewportChanged` debounce is invisible to capture, and the
  // first scene gets stamped with the initial-fit viewport instead of
  // what the analyst composed.
  mapPanel.flushPendingViewportUpdate();

  // PR #627 — query the LIVE Leaflet viewport synchronously-ish so the
  // captured scene matches what the analyst is currently looking at, even
  // if the moveend → postMessage → debounce → state.viewport chain hasn't
  // propagated for this round (the very first capture is the case in point:
  // the analyst zooms to compose, then clicks Capture before any pan
  // gives `state.viewport` a chance to absorb the zoom). The webview
  // returns `map.getCenter()` + `map.getZoom()` + the 4 bounds corners
  // direct from Leaflet. On timeout/Leaflet-not-ready (`liveViewport ===
  // null`) we fall back to `state.viewport` so the rejection path below
  // still catches a truly empty session.
  const liveViewport = await mapPanel.requestCurrentViewport(1000);

  // Step 3 — read snapshot
  const state: SessionStoreWithUndo = sessionStore.getState();
  const stateViewport = state.viewport;
  const viewport: typeof stateViewport = liveViewport !== null
    ? {
        coordinates: liveViewport.bounds.map(([lng, lat]) => ({
          longitude: lng,
          latitude: lat,
        })),
        zoom: liveViewport.zoom,
      }
    : stateViewport;
  const currentTime = state.currentTime;
  const timeRange = state.timeRange;
  const hiddenIds = new Set(state.hiddenFeatureIds);
  const features = mapPanel.getCurrentFeatures();

  // Step 4 — validate
  if (viewport === null || viewport.zoom === undefined) {
    void deps.showErrorMessage(
      'Capture failed — map has not reported a viewport yet. Pan or zoom the map and try again.',
    );
    return { status: 'rejected', reason: 'viewport-unavailable' };
  }
  if (currentTime === null) {
    void deps.showErrorMessage('Capture failed — the time slider is not set.');
    return { status: 'rejected', reason: 'currenttime-unavailable' };
  }
  if (
    timeRange !== null &&
    (currentTime < timeRange.start || currentTime > timeRange.end)
  ) {
    void deps.showErrorMessage(
      "Capture failed — time slider is outside this plot's time range.",
    );
    return { status: 'rejected', reason: 'currenttime-out-of-range' };
  }

  // Step 5 — derive Scene inputs (pre-thumbnail)
  const timestampIso = new Date(currentTime).toISOString();
  const centerObj = calculateViewportCenter(viewport);
  const center: [number, number] = [centerObj.longitude, centerObj.latitude];
  const zoom = viewport.zoom;
  const visibleIds: string[] = [];
  for (const f of features) {
    // ADR-035: canonical identity is the top-level GeoJSON `id`.
    // `properties.id` is absent on data features (Tracks), so reading it
    // here silently dropped every Track from `visible_feature_ids`.
    const rawId = getPlotFeatureId(f);
    if (rawId === undefined) {continue;}
    if (hiddenIds.has(rawId)) {continue;}
    visibleIds.push(rawId);
  }

  // Step 6 — resolve active Storyboard (first-capture prompt if none).
  // #235: the first-capture name comes from the inline panel naming row,
  // not a host-level quick-pick that would occlude the map
  // (FR-VIS-022/023, SC-009). The panel surface posts back the analyst's
  // confirmed name (or null on cancel) — both paths leave the map and
  // time controller continuously visible.
  let activeStoryboardId: string;
  let currentPlot = packagePlot(features);
  const existing = getActiveStoryboardDefault(currentPlot);
  if (existing !== null) {
    activeStoryboardId = existing.properties.id;
  } else {
    const knownNames = collectStoryboardNames(currentPlot);
    const reply = await context.panelView.promptStoryboardName({
      defaultName: defaultStoryboardName(),
      knownNames,
    });
    if (reply === null || reply.name.trim() === '') {
      return { status: 'cancelled', reason: 'name-prompt' };
    }
    try {
      const result = await createStoryboard(currentPlot, {
        name: reply.name.trim(),
        actor,
        now: deps.now(),
      });
      currentPlot = result.plot;
      activeStoryboardId = result.storyboard.properties.id;
      mapPanel.setFeatures(
        // eslint-disable-next-line no-restricted-syntax -- #216: StoryboardPlotFeature ↔ DebriefFeature boundary — both are GeoJSON Features (see ADR-019).
        currentPlot.features as unknown as DebriefFeature[],
      );
    } catch (err) {
      deps.logError(
        `[captureScene] createStoryboard failed: ${stringifyError(err)}`,
      );
      void deps.showErrorMessage(
        'Capture failed — unexpected error. See Debrief output channel for details.',
      );
      return { status: 'rejected', reason: 'unexpected', error: err };
    }
  }

  // Step 7 — capture thumbnail (synchronous #174 call)
  const thumbnails = await mapPanel.requestThumbnailCapture(5000);
  if (
    thumbnails.largePngBase64 === null ||
    thumbnails.smallPngBase64 === null
  ) {
    void deps.showErrorMessage(
      'Capture failed — could not produce thumbnail. Scene not saved.',
    );
    return { status: 'rejected', reason: 'thumbnail-failed' };
  }

  // Step 8 — write per-Scene PNGs. Pre-generate the ULID so the asset key
  // embeds the same id that createScene will use (via idOverride).
  const sceneId = deps.generateUlid();
  try {
    await deps.writeSceneThumbnail(
      stacItemPath,
      sceneId,
      thumbnails.largePngBase64,
      thumbnails.smallPngBase64,
    );
  } catch (err) {
    deps.logError(
      `[captureScene] writeSceneThumbnail failed: ${stringifyError(err)}`,
    );
    void deps.showErrorMessage(
      'Capture failed — could not produce thumbnail. Scene not saved.',
    );
    return { status: 'rejected', reason: 'thumbnail-failed' };
  }
  const assetKey = `scene-thumbnail-${sceneId}`;

  // Step 9 — call #215 createScene on the latest features, then push back.
  // Spec #258: pass the captured display_mode + real viewport bounds so the
  // scene's stored polygon matches what the author saw (FR-001, FR-004).
  const bounds = sceneBoundsFromViewport(viewport);
  const sceneInput: CreateSceneInput = {
    storyboardId: activeStoryboardId,
    viewport: { center, zoom, bearing: 0 },
    bounds,
    polygonSource: bounds !== undefined ? 'bounds' : 'placeholder',
    displayMode: state.displayMode,
    timestamp: timestampIso,
    visibleFeatureIds: visibleIds,
    thumbnailAssetRef: assetKey,
    actor,
    now: deps.now(),
    idOverride: sceneId,
  };
  try {
    const fcLatest = packagePlot(mapPanel.getCurrentFeatures());
    const result = await createScene(fcLatest, sceneInput);
    mapPanel.setFeatures(
      // eslint-disable-next-line no-restricted-syntax -- #216: StoryboardPlotFeature ↔ DebriefFeature boundary — both are GeoJSON Features (see ADR-019).
      result.plot.features as unknown as DebriefFeature[],
    );
    await persistFeatureCollection(context, deps, mapPanel.getCurrentFeatures());
    const withUndo = sessionStore.getState();
    withUndo.markDirty();
    // PR #624 — restore the captured viewport on the live map. Adding a new
    // STORYBOARD_SCENE polygon to the feature list expands the overall
    // bounding box, which (depending on host config) can re-trigger
    // fit-to-features behaviour and snap the analyst away from the
    // composition they just captured. Jumping back to (center, zoom) with
    // animate:false is idempotent when nothing reset the view and corrective
    // when something did, so we issue it unconditionally on the success
    // path.
    mapPanel.flyToViewport({ center, zoom, bearing: 0 }, 0);
    void deps.executeCommand('debrief.storyboardPanel.focus');
    return { status: 'captured', scene: result.scene };
  } catch (err) {
    // #259 — createScene no longer throws DuplicateTimestampError; any
    // failure here is an unexpected error.
    deps.logError(
      `[captureScene] createScene failed: ${stringifyError(err)}`,
    );
    void deps.showErrorMessage(
      'Capture failed — unexpected error. See Debrief output channel for details.',
    );
    return { status: 'rejected', reason: 'unexpected', error: err };
  }
}

/**
 * Eagerly persist the post-create FeatureCollection to features.geojson so
 * the captured Storyboard / Scene survives a reload without requiring the
 * user to run "Save Session" first. Mirrors the eager scene-PNG write that
 * already happened in step 8.
 *
 * Best-effort: write failures are logged + surfaced as a non-modal warning,
 * but do not roll back the in-memory capture (the user can retry via Save
 * Session, and the scene PNG is already on disk).
 */
async function persistFeatureCollection(
  context: CaptureCommandContext,
  deps: ResolvedDeps,
  features: DebriefFeature[],
): Promise<void> {
  try {
    await deps.writeFeatureCollection(context.stacItemPath, features);
  } catch (err) {
    deps.logError(
      `[captureScene] features.geojson write failed: ${stringifyError(err)}`,
    );
    void vscode.window.showWarningMessage(
      'Scene captured, but features.geojson could not be written. Run Save Session to retry.',
    );
  }
}

// #259 — handleDuplicateTimestamp / performReplace / retryCreateScene /
// findExistingConflict / findExistingTitle / wouldOffsetExceedTimeRange
// were the duplicate-timestamp banner flow. They are obsolete now that
// createScene unconditionally appends to a tied-timestamp group.

/**
 * Collect existing Storyboard names on the plot for inline collision
 * detection in the panel's first-capture naming row (#235).
 */
function collectStoryboardNames(plot: StoryboardPlot): readonly string[] {
  const names: string[] = [];
  for (const f of plot.features) {
    const props = f.properties as { kind?: string; name?: string } | null;
    if (
      props !== null &&
      props.kind === 'STORYBOARD' &&
      typeof props.name === 'string'
    ) {
      names.push(props.name);
    }
  }
  return names;
}

/**
 * Default Storyboard name for the inline naming row. Kept simple — the
 * analyst will almost always type something more meaningful.
 */
function defaultStoryboardName(): string {
  return 'Storyboard';
}

function stringifyError(err: unknown): string {
  if (err instanceof Error) {
    return `${err.message}\n${err.stack ?? ''}`;
  }
  return String(err);
}

/** Test-only: reset the module-scoped in-flight guard between cases. */
export function __resetCaptureInFlightForTesting(): void {
  captureInFlight = false;
}

/** Test-only accessor for the guard. */
export function __getCaptureInFlightForTesting(): boolean {
  return captureInFlight;
}

/**
 * DuplicateStoryboardNameError is imported so the handler's belt-and-braces
 * guard still compiles if #215 throws it before `validateInput` catches
 * the dup. The handler treats it as an unexpected error.
 */
export const _DUPLICATE_STORYBOARD_NAME_ERROR = DuplicateStoryboardNameError;
