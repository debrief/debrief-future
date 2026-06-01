import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { DebriefFeature } from '../../../../schemas/src/generated/typescript/index.ts';
import { UseStagedEditsApi, VertexEditableProperties } from '../../ActivityPanel/useStagedEdits';

export interface SubFeatureEditorModeProps {
    /** The parent feature carrying the vertex_metadata array. */
    feature: DebriefFeature;
    /** Selection path identifying the vertex (e.g. `positions/4`,
     *  `rings/0/vertices/3`, `vertices/2`, `vertex/0`). */
    path: string;
    /** True when the plot's storage is read-only — disables inputs. */
    readOnly: boolean;
    /** Staging buffer callback for vertex edits. */
    setVertexField: UseStagedEditsApi['setVertexField'];
    /**
     * Staged (uncommitted) vertex edits for this (featureId, path) cell,
     * overlaid on top of the resolved `vertex_metadata` entry for display
     * purposes (US-3 AS-3 hydration on re-selection). Sparse — only slots
     * the analyst has touched are present.
     */
    stagedVertexEdits?: Partial<VertexEditableProperties>;
}
export declare function SubFeatureEditorMode(props: SubFeatureEditorModeProps): React.ReactElement;
export default SubFeatureEditorMode;
//# sourceMappingURL=SubFeatureEditorMode.d.ts.map