import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { SceneRowViewModel } from './types';

export interface SceneRowProps {
    readonly scene: SceneRowViewModel;
    /** When true, the row renders with bolder styling + `data-active="true"` —
     *  used by Feature 217 to highlight the current transport scene. */
    readonly active?: boolean;
    onClick(sceneId: string): void;
}
export declare function SceneRow({ scene, active, onClick }: SceneRowProps): React.ReactElement;
//# sourceMappingURL=SceneRow.d.ts.map