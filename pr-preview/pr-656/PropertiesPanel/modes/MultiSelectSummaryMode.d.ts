import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { DebriefFeature } from '../../../../schemas/src/generated/typescript/index.ts';

export interface MultiSelectSummaryModeProps {
    /** Feature ids in the multi-select (length ≥ 2 in production; the
     *  component degrades gracefully for length 1 / 0). */
    featureIds: string[];
    /** Resolved feature map — driven by `useFeaturesById` upstream. */
    featuresById: ReadonlyMap<string, DebriefFeature>;
    /** Threaded for dispatcher symmetry. The summary is unconditionally
     *  non-interactive (FR-011) regardless of this value. */
    readOnly?: boolean;
}
export declare function MultiSelectSummaryMode(props: MultiSelectSummaryModeProps): React.ReactElement;
export default MultiSelectSummaryMode;
//# sourceMappingURL=MultiSelectSummaryMode.d.ts.map