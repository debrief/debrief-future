/**
 * Types for the presentational Storyboard panel (Features 216 + 217).
 *
 * These types cross the extension → webview boundary. The panel itself is
 * headless of VS Code — consumers marshal `SceneRowViewModel` from their
 * own sources (e.g. #215's CRUD module in the VS Code extension, fixture
 * data in Storybook).
 *
 * #217 adds the multi-Storyboard dropdown, overflow menu, transport row,
 * and current-Scene highlight. All new fields are optional + defaulted so
 * #216 consumers keep compiling unchanged (plan.md design-fix 3).
 */
export interface SceneRowViewModel {
    /** ULID of the Scene. */
    readonly sceneId: string;
    /** Scene title — defaults to the DTG of `timestampIso` (set upstream by #215). */
    readonly title: string;
    /** ISO-8601 instant the Scene was captured. */
    readonly timestampIso: string;
    /** Pre-formatted DTG label — `DDHHmmZ MMM YY` by #215's `formatDtg`. */
    readonly dtgLabel: string;
    /** Webview-safe URI resolved via `Webview.asWebviewUri`. */
    readonly thumbnailHref: string;
    /**
     * Row state. `pending` is used briefly between a CRUD return and the
     * panel refresh; #216 emits mostly `ok` rows. #217 keeps this binary —
     * a "blocked" Scene is signalled at step-onto time via the hard-block
     * modal, not in the row (plan.md design-fix 1).
     */
    readonly state: {
        readonly kind: 'ok';
    } | {
        readonly kind: 'pending';
    };
}
/**
 * One option in the Storyboard header dropdown (#217).
 */
export interface StoryboardOptionViewModel {
    readonly storyboardId: string;
    readonly name: string;
    readonly sceneCount: number;
    /** ISO-8601 instant of the last provenance entry — used for tooltip + sort. */
    readonly lastModifiedIso: string;
}
/**
 * Transport row state projection (#217).
 */
export interface TransportViewModel {
    readonly canGoBackward: boolean;
    readonly canGoForward: boolean;
    /** 1-based index of the current Scene (0 when the Storyboard is empty). */
    readonly sceneNumber: number;
    readonly sceneTotal: number;
    /** When true, both transport buttons are disabled until the in-flight
     *  flyTo completes. The panel also dims the overflow menu's CRUD items
     *  to reflect the single-flight CRUD guard (plan.md R9). */
    readonly transitionInFlight: boolean;
}
/**
 * Reason a Scene hard-blocks at step-onto (#217). The presentational
 * `HardBlockModal` component consumes this; the VS Code extension surfaces
 * the real modal via `window.showInformationMessage({ modal: true })`.
 */
export type MissingDataReason = {
    readonly kind: 'missing-features';
    readonly missingFeatureIds: readonly string[];
} | {
    readonly kind: 'timestamp-out-of-range';
    readonly sceneTimestampIso: string;
    readonly plotStartIso: string;
    readonly plotEndIso: string;
};
/**
 * Per-Scene edit view-model (#218 data-model §3). Populated by the
 * extension from the plot FeatureCollection + `StaleFlagCache` + per-row
 * UI state. Consumed by StoryboardPanel's row renderer to drive inline
 * rename, edit form expansion, stale badge, pending-delete visibility.
 */
export interface SceneEditViewModel {
    readonly sceneId: string;
    readonly title: string;
    readonly description: string | null;
    readonly timestamp: string;
    readonly titleIsEditing: boolean;
    readonly editFormOpen: boolean;
    readonly pendingDelete: boolean;
    readonly stale: boolean;
    readonly unresolvedFeatureIds: readonly string[];
    readonly missingData: {
        readonly kind: 'ok';
    } | {
        readonly kind: 'missing-features';
        readonly ids: readonly string[];
    } | {
        readonly kind: 'out-of-range';
        readonly scenario: 'before-start' | 'after-end';
    };
}
/**
 * Storyboard-level edit view-model (#218 data-model §4).
 */
export interface StoryboardEditViewModel {
    readonly storyboardId: string;
    readonly name: string;
    readonly description: string | null;
    readonly nameIsEditing: boolean;
    readonly descriptionExpanded: boolean;
    readonly sceneCount: number;
}
/**
 * First-capture inline naming row (#235 data-model §NamingRowState).
 *
 * Presentational projection of the host's `namingRow` push slice plus the
 * panel's own `pendingName` typing state.
 */
export interface NamingRowViewModel {
    readonly visible: boolean;
    readonly pendingName: string;
    readonly defaultName: string;
    /** Existing storyboard name that collides with the trimmed `pendingName`,
     *  or `null` when no collision. Drives the inline warning slot. */
    readonly collisionWith: string | null;
    /** Derived: `pendingName.trim() !== '' && collisionWith === null`. */
    readonly canConfirm: boolean;
}
/**
 * Duplicate-timestamp inline collision banner (#235 data-model §CollisionBannerState).
 *
 * Anchored above the conflicting Scene row when visible; presents
 * Replace / Offset / Cancel. The Offset button is hidden by the panel
 * when `offsetCapReached` is true (FR-CAP-017 cap of 60) OR when the
 * host signals `offsetWouldExceedTimeRange` via the push payload
 * (FR-CAP-017a) — surfaced through `offsetButtonHidden`.
 */
export interface CollisionBannerViewModel {
    readonly visible: boolean;
    readonly conflictingSceneId: string | null;
    readonly conflictingSceneTitle: string | null;
    readonly proposedTimestamp: string | null;
    /** `formatDtg(proposedTimestamp)` — presentational only. */
    readonly proposedTimestampDtg: string | null;
    readonly offsetCount: number;
    /** Derived: `offsetCount >= 60`. */
    readonly offsetCapReached: boolean;
    /** Mirror of the host's `offsetWouldExceedTimeRange` flag (FR-CAP-017a). */
    readonly offsetWouldExceedTimeRange: boolean;
    /** Derived: `offsetCapReached || offsetWouldExceedTimeRange`. The Offset
     *  button is rendered only when this is `false`. */
    readonly offsetButtonHidden: boolean;
    readonly cause: 'capture' | 'update-to-current' | null;
}
export interface StoryboardPanelProps {
    /** Ordered by `timestampIso` ascending. Empty when no active Storyboard. */
    readonly scenes: readonly SceneRowViewModel[];
    /** Header label — null signals the "no Storyboards yet" empty state. */
    readonly activeStoryboardName: string | null;
    /** When true, renders a pending row above the existing Scene list. */
    readonly captureInFlight: boolean;
    /** Fires on the Storyboard panel's toolbar "Capture" button. */
    onCaptureClick(): void;
    /** Fires on row click; #217 wires this to the playback service's
     *  click-to-select transport. */
    onSceneRowClick(sceneId: string): void;
    /** All Storyboards on the plot. When provided and non-empty, the panel
     *  renders the `StoryboardHeader` dropdown; when undefined or empty, the
     *  panel keeps the #216 static header (`activeStoryboardName` label). */
    readonly storyboards?: readonly StoryboardOptionViewModel[];
    /** Selected Storyboard id — drives the dropdown selection and the
     *  Scene-list filter. `null` when the plot has no Storyboards. */
    readonly activeStoryboardId?: string | null;
    /** Scene id of the current transport position — the row with this id
     *  gets `data-active="true"` and bolder visual treatment. `null` when
     *  the active Storyboard has no Scenes. */
    readonly currentSceneId?: string | null;
    /** Transport state projection. When undefined, the panel does not
     *  render the TransportRow (empty-Storyboard-set / loading state). */
    readonly transport?: TransportViewModel;
    /** Fires when the analyst changes the dropdown selection. */
    onActiveStoryboardChange?(storyboardId: string): void;
    /** Fires when the analyst clicks "Create" in the overflow menu. */
    onCreateStoryboard?(): void;
    /** Fires when the analyst clicks "Rename" in the overflow menu. */
    onRenameStoryboard?(): void;
    /** Fires when the analyst clicks "Delete" in the overflow menu. */
    onDeleteStoryboard?(): void;
    /** Fires when the analyst clicks Forward or presses scoped Right arrow. */
    onTransportForward?(): void;
    /** Fires when the analyst clicks Backward or presses scoped Left arrow. */
    onTransportBackward?(): void;
    /** Per-Scene edit view-model keyed by sceneId. If absent for a given
     *  sceneId, the row falls back to #216/#217 behaviour. */
    readonly sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
    /** Storyboard-level edit view-model for the active Storyboard. */
    readonly storyboardEditViewModel?: StoryboardEditViewModel;
    /** Pending delete (session undo) descriptor — `null` when no undo window. */
    readonly pendingUndoToast?: {
        readonly sceneId: string;
        readonly sceneTitle: string;
        readonly deletedAt: string;
        readonly canUndo: boolean;
    } | null;
    onSceneTitleRenameCommit?(sceneId: string, newTitle: string): void;
    onSceneDescriptionSubmit?(sceneId: string, description: string | null): void;
    onSceneDeleteRequested?(sceneId: string): void;
    onSceneUndoDeleteClicked?(sceneId: string): void;
    onSceneUpdateToCurrentClicked?(sceneId: string): void;
    onSceneDuplicateClicked?(sceneId: string): void;
    onSceneCopyToOtherClicked?(sceneId: string): void;
    onSceneRefreshThumbnailClicked?(sceneId: string): void;
    onStoryboardRefreshAllStaleClicked?(storyboardId: string): void;
    onStoryboardNameRenameCommit?(storyboardId: string, newName: string): void;
    onStoryboardDescriptionSubmit?(storyboardId: string, description: string | null): void;
    /** Which row's overflow menu is currently open. `null` = no menu open. */
    readonly overflowMenuOpenFor?: string | null;
    /** Anchor rect for positioning the overflow menu popover. `null` when
     *  no menu is open. */
    readonly overflowMenuAnchorRect?: DOMRect | null;
    /** Fires when the analyst clicks the chevron on a Scene row, or double-
     *  clicks the row body. Toggles the inline edit form for that Scene. */
    onSceneRowExpandToggle?(sceneId: string): void;
    /** Fires when the analyst right-clicks (or presses Shift+F10 / Context
     *  Menu key) on a Scene row. The menu is positioned at the provided
     *  anchor rect. */
    onSceneOverflowMenuOpen?(sceneId: string, anchorRect: DOMRect): void;
    /** Fires when the overflow menu is dismissed (Escape / click outside /
     *  menu item activated). */
    onSceneOverflowMenuClose?(): void;
    /** Fires when the analyst cancels the inline edit form (Escape with
     *  form focus but textarea unfocused). */
    onSceneEditFormCancel?(sceneId: string): void;
    /** Fires when the analyst dismisses the Undo toast (close button). */
    onUndoToastDismiss?(): void;
    /** First-capture naming-row view-model. When `visible:false` (or
     *  omitted) the panel does not render the inline naming row. */
    readonly namingRowViewModel?: NamingRowViewModel;
    /** Duplicate-timestamp collision-banner view-model. When `visible:false`
     *  (or omitted) the panel does not render the inline banner. */
    readonly collisionBannerViewModel?: CollisionBannerViewModel;
    /** Fires when the analyst types in the naming-row input. The panel
     *  forwards the new text; the host echoes it back as `pendingName` on
     *  the next push. */
    onNamingRowTextChanged?(pendingName: string): void;
    /** Fires when the analyst presses Enter or clicks Confirm in the
     *  naming row with a non-empty, non-colliding name. The panel passes
     *  the trimmed `name`. */
    onNamingRowConfirm?(name: string): void;
    /** Fires when the analyst presses Escape, clicks Cancel, or clicks
     *  outside the naming row. */
    onNamingRowCancel?(): void;
    /** Fires when the analyst clicks Replace in the collision banner.
     *  Carries the `conflictingSceneId` so the host can verify it matches
     *  its own slice (stale-message defence per `contracts/panel-messages.md`). */
    onCollisionReplace?(conflictingSceneId: string): void;
    /** Fires when the analyst clicks Offset (+1 s). The panel does NOT
     *  compute the new timestamp; the host advances and re-pushes. */
    onCollisionOffset?(): void;
    /** Fires when the analyst clicks Cancel in the collision banner. */
    onCollisionCancel?(): void;
}
//# sourceMappingURL=types.d.ts.map