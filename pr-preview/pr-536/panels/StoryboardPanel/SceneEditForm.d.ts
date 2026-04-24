import { default as React, ReactNode } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export type SceneMissingData = {
    readonly kind: 'ok';
} | {
    readonly kind: 'missing-features';
    readonly ids: readonly string[];
} | {
    readonly kind: 'out-of-range';
    readonly scenario: 'before-start' | 'after-end';
};
export interface SceneEditFormProps {
    readonly sceneId: string;
    readonly title: string;
    readonly description: string | null;
    readonly timestamp: string;
    readonly missingData: SceneMissingData;
    readonly onTitleRenameCommit: (newTitle: string) => void;
    readonly onDescriptionSubmit: (description: string | null) => void;
    readonly onUpdateToCurrent: () => void;
    readonly onDuplicate: () => void;
    readonly onCopyToOther: () => void;
    readonly onDelete: () => void;
    readonly onRefreshThumbnail: () => void;
    readonly onCancel: () => void;
    /** Optional markdown renderer; defaults to plain text in a <pre>. */
    readonly renderMarkdown?: (markdown: string) => ReactNode;
}
export declare const SceneEditForm: React.FC<SceneEditFormProps>;
//# sourceMappingURL=SceneEditForm.d.ts.map