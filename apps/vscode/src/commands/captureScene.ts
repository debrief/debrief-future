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
  deleteScene,
  getActiveStoryboardDefault,
  formatDtg,
  DuplicateTimestampError,
  DuplicateStoryboardNameError,
  type StoryboardPlot,
  type SceneFeature,
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
}

/**
 * Override points for unit tests — real implementations default to VS Code
 * APIs + the on-disk thumbnail service.
 */
export interface CaptureCommandDeps {
  readonly showInputBox?: typeof vscode.window.showInputBox;
  readonly showErrorMessage?: typeof vscode.window.showErrorMessage;
  readonly showInformationMessage?: typeof vscode.window.showInformationMessage;
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
  showInputBox: NonNullable<CaptureCommandDeps['showInputBox']>;
  showErrorMessage: NonNullable<CaptureCommandDeps['showErrorMessage']>;
  showInformationMessage: NonNullable<CaptureCommandDeps['showInformationMessage']>;
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

function resolveDeps(input: CaptureCommandDeps | undefined): ResolvedDeps {
  const i = input ?? {};
  return {
    showInputBox: i.showInputBox ?? vscode.window.showInputBox,
    showErrorMessage: i.showErrorMessage ?? vscode.window.showErrorMessage,
    showInformationMessage:
      i.showInformationMessage ?? vscode.window.showInformationMessage,
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

  // Step 3 — read snapshot
  const state: SessionStoreWithUndo = sessionStore.getState();
  const viewport = state.viewport;
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
    const props = f.properties as { id?: string | number | null } | null;
    const rawId = props?.id;
    if (typeof rawId !== 'string' || rawId.length === 0) {continue;}
    if (hiddenIds.has(rawId)) {continue;}
    visibleIds.push(rawId);
  }

  // Step 6 — resolve active Storyboard (first-capture prompt if none)
  let activeStoryboardId: string;
  let currentPlot = packagePlot(features);
  const existing = getActiveStoryboardDefault(currentPlot);
  if (existing !== null) {
    activeStoryboardId = existing.properties.id;
  } else {
    const name = await promptForStoryboardName(currentPlot, deps);
    if (name === undefined) {
      return { status: 'cancelled', reason: 'name-prompt' };
    }
    try {
      const result = await createStoryboard(currentPlot, {
        name,
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
  const sceneInput: CreateSceneInput = {
    storyboardId: activeStoryboardId,
    viewport: { center, zoom, bearing: 0 },
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
    void deps.executeCommand('debrief.storyboardPanel.focus');
    return { status: 'captured', scene: result.scene };
  } catch (err) {
    if (err instanceof DuplicateTimestampError) {
      return handleDuplicateTimestamp(context, deps, sceneInput, 0);
    }
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

async function handleDuplicateTimestamp(
  context: CaptureCommandContext,
  deps: ResolvedDeps,
  inputs: CreateSceneInput,
  retries: number,
): Promise<CaptureResult> {
  const { mapPanel, sessionStore } = context;
  if (retries >= 5) {
    void deps.showErrorMessage(
      'Too many consecutive offset retries — pick a different moment in time.',
    );
    return { status: 'rejected', reason: 'duplicate-offset-limit-exceeded' };
  }
  const conflict = findExistingConflict(mapPanel, inputs);
  const choice = await deps.showInformationMessage(
    `A scene already exists at ${formatDtg(inputs.timestamp)}.`,
    { modal: true },
    'Replace',
    'Offset (+1 s)',
  );
  if (choice === undefined) {
    return { status: 'cancelled', reason: 'duplicate-prompt' };
  }
  if (choice === 'Replace') {
    return performReplace(context, deps, inputs, conflict);
  }
  if (choice === 'Offset (+1 s)') {
    const offsetIso = new Date(
      new Date(inputs.timestamp).getTime() + 1000,
    ).toISOString();
    return retryCreateScene(context, deps, { ...inputs, timestamp: offsetIso }, retries + 1);
  }
  void sessionStore; // reserved for future telemetry
  return { status: 'cancelled', reason: 'duplicate-prompt' };
}

function findExistingConflict(
  mapPanel: MapPanel,
  inputs: CreateSceneInput,
): string | null {
  const plot = packagePlot(mapPanel.getCurrentFeatures());
  for (const f of plot.features) {
    const props = f.properties as {
      kind?: string;
      storyboard_id?: string;
      timestamp?: string;
      id?: string;
    } | null;
    if (
      props !== null &&
      props.kind === 'STORYBOARD_SCENE' &&
      props.storyboard_id === inputs.storyboardId &&
      props.timestamp === inputs.timestamp
    ) {
      return typeof props.id === 'string' ? props.id : null;
    }
  }
  return null;
}

async function performReplace(
  context: CaptureCommandContext,
  deps: ResolvedDeps,
  inputs: CreateSceneInput,
  conflictSceneId: string | null,
): Promise<CaptureResult> {
  if (conflictSceneId === null) {
    deps.logError('[captureScene] Replace requested but conflict scene not located; retrying createScene');
    return retryCreateScene(context, deps, inputs, 0);
  }
  try {
    const fcLatest = packagePlot(context.mapPanel.getCurrentFeatures());
    const afterDelete = await deleteScene(fcLatest, {
      sceneId: conflictSceneId,
      actor: context.actor,
      now: deps.now(),
    });
    context.mapPanel.setFeatures(
      // eslint-disable-next-line no-restricted-syntax -- #216: StoryboardPlotFeature ↔ DebriefFeature boundary — both are GeoJSON Features (see ADR-019).
      afterDelete.plot.features as unknown as DebriefFeature[],
    );
  } catch (err) {
    deps.logError(
      `[captureScene] deleteScene (replace branch) failed: ${stringifyError(err)}`,
    );
    void deps.showErrorMessage(
      'Capture failed — could not replace the conflicting scene.',
    );
    return { status: 'rejected', reason: 'unexpected', error: err };
  }
  return retryCreateScene(context, deps, inputs, 0);
}

async function retryCreateScene(
  context: CaptureCommandContext,
  deps: ResolvedDeps,
  inputs: CreateSceneInput,
  retries: number,
): Promise<CaptureResult> {
  try {
    const fcLatest = packagePlot(context.mapPanel.getCurrentFeatures());
    const result = await createScene(fcLatest, inputs);
    context.mapPanel.setFeatures(
      // eslint-disable-next-line no-restricted-syntax -- #216: StoryboardPlotFeature ↔ DebriefFeature boundary — both are GeoJSON Features (see ADR-019).
      result.plot.features as unknown as DebriefFeature[],
    );
    await persistFeatureCollection(context, deps, context.mapPanel.getCurrentFeatures());
    const withUndo = context.sessionStore.getState();
    withUndo.markDirty();
    void deps.executeCommand('debrief.storyboardPanel.focus');
    return { status: 'captured', scene: result.scene };
  } catch (err) {
    if (err instanceof DuplicateTimestampError) {
      return handleDuplicateTimestamp(context, deps, inputs, retries);
    }
    deps.logError(
      `[captureScene] createScene (retry) failed: ${stringifyError(err)}`,
    );
    void deps.showErrorMessage(
      'Capture failed — unexpected error. See Debrief output channel for details.',
    );
    return { status: 'rejected', reason: 'unexpected', error: err };
  }
}

async function promptForStoryboardName(
  plot: StoryboardPlot,
  deps: ResolvedDeps,
): Promise<string | undefined> {
  const existingNames = new Set<string>();
  for (const f of plot.features) {
    const props = f.properties as { kind?: string; name?: string } | null;
    if (props !== null && props.kind === 'STORYBOARD' && typeof props.name === 'string') {
      existingNames.add(props.name);
    }
  }
  return deps.showInputBox({
    prompt: 'Name for the new Storyboard',
    placeHolder: 'e.g. Exercise Alpha',
    ignoreFocusOut: true,
    validateInput: (value) => {
      const trimmed = value.trim();
      if (trimmed === '') {return 'Name cannot be empty';}
      if (existingNames.has(trimmed)) {
        return `A Storyboard named "${trimmed}" already exists on this plot`;
      }
      return null;
    },
  });
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
