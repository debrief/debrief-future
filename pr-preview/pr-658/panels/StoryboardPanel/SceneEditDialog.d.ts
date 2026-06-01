import { default as React, ReactNode } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { SceneMissingData } from './SceneEditForm';

export interface SceneEditDialogProps {
    readonly sceneId: string;
    readonly title: string;
    readonly description: string | null;
    readonly timestamp: string;
    readonly missingData: SceneMissingData;
    /** Commits the edited title and description. The panel decides which of
     *  the underlying host callbacks to fire based on what actually changed. */
    readonly onSave: (title: string, description: string | null) => void;
    /** Recapture the Scene against the current view (missing-data remedy). */
    readonly onUpdateToCurrent: () => void;
    /** Close without saving (Cancel / Escape / backdrop click). */
    readonly onCancel: () => void;
    /** Optional markdown renderer; defaults to plain text in a <pre>. */
    readonly renderMarkdown?: (markdown: string) => ReactNode;
}
export declare function SceneEditDialog({ sceneId, title, description, timestamp, missingData, onSave, onUpdateToCurrent, onCancel, renderMarkdown, }: SceneEditDialogProps): React.ReactElement;
//# sourceMappingURL=SceneEditDialog.d.ts.map