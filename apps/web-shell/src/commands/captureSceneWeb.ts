/**
 * Web-shell sibling of `apps/vscode/src/commands/captureScene.ts`
 * (#235 — T041-T044).
 *
 * Same 9-step orchestration as the VS Code command but with browser
 * deps:
 *   - reads viewport / currentTime / timeRange / hiddenFeatureIds /
 *     featureCollection from the live `getSessionStore()` (snapshot at
 *     capture press, plus a re-read after the panel round-trip so live
 *     state changes between press and confirm follow through —
 *     Acceptance Scenario 2).
 *   - pulls the Leaflet container via a caller-supplied
 *     `getMapContainer()` callback, captures via
 *     `captureSceneThumbnail` (modern-screenshot in the browser).
 *   - rounds the analyst's reply through `WebPanelHost` instead of a
 *     `vscode.window.showInputBox` quick-pick or a modal
 *     `showInformationMessage` (FR-VIS-022/023, SC-009).
 *
 * Returns the same `CaptureResult` discriminator the VS Code command
 * returns so callers can branch on `status: 'captured' | 'cancelled' |
 * 'rejected'` identically.
 */

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
  type DebriefFeature,
} from '@debrief/components';
import { calculateViewportCenter } from '@debrief/utils';
import type { Feature, FeatureCollection } from 'geojson';
import type { SessionStoreApi } from '@debrief/session-state';
import {
  captureSceneThumbnail,
  type WriteSceneThumbnailResult,
} from '../services/webSceneThumbnailAdapter';
import type {
  CapturePanelSurface,
  NamingRowResolution,
} from '../services/webPanelHost';

type StoryboardPlotFeature = StoryboardPlot['features'][number];

/**
 * Spec #258 / FR-004 — derive a {@link SceneBounds} from the session-state
 * `ViewportPolygon` (four corners in `[NW, NE, SE, SW]` order). Returns
 * `undefined` when the viewport has no corners (the caller then falls back
 * to the legacy placeholder polygon).
 */
function sceneBoundsFromViewport(
  viewport: { coordinates?: ReadonlyArray<{ longitude: number; latitude: number }> } | null,
): SceneBounds | undefined {
  if (viewport === null) return undefined;
  const corners = viewport.coordinates;
  if (!corners || corners.length === 0) return undefined;
  let west = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  for (const c of corners) {
    if (c.longitude < west) west = c.longitude;
    if (c.longitude > east) east = c.longitude;
    if (c.latitude < south) south = c.latitude;
    if (c.latitude > north) north = c.latitude;
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

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Dependencies the web-shell capture handler pulls from `App.tsx`.
 *
 * `getFeatureCollection` returns the live FeatureCollection. The capture
 * command mutates it via #215's pure CRUD module then calls
 * `setFeatureCollection` to push the result back into React state.
 *
 * `getMapContainer` resolves the live `.leaflet-container` element so
 * the thumbnail adapter has something to render. It MUST return null
 * when the map has not mounted yet.
 */
export interface CaptureSceneWebContext {
  readonly sessionStore: SessionStoreApi;
  readonly getFeatureCollection: () => FeatureCollection;
  readonly setFeatureCollection: (fc: FeatureCollection) => void;
  readonly getMapContainer: () => HTMLElement | null;
  readonly panelView: CapturePanelSurface;
  readonly actor: string;
  readonly trigger:
    | { readonly source: 'keybinding' }
    | { readonly source: 'panelButton' }
    | { readonly source: 'programmatic' };
}

/** Override points for unit tests. */
export interface CaptureSceneWebDeps {
  readonly captureThumbnail?: (
    container: HTMLElement,
    sceneId: string,
  ) => Promise<WriteSceneThumbnailResult>;
  readonly generateUlid?: () => string;
  readonly now?: () => string;
  readonly logError?: (line: string) => void;
  readonly showError?: (message: string) => void;
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
        | 'map-container-unavailable'
        | 'thumbnail-failed'
        | 'duplicate-offset-limit-exceeded'
        | 'unexpected';
      readonly error?: unknown;
    };

interface ResolvedDeps {
  captureThumbnail: NonNullable<CaptureSceneWebDeps['captureThumbnail']>;
  generateUlid: () => string;
  now: () => string;
  logError: (line: string) => void;
  showError: (message: string) => void;
}

function resolveDeps(input: CaptureSceneWebDeps | undefined): ResolvedDeps {
  const i = input ?? {};
  return {
    captureThumbnail:
      i.captureThumbnail ??
      ((container, sceneId) => captureSceneThumbnail(container, sceneId)),
    generateUlid: i.generateUlid ?? ((): string => ulid()),
    now: i.now ?? ((): string => new Date().toISOString()),
    logError: i.logError ?? ((line: string): void => console.error(line)),
    showError:
      i.showError ?? ((message: string): void => console.warn(message)),
  };
}

// ─── In-flight guard ─────────────────────────────────────────────────

/**
 * Module-scoped in-flight guard. Reset via `finally` so a throw never
 * leaves it stuck. The guard also disambiguates a Capture Scene press
 * from a `pagehide` listener (T044) — the listener calls
 * `__abortCaptureInFlight` which clears the guard and aborts any
 * pending `captureThumbnail` Promise via the AbortController.
 */
let captureInFlight = false;

/**
 * AbortController for the in-flight capture. `pagehide` /
 * `beforeunload` (T044) calls `abort()` so the awaiting modern-screenshot
 * Promise rejects cleanly instead of running to completion on a closed tab.
 */
let captureAbortController: AbortController | null = null;

export function __abortCaptureInFlight(): void {
  if (captureAbortController !== null) {
    captureAbortController.abort();
    captureAbortController = null;
  }
  captureInFlight = false;
}

export function __resetCaptureInFlightForTesting(): void {
  captureInFlight = false;
  captureAbortController = null;
}

export function __getCaptureInFlightForTesting(): boolean {
  return captureInFlight;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function packagePlot(features: readonly Feature[]): StoryboardPlot {
  return {
    type: 'FeatureCollection',
    // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019: GeoJSON Feature ↔ StoryboardPlotFeature boundary.
    features: features as unknown as StoryboardPlotFeature[],
  };
}

function plotToFeatureCollection(plot: StoryboardPlot): FeatureCollection {
  return {
    type: 'FeatureCollection',
    // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019.
    features: plot.features as unknown as Feature[],
  };
}

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

function defaultStoryboardName(): string {
  return 'Storyboard';
}

// #259 — findExistingConflict / findExistingTitle / wouldOffsetExceedTimeRange
// were used by the now-deleted duplicate-timestamp banner flow.

function stringifyError(err: unknown): string {
  if (err instanceof Error) {
    return `${err.message}\n${err.stack ?? ''}`;
  }
  return String(err);
}

// ─── Main orchestrator ───────────────────────────────────────────────

export async function captureSceneWeb(
  context: CaptureSceneWebContext,
  depsInput?: CaptureSceneWebDeps,
): Promise<CaptureResult> {
  if (captureInFlight) {
    return { status: 'cancelled', reason: 'in-flight' };
  }
  captureInFlight = true;
  captureAbortController = new AbortController();
  const deps = resolveDeps(depsInput);
  try {
    return await captureSceneWebInner(context, deps);
  } finally {
    captureInFlight = false;
    captureAbortController = null;
  }
}

async function captureSceneWebInner(
  context: CaptureSceneWebContext,
  deps: ResolvedDeps,
): Promise<CaptureResult> {
  const { sessionStore, getFeatureCollection, setFeatureCollection, actor } =
    context;

  // Step 3 — read snapshot
  const initialState = sessionStore.getState();
  const viewport = initialState.viewport;
  const currentTime = initialState.currentTime;
  const timeRange = initialState.timeRange;
  const hiddenIds = new Set(initialState.hiddenFeatureIds);

  // Step 4 — validate
  if (viewport === null || viewport.zoom === undefined) {
    deps.showError(
      'Capture failed — map has not reported a viewport yet. Pan or zoom the map and try again.',
    );
    return { status: 'rejected', reason: 'viewport-unavailable' };
  }
  if (currentTime === null) {
    deps.showError('Capture failed — the time slider is not set.');
    return { status: 'rejected', reason: 'currenttime-unavailable' };
  }
  if (
    timeRange !== null &&
    (currentTime < timeRange.start || currentTime > timeRange.end)
  ) {
    deps.showError(
      "Capture failed — time slider is outside this plot's time range.",
    );
    return { status: 'rejected', reason: 'currenttime-out-of-range' };
  }

  // Step 6 (early) — resolve active Storyboard. Done before the
  // thumbnail capture so the panel naming row blocks first; the live
  // viewport / playhead can still move while it is open and we re-read
  // them after confirm (Acceptance Scenario 2).
  let plot = packagePlot(getFeatureCollection().features);
  const existing = getActiveStoryboardDefault(plot);
  let activeStoryboardId: string;
  if (existing !== null) {
    activeStoryboardId = existing.properties.id;
  } else {
    const knownNames = collectStoryboardNames(plot);
    const reply: NamingRowResolution = await context.panelView.promptStoryboardName({
      defaultName: defaultStoryboardName(),
      knownNames,
    });
    if (reply === null || reply.name.trim() === '') {
      return { status: 'cancelled', reason: 'name-prompt' };
    }
    // Re-read the plot after the round-trip — Phase 4's maintenance
    // ops or another capture (#235 in-flight guard prevents the latter,
    // but be defensive) may have touched it.
    plot = packagePlot(getFeatureCollection().features);
    try {
      const result = await createStoryboard(plot, {
        name: reply.name.trim(),
        actor,
        now: deps.now(),
      });
      plot = result.plot;
      activeStoryboardId = result.storyboard.properties.id;
      setFeatureCollection(plotToFeatureCollection(plot));
    } catch (err) {
      if (err instanceof DuplicateStoryboardNameError) {
        // Panel-side validation should prevent this; surface anyway.
        deps.showError('A Storyboard with that name already exists.');
        return { status: 'rejected', reason: 'unexpected', error: err };
      }
      deps.logError(
        `[captureSceneWeb] createStoryboard failed: ${stringifyError(err)}`,
      );
      deps.showError('Capture failed — unexpected error.');
      return { status: 'rejected', reason: 'unexpected', error: err };
    }
  }

  // Step 5 (late) — derive Scene inputs from the *latest* state.
  // Acceptance Scenario 2: the persisted Scene's timestamp + viewport
  // reflect the post-name-prompt live values, not the press-time values.
  const latestState = sessionStore.getState();
  const latestViewport = latestState.viewport;
  const latestCurrentTime = latestState.currentTime;
  if (latestViewport === null || latestViewport.zoom === undefined) {
    deps.showError(
      'Capture failed — map viewport became unavailable mid-flow.',
    );
    return { status: 'rejected', reason: 'viewport-unavailable' };
  }
  if (latestCurrentTime === null) {
    deps.showError(
      'Capture failed — time slider became unavailable mid-flow.',
    );
    return { status: 'rejected', reason: 'currenttime-unavailable' };
  }
  const latestTimeRange = latestState.timeRange;
  if (
    latestTimeRange !== null &&
    (latestCurrentTime < latestTimeRange.start ||
      latestCurrentTime > latestTimeRange.end)
  ) {
    deps.showError(
      "Capture failed — time slider is outside this plot's time range.",
    );
    return { status: 'rejected', reason: 'currenttime-out-of-range' };
  }
  const timestampIso = new Date(latestCurrentTime).toISOString();
  const centerObj = calculateViewportCenter(latestViewport);
  const center: [number, number] = [centerObj.longitude, centerObj.latitude];
  const zoom = latestViewport.zoom;
  const latestHiddenIds = new Set(latestState.hiddenFeatureIds);
  // Re-collect visible IDs against the latest plot (may have grown via
  // the createStoryboard call above).
  const visibleIds: string[] = [];
  for (const f of plot.features) {
    // ADR-038: canonical identity is the top-level GeoJSON `id`.
    // `properties.id` is absent on data features (Tracks), so reading it
    // here silently dropped every Track from `visible_feature_ids`.
    const rawId = getPlotFeatureId(f);
    if (rawId === undefined) continue;
    if (latestHiddenIds.has(rawId)) continue;
    if (hiddenIds.has(rawId)) continue;
    visibleIds.push(rawId);
  }

  // Step 7 — capture thumbnail (browser).
  const container = context.getMapContainer();
  if (container === null) {
    deps.showError(
      'Capture failed — map element not found in DOM. Try again after the plot finishes loading.',
    );
    return { status: 'rejected', reason: 'map-container-unavailable' };
  }
  const sceneId = deps.generateUlid();
  let thumbnailResult: WriteSceneThumbnailResult;
  try {
    thumbnailResult = await deps.captureThumbnail(container, sceneId);
  } catch (err) {
    deps.logError(
      `[captureSceneWeb] captureThumbnail failed: ${stringifyError(err)}`,
    );
    deps.showError(
      'Capture failed — could not produce thumbnail. Scene not saved.',
    );
    return { status: 'rejected', reason: 'thumbnail-failed' };
  }
  const assetKey = thumbnailResult.assetKey;

  // Step 9 — call #215 createScene against the latest plot.
  // CRITICAL: thread `plot` through tryCreateScene directly. React's
  // setState in step 6 above is async, so reading getFeatureCollection()
  // again would miss the newly-created Storyboard and OrphanSceneError.
  // Spec #258: capture display_mode + viewport bounds so playback can
  // restore both (FR-001, FR-004).
  const bounds = sceneBoundsFromViewport(latestViewport);
  const sceneInput: CreateSceneInput = {
    storyboardId: activeStoryboardId,
    viewport: { center, zoom, bearing: 0 },
    bounds,
    polygonSource: bounds !== undefined ? 'bounds' : 'placeholder',
    displayMode: latestState.displayMode,
    timestamp: timestampIso,
    visibleFeatureIds: visibleIds,
    thumbnailAssetRef: assetKey,
    actor,
    now: deps.now(),
    idOverride: sceneId,
  };
  // #259 — captures always succeed at the timestamp level; no banner flow.
  try {
    const result = await createScene(plot, sceneInput);
    context.setFeatureCollection(plotToFeatureCollection(result.plot));
    sessionStore.getState().markDirty();
    return { status: 'captured', scene: result.scene };
  } catch (err) {
    deps.logError(
      `[captureSceneWeb] createScene failed: ${stringifyError(err)}`,
    );
    deps.showError('Capture failed — unexpected error.');
    return { status: 'rejected', reason: 'unexpected', error: err };
  }
}

// `DebriefFeature` is imported only to keep the boundary cast type-safe;
// reference it so the import is not flagged as unused on strict configs.
export type _DEBRIEF_FEATURE_BRAND = DebriefFeature;
