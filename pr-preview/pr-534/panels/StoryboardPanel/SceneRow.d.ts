import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { SceneRowViewModel } from './types';

export interface SceneRowProps {
    readonly scene: SceneRowViewModel;
    /** When true, the row renders with bolder styling + `data-active="true"` —
     *  used by Feature 217 to highlight the current transport scene. */
    readonly active?: boolean;
    /** When true, the chevron glyph renders in its expanded (▼) state and
     *  the row's `aria-expanded` is true. From #230 panel reducer. */
    readonly editFormOpen?: boolean;
    onClick(sceneId: string): void;
    /** #230 FR-001 — chevron click / double-click / keyboard disclosure. */
    onExpandToggle?(sceneId: string): void;
    /** #230 FR-003 — overflow menu open (right-click / Shift+F10). */
    onOverflowMenuOpen?(sceneId: string, anchorRect: DOMRect): void;
}
export declare function SceneRow({ scene, active, editFormOpen, onClick, onExpandToggle, onOverflowMenuOpen, }: SceneRowProps): React.ReactElement;
//# sourceMappingURL=SceneRow.d.ts.map