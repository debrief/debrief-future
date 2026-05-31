import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { SceneEditViewModel, SceneRowViewModel } from './types';

export interface SceneListProps {
    readonly scenes: readonly SceneRowViewModel[];
    readonly captureInFlight: boolean;
    /** ID of the current transport scene — that row gets `data-active="true"`. */
    readonly currentSceneId?: string | null;
    onSceneRowClick(sceneId: string): void;
    readonly sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
    onSceneRefreshThumbnailClicked?(sceneId: string): void;
    /** Opens the per-Scene edit dialog (double-click shortcut). */
    onSceneRowExpandToggle?(sceneId: string): void;
    onSceneOverflowMenuOpen?(sceneId: string, anchorRect: DOMRect): void;
}
export declare function SceneList({ scenes, captureInFlight, currentSceneId, onSceneRowClick, sceneEditViewModels, onSceneRefreshThumbnailClicked, onSceneRowExpandToggle, onSceneOverflowMenuOpen, }: SceneListProps): React.ReactElement;
//# sourceMappingURL=SceneList.d.ts.map