import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { DebriefFeature } from '../../../schemas/src/generated/typescript/index.ts';
import { EditingMode } from './selectionMode';
import { UseStagedEditsApi, StagedEdits } from '../ActivityPanel/useStagedEdits';
import { PropertiesFormProps } from './types';

export interface PropertiesPanelDispatchProps {
    /** Discriminated-union mode emitted by `resolveEditingMode`. */
    editingMode: EditingMode;
    /** Feature lookup map — used to hand the chosen feature(s) into the
     *  feature / sub-feature / multi shells. */
    featuresById: ReadonlyMap<string, DebriefFeature>;
    /** Read-only signal from the plot slice (`selectIsReadOnly`). */
    isReadOnly: boolean;
    /** Read-only reason from the plot slice (`selectReadOnlyReason`). */
    readOnlyReason: string | null;
    /** The existing #447 plot-editor surface. Plot mode renders the
     *  unchanged `PropertiesForm` with these props verbatim. */
    plotFormProps: PropertiesFormProps;
    /** Staging buffer callbacks — handed to the mode shells. */
    setFeatureField: UseStagedEditsApi['setFeatureField'];
    setVertexField: UseStagedEditsApi['setVertexField'];
    revertField: UseStagedEditsApi['revertField'];
    unrevertField: UseStagedEditsApi['unrevertField'];
    /**
     * Optional read of the staging-buffer state. When supplied, the feature
     * and sub-feature mode shells overlay staged (uncommitted) edits on top
     * of the saved `feature.properties` values — this is the US-3 AS-3
     * hydration path: re-selecting a feature with unsaved edits shows the
     * staged value in the inputs, not the saved one.
     */
    stagedEdits?: StagedEdits;
}
export declare function PropertiesPanelDispatch(props: PropertiesPanelDispatchProps): React.ReactElement;
export default PropertiesPanelDispatch;
//# sourceMappingURL=PropertiesPanelDispatch.d.ts.map