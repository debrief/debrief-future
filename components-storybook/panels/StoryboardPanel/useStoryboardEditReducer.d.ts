import { SceneEditViewModel, SceneRowViewModel, StoryboardEditViewModel, StoryboardOptionViewModel, TransportViewModel } from './types';

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
export type ThemeVariant = 'light' | 'dark' | 'vscode';
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
 */
export declare function composeSceneEditViewModels(state: StoryboardEditReducerState): Readonly<Record<string, SceneEditViewModel>>;
export interface StoryboardEditReducerHandle {
    readonly state: StoryboardEditReducerState;
    readonly dispatch: (action: StoryboardEditAction) => void;
    readonly sceneEditViewModels: Readonly<Record<string, SceneEditViewModel>>;
    readonly toggleExpandRow: (sceneId: string) => void;
    readonly closeEditForm: () => void;
    readonly openOverflowMenu: (sceneId: string, anchorRect: DOMRect) => void;
    readonly closeOverflowMenu: () => void;
    readonly dismissUndoToast: () => void;
}
export declare function useStoryboardEditReducer(initialOverrides?: Partial<StoryboardEditReducerState>): StoryboardEditReducerHandle;
//# sourceMappingURL=useStoryboardEditReducer.d.ts.map