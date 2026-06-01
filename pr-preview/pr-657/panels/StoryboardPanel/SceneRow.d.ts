import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { SceneRowViewModel } from './types';

export interface SceneRowProps {
    readonly scene: SceneRowViewModel;
    /** When true, the row renders with bolder styling + `data-active="true"` —
     *  used by Feature 217 to highlight the current transport scene. */
    readonly active?: boolean;
    /** When true, this row's edit dialog is open — surfaced as
     *  `data-edit-form-open="true"` for styling/tests. */
    readonly editFormOpen?: boolean;
    onClick(sceneId: string): void;
    /** Opens the per-Scene edit dialog (double-click shortcut; the primary
     *  trigger is the ⋯ overflow menu's Edit item). */
    onExpandToggle?(sceneId: string): void;
    /** #230 FR-003 — overflow menu open (right-click / Shift+F10). */
    onOverflowMenuOpen?(sceneId: string, anchorRect: DOMRect): void;
}
export declare function SceneRow({ scene, active, editFormOpen, onClick, onExpandToggle, onOverflowMenuOpen, }: SceneRowProps): React.ReactElement;
//# sourceMappingURL=SceneRow.d.ts.map