import { CSSProperties } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { DebriefFeature } from '../utils/types';

export interface FeatureRowProps {
    /** The feature to display */
    feature: DebriefFeature;
    /** Whether this row is selected */
    isSelected: boolean;
    /** Click handler */
    onClick: (event: React.MouseEvent) => void;
    /** Optional inline style */
    style?: CSSProperties;
}
/**
 * FeatureRow displays a single feature in the list.
 */
export declare function FeatureRow({ feature, isSelected, onClick, style, }: FeatureRowProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=FeatureRow.d.ts.map