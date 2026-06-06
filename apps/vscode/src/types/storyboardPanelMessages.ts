/**
 * Typed message contracts for the Storyboard panel webview
 * (Features 216 + 217 + 235).
 *
 * All payloads are JSON-safe; no raw filesystem paths cross the boundary
 * (Article X). Discriminated unions keep extension / webview code
 * strictly typed (Article XV).
 */

import type {
  CollisionBannerPushState,
  NamingRowPushState,
  SceneEditViewModel,
  SceneRowViewModel,
  StoryboardEditViewModel,
  StoryboardOptionViewModel,
  TransportViewModel,
} from '@debrief/components';

export type { CollisionBannerPushState, NamingRowPushState };

/** Webview → Extension. */
export type StoryboardPanelMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'capture-clicked' }
  // #273 — live preview of the active storyboard in a new browser tab.
  | { readonly type: 'preview-clicked'; readonly storyboardId: string }
  | { readonly type: 'scene-row-clicked'; readonly sceneId: string }
  | {
      readonly type: 'log';
      readonly level: 'debug' | 'warn' | 'error';
      readonly message: string;
    }
  // #217 — multi-Storyboard + transport
  | { readonly type: 'active-storyboard-changed'; readonly storyboardId: string }
  | { readonly type: 'transport-forward-clicked' }
  | { readonly type: 'transport-backward-clicked' }
  | { readonly type: 'create-storyboard-requested' }
  | { readonly type: 'rename-storyboard-requested' }
  | { readonly type: 'delete-storyboard-requested' }
  // #218 — edit suite (Scene-level ops)
  | {
      readonly type: 'scene-title-rename-committed';
      readonly sceneId: string;
      readonly newTitle: string;
    }
  | {
      readonly type: 'scene-description-edit-submitted';
      readonly sceneId: string;
      readonly description: string | null;
    }
  | { readonly type: 'scene-delete-requested'; readonly sceneId: string }
  | { readonly type: 'scene-undo-delete-clicked'; readonly sceneId: string }
  | { readonly type: 'scene-update-to-current-clicked'; readonly sceneId: string }
  | { readonly type: 'scene-duplicate-clicked'; readonly sceneId: string }
  | { readonly type: 'scene-copy-to-other-clicked'; readonly sceneId: string }
  | { readonly type: 'scene-refresh-thumbnail-clicked'; readonly sceneId: string }
  // #218 — edit suite (Storyboard-level ops)
  | {
      readonly type: 'storyboard-refresh-all-stale-clicked';
      readonly storyboardId: string;
    }
  | {
      readonly type: 'storyboard-name-rename-committed';
      readonly storyboardId: string;
      readonly newName: string;
    }
  | {
      readonly type: 'storyboard-description-edit-submitted';
      readonly storyboardId: string;
      readonly description: string | null;
    }
  // #235 — first-capture naming row + duplicate-timestamp collision banner.
  // Stateless action posts per contracts/panel-messages.md §B. The host
  // owns the in-flight prompt lifecycle; the panel just posts the analyst's
  // resolution. Stale messages are dropped by the host (§C).
  | {
      readonly type: 'naming-row-confirm';
      readonly name: string;
    }
  | { readonly type: 'naming-row-cancel' }
  | {
      readonly type: 'collision-replace';
      readonly conflictingSceneId: string;
    }
  | { readonly type: 'collision-offset' }
  | { readonly type: 'collision-cancel' }
  // #271 — author dismissed the overlap warning on a Scene row; carries the
  // partner Scenes named on that badge so the host marks each pair dismissed.
  | {
      readonly type: 'scene-overlap-dismiss';
      readonly sceneId: string;
      readonly partnerSceneIds: readonly string[];
    };

/**
 * Full snapshot projection for the panel (#217). Replaces the narrower
 * #216 `scenes` message when the playback service is wired up.
 */
export interface StoryboardPlaybackSnapshotMessage {
  readonly type: 'snapshot';
  readonly storyboards: readonly StoryboardOptionViewModel[];
  readonly scenes: readonly SceneRowViewModel[];
  readonly activeStoryboardId: string | null;
  readonly activeStoryboardName: string | null;
  readonly currentSceneId: string | null;
  readonly transport: TransportViewModel;
  // #230 — edit-suite enrichments (FR-020). Optional so #217 fixtures /
  // tests keep compiling. When present, the panel renders edit forms,
  // stale badges, and undo toasts against the supplied view-models.
  readonly sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
  readonly pendingUndoToast?: SceneUndoToastDescriptor | null;
  readonly storyboardEditViewModel?: StoryboardEditViewModel | null;
  // #235 — host-driven first-capture naming row + collision banner.
  // `null` clears the slice; `undefined` (or absent) leaves it unchanged.
  readonly namingRow?: NamingRowPushState | null;
  readonly collisionBanner?: CollisionBannerPushState | null;
}

/**
 * Per-Scene stale-flag update emitted by `StoryboardEditService.onPlotOpened`
 * (Feature 218 — FR-EDIT-016). Consumed by the panel to render `StaleBadge`
 * on the affected rows.
 */
export interface SceneStaleFlagUpdate {
  readonly sceneId: string;
  readonly stale: boolean;
  readonly unresolvedFeatureIds: readonly string[];
}

/**
 * Undo-toast descriptor (Feature 218 — FR-EDIT-003). The extension fires
 * this inbound message after a successful delete so the panel can
 * render the session-scoped undo button. `null` clears the toast.
 */
export interface SceneUndoToastDescriptor {
  readonly sceneId: string;
  readonly sceneTitle: string;
  readonly deletedAt: string;
  readonly canUndo: boolean;
}

/** Extension → Webview. */
export type ExtensionToStoryboardPanelMessage =
  | {
      readonly type: 'scenes';
      readonly scenes: SceneRowViewModel[];
      readonly activeStoryboardName: string | null;
      readonly activeStoryboardId: string | null;
      // #230 — edit-suite enrichments (FR-020). Same fields as the
      // `snapshot` message so the panel reducer handles both uniformly.
      readonly sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
      readonly pendingUndoToast?: SceneUndoToastDescriptor | null;
      readonly storyboardEditViewModel?: StoryboardEditViewModel | null;
      // #235 — see SnapshotPayload above for semantics.
      readonly namingRow?: NamingRowPushState | null;
      readonly collisionBanner?: CollisionBannerPushState | null;
    }
  | {
      readonly type: 'captureInFlight';
      readonly inFlight: boolean;
    }
  | {
      readonly type: 'theme';
      readonly theme:
        | 'light'
        | 'dark'
        | 'high-contrast-light'
        | 'high-contrast-dark';
    }
  // #217 — full playback snapshot
  | StoryboardPlaybackSnapshotMessage
  // #218 — edit-suite inbound messages (3 new variants)
  | {
      /** Open the edit form on a specific Scene row. Fires from the hard-
       *  block prompt (FR-EDIT-015) so the form lands with missing-data
       *  details pre-filled. */
      readonly type: 'scene-edit-form-open';
      readonly sceneId: string;
    }
  | {
      /** Per-Scene stale-flag bulk update. Extension emits this after the
       *  on-plot-open stale-detection pass and after every mutation that
       *  invalidates a Scene's hash. */
      readonly type: 'scene-stale-flags-updated';
      readonly flags: readonly SceneStaleFlagUpdate[];
    }
  | {
      /** Session-scoped undo-toast descriptor; `toast === null` clears. */
      readonly type: 'scene-undo-toast-shown';
      readonly toast: SceneUndoToastDescriptor | null;
    };
