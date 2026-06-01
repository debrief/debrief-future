import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { SceneEditViewModel, SceneRowViewModel } from './types';

export interface SceneListProps {
    readonly scenes: readonly SceneRowViewModel[];
    readonly captureInFlight: boolean;
    /** ID of the current transport scene — that row gets `data-active="true"`. */
    readonly currentSceneId?: string | null;
    onSceneRowClick(sceneId: string): void;
    readonly sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
    onSceneTitleRenameCommit?(sceneId: string, newTitle: string): void;
    onSceneDescriptionSubmit?(sceneId: string, description: string | null): void;
    onSceneDeleteRequested?(sceneId: string): void;
    onSceneUpdateToCurrentClicked?(sceneId: string): void;
    onSceneDuplicateClicked?(sceneId: string): void;
    onSceneCopyToOtherClicked?(sceneId: string): void;
    onSceneRefreshThumbnailClicked?(sceneId: string): void;
    onSceneEditFormCancel?(sceneId: string): void;
    onSceneRowExpandToggle?(sceneId: string): void;
    onSceneOverflowMenuOpen?(sceneId: string, anchorRect: DOMRect): void;
    onSceneOverlapDismiss?(sceneId: string, partnerSceneIds: readonly string[]): void;
}
export declare function SceneList({ scenes, captureInFlight, currentSceneId, onSceneRowClick, sceneEditViewModels, onSceneTitleRenameCommit, onSceneDescriptionSubmit, onSceneDeleteRequested, onSceneUpdateToCurrentClicked, onSceneDuplicateClicked, onSceneCopyToOtherClicked, onSceneRefreshThumbnailClicked, onSceneEditFormCancel, onSceneRowExpandToggle, onSceneOverflowMenuOpen, onSceneOverlapDismiss, }: SceneListProps): React.ReactElement;
//# sourceMappingURL=SceneList.d.ts.map