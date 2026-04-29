/**
 * Storyboard panel view provider (Feature 216).
 *
 * Mirrors `logPanelView.ts` for CSP / nonce / message wiring. Responsibilities:
 *  - Register a webview view at `debrief.storyboardPanel`.
 *  - Compute `SceneRowViewModel`s from the active session's Plot on demand.
 *  - Forward `capture-clicked` to the capture command.
 *  - Expose `refresh()` + `setCaptureInFlight(boolean)` for the capture
 *    handler's progress-reporting callbacks.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
  formatDtg,
  getActiveStoryboardDefault,
  isSceneFeature,
  type StoryboardPlot,
  type SceneFeature,
  type SceneEditViewModel,
  type StoryboardEditViewModel,
  type NamingRowReducerState,
  type CollisionBannerReducerState,
  type CascadeDeleteConfirmReducerState,
} from '@debrief/components';
import type { SceneRowViewModel } from '@debrief/components';
import type { SessionManager } from '../services/sessionManager';
import type { MapPanel } from '../webview/mapPanel';
import type { StoryboardPlaybackService, StoryboardPlaybackSnapshot } from '../services/storyboardPlayback';
import type { StoryboardEditService } from '../services/storyboardEdit';
import { plotFromFeatures } from '../services/plotFromFeatures';
import type {
  StoryboardPanelMessage,
  ExtensionToStoryboardPanelMessage,
  SceneUndoToastDescriptor,
} from '../types/storyboardPanelMessages';

const VIEW_TYPE = 'debrief.storyboardPanel';

export class StoryboardPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = VIEW_TYPE;

  /**
   * Public accessor for the active webview (#220 theme relay).
   */
  public get webview(): vscode.Webview | undefined {
    return this.view?.webview;
  }

  private view: vscode.WebviewView | undefined;
  private webviewReady = false;
  private pendingMessages: ExtensionToStoryboardPanelMessage[] = [];
  private sessionChangeDisposable: vscode.Disposable | undefined;
  private getMapPanel: () => MapPanel | undefined = () => undefined;
  private playbackService: StoryboardPlaybackService | undefined;
  private editService: StoryboardEditService | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly sessionManager: SessionManager,
  ) {
    this.sessionChangeDisposable = this.sessionManager.onActiveSessionChange(() => {
      this.refresh();
    });
  }

  public setMapPanelResolver(fn: () => MapPanel | undefined): void {
    this.getMapPanel = fn;
  }

  /**
   * #217 Phase 4: Provide the playback service so the panel can forward
   * synchronous state changes (dropdown selection) without going through
   * the command palette.
   */
  public setPlaybackService(service: StoryboardPlaybackService): void {
    this.playbackService = service;
  }

  /**
   * #218: provide the edit service. Also installs the panel as a sink
   * for inbound edit messages (scene-edit-form-open, stale-flags-updated,
   * scene-undo-toast-shown) so the service can push UI state back to the
   * webview without a direct dependency on this class.
   */
  public setEditService(service: StoryboardEditService): void {
    this.editService = service;
    service.setPanelSink({
      postMessage: (msg): void => this.post(msg),
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _resolveContext: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;
    this.webviewReady = false;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'dist'),
        vscode.Uri.joinPath(this.extensionUri, 'node_modules'),
      ],
    };
    webviewView.webview.html = this.buildHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message: StoryboardPanelMessage) => {
      this.handleMessage(message);
    });

    webviewView.onDidDispose(() => {
      this.view = undefined;
      this.webviewReady = false;
    });
  }

  public refresh(): void {
    if (!this.view) {return;}
    const plotFeatures = this.getMapPanel()?.getCurrentFeatures() ?? [];
    const plot: StoryboardPlot = plotFromFeatures(plotFeatures);
    const activeStoryboard = getActiveStoryboardDefault(plot);
    const activeId = activeStoryboard?.properties.id ?? null;
    const activeName = activeStoryboard?.properties.name ?? null;
    const scenes: SceneRowViewModel[] = this.computeSceneRowViewModels(
      plot,
      activeId,
      this.view.webview,
    );
    // #230 T017 — enrich refresh payload with edit view-models so the
    // panel reducer hydrates without round-trips.
    // INVARIANT: composing these VMs MUST stay O(active-storyboard Scenes)
    // — we iterate only `scenes` already filtered to the active Storyboard
    // (review 13A from #218 / FR-008 of #230). Do not introduce per-Scene
    // cross-plot lookups here.
    const docUri = this.sessionManager.getActiveDocumentUri();
    const sceneEditViewModels: Record<string, SceneEditViewModel> = {};
    for (const row of scenes) {
      sceneEditViewModels[row.sceneId] = this.composeSceneEditViewModel(
        plot,
        row,
        docUri,
      );
    }
    const storyboardEditViewModel: StoryboardEditViewModel | null =
      activeStoryboard !== null
        ? {
            storyboardId: activeStoryboard.properties.id,
            name: activeStoryboard.properties.name,
            description: activeStoryboard.properties.description ?? null,
            nameIsEditing: false,
            descriptionExpanded: false,
            sceneCount: scenes.length,
          }
        : null;
    const pendingUndoToast = this.composePendingUndoToast(docUri);
    this.post({
      type: 'scenes',
      scenes,
      activeStoryboardName: activeName,
      activeStoryboardId: activeId,
      sceneEditViewModels,
      pendingUndoToast,
      storyboardEditViewModel,
      // #235 — host-driven prompt slices. Always echoed on refresh so a
      // panel reload picks them up.
      namingRow: this.currentNamingRow,
      collisionBanner: this.currentCollisionBanner,
      cascadeDeleteConfirm: this.currentCascadeDeleteConfirm,
    });
  }

  /**
   * Compose a per-Scene edit view-model bundle for the refresh payload.
   * Read-only; draws on the edit service's staleCache + undoBuffer.
   *
   * Defensive against mocks/partial services: `getStaleFlag` and
   * `getPendingDeletes` are both optional-at-runtime.
   */
  private composeSceneEditViewModel(
    plot: StoryboardPlot,
    row: SceneRowViewModel,
    documentUri: string | null,
  ): SceneEditViewModel {
    const svc = this.editService;
    const staleFlag =
      documentUri !== null && svc && typeof svc.getStaleFlag === 'function'
        ? svc.getStaleFlag(documentUri, row.sceneId)
        : null;
    const pendingList =
      documentUri !== null && svc && typeof svc.getPendingDeletes === 'function'
        ? svc.getPendingDeletes(documentUri)
        : [];
    const pending = pendingList.some(
      (d) => d.original.properties.id === row.sceneId,
    );
    let description: string | null = null;
    for (const f of plot.features) {
      if (isSceneFeature(f) && f.properties.id === row.sceneId) {
        description = f.properties.description ?? null;
        break;
      }
    }
    return {
      sceneId: row.sceneId,
      title: row.title,
      description,
      timestamp: row.timestampIso,
      titleIsEditing: false,
      editFormOpen: false,
      pendingDelete: pending,
      stale: staleFlag?.stale ?? false,
      unresolvedFeatureIds: staleFlag?.unresolvedFeatureIds ?? [],
      missingData: { kind: 'ok' },
    };
  }

  /**
   * Compose the pending-undo-toast descriptor for the refresh payload —
   * the most recent delete buffered for the active document. Null when
   * the buffer is empty. Defensive against mocks without the read method.
   */
  private composePendingUndoToast(
    documentUri: string | null,
  ): SceneUndoToastDescriptor | null {
    if (documentUri === null || !this.editService) {return null;}
    const svc = this.editService;
    if (typeof svc.getPendingDeletes !== 'function') {return null;}
    const deletes = svc.getPendingDeletes(documentUri);
    if (deletes.length === 0) {return null;}
    const latest = deletes[deletes.length - 1];
    if (latest === undefined) {return null;}
    return {
      sceneId: latest.original.properties.id,
      sceneTitle: latest.original.properties.title,
      deletedAt: latest.deletedAt,
      canUndo: true,
    };
  }

  /**
   * Apply a full playback snapshot (#217). Called by the
   * StoryboardPlaybackService on every transport step / lifecycle event /
   * CRUD op. The service already enriches the view-models; we pass them
   * straight through.
   */
  public applySnapshot(snapshot: StoryboardPlaybackSnapshot): void {
    // Thumbnails may not be resolvable by the service (it doesn't know
    // about webview URIs). Enrich each row with a webview-safe thumbnail
    // href derived from the STAC item directory.
    const enrichedScenes = snapshot.scenes.map((row) => ({
      ...row,
      thumbnailHref: row.thumbnailHref === ''
        ? this.resolveThumbnailHrefForActiveItem(row.sceneId)
        : row.thumbnailHref,
    }));
    // #230 T017 — enrich snapshot with edit view-models for the panel
    // reducer. Same O(active-storyboard Scenes) invariant as refresh().
    const docUri = this.sessionManager.getActiveDocumentUri();
    const plotFeatures = this.getMapPanel()?.getCurrentFeatures() ?? [];
    const plot: StoryboardPlot = plotFromFeatures(plotFeatures);
    const sceneEditViewModels: Record<string, SceneEditViewModel> = {};
    for (const row of enrichedScenes) {
      sceneEditViewModels[row.sceneId] = this.composeSceneEditViewModel(
        plot,
        row,
        docUri,
      );
    }
    let storyboardEditViewModel: StoryboardEditViewModel | null = null;
    if (snapshot.activeStoryboardId !== null) {
      const found = snapshot.storyboards.find(
        (s) => s.storyboardId === snapshot.activeStoryboardId,
      );
      if (found !== undefined) {
        let description: string | null = null;
        for (const f of plot.features) {
          if (
            f.properties !== null &&
            typeof f.properties === 'object' &&
            'id' in f.properties &&
            (f.properties as { id: string }).id === found.storyboardId &&
            'description' in f.properties
          ) {
            const desc = (f.properties as { description?: string | null })
              .description;
            description = desc ?? null;
            break;
          }
        }
        storyboardEditViewModel = {
          storyboardId: found.storyboardId,
          name: found.name,
          description,
          nameIsEditing: false,
          descriptionExpanded: false,
          sceneCount: enrichedScenes.length,
        };
      }
    }
    const pendingUndoToast = this.composePendingUndoToast(docUri);
    this.post({
      type: 'snapshot',
      storyboards: snapshot.storyboards,
      scenes: enrichedScenes,
      activeStoryboardId: snapshot.activeStoryboardId,
      activeStoryboardName: snapshot.activeStoryboardName,
      currentSceneId: snapshot.currentSceneId,
      transport: snapshot.transport,
      sceneEditViewModels,
      pendingUndoToast,
      storyboardEditViewModel,
      // #235 — echo host-driven prompt slices on every snapshot push.
      namingRow: this.currentNamingRow,
      collisionBanner: this.currentCollisionBanner,
      cascadeDeleteConfirm: this.currentCascadeDeleteConfirm,
    });
  }

  private resolveThumbnailHrefForActiveItem(sceneId: string): string {
    if (!this.view) {return '';}
    const stacItemPath = this.getStacItemDirectory();
    return this.resolveThumbnailHref(this.view.webview, stacItemPath, sceneId);
  }

  public setCaptureInFlight(inFlight: boolean): void {
    this.post({ type: 'captureInFlight', inFlight });
  }

  // ── #235 — host-driven prompt slices + action emitters ──────────────
  //
  // The capture command sets these slices via the `setNamingRow` /
  // `setCollisionBanner` methods, which in turn push a fresh `scenes`
  // payload to the webview carrying the new fields. The five new action
  // posts arriving from the webview fire through the matching emitters
  // below; the capture command awaits a one-shot subscriber on the
  // matching emitter to resolve its in-flight prompt.

  private currentNamingRow: NamingRowReducerState | null = null;
  private currentCollisionBanner: CollisionBannerReducerState | null = null;
  private currentCascadeDeleteConfirm: CascadeDeleteConfirmReducerState | null =
    null;

  private readonly namingRowConfirmEmitter = new vscode.EventEmitter<{
    readonly name: string;
  }>();
  private readonly namingRowCancelEmitter = new vscode.EventEmitter<void>();
  private readonly collisionReplaceEmitter = new vscode.EventEmitter<{
    readonly conflictingSceneId: string;
  }>();
  private readonly collisionOffsetEmitter = new vscode.EventEmitter<void>();
  private readonly collisionCancelEmitter = new vscode.EventEmitter<void>();

  public readonly onNamingRowConfirm = this.namingRowConfirmEmitter.event;
  public readonly onNamingRowCancel = this.namingRowCancelEmitter.event;
  public readonly onCollisionReplace = this.collisionReplaceEmitter.event;
  public readonly onCollisionOffset = this.collisionOffsetEmitter.event;
  public readonly onCollisionCancel = this.collisionCancelEmitter.event;

  /**
   * Set the host-pushed first-capture naming row slice. Pushing `null`
   * clears the row. The next `scenes` payload carries the slice so the
   * panel reducer applies it.
   */
  public setNamingRow(slice: NamingRowReducerState | null): void {
    this.currentNamingRow = slice;
    this.refresh();
  }

  /**
   * Set the host-pushed duplicate-timestamp collision banner slice.
   * Pushing `null` clears the banner.
   */
  public setCollisionBanner(slice: CollisionBannerReducerState | null): void {
    this.currentCollisionBanner = slice;
    this.refresh();
  }

  /**
   * Set the host-pushed inline cascade-delete confirmation slice for
   * storyboard delete (FR-MAINT-021). Pushing `null` clears it.
   */
  public setCascadeDeleteConfirm(
    slice: CascadeDeleteConfirmReducerState | null,
  ): void {
    this.currentCascadeDeleteConfirm = slice;
    this.refresh();
  }

  /**
   * Read-only access to the current host-side slice values, used by
   * the capture command for stale-message defence (it re-checks the
   * slice it set is still the live one before acting on a panel post).
   */
  public getNamingRow(): NamingRowReducerState | null {
    return this.currentNamingRow;
  }

  public getCollisionBanner(): CollisionBannerReducerState | null {
    return this.currentCollisionBanner;
  }

  private computeSceneRowViewModels(
    plot: StoryboardPlot,
    activeStoryboardId: string | null,
    webview: vscode.Webview,
  ): SceneRowViewModel[] {
    if (activeStoryboardId === null) {return [];}
    const stacItemPath = this.getStacItemDirectory();
    const scenes: SceneFeature[] = [];
    for (const f of plot.features) {
      if (isSceneFeature(f) && f.properties.storyboard_id === activeStoryboardId) {
        scenes.push(f);
      }
    }
    scenes.sort((a, b) =>
      a.properties.timestamp < b.properties.timestamp ? -1 : a.properties.timestamp > b.properties.timestamp ? 1 : 0,
    );
    return scenes.map((scene) => {
      const thumbnailHref = this.resolveThumbnailHref(
        webview,
        stacItemPath,
        scene.properties.id,
      );
      return {
        sceneId: scene.properties.id,
        title: scene.properties.title,
        timestampIso: scene.properties.timestamp,
        dtgLabel: formatDtg(scene.properties.timestamp),
        thumbnailHref,
        state: { kind: 'ok' as const },
      };
    });
  }

  private resolveThumbnailHref(
    webview: vscode.Webview,
    stacItemPath: string | null,
    sceneId: string,
  ): string {
    if (stacItemPath === null) {return '';}
    const largePath = path.join(
      stacItemPath,
      'scene-thumbnails',
      `scene-${sceneId}.png`,
    );
    return webview.asWebviewUri(vscode.Uri.file(largePath)).toString();
  }

  private getStacItemDirectory(): string | null {
    const panel = this.getMapPanel();
    const plot = panel?.getCurrentPlot();
    const store = panel?.getCurrentStore?.();
    if (!plot || !store?.path || !plot.itemPath) {return null;}
    const full = path.join(store.path, plot.itemPath);
    return path.dirname(full);
  }

  private handleMessage(message: StoryboardPanelMessage): void {
    switch (message.type) {
      case 'ready':
        this.webviewReady = true;
        this.flushPending();
        this.refresh();
        break;
      case 'capture-clicked':
        void vscode.commands.executeCommand('debrief.captureScene');
        break;
      case 'scene-row-clicked':
        // #217: scene-row-clicked now drives transport (goToScene via
        // the debrief.storyboard.clickScene command). The service runs
        // the hard-block check inside goToScene — if the target Scene
        // is missing features or out of range, the native VS Code modal
        // surfaces. Rows themselves carry no pre-computed `blocked`
        // state (design-fix 1).
        void vscode.commands.executeCommand('debrief.storyboard.clickScene', message.sceneId);
        break;
      case 'transport-forward-clicked':
        // Delegating to the VS Code command keeps the panel button click
        // and the scoped Right-arrow key on the same code path.
        void vscode.commands.executeCommand('debrief.storyboard.forward');
        break;
      case 'transport-backward-clicked':
        void vscode.commands.executeCommand('debrief.storyboard.backward');
        break;
      case 'active-storyboard-changed': {
        // Direct state change — NOT a palette command. The service
        // updates per-plot state synchronously and emits a snapshot.
        const uri = this.sessionManager.getActiveDocumentUri();
        if (uri && this.playbackService) {
          this.playbackService.setActiveStoryboard(uri, message.storyboardId);
        }
        break;
      }
      case 'create-storyboard-requested':
        void vscode.commands.executeCommand('debrief.storyboard.create');
        break;
      case 'rename-storyboard-requested':
        void vscode.commands.executeCommand('debrief.storyboard.rename');
        break;
      case 'delete-storyboard-requested':
        void vscode.commands.executeCommand('debrief.storyboard.delete');
        break;
      case 'log':
        if (message.level === 'error') {
          console.error(`[StoryboardPanel webview] ${message.message}`);
        } else if (message.level === 'warn') {
          console.warn(`[StoryboardPanel webview] ${message.message}`);
        }
        // debug-level logs are intentionally dropped in production builds.
        break;

      // #218 — edit suite (Scene-level ops). Each dispatches directly to
      // the edit service rather than via command palette, because the
      // webview carries all the params the service needs (new title,
      // description, timestamp) — going through palette would require
      // packaging + unpacking args.
      case 'scene-title-rename-committed':
        void this.dispatchEdit(async (svc, uri) =>
          svc.renameScene({
            documentUri: uri,
            sceneId: message.sceneId,
            newTitle: message.newTitle,
            actor: 'vscode-user',
          }),
        );
        break;
      case 'scene-description-edit-submitted':
        void this.dispatchEdit(async (svc, uri) =>
          svc.describeScene({
            documentUri: uri,
            sceneId: message.sceneId,
            description: message.description,
            actor: 'vscode-user',
          }),
        );
        break;
      case 'scene-delete-requested':
        void this.dispatchEdit(async (svc, uri) =>
          svc.deleteScene({
            documentUri: uri,
            sceneId: message.sceneId,
            actor: 'vscode-user',
          }),
        );
        break;
      case 'scene-undo-delete-clicked':
        void this.dispatchEdit(async (svc, uri) =>
          svc.undoDeleteScene({
            documentUri: uri,
            sceneId: message.sceneId,
            actor: 'vscode-user',
          }),
        );
        break;
      case 'scene-update-to-current-clicked':
        // Palette-style route — needs the current map view + optional
        // prompts; delegate to the command handler. The command reads
        // mapPanel state and wires collision modals.
        void vscode.commands.executeCommand(
          'debrief.storyboard.updateSceneToCurrent',
          { sceneId: message.sceneId },
        );
        break;
      case 'scene-duplicate-clicked':
        void vscode.commands.executeCommand(
          'debrief.storyboard.duplicateScene',
          { sceneId: message.sceneId },
        );
        break;
      case 'scene-copy-to-other-clicked':
        void vscode.commands.executeCommand(
          'debrief.storyboard.copySceneToOtherStoryboard',
          { sceneId: message.sceneId },
        );
        break;
      case 'scene-refresh-thumbnail-clicked':
        void vscode.commands.executeCommand(
          'debrief.storyboard.refreshSceneThumbnail',
          { sceneId: message.sceneId },
        );
        break;
      case 'storyboard-refresh-all-stale-clicked':
        void vscode.commands.executeCommand(
          'debrief.storyboard.refreshAllStaleThumbnails',
          { storyboardId: message.storyboardId },
        );
        break;
      case 'storyboard-name-rename-committed':
        void this.dispatchEdit(async (svc, uri) =>
          svc.renameStoryboard({
            documentUri: uri,
            storyboardId: message.storyboardId,
            newName: message.newName,
            actor: 'vscode-user',
          }),
        );
        break;
      case 'storyboard-description-edit-submitted':
        void this.dispatchEdit(async (svc, uri) =>
          svc.describeStoryboard({
            documentUri: uri,
            storyboardId: message.storyboardId,
            description: message.description,
            actor: 'vscode-user',
          }),
        );
        break;
      // ── #235 — naming row + collision banner inbound posts ──────────
      case 'naming-row-confirm-requested':
        // Stale-message defence — drop if no host-side row is in flight.
        if (
          this.currentNamingRow !== null &&
          this.currentNamingRow.visible
        ) {
          this.namingRowConfirmEmitter.fire({ name: message.name });
        }
        break;
      case 'naming-row-cancel-requested':
        if (
          this.currentNamingRow !== null &&
          this.currentNamingRow.visible
        ) {
          this.namingRowCancelEmitter.fire();
        }
        break;
      case 'collision-replace-requested':
        // Stale-message defence — drop if no banner OR mismatched id.
        if (
          this.currentCollisionBanner !== null &&
          this.currentCollisionBanner.visible &&
          this.currentCollisionBanner.conflictingSceneId ===
            message.conflictingSceneId
        ) {
          this.collisionReplaceEmitter.fire({
            conflictingSceneId: message.conflictingSceneId,
          });
        }
        break;
      case 'collision-offset-requested':
        if (
          this.currentCollisionBanner !== null &&
          this.currentCollisionBanner.visible &&
          !this.currentCollisionBanner.offsetWouldExceedTimeRange
        ) {
          this.collisionOffsetEmitter.fire();
        }
        break;
      case 'collision-cancel-requested':
        if (
          this.currentCollisionBanner !== null &&
          this.currentCollisionBanner.visible
        ) {
          this.collisionCancelEmitter.fire();
        }
        break;
    }
  }

  /**
   * INVARIANT: `dispatchEdit` must remain O(active-Storyboard Scenes) at
   * spec bound (5 × 50 scenes); expensive work here breaks the polish-
   * loop UX (review 13A sentinel — SC-014 / research.md R4).
   */
  private async dispatchEdit<T>(
    op: (svc: StoryboardEditService, documentUri: string) => Promise<T>,
  ): Promise<void> {
    const uri = this.sessionManager.getActiveDocumentUri();
    const svc = this.editService;
    if (uri === null || !svc) {
      return;
    }
    try {
      await op(svc, uri);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[StoryboardPanel edit dispatch] ${msg}`);
    }
  }

  private post(message: ExtensionToStoryboardPanelMessage): void {
    if (this.view && this.webviewReady) {
      void this.view.webview.postMessage(message);
    } else {
      this.pendingMessages.push(message);
    }
  }

  private flushPending(): void {
    if (!this.view) {return;}
    for (const msg of this.pendingMessages) {
      void this.view.webview.postMessage(msg);
    }
    this.pendingMessages = [];
  }

  private buildHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'storyboardPanel.js'),
    );
    const cspSource = webview.cspSource;
    const nonce = createNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${cspSource} data:; img-src ${cspSource} data: vscode-resource:;">
  <title>Storyboard</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      overflow: hidden;
    }
    #root { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }

  public dispose(): void {
    this.sessionChangeDisposable?.dispose();
    this.sessionChangeDisposable = undefined;
    this.namingRowConfirmEmitter.dispose();
    this.namingRowCancelEmitter.dispose();
    this.collisionReplaceEmitter.dispose();
    this.collisionOffsetEmitter.dispose();
    this.collisionCancelEmitter.dispose();
    this.view = undefined;
  }
}

function createNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
