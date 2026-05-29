import { MissingDataClassification } from '../storyboard';
import { SceneRowViewModel, StoryboardOptionViewModel, TransportViewModel, MissingDataReason } from '../panels/StoryboardPanel/types';
import { HostDisposable, HostEvent } from './events';
import { PlaybackMapPanel, PlaybackSessionManager, PlaybackSessionStore, PlaybackTimeRangeView, ModalPromptPort, VisibilityPort } from './ports';

export type { PlaybackMapPanel, PlaybackSessionManager, PlaybackTimeRangeView, PlaybackSessionStore, ModalPromptPort, VisibilityPort, };
export interface PlaybackPanelView {
    applySnapshot(snapshot: StoryboardPlaybackSnapshot): void;
}
export interface StoryboardPlaybackSnapshot {
    readonly documentUri: string;
    readonly storyboards: readonly StoryboardOptionViewModel[];
    readonly scenes: readonly SceneRowViewModel[];
    readonly activeStoryboardId: string | null;
    readonly currentSceneId: string | null;
    readonly activeStoryboardName: string | null;
    readonly transport: TransportViewModel;
}
export interface StoryboardPlaybackServiceOptions {
    readonly sessionManager: PlaybackSessionManager;
    readonly mapPanel: PlaybackMapPanel;
    readonly panelView: PlaybackPanelView;
    readonly timeRangeView: PlaybackTimeRangeView;
    readonly modalPromptPort: ModalPromptPort;
    readonly visibilityPort: VisibilityPort;
    /** Error-toast sink. Defaults to a no-op (warn to console). The
     *  VS Code app wires `vscode.window.showErrorMessage`; the briefing
     *  renderer SPA installs its halted-state handler instead. */
    readonly showErrorMessage?: (message: string) => void;
    /** Context-key sink. Defaults to a no-op. The VS Code app wires
     *  `vscode.commands.executeCommand('setContext', key, value)`. */
    readonly setContext?: (key: string, value: unknown) => void;
    /** Non-modal info-toast sink (used by the edit-stub flow). Defaults
     *  to a no-op (warn to console). The VS Code app wires
     *  `vscode.window.showInformationMessage`. */
    readonly showInformationMessage?: (message: string) => void;
    /** Injected for tests; defaults to `Date.now`. */
    readonly now?: () => number;
    /** Optional DTG formatter for scene row titles. Defaults to ISO. */
    readonly formatDtg?: (iso: string) => string;
    /** Stub thumbnail resolver — in production the panel view resolves
     *  webview-safe URIs; the service passes the raw scene id through so
     *  the panel can enrich the row. */
    readonly resolveThumbnailHref?: (sceneId: string) => string;
}
export declare class StoryboardPlaybackService implements HostDisposable {
    private readonly states;
    private readonly _onSnapshotChange;
    readonly onSnapshotChange: HostEvent<StoryboardPlaybackSnapshot>;
    private readonly sessionManager;
    private readonly mapPanel;
    private readonly panelView;
    private readonly timeRangeView;
    private readonly modalPromptPort;
    private readonly visibilityPort;
    private readonly showErrorMessage;
    private readonly setContextFn;
    private readonly showInformationMessage;
    private readonly resolveThumbnailHref;
    private readonly formatDtg;
    private readonly rootDisposables;
    private disposed;
    private flyToTokenToDocumentUri;
    constructor(options: StoryboardPlaybackServiceOptions);
    onPlotOpened(documentUri: string): void;
    onPlotClosed(documentUri: string): void;
    onPlotFeaturesChanged(documentUri: string): void;
    getSnapshot(documentUri: string): StoryboardPlaybackSnapshot;
    forward(documentUri: string): Promise<void>;
    backward(documentUri: string): Promise<void>;
    goToScene(documentUri: string, sceneId: string): Promise<void>;
    /**
     * Lazy-seed `state.activeStoryboardId` + `sceneOrder` from the current
     * plot when no seeding event has populated them yet.
     *
     * Background: `onPlotOpened` and `onPlotFeaturesChanged` are the
     * normal seeding paths, but they are not guaranteed to have fired by
     * the time the user clicks a Scene row — the panel's row list is
     * sourced independently via `StoryboardPanelView.refresh()`
     * (`getActiveStoryboardDefault`), so the panel can display Scenes
     * while transport state is still empty. Without this fallback,
     * `goToScene` silently no-ops and clicks appear dead.
     *
     * Priority mirrors the existing fallbacks in `onPlotOpened` /
     * `onPlotFeaturesChanged`: most-recently-modified Storyboard first,
     * then the alphabetic default used by the panel.
     */
    private ensureSceneOrderSeeded;
    setActiveStoryboard(documentUri: string, storyboardId: string | null): void;
    createStoryboard(documentUri: string, name: string, description?: string): Promise<void>;
    renameStoryboard(documentUri: string, storyboardId: string, newName: string): Promise<void>;
    deleteStoryboard(documentUri: string, storyboardId: string): Promise<void>;
    resolveHardBlockByJumpingPast(documentUri: string, blockedSceneId: string, direction: 'forward' | 'backward'): Promise<void>;
    resolveHardBlockByOpeningForEditing(documentUri: string, blockedSceneId: string): void;
    dispose(): void;
    private stepTo;
    private executeTransition;
    private clearTransition;
    private classifyScene;
    private buildPlotTimeRange;
    private promptHardBlock;
    private formatHardBlockBody;
    private recomputeSceneOrder;
    private applyScrubbableRange;
    private updateStoryboardActiveContext;
    private pushSceneRectangles;
    private buildSnapshot;
    private emptySnapshot;
    private emitSnapshot;
}
export declare function missingDataReasonFromClassification(classification: MissingDataClassification, sceneTimestampIso: string, plotStartIso: string, plotEndIso: string): MissingDataReason | null;
//# sourceMappingURL=service.d.ts.map