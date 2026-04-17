import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { FieldKey, FieldValue, PropertiesFormField } from '../PropertiesPanel';

export interface PropertiesSidePanelProps {
    /** Absolute path to the STAC store root. Required for commit routing. */
    storePath: string;
    /**
     * Hydrated per-selection fields, keyed by itemPath. Host computes from
     * item.properties + JSON Schema. Missing key → loading state.
     */
    fieldsByItemPath: Record<string, PropertiesFormField[]>;
    /** Loading state keyed by itemPath. */
    loadingByItemPath?: Record<string, boolean>;
    /** Read-only state keyed by itemPath. */
    readOnlyByItemPath?: Record<string, boolean>;
    /** Write-error banner text keyed by itemPath. */
    writeErrorByItemPath?: Record<string, string | null>;
    /** Emits commit messages to the extension host. */
    onMessage: (message: {
        type: 'properties:commit';
        storePath: string;
        itemPath: string;
        patch: Record<FieldKey, FieldValue>;
    }) => void;
    className?: string;
}
export declare function PropertiesSidePanel({ storePath, fieldsByItemPath, loadingByItemPath, readOnlyByItemPath, writeErrorByItemPath, onMessage, className, }: PropertiesSidePanelProps): React.ReactElement;
//# sourceMappingURL=PropertiesSidePanel.d.ts.map