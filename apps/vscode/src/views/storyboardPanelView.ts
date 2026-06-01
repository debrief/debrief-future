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
  listScenesOrdered,
  detectSceneOverlaps,
  overlapPairKey,
  type StoryboardPlot,
  type SceneEditViewModel,
  type StoryboardEditViewModel,
} from '@debrief/components';
import type { SceneRowViewModel, OverlapPartner } from '@debrief/components';
import type { SessionManager } from '../services/sessionManager';
import type { MapPanel } from '../webview/mapPanel';
import type { StoryboardPlaybackService, StoryboardPlaybackSnapshot } from '../services/storyboardPlayback';
import type { StoryboardEditService } from '../services/storyboardEdit';
import { plotFromFeatures } from '../services/plotFromFeatures';
import type {
  StoryboardPanelMessage,
  ExtensionToStoryboardPanelMessage,
  SceneUndoToastDescriptor,
  NamingRowPushState,
  CollisionBannerPushState,
} from '../types/storyboardPanelMessages';

const VIEW_TYPE = 'debrief.storyboardPanel';

/**
 * Resolution of the inline naming row (#235). `null` = analyst cancelled.
 */
export type NamingRowResolution = { readonly name: string } | null;

/**
 * Resolution of the inline collision banner (#235).
 *  - `replace` — analyst clicked Replace; capture command should delete + retry.
 *  - `offset` — analyst clicked Offset (+1 s); capture command advances and re-checks.
 *  - `cancel` — analyst dismissed the banner.
 */
export type CollisionBannerResolution =
  | { readonly kind: 'replace'; readonly conflictingSceneId: string }
  | { readonly kind: 'offset' }
  | { readonly kind: 'cancel' };

export class StoryboardPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = VIEW_TYPE;

  /**
   * Public accessor for the active webview (#220 theme relay).
   */
  public get webview(): vscode.Webview | undefined {
    return this.activeWebview;
  }

  /**
   * The webview this provider posts to. After the UX-review flatten the
   * Storyboard renders as a section *inside* the Activity webview, so the
   * provider no longer owns a view — it attaches to the Activity webview
   * via {@link attachWebview}. The legacy `this.view` path is retained for
   * completeness (the view is no longer registered in package.json).
   */
  private get activeWebview(): vscode.Webview | undefined {
    return this.attachedWebview ?? this.view?.webview;
  }

  private view: vscode.WebviewView | undefined;
  private attachedWebview: vscode.Webview | undefined;
  private attachedMessageDisposable: vscode.Disposable | undefined;
  private webviewReady = false;
  private pendingMessages: ExtensionToStoryboardPanelMessage[] = [];
  private sessionChangeDisposable: vscode.Disposable | undefined;
  private getMapPanel: () => MapPanel | undefined = () => undefined;
  private playbackService: StoryboardPlaybackService | undefined;
  private editService: StoryboardEditService | undefined;
  private authorisedStoreRoot: string | null = null;

  /**
   * #235 — current host-driven prompt slices. Tracked so `refresh()` and
   * `applySnapshot()` can re-include them on every push (the analyst must
   * still see the row/banner after, e.g., a `setActiveStoryboard` triggers
   * a refresh mid-flow).
   */
  private currentNamingRow: NamingRowPushState | null = null;
  private currentCollisionBanner: CollisionBannerPushState | null = null;
  /**
   * #271 — session-scoped set of dismissed overlap pair keys
   * (`overlapPairKey`). Never persisted. Pruned to the currently-active
   * overlap set on every refresh so a re-created pair re-warns (FR-009).
   */
  private dismissedOverlapPairs = new Set<string>();

  /**
   * #235 — pending resolvers for the host-driven prompts. The capture
   * command awaits these; inbound action posts from the panel resolve them.
   * Stale messages (no resolver) are dropped silently per
   * contracts/panel-messages.md §C.
   */
  private namingRowResolver: ((r: NamingRowResolution) => void) | null = null;
  private collisionResolver:
    | ((r: CollisionBannerResolution) => void)
    | null = null;

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
    this.authorisedStoreRoot = null;

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
      this.authorisedStoreRoot = null;
    });
  }

  /**
   * Attach to a host-owned webview (the Activity webview). The Activity
   * provider builds the HTML + sets `webview.options`; this provider only
   * posts messages and registers its own `onDidReceiveMessage` listener.
   * VS Code permits multiple listeners per webview, and neither switch
   * throws on unrecognised message types, so the two providers coexist on
   * one webview without cross-talk. The webview JS posts `{type:'ready'}`
   * once mounted, which flushes any queued messages + triggers a refresh.
   */
  public attachWebview(webview: vscode.Webview): void {
    this.attachedWebview = webview;
    this.webviewReady = false;
    this.authorisedStoreRoot = null;
    this.attachedMessageDisposable?.dispose();
    this.attachedMessageDisposable = webview.onDidReceiveMessage(
      (message: StoryboardPanelMessage) => {
        this.handleMessage(message);
      },
    );
  }

  /**
   * Detach from the host webview (called when the Activity view disposes).
   */
  public detachWebview(): void {
    this.attachedMessageDisposable?.dispose();
    this.attachedMessageDisposable = undefined;
    this.attachedWebview = undefined;
    this.webviewReady = false;
    this.authorisedStoreRoot = null;
  }

  public refresh(): void {
    const webview = this.activeWebview;
    if (!webview) {return;}
    const plotFeatures = this.getMapPanel()?.getCurrentFeatures() ?? [];
    const plot: StoryboardPlot = plotFromFeatures(plotFeatures);
    const activeStoryboard = getActiveStoryboardDefault(plot);
    const activeId = activeStoryboard?.properties.id ?? null;
    const activeName = activeStoryboard?.properties.name ?? null;
    const scenes: SceneRowViewModel[] = this.computeSceneRowViewModels(
      plot,
      activeId,
      webview,
    );
    // #230 T017 — enrich refresh payload with edit view-models so the
    // panel reducer hydrates without round-trips.
    // INVARIANT: composing these VMs MUST stay O(active-storyboard Scenes)
    // — we iterate only `scenes` already filtered to the active Storyboard
    // (review 13A from #218 / FR-008 of #230). Do not introduce per-Scene
    // cross-plot lookups here.
    const docUri = this.sessionManager.getActiveDocumentUri();
    // #271 — compute time-range overlap warnings once for the active
    // Storyboard, applying session dismissals, then prune the dismissal set
    // to the still-active overlaps so a re-created pair warns afresh (FR-009).
    const overlaps =
      activeId !== null
        ? detectSceneOverlaps(plot, activeId, this.dismissedOverlapPairs)
        : new Map<string, readonly OverlapPartner[]>();
    this.pruneDismissedOverlapPairs(plot, activeId);
    const sceneEditViewModels: Record<string, SceneEditViewModel> = {};
    for (const row of scenes) {
      sceneEditViewModels[row.sceneId] = this.composeSceneEditViewModel(
        plot,
        row,
        docUri,
        overlaps.get(row.sceneId) ?? [],
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
      namingRow: this.currentNamingRow,
      collisionBanner: this.currentCollisionBanner,
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
    overlapsWith: readonly OverlapPartner[],
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
      overlapsWith,
    };
  }

  /**
   * #271 — drop dismissed overlap pair keys that no longer correspond to an
   * active (undismissed) overlap, so a pair that is pulled apart and later
   * re-overlapped warns afresh (FR-009 / contract C4.4). Pure set bookkeeping.
   */
  private pruneDismissedOverlapPairs(
    plot: StoryboardPlot,
    activeStoryboardId: string | null,
  ): void {
    if (this.dismissedOverlapPairs.size === 0) {
      return;
    }
    // Re-detect WITHOUT dismissals to learn the full set of currently-active
    // overlap pairs, then intersect the dismissed set with it.
    const activePairs = new Set<string>();
    if (activeStoryboardId !== null) {
      const raw = detectSceneOverlaps(plot, activeStoryboardId);
      for (const [sceneId, partners] of raw) {
        for (const partner of partners) {
          activePairs.add(overlapPairKey(sceneId, partner.sceneId));
        }
      }
    }
    for (const key of [...this.dismissedOverlapPairs]) {
      if (!activePairs.has(key)) {
        this.dismissedOverlapPairs.delete(key);
      }
    }
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
    // #271 — keep overlap warnings visible during playback snapshots too.
    const overlaps =
      snapshot.activeStoryboardId !== null
        ? detectSceneOverlaps(
            plot,
            snapshot.activeStoryboardId,
            this.dismissedOverlapPairs,
          )
        : new Map<string, readonly OverlapPartner[]>();
    this.pruneDismissedOverlapPairs(plot, snapshot.activeStoryboardId);
    const sceneEditViewModels: Record<string, SceneEditViewModel> = {};
    for (const row of enrichedScenes) {
      sceneEditViewModels[row.sceneId] = this.composeSceneEditViewModel(
        plot,
        row,
        docUri,
        overlaps.get(row.sceneId) ?? [],
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
      namingRow: this.currentNamingRow,
      collisionBanner: this.currentCollisionBanner,
    });
  }

  private resolveThumbnailHrefForActiveItem(sceneId: string): string {
    const webview = this.activeWebview;
    if (!webview) {return '';}
    const stacItemPath = this.getStacItemDirectory();
    return this.resolveThumbnailHref(webview, stacItemPath, sceneId);
  }

  public setCaptureInFlight(inFlight: boolean): void {
    this.post({ type: 'captureInFlight', inFlight });
  }

  /**
   * #235 — push a naming-row state to the panel. `null` clears the slice.
   * Most callers should use `promptStoryboardName` instead — that helper
   * pairs the push with a Promise that resolves on the analyst's reply.
   */
  public setNamingRow(state: NamingRowPushState | null): void {
    this.currentNamingRow = state;
    this.refresh();
  }

  /**
   * #235 — push a collision-banner state to the panel. `null` clears it.
   * Most callers should use `promptCollisionResolution` instead.
   */
  public setCollisionBanner(state: CollisionBannerPushState | null): void {
    this.currentCollisionBanner = state;
    this.refresh();
  }

  /**
   * #235 — show the inline naming row and await the analyst's reply.
   * Resolves with `{ name }` on confirm or `null` on cancel. Always clears
   * the slice before resolving.
   *
   * Replaces the legacy `vscode.window.showInputBox` quick-pick that
   * occluded the map (FR-VIS-022/023, SC-009).
   */
  public async promptStoryboardName(args: {
    readonly defaultName: string;
    readonly knownNames: readonly string[];
  }): Promise<NamingRowResolution> {
    // If a previous prompt was somehow still pending (host bug), reject it.
    if (this.namingRowResolver !== null) {
      const stale = this.namingRowResolver;
      this.namingRowResolver = null;
      stale(null);
    }
    this.setNamingRow({
      visible: true,
      defaultName: args.defaultName,
      knownNames: args.knownNames,
    });
    return new Promise<NamingRowResolution>((resolve) => {
      this.namingRowResolver = (r): void => {
        this.namingRowResolver = null;
        this.setNamingRow(null);
        resolve(r);
      };
    });
  }

  /**
   * #235 — show the inline collision banner and await the analyst's reply.
   * The caller drives the offset count + proposedTimestamp; this method
   * just renders whatever banner state is supplied and resolves on the
   * next inbound resolution action. Does NOT clear the slice on
   * `offset` — the caller re-pushes a fresh banner via `setCollisionBanner`
   * (or this method again) after recomputing offsets.
   *
   * Replaces the legacy modal `vscode.window.showInformationMessage(…,
   * { modal: true }, 'Replace', 'Offset (+1 s)')` that occluded the map
   * (FR-VIS-022/023, SC-009).
   */
  public async promptCollisionResolution(
    state: CollisionBannerPushState,
  ): Promise<CollisionBannerResolution> {
    if (this.collisionResolver !== null) {
      const stale = this.collisionResolver;
      this.collisionResolver = null;
      stale({ kind: 'cancel' });
    }
    this.setCollisionBanner(state);
    return new Promise<CollisionBannerResolution>((resolve) => {
      this.collisionResolver = (r): void => {
        this.collisionResolver = null;
        // Offset is special: the caller will re-push a fresh banner with
        // updated offsetCount + proposedTimestamp + offsetWouldExceedTimeRange,
        // so we leave `currentCollisionBanner` in place. Replace and Cancel
        // both end the flow → clear it.
        if (r.kind !== 'offset') {
          this.setCollisionBanner(null);
        }
        resolve(r);
      };
    });
  }

  private computeSceneRowViewModels(
    plot: StoryboardPlot,
    activeStoryboardId: string | null,
    webview: vscode.Webview,
  ): SceneRowViewModel[] {
    if (activeStoryboardId === null) {return [];}
    const stacItemPath = this.getStacItemDirectory();
    // #259 — canonical ordering is (timestamp, creation_order) ASC. The
    // panel must use the shared helper so tied-timestamp groups appear in
    // capture order, matching the playback transport (FR-006).
    const scenes = listScenesOrdered(plot, activeStoryboardId);
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
    // Scene thumbnails live under `{store.path}/{plot.itemPath}/scene-thumbnails/`,
    // outside the extension's own `dist/`. The webview will block image
    // requests there unless the store root is whitelisted in
    // `localResourceRoots`. Authorise it lazily here — the active store
    // can change across sessions, so we re-set options when it does.
    this.authoriseStoreRoot(store.path);
    const full = path.join(store.path, plot.itemPath);
    return path.dirname(full);
  }

  /**
   * Ensure the webview is authorised to read files under `storePath`
   * (where scene thumbnails are written). Idempotent per `storePath` —
   * we only re-set `webview.options` when the active store changes.
   */
  private authoriseStoreRoot(storePath: string): void {
    const webview = this.activeWebview;
    if (!webview) {return;}
    if (this.authorisedStoreRoot === storePath) {return;}
    // Re-set the (shared) webview's resource roots to include the STAC store
    // where scene thumbnails live. We keep dist + node_modules so the Activity
    // bundle + codicons continue to resolve after we widen the roots.
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'dist'),
        vscode.Uri.joinPath(this.extensionUri, 'node_modules'),
        vscode.Uri.file(storePath),
      ],
    };
    this.authorisedStoreRoot = storePath;
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
      case 'preview-clicked':
        // #273 — live preview of the active storyboard in a new browser tab.
        void vscode.commands.executeCommand('debrief.storyboard.preview', {
          storyboardId: message.storyboardId,
        });
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
        // The panel header confirms inline before sending this, so skip the
        // command's native modal to avoid a double confirm.
        void vscode.commands.executeCommand('debrief.storyboard.delete', {
          skipConfirm: true,
        });
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

      // #235 — naming row + collision banner resolutions.
      // Stale-message defence (contracts/panel-messages.md §C): drop the
      // action when no resolver is registered or when the host's own
      // current slice has been cleared / mismatched.
      case 'naming-row-confirm': {
        if (
          this.namingRowResolver !== null &&
          this.currentNamingRow !== null &&
          this.currentNamingRow.visible
        ) {
          this.namingRowResolver({ name: message.name });
        }
        break;
      }
      case 'naming-row-cancel': {
        if (
          this.namingRowResolver !== null &&
          this.currentNamingRow !== null &&
          this.currentNamingRow.visible
        ) {
          this.namingRowResolver(null);
        }
        break;
      }
      case 'collision-replace': {
        if (
          this.collisionResolver !== null &&
          this.currentCollisionBanner !== null &&
          this.currentCollisionBanner.visible &&
          this.currentCollisionBanner.conflictingSceneId ===
            message.conflictingSceneId
        ) {
          this.collisionResolver({
            kind: 'replace',
            conflictingSceneId: message.conflictingSceneId,
          });
        }
        break;
      }
      case 'collision-offset': {
        if (
          this.collisionResolver !== null &&
          this.currentCollisionBanner !== null &&
          this.currentCollisionBanner.visible
        ) {
          this.collisionResolver({ kind: 'offset' });
        }
        break;
      }
      case 'collision-cancel': {
        if (
          this.collisionResolver !== null &&
          this.currentCollisionBanner !== null &&
          this.currentCollisionBanner.visible
        ) {
          this.collisionResolver({ kind: 'cancel' });
        }
        break;
      }
      case 'scene-overlap-dismiss': {
        // #271 — session-scoped dismissal. Mark every named pair dismissed
        // and re-render; no Scene data is touched.
        for (const partnerId of message.partnerSceneIds) {
          this.dismissedOverlapPairs.add(
            overlapPairKey(message.sceneId, partnerId),
          );
        }
        this.refresh();
        break;
      }
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
    const webview = this.activeWebview;
    if (webview && this.webviewReady) {
      void webview.postMessage(message);
    } else {
      this.pendingMessages.push(message);
    }
  }

  private flushPending(): void {
    const webview = this.activeWebview;
    if (!webview) {return;}
    for (const msg of this.pendingMessages) {
      void webview.postMessage(msg);
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
    this.view = undefined;
    // Cancel any in-flight prompts so the awaiting capture command
    // unblocks instead of leaking.
    if (this.namingRowResolver !== null) {
      const r = this.namingRowResolver;
      this.namingRowResolver = null;
      r(null);
    }
    if (this.collisionResolver !== null) {
      const r = this.collisionResolver;
      this.collisionResolver = null;
      r({ kind: 'cancel' });
    }
    this.currentNamingRow = null;
    this.currentCollisionBanner = null;
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
