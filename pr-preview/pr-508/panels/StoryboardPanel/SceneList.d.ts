import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { SceneRowViewModel } from './types';

export interface SceneListProps {
    readonly scenes: readonly SceneRowViewModel[];
    readonly captureInFlight: boolean;
    onSceneRowClick(sceneId: string): void;
}
export declare function SceneList({ scenes, captureInFlight, onSceneRowClick, }: SceneListProps): React.ReactElement;
//# sourceMappingURL=SceneList.d.ts.map