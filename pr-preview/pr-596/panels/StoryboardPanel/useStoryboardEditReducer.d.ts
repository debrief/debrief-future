import { CollisionBannerViewModel, NamingRowViewModel, SceneEditViewModel, SceneRowViewModel, StoryboardEditViewModel, StoryboardOptionViewModel, TransportViewModel } from './types';

export interface UndoToastDescriptor {
    readonly sceneId: string;
    readonly sceneTitle: string;
    readonly deletedAt: string;
    readonly canUndo: boolean;
}
export interface StaleFlagEntry {
    readonly sceneId: string;
    readonly stale: boolean;
    readonly unresolvedFeatureIds: readonly string[];
}
/**
 * Local theme variant for the Storyboard panel reducer state.
 *
 * Aligned with the project-wide flat union (#220) — the legacy `'vscode'`
 * value has been retired. Inside a VS Code webview the panel resolves to
 * one of the four explicit values via `vsCodeBodyClassSource`.
 */
export type ThemeVariant = 'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark';
/**
 * Host-pushed first-capture naming-row state slice (#235 contract §A).
 *
 * Non-null + `visible:true` → host has a capture command in flight that
 * needs the analyst to confirm a Storyboard name. The reducer owns the
 * panel-local `pendingName` typing state on top of this push slice.
 */
export interface NamingRowReducerState {
    readonly visible: boolean;
    readonly defaultName: string;
    readonly knownNames: readonly string[];
    /** Panel-local typing state — initialised from `defaultName` when the
     *  slice first becomes visible, then driven by the analyst's keystrokes. */
    readonly pendingName: string;
}
/**
 * Host-pushed duplicate-timestamp collision-banner state slice
 * (#235 contract §A).
 */
export interface CollisionBannerReducerState {
    readonly visible: boolean;
    readonly conflictingSceneId: string;
    readonly conflictingSceneTitle: string;
    readonly originalTimestamp: string;
    readonly proposedTimestamp: string;
    readonly offsetCount: number;
    readonly offsetWouldExceedTimeRange: boolean;
    readonly cause: 'capture' | 'update-to-current';
}
export interface StoryboardEditReducerState {
    readonly sceneRows: readonly SceneRowViewModel[];
    readonly activeStoryboardId: string | null;
    readonly activeStoryboardName: string | null;
    readonly storyboards: readonly StoryboardOptionViewModel[];
    readonly currentSceneId: string | null;
    readonly transport: TransportViewModel | undefined;
    readonly captureInFlight: boolean;
    readonly theme: ThemeVariant;
    readonly sceneEditViewModelsFromExtension: Readonly<Record<string, SceneEditViewModel>>;
    readonly storyboardEditViewModel: StoryboardEditViewModel | null;
    readonly staleFlags: ReadonlyMap<string, StaleFlagEntry>;
    readonly pendingUndoToast: UndoToastDescriptor | null;
    readonly editFormOpenFor: string | null;
    readonly overflowMenuOpenFor: string | null;
    readonly overflowMenuAnchorRect: DOMRect | null;
    readonly namingRow: NamingRowReducerState | null;
    readonly collisionBanner: CollisionBannerReducerState | null;
}
/**
 * Push slice for the first-capture naming row (#235 contract §A —
 * `NamingRowPushState`). Mirrors `NamingRowReducerState` minus the
 * panel-local `pendingName`, which is initialised by the reducer when the
 * slice first becomes visible.
 */
export interface NamingRowPushState {
    readonly visible: boolean;
    readonly defaultName: string;
    readonly knownNames: readonly string[];
}
/**
 * Push slice for the duplicate-timestamp collision banner (#235 contract
 * §A — `CollisionBannerPushState`).
 */
export interface CollisionBannerPushState {
    readonly visible: boolean;
    readonly conflictingSceneId: string;
    readonly conflictingSceneTitle: string;
    readonly originalTimestamp: string;
    readonly proposedTimestamp: string;
    readonly offsetCount: number;
    readonly offsetWouldExceedTimeRange: boolean;
    readonly cause: 'capture' | 'update-to-current';
}
/**
 * Payload shapes that the scenes / snapshot messages deliver. Keeping the
 * reducer decoupled from the webview message envelope keeps it testable
 * without importing VS Code types.
 */
export interface ScenesPayload {
    readonly scenes: readonly SceneRowViewModel[];
    readonly activeStoryboardName: string | null;
    readonly activeStoryboardId: string | null;
    readonly sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
    readonly pendingUndoToast?: UndoToastDescriptor | null;
    readonly storyboardEditViewModel?: StoryboardEditViewModel | null;
    readonly namingRow?: NamingRowPushState | null;
    readonly collisionBanner?: CollisionBannerPushState | null;
}
export interface SnapshotPayload {
    readonly storyboards: readonly StoryboardOptionViewModel[];
    readonly scenes: readonly SceneRowViewModel[];
    readonly activeStoryboardId: string | null;
    readonly activeStoryboardName: string | null;
    readonly currentSceneId: string | null;
    readonly transport: TransportViewModel;
    readonly sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
    readonly pendingUndoToast?: UndoToastDescriptor | null;
    readonly storyboardEditViewModel?: StoryboardEditViewModel | null;
    readonly namingRow?: NamingRowPushState | null;
    readonly collisionBanner?: CollisionBannerPushState | null;
}
export type StoryboardEditAction = {
    readonly type: 'scenes-message';
    readonly payload: ScenesPayload;
} | {
    readonly type: 'snapshot-message';
    readonly payload: SnapshotPayload;
} | {
    readonly type: 'scene-edit-form-open';
    readonly sceneId: string;
} | {
    readonly type: 'scene-stale-flags-updated';
    readonly flags: readonly StaleFlagEntry[];
} | {
    readonly type: 'scene-undo-toast-shown';
    readonly toast: UndoToastDescriptor | null;
} | {
    readonly type: 'capture-in-flight';
    readonly inFlight: boolean;
} | {
    readonly type: 'theme-changed';
    readonly theme: ThemeVariant;
} | {
    readonly type: 'expand-row-toggle';
    readonly sceneId: string;
} | {
    readonly type: 'scene-edit-form-close';
} | {
    readonly type: 'scene-undo-toast-dismissed';
} | {
    readonly type: 'overflow-menu-open';
    readonly sceneId: string;
    readonly anchorRect: DOMRect;
} | {
    readonly type: 'overflow-menu-close';
} | {
    readonly type: 'naming-row-text-changed';
    readonly pendingName: string;
} | {
    readonly type: 'naming-row-confirm-requested';
} | {
    readonly type: 'naming-row-cancel-requested';
} | {
    readonly type: 'collision-replace-requested';
    readonly conflictingSceneId: string;
} | {
    readonly type: 'collision-offset-requested';
} | {
    readonly type: 'collision-cancel-requested';
};
export declare function createInitialStoryboardEditState(overrides?: Partial<StoryboardEditReducerState>): StoryboardEditReducerState;
export declare function storyboardEditReducer(state: StoryboardEditReducerState, action: StoryboardEditAction): StoryboardEditReducerState;
/**
 * Compose the final `sceneEditViewModels` dictionary the panel renders.
 * Layers, in order:
 *   1. Baseline from `sceneEditViewModelsFromExtension` (from refresh).
 *   2. Overlay `stale` + `unresolvedFeatureIds` from inbound `staleFlags`.
 *   3. Overlay `editFormOpen: true` for the row matching `editFormOpenFor`.
 *
 * Rows without a baseline entry synthesise a minimal view-model so the
 * chevron/overflow affordances still work (fallback for fixtures that
 * don't provide per-row edit VMs).
 *
 * **Public API — see `./CONTRACTS.md` for the pinned signature, the
 * O(active-storyboard Scenes) invariant (FR-008), and the perf budget
 * (median ≤ 50 ms over 100 iterations on a 50-Scene active storyboard,
 * FR-030). The perf-regression guard is
 * `__tests__/composeSceneEditViewModels.perf.test.ts`.**
 */
export declare function composeSceneEditViewModels(state: StoryboardEditReducerState): Readonly<Record<string, SceneEditViewModel>>;
/**
 * Maximum Offset (+1 s) press count before the panel hides the Offset
 * button (FR-CAP-017a / data-model §CollisionBannerState invariants).
 */
export declare const COLLISION_OFFSET_CAP = 60;
/**
 * Project the reducer's `namingRow` slice into a presentational view-model.
 * Inline duplicate-name detection runs on the trimmed `pendingName`
 * against the host-supplied `knownNames`.
 */
export declare function composeNamingRowViewModel(state: StoryboardEditReducerState): NamingRowViewModel;
/**
 * Project the reducer's `collisionBanner` slice into a presentational
 * view-model. The DTG label is computed lazily when a non-null formatter
 * is supplied; callers that don't care (e.g. the test suite) can pass
 * `undefined` and read `proposedTimestamp` directly.
 */
export declare function composeCollisionBannerViewModel(state: StoryboardEditReducerState, formatDtg?: (iso: string) => string): CollisionBannerViewModel;
export interface StoryboardEditReducerHandle {
    readonly state: StoryboardEditReducerState;
    readonly dispatch: (action: StoryboardEditAction) => void;
    readonly sceneEditViewModels: Readonly<Record<string, SceneEditViewModel>>;
    readonly namingRowViewModel: NamingRowViewModel;
    readonly collisionBannerViewModel: CollisionBannerViewModel;
    readonly toggleExpandRow: (sceneId: string) => void;
    readonly closeEditForm: () => void;
    readonly openOverflowMenu: (sceneId: string, anchorRect: DOMRect) => void;
    readonly closeOverflowMenu: () => void;
    readonly dismissUndoToast: () => void;
    readonly setNamingRowPendingName: (pendingName: string) => void;
}
export declare function useStoryboardEditReducer(initialOverrides?: Partial<StoryboardEditReducerState>): StoryboardEditReducerHandle;
//# sourceMappingURL=useStoryboardEditReducer.d.ts.map