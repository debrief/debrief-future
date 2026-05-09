import { StoryboardEditAction, StoryboardEditReducerState } from '../useStoryboardEditReducer';
import { SceneEditViewModel, SceneRowViewModel, StoryboardEditViewModel, StoryboardOptionViewModel, StoryboardPanelProps } from '../types';

/**
 * Failure-injection knobs. Both fields are optional + independent. When
 * either is set, the matching sceneId routes through the failure branch
 * of the corresponding handler (see contracts/harness-knobs.md §2).
 *
 * Type retained as `MockPortKnobs` (rather than e.g. `MockHandlerKnobs`)
 * for continuity with the URL-knob contract in §1 of the same document
 * and the spec's existing references to this name. Post-ADR-027 there is
 * no port; the type name is a vestigial label, not an architectural claim.
 */
export interface MockPortKnobs {
    /** Route this sceneId's copy-to-other dispatch to the rollback branch. */
    readonly induceCopyFailure?: string;
    /** Route this sceneId's refresh-thumbnail / refresh-all-stale dispatch
     *  to the per-Scene failure branch. */
    readonly induceRefreshFailure?: string;
}
/**
 * The handler subset of `StoryboardPanelProps` the helper wires. Composed
 * via `Pick<>` so adding a new callback to `StoryboardPanelProps`
 * surfaces here as a TS compile error (helper must implement it).
 *
 * Required-only: each entry below MUST be implemented. Optional callbacks
 * on the panel that this helper does not own (e.g. `onActiveStoryboardChange`,
 * transport callbacks) are NOT part of this surface — callers wire those
 * directly.
 */
export type MockHandlers = Required<Pick<StoryboardPanelProps, 'onCaptureClick' | 'onSceneRowClick' | 'onSceneRowExpandToggle' | 'onSceneOverflowMenuOpen' | 'onSceneOverflowMenuClose' | 'onSceneEditFormCancel' | 'onSceneTitleRenameCommit' | 'onSceneDescriptionSubmit' | 'onSceneDeleteRequested' | 'onSceneUndoDeleteClicked' | 'onSceneUpdateToCurrentClicked' | 'onSceneDuplicateClicked' | 'onSceneCopyToOtherClicked' | 'onSceneRefreshThumbnailClicked' | 'onStoryboardRefreshAllStaleClicked' | 'onStoryboardNameRenameCommit' | 'onStoryboardDescriptionSubmit' | 'onUndoToastDismiss'>>;
/**
 * Fixture shape consumed by the helper. The web-shell harness's
 * `StoryboardEditFixture` matches this shape; stories construct one
 * inline.
 */
export interface MockHandlersFixture {
    readonly storyboards: readonly StoryboardOptionViewModel[];
    readonly activeStoryboardId: string;
    readonly activeStoryboardName: string;
    readonly scenes: readonly SceneRowViewModel[];
    readonly sceneEditViewModels: Readonly<Record<string, SceneEditViewModel>>;
    readonly storyboardEditViewModel: StoryboardEditViewModel;
}
/**
 * Optional initial-state overlay applied on mount. Used by the harness
 * to honour URL knobs (`?stale=A,B`, `?pendingDelete=X`, `?missingData=...`).
 * Stories typically pass nothing.
 */
export interface MockHandlersInitial {
    readonly staleSceneIds?: readonly string[];
    readonly pendingDeleteSceneIds?: readonly string[];
    readonly missingDataBySceneId?: Readonly<Record<string, readonly string[]>>;
}
/** Outbound recorder used by the harness for Playwright assertions. */
export type MockOutboundRecorder = (type: string, payload: Record<string, unknown>) => void;
export interface UseStoryOnlyMockHandlersOptions {
    readonly knobs?: MockPortKnobs;
    readonly initial?: MockHandlersInitial;
    readonly recordOutbound?: MockOutboundRecorder;
}
export interface MockHandlersHandle {
    readonly state: StoryboardEditReducerState;
    readonly dispatch: (action: StoryboardEditAction) => void;
    readonly sceneEditViewModels: Readonly<Record<string, SceneEditViewModel>>;
    readonly handlers: MockHandlers;
}
/**
 * Wire the StoryboardPanel callback surface to the reducer + a small
 * "extension acknowledgement" simulation layer, returning the spread
 * for the panel.
 */
export declare function useStoryOnlyMockHandlers(fixture: MockHandlersFixture, options?: UseStoryOnlyMockHandlersOptions): MockHandlersHandle;
//# sourceMappingURL=storyOnlyMockHandlers.d.ts.map