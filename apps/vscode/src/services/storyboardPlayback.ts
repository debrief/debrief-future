/**
 * StoryboardPlaybackService — extension-host state machine for Feature 217
 * step-through playback.
 *
 * Consumed by:
 *   - the Storyboard panel webview (transport buttons, row clicks, header
 *     dropdown, overflow menu),
 *   - the MapPanel (Scene rectangle clicks, feature-change notifications),
 *   - the `debrief.storyboard.*` VS Code commands (forward, backward,
 *     clickScene, jumpPast, create, rename, delete),
 *   - the extension host (plot-opened / plot-closed lifecycle events).
 *
 * See `specs/217-storyboarding-playback/contracts/playback-service.md` for
 * the authoritative API contract.
 */

import * as vscode from 'vscode';
import {
  createStoryboard as crudCreateStoryboard,
  renameStoryboard as crudRenameStoryboard,
  deleteStoryboard as crudDeleteStoryboard,
  detectMissingDataForScene,
  getMostRecentlyModifiedStoryboard,
  getScene,
  isSceneFeature,
  isStoryboardFeature,
  listScenesOrdered,
  validatePlot,
  type MissingDataClassification,
  type StoryboardPlot,
  type SceneFeature,
  type StoryboardFeature,
} from '@debrief/components';
import type {
  SceneRowViewModel,
  StoryboardOptionViewModel,
  TransportViewModel,
  MissingDataReason,
  DebriefFeature,
} from '@debrief/components';
import type { SessionStoreApi } from '@debrief/session-state';
import { plotFromFeatures, featuresFromPlot } from './plotFromFeatures';

// ── Ports (injectable for tests) ─────────────────────────────────────

export interface PlaybackMapPanel {
  getCurrentFeatures(): DebriefFeature[];
  /** Push a new feature set back into the MapPanel after a #215 CRUD op
   *  (Feature 217 Phase 4). The subsequent `onFeaturesChanged` fires the
   *  normal recompute path; the service also re-seeds its own state
   *  directly from the `result.plot` to avoid racing the event loop. */
  setFeatures(features: readonly DebriefFeature[]): void;
  flyToViewport(viewport: SceneFeature['properties']['viewport'], durationMs: number): number;
  setSceneRectangles(
    scenes: ReadonlyArray<SceneFeature> | null,
    activeStoryboardId: string | null,
    currentSceneId: string | null,
  ): void;
  readonly onFlyToComplete: vscode.Event<number>;
  readonly onSceneRectangleClick: vscode.Event<string>;
  readonly onFeaturesChanged: vscode.Event<DebriefFeature[]>;
}

export interface PlaybackSessionManager {
  getActiveDocumentUri(): string | null;
  getSession(uri: string): SessionStoreApi | undefined;
  getActiveSession(): SessionStoreApi | null;
  readonly onActiveSessionChange: vscode.Event<SessionStoreApi | null>;
}

export interface PlaybackPanelView {
  applySnapshot(snapshot: StoryboardPlaybackSnapshot): void;
}

export interface PlaybackTimeRangeView {
  setScrubbableRange(start: number | null, end: number | null): void;
}

export interface ModalPromptPort {
  showInformationMessage(
    message: string,
    options: { modal: true },
    ...items: string[]
  ): Thenable<string | undefined>;
}

export interface VisibilityPort {
  readonly onDidChangeVisibility: vscode.Event<boolean>;
}

// ── Snapshot (transport-safe) ─────────────────────────────────────────

export interface StoryboardPlaybackSnapshot {
  readonly documentUri: string;
  readonly storyboards: readonly StoryboardOptionViewModel[];
  readonly scenes: readonly SceneRowViewModel[];
  readonly activeStoryboardId: string | null;
  readonly currentSceneId: string | null;
  readonly activeStoryboardName: string | null;
  readonly transport: TransportViewModel;
}

// ── Per-plot state ────────────────────────────────────────────────────

interface TransportState {
  readonly documentUri: string;
  plotValid: boolean;
  activeStoryboardId: string | null;
  sceneOrder: string[];
  currentSceneIndex: number;
  /** Non-null while a flyTo+RAF tween is in flight. */
  transitionId: number | null;
  transitionSafetyTimer: ReturnType<typeof setTimeout> | null;
  /** Whether an active scrubbable-range override has been installed —
   *  drives dispose() behaviour. */
  scrubbableOverrideInstalled: boolean;
  /** Disposables subscribed while this plot is active (cleaned up on
   *  close). */
  disposables: vscode.Disposable[];
}

// ── Options ───────────────────────────────────────────────────────────

export interface StoryboardPlaybackServiceOptions {
  readonly sessionManager: PlaybackSessionManager;
  readonly mapPanel: PlaybackMapPanel;
  readonly panelView: PlaybackPanelView;
  readonly timeRangeView: PlaybackTimeRangeView;
  readonly modalPromptPort: ModalPromptPort;
  readonly visibilityPort: VisibilityPort;
  /** Injected for tests; defaults to `vscode.window.showErrorMessage`. */
  readonly showErrorMessage?: (message: string) => void;
  /** Injected for tests; defaults to
   *  `vscode.commands.executeCommand('setContext', key, value)`. */
  readonly setContext?: (key: string, value: unknown) => void;
  /** Injected for tests; defaults to `Date.now`. */
  readonly now?: () => number;
  /** Optional DTG formatter for scene row titles. Defaults to ISO. */
  readonly formatDtg?: (iso: string) => string;
  /** Stub thumbnail resolver — in production the panel view resolves
   *  webview-safe URIs; the service passes the raw scene id through so
   *  the panel can enrich the row. */
  readonly resolveThumbnailHref?: (sceneId: string) => string;
}

// ── Default messages ──────────────────────────────────────────────────

const messages = {
  jumpPastLabel: 'Jump past this scene',
  openForEditingLabel: 'Open for editing',
  corruptPlot: (reason: string): string =>
    `This plot has a storyboard invariant violation (${reason}). Transport has been disabled.`,
  missingFeatures: (sceneTitle: string, missingIds: readonly string[]): string =>
    `Cannot step onto "${sceneTitle}" — ${missingIds.length === 1 ? 'feature' : 'features'} no longer in plot: ${missingIds.join(', ')}`,
  outOfRange: (sceneTitle: string): string =>
    `Cannot step onto "${sceneTitle}" — timestamp is outside the plot's time range.`,
  editSceneStub: (sceneTitle: string, timestampIso: string): string =>
    `Scene: ${sceneTitle} (${timestampIso}). Scene editing arrives in #218.`,
};

// ── Service ───────────────────────────────────────────────────────────

export class StoryboardPlaybackService implements vscode.Disposable {
  private readonly states = new Map<string, TransportState>();
  private readonly _onSnapshotChange = new vscode.EventEmitter<StoryboardPlaybackSnapshot>();
  public readonly onSnapshotChange: vscode.Event<StoryboardPlaybackSnapshot> = this._onSnapshotChange.event;

  private readonly sessionManager: PlaybackSessionManager;
  private readonly mapPanel: PlaybackMapPanel;
  private readonly panelView: PlaybackPanelView;
  private readonly timeRangeView: PlaybackTimeRangeView;
  private readonly modalPromptPort: ModalPromptPort;
  private readonly visibilityPort: VisibilityPort;
  private readonly showErrorMessage: (message: string) => void;
  private readonly setContextFn: (key: string, value: unknown) => void;
  private readonly resolveThumbnailHref: (sceneId: string) => string;
  private readonly formatDtg: (iso: string) => string;

  private readonly rootDisposables: vscode.Disposable[] = [];
  private disposed = false;
  private flyToTokenToDocumentUri = new Map<number, string>();

  constructor(options: StoryboardPlaybackServiceOptions) {
    this.sessionManager = options.sessionManager;
    this.mapPanel = options.mapPanel;
    this.panelView = options.panelView;
    this.timeRangeView = options.timeRangeView;
    this.modalPromptPort = options.modalPromptPort;
    this.visibilityPort = options.visibilityPort;
    this.showErrorMessage =
      options.showErrorMessage ??
      ((msg) => {
        void vscode.window.showErrorMessage(msg);
      });
    this.setContextFn =
      options.setContext ??
      ((key, value) => {
        void vscode.commands.executeCommand('setContext', key, value);
      });
    this.resolveThumbnailHref =
      options.resolveThumbnailHref ?? ((_sceneId: string): string => '');
    this.formatDtg =
      options.formatDtg ?? ((iso: string): string => iso);

    // Wire visibility → transition-clear for every plot with an
    // in-flight transition (R8 secondary trigger).
    this.rootDisposables.push(
      this.visibilityPort.onDidChangeVisibility((visible) => {
        if (visible) {return;}
        for (const state of this.states.values()) {
          if (state.transitionId !== null) {
            this.clearTransition(state);
          }
        }
      }),
    );

    // Wire flyToComplete → transition-clear (R8 primary trigger).
    this.rootDisposables.push(
      this.mapPanel.onFlyToComplete((token) => {
        const documentUri = this.flyToTokenToDocumentUri.get(token);
        if (documentUri === undefined) {return;}
        const state = this.states.get(documentUri);
        if (!state) {return;}
        if (state.transitionId !== token) {return;}
        this.clearTransition(state);
      }),
    );
  }

  // ── Lifecycle ─────────────────────────────────────────────────────

  public onPlotOpened(documentUri: string): void {
    const features = this.mapPanel.getCurrentFeatures();
    const plot = plotFromFeatures(features);

    // Validate plot; on throw disable transport + surface a single error.
    let plotValid = true;
    try {
      validatePlot(plot);
    } catch (err) {
      plotValid = false;
      this.showErrorMessage(messages.corruptPlot(err instanceof Error ? err.message : String(err)));
    }

    const state: TransportState = {
      documentUri,
      plotValid,
      activeStoryboardId: null,
      sceneOrder: [],
      currentSceneIndex: 0,
      transitionId: null,
      transitionSafetyTimer: null,
      scrubbableOverrideInstalled: false,
      disposables: [],
    };
    this.states.set(documentUri, state);

    if (!plotValid) {
      this.emitSnapshot(state, plot);
      return;
    }

    const active = getMostRecentlyModifiedStoryboard(plot);
    state.activeStoryboardId = active?.properties.id ?? null;
    this.recomputeSceneOrder(state, plot);
    this.applyScrubbableRange(state, plot);
    this.updateStoryboardActiveContext(state);
    this.pushSceneRectangles(state, plot);
    this.emitSnapshot(state, plot);
  }

  public onPlotClosed(documentUri: string): void {
    const state = this.states.get(documentUri);
    if (!state) {return;}
    this.clearTransition(state);
    if (state.scrubbableOverrideInstalled) {
      this.timeRangeView.setScrubbableRange(null, null);
      state.scrubbableOverrideInstalled = false;
    }
    for (const d of state.disposables) {d.dispose();}
    this.states.delete(documentUri);
    this.setContextFn('debrief.storyboardActive', false);
    this.mapPanel.setSceneRectangles(null, null, null);
  }

  public onPlotFeaturesChanged(documentUri: string): void {
    const state = this.states.get(documentUri);
    if (!state) {return;}
    if (!state.plotValid) {return;}
    const plot = plotFromFeatures(this.mapPanel.getCurrentFeatures());

    // Check whether the active Storyboard still exists.
    if (state.activeStoryboardId !== null) {
      const stillExists = plot.features.some(
        (f) => isStoryboardFeature(f) && f.properties.id === state.activeStoryboardId,
      );
      if (!stillExists) {
        const fallback = getMostRecentlyModifiedStoryboard(plot);
        state.activeStoryboardId = fallback?.properties.id ?? null;
      }
    } else {
      // If none was active, try to seed one now.
      const fallback = getMostRecentlyModifiedStoryboard(plot);
      state.activeStoryboardId = fallback?.properties.id ?? null;
    }

    this.recomputeSceneOrder(state, plot);
    this.applyScrubbableRange(state, plot);
    this.updateStoryboardActiveContext(state);
    this.pushSceneRectangles(state, plot);
    this.emitSnapshot(state, plot);
  }

  // ── Read API ──────────────────────────────────────────────────────

  public getSnapshot(documentUri: string): StoryboardPlaybackSnapshot {
    const state = this.states.get(documentUri);
    if (!state) {
      return this.emptySnapshot(documentUri);
    }
    const plot = plotFromFeatures(this.mapPanel.getCurrentFeatures());
    return this.buildSnapshot(state, plot);
  }

  // ── Transport ─────────────────────────────────────────────────────

  public async forward(documentUri: string): Promise<void> {
    const state = this.states.get(documentUri);
    if (!state || !state.plotValid) {return;}
    if (state.transitionId !== null) {return;}
    if (state.currentSceneIndex >= state.sceneOrder.length - 1) {return;}
    await this.stepTo(state, state.currentSceneIndex + 1, 'forward');
  }

  public async backward(documentUri: string): Promise<void> {
    const state = this.states.get(documentUri);
    if (!state || !state.plotValid) {return;}
    if (state.transitionId !== null) {return;}
    if (state.currentSceneIndex <= 0) {return;}
    await this.stepTo(state, state.currentSceneIndex - 1, 'backward');
  }

  public async goToScene(documentUri: string, sceneId: string): Promise<void> {
    const state = this.states.get(documentUri);
    if (!state || !state.plotValid) {return;}
    if (state.transitionId !== null) {return;}
    const index = state.sceneOrder.indexOf(sceneId);
    if (index < 0) {return;}
    // Re-fly even when the click target equals `currentSceneIndex`. The
    // map may have been panned/zoomed since the Scene was captured (or
    // the user just landed on the storyboard with `currentSceneIndex=0`
    // and never animated); a click is an explicit "show me this Scene"
    // request, so honour it idempotently.
    const direction: 'forward' | 'backward' =
      index >= state.currentSceneIndex ? 'forward' : 'backward';
    await this.stepTo(state, index, direction);
  }

  public setActiveStoryboard(
    documentUri: string,
    storyboardId: string | null,
  ): void {
    const state = this.states.get(documentUri);
    if (!state || !state.plotValid) {return;}
    if (state.activeStoryboardId === storyboardId) {return;}
    state.activeStoryboardId = storyboardId;
    const plot = plotFromFeatures(this.mapPanel.getCurrentFeatures());
    this.recomputeSceneOrder(state, plot);
    this.applyScrubbableRange(state, plot);
    this.updateStoryboardActiveContext(state);
    this.pushSceneRectangles(state, plot);
    this.emitSnapshot(state, plot);
  }

  // ── Storyboard CRUD (delegates to #215) ───────────────────────────

  public async createStoryboard(
    documentUri: string,
    name: string,
    description?: string,
  ): Promise<void> {
    const state = this.states.get(documentUri);
    if (!state || !state.plotValid) {return;}
    if (state.transitionId !== null) {return;} // R9 guard
    const plot = plotFromFeatures(this.mapPanel.getCurrentFeatures());
    try {
      const result = await crudCreateStoryboard(plot, {
        name,
        description,
        actor: 'vscode-user',
        now: new Date().toISOString(),
      });
      // Push the new feature set back into MapPanel (the canonical
      // source of truth). The subsequent onFeaturesChanged recomputes
      // the panel / rectangles; we also update activeStoryboardId
      // here so the new Storyboard becomes the selected one.
      this.mapPanel.setFeatures(featuresFromPlot(result.plot));
      state.activeStoryboardId = result.storyboard.properties.id;
      this.recomputeSceneOrder(state, result.plot);
      this.applyScrubbableRange(state, result.plot);
      this.updateStoryboardActiveContext(state);
      this.pushSceneRectangles(state, result.plot);
      this.emitSnapshot(state, result.plot);
    } catch (err) {
      this.showErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  public async renameStoryboard(
    documentUri: string,
    storyboardId: string,
    newName: string,
  ): Promise<void> {
    const state = this.states.get(documentUri);
    if (!state || !state.plotValid) {return;}
    if (state.transitionId !== null) {return;}
    const plot = plotFromFeatures(this.mapPanel.getCurrentFeatures());
    try {
      const result = await crudRenameStoryboard(plot, {
        storyboardId,
        newName,
        actor: 'vscode-user',
        now: new Date().toISOString(),
      });
      this.mapPanel.setFeatures(featuresFromPlot(result.plot));
      this.emitSnapshot(state, result.plot);
    } catch (err) {
      this.showErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  public async deleteStoryboard(
    documentUri: string,
    storyboardId: string,
  ): Promise<void> {
    const state = this.states.get(documentUri);
    if (!state || !state.plotValid) {return;}
    if (state.transitionId !== null) {return;}
    const plot = plotFromFeatures(this.mapPanel.getCurrentFeatures());
    try {
      const result = await crudDeleteStoryboard(plot, {
        storyboardId,
        actor: 'vscode-user',
        now: new Date().toISOString(),
      });
      this.mapPanel.setFeatures(featuresFromPlot(result.plot));
      if (state.activeStoryboardId === storyboardId) {
        const fallback = getMostRecentlyModifiedStoryboard(result.plot);
        state.activeStoryboardId = fallback?.properties.id ?? null;
      }
      this.recomputeSceneOrder(state, result.plot);
      this.applyScrubbableRange(state, result.plot);
      this.updateStoryboardActiveContext(state);
      this.pushSceneRectangles(state, result.plot);
      this.emitSnapshot(state, result.plot);
    } catch (err) {
      this.showErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  // ── Hard-block resolution ─────────────────────────────────────────

  public async resolveHardBlockByJumpingPast(
    documentUri: string,
    blockedSceneId: string,
    direction: 'forward' | 'backward',
  ): Promise<void> {
    const state = this.states.get(documentUri);
    if (!state || !state.plotValid) {return;}
    const idx = state.sceneOrder.indexOf(blockedSceneId);
    if (idx < 0) {return;}
    const target = direction === 'forward' ? idx + 1 : idx - 1;
    if (target < 0 || target >= state.sceneOrder.length) {return;}
    await this.stepTo(state, target, direction, /* skipHardBlockCheck */ true);
  }

  public resolveHardBlockByOpeningForEditing(
    documentUri: string,
    blockedSceneId: string,
  ): void {
    const state = this.states.get(documentUri);
    if (!state) {return;}
    const plot = plotFromFeatures(this.mapPanel.getCurrentFeatures());
    const scene = getScene(plot, blockedSceneId);
    if (!scene) {return;}
    // Surface a read-only info toast. No transport change.
    void vscode.window.showInformationMessage(
      messages.editSceneStub(scene.properties.title, scene.properties.timestamp),
    );
  }

  // ── Disposal ─────────────────────────────────────────────────────

  public dispose(): void {
    if (this.disposed) {return;}
    this.disposed = true;
    for (const state of this.states.values()) {
      this.clearTransition(state);
      if (state.scrubbableOverrideInstalled) {
        this.timeRangeView.setScrubbableRange(null, null);
        state.scrubbableOverrideInstalled = false;
      }
      for (const d of state.disposables) {d.dispose();}
    }
    this.states.clear();
    for (const d of this.rootDisposables) {d.dispose();}
    this.rootDisposables.length = 0;
    this._onSnapshotChange.dispose();
    this.setContextFn('debrief.storyboardActive', false);
  }

  // ── Internals ─────────────────────────────────────────────────────

  private async stepTo(
    state: TransportState,
    targetIndex: number,
    direction: 'forward' | 'backward',
    skipHardBlockCheck = false,
  ): Promise<void> {
    const targetSceneId = state.sceneOrder[targetIndex];
    if (targetSceneId === undefined) {return;}
    const plot = plotFromFeatures(this.mapPanel.getCurrentFeatures());
    const targetScene = getScene(plot, targetSceneId);
    if (!targetScene) {return;}

    if (!skipHardBlockCheck) {
      const classification = this.classifyScene(targetScene, plot);
      if (classification.kind !== 'ok') {
        await this.promptHardBlock(targetScene, classification, direction, state.documentUri);
        return;
      }
    }

    this.executeTransition(state, targetIndex, targetScene, plot);
  }

  private executeTransition(
    state: TransportState,
    targetIndex: number,
    targetScene: SceneFeature,
    plot: StoryboardPlot,
  ): void {
    const viewport = targetScene.properties.viewport;
    const durationMs = targetScene.properties.transition_duration_ms ?? 500;
    const token = this.mapPanel.flyToViewport(viewport, durationMs);
    state.transitionId = token;
    this.flyToTokenToDocumentUri.set(token, state.documentUri);

    // Update the current scene index + scrubbable range immediately so the
    // panel + time view show the destination scene without waiting for
    // the flyTo to complete.
    state.currentSceneIndex = targetIndex;
    this.applyScrubbableRange(state, plot);
    this.pushSceneRectangles(state, plot);

    // RAF tween of `currentTime` — runs in the host process. For zero-
    // duration jumps, snap immediately. For non-zero durations, snap to
    // the target timestamp immediately in the service (the webview map
    // panel drives the in-between frames visually).
    const targetEpoch = new Date(targetScene.properties.timestamp).getTime();
    const session = this.sessionManager.getSession(state.documentUri);
    if (session && !Number.isNaN(targetEpoch)) {
      session.getState().setCurrentTime(targetEpoch);
    }

    // Safety timer (R8).
    if (state.transitionSafetyTimer !== null) {
      clearTimeout(state.transitionSafetyTimer);
    }
    state.transitionSafetyTimer = setTimeout(() => {
      if (state.transitionId === token) {
        this.clearTransition(state);
      }
    }, durationMs + 250);

    this.emitSnapshot(state, plot);
  }

  private clearTransition(state: TransportState): void {
    if (state.transitionId !== null) {
      this.flyToTokenToDocumentUri.delete(state.transitionId);
    }
    state.transitionId = null;
    if (state.transitionSafetyTimer !== null) {
      clearTimeout(state.transitionSafetyTimer);
      state.transitionSafetyTimer = null;
    }
    const plot = plotFromFeatures(this.mapPanel.getCurrentFeatures());
    this.emitSnapshot(state, plot);
  }

  private classifyScene(
    scene: SceneFeature,
    plot: StoryboardPlot,
  ): MissingDataClassification {
    const temporal = this.sessionManager.getActiveSession()?.getState();
    const timeRange = temporal?.timeRange;
    const plotTimeRange = this.buildPlotTimeRange(timeRange);
    // eslint-disable-next-line no-restricted-syntax -- PlotFeature is a structural superset of GeoJSON.Feature for the purposes of detectMissingDataForScene (it only reads feature.id / properties.id); cast is safe at this boundary.
    const features = plot.features as unknown as readonly GeoJSON.Feature[];
    return detectMissingDataForScene(scene, features, plotTimeRange);
  }

  private buildPlotTimeRange(
    timeRange: { start: number; end: number } | null | undefined,
  ): { start: string; end: string } {
    if (!timeRange || Number.isNaN(timeRange.start) || Number.isNaN(timeRange.end)) {
      return { start: new Date(0).toISOString(), end: new Date(8.64e15).toISOString() };
    }
    return {
      start: new Date(timeRange.start).toISOString(),
      end: new Date(timeRange.end).toISOString(),
    };
  }

  private async promptHardBlock(
    scene: SceneFeature,
    classification: MissingDataClassification,
    direction: 'forward' | 'backward',
    documentUri: string,
  ): Promise<void> {
    const body = this.formatHardBlockBody(scene, classification);
    const choice = await this.modalPromptPort.showInformationMessage(
      body,
      { modal: true },
      messages.jumpPastLabel,
      messages.openForEditingLabel,
    );
    if (choice === messages.jumpPastLabel) {
      await this.resolveHardBlockByJumpingPast(documentUri, scene.properties.id, direction);
    } else if (choice === messages.openForEditingLabel) {
      this.resolveHardBlockByOpeningForEditing(documentUri, scene.properties.id);
    }
    // Dismissed: transport unchanged.
  }

  private formatHardBlockBody(
    scene: SceneFeature,
    classification: MissingDataClassification,
  ): string {
    if (classification.kind === 'missing-features') {
      return messages.missingFeatures(scene.properties.title, classification.missingIds);
    }
    if (classification.kind === 'out-of-range') {
      return messages.outOfRange(scene.properties.title);
    }
    return scene.properties.title;
  }

  private recomputeSceneOrder(state: TransportState, plot: StoryboardPlot): void {
    if (state.activeStoryboardId === null) {
      state.sceneOrder = [];
      state.currentSceneIndex = 0;
      return;
    }
    const scenes = listScenesOrdered(plot, state.activeStoryboardId);
    const order = scenes.map((s) => s.properties.id);
    // Preserve current scene when possible; otherwise reset to 0.
    const currentId = state.sceneOrder[state.currentSceneIndex];
    const preservedIdx = currentId ? order.indexOf(currentId) : -1;
    state.sceneOrder = order;
    state.currentSceneIndex = preservedIdx >= 0 ? preservedIdx : 0;
  }

  private applyScrubbableRange(state: TransportState, plot: StoryboardPlot): void {
    const currentSceneId = state.sceneOrder[state.currentSceneIndex];
    if (!currentSceneId) {
      if (state.scrubbableOverrideInstalled) {
        this.timeRangeView.setScrubbableRange(null, null);
        state.scrubbableOverrideInstalled = false;
      }
      return;
    }
    const currentScene = getScene(plot, currentSceneId);
    if (!currentScene) {return;}
    const nextSceneId = state.sceneOrder[state.currentSceneIndex + 1];
    const currentEpoch = new Date(currentScene.properties.timestamp).getTime();
    let endEpoch = currentEpoch;
    if (nextSceneId !== undefined) {
      const nextScene = getScene(plot, nextSceneId);
      if (nextScene) {
        endEpoch = new Date(nextScene.properties.timestamp).getTime();
      }
    }
    if (Number.isNaN(currentEpoch)) {return;}
    this.timeRangeView.setScrubbableRange(currentEpoch, endEpoch);
    state.scrubbableOverrideInstalled = true;
  }

  private updateStoryboardActiveContext(state: TransportState): void {
    const active = state.plotValid && state.sceneOrder.length > 0;
    this.setContextFn('debrief.storyboardActive', active);
  }

  private pushSceneRectangles(state: TransportState, plot: StoryboardPlot): void {
    if (!state.plotValid || state.activeStoryboardId === null) {
      this.mapPanel.setSceneRectangles(null, null, null);
      return;
    }
    const activeScenes: SceneFeature[] = [];
    for (const f of plot.features) {
      if (isSceneFeature(f) && f.properties.storyboard_id === state.activeStoryboardId) {
        activeScenes.push(f);
      }
    }
    activeScenes.sort((a, b) =>
      a.properties.timestamp < b.properties.timestamp ? -1 : a.properties.timestamp > b.properties.timestamp ? 1 : 0,
    );
    const currentSceneId = state.sceneOrder[state.currentSceneIndex] ?? null;
    this.mapPanel.setSceneRectangles(
      activeScenes,
      state.activeStoryboardId,
      currentSceneId,
    );
  }

  private buildSnapshot(state: TransportState, plot: StoryboardPlot): StoryboardPlaybackSnapshot {
    const storyboards: StoryboardOptionViewModel[] = [];
    let activeStoryboardName: string | null = null;
    for (const f of plot.features) {
      if (!isStoryboardFeature(f)) {continue;}
      const sbFeature = f as StoryboardFeature;
      const sceneCount = plot.features.filter(
        (candidate) =>
          isSceneFeature(candidate) &&
          candidate.properties.storyboard_id === sbFeature.properties.id,
      ).length;
      const provenance = sbFeature.properties.provenance ?? [];
      const last = provenance[provenance.length - 1];
      storyboards.push({
        storyboardId: sbFeature.properties.id,
        name: sbFeature.properties.name,
        sceneCount,
        lastModifiedIso: last?.timestamp ?? '',
      });
      if (sbFeature.properties.id === state.activeStoryboardId) {
        activeStoryboardName = sbFeature.properties.name;
      }
    }

    const scenes: SceneRowViewModel[] = [];
    for (const sceneId of state.sceneOrder) {
      const sceneFeature = getScene(plot, sceneId);
      if (!sceneFeature) {continue;}
      scenes.push({
        sceneId: sceneFeature.properties.id,
        title: sceneFeature.properties.title,
        timestampIso: sceneFeature.properties.timestamp,
        dtgLabel: this.formatDtg(sceneFeature.properties.timestamp),
        thumbnailHref: this.resolveThumbnailHref(sceneFeature.properties.id),
        state: { kind: 'ok' },
      });
    }

    const sceneTotal = scenes.length;
    const sceneNumber = sceneTotal === 0 ? 0 : state.currentSceneIndex + 1;
    const currentSceneId = state.sceneOrder[state.currentSceneIndex] ?? null;
    const transitionInFlight = state.transitionId !== null;
    const transport: TransportViewModel = {
      canGoBackward: !transitionInFlight && sceneNumber > 1,
      canGoForward: !transitionInFlight && sceneNumber < sceneTotal,
      sceneNumber,
      sceneTotal,
      transitionInFlight,
    };

    return {
      documentUri: state.documentUri,
      storyboards,
      scenes,
      activeStoryboardId: state.activeStoryboardId,
      activeStoryboardName,
      currentSceneId,
      transport,
    };
  }

  private emptySnapshot(documentUri: string): StoryboardPlaybackSnapshot {
    return {
      documentUri,
      storyboards: [],
      scenes: [],
      activeStoryboardId: null,
      currentSceneId: null,
      activeStoryboardName: null,
      transport: {
        canGoBackward: false,
        canGoForward: false,
        sceneNumber: 0,
        sceneTotal: 0,
        transitionInFlight: false,
      },
    };
  }

  private emitSnapshot(state: TransportState, plot: StoryboardPlot): void {
    const snapshot = this.buildSnapshot(state, plot);
    this.panelView.applySnapshot(snapshot);
    this._onSnapshotChange.fire(snapshot);
  }
}

// ── Helpers exported for command handlers ─────────────────────────────

export function missingDataReasonFromClassification(
  classification: MissingDataClassification,
  sceneTimestampIso: string,
  plotStartIso: string,
  plotEndIso: string,
): MissingDataReason | null {
  if (classification.kind === 'ok') {return null;}
  if (classification.kind === 'missing-features') {
    return {
      kind: 'missing-features',
      missingFeatureIds: classification.missingIds,
    };
  }
  return {
    kind: 'timestamp-out-of-range',
    sceneTimestampIso,
    plotStartIso,
    plotEndIso,
  };
}
