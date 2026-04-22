import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { SceneRowViewModel } from './types';

export interface SceneRowProps {
    readonly scene: SceneRowViewModel;
    onClick(sceneId: string): void;
}
export declare function SceneRow({ scene, onClick }: SceneRowProps): React.ReactElement;
//# sourceMappingURL=SceneRow.d.ts.map