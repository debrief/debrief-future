import { CSSProperties } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { DebriefFeature } from '../utils/types';
import { DisplayItem } from './flattenFeatures';

export interface FeatureRowProps {
    /** The feature to display (for top-level rows) */
    feature?: DebriefFeature;
    /** Display item for child rows (positions, points, etc.) */
    displayItem?: DisplayItem;
    /** Whether this row is selected */
    isSelected: boolean;
    /** Whether this feature is hidden (shows eye-slash indicator) */
    isHidden?: boolean;
    /** Nesting depth (0 = top-level) */
    depth?: number;
    /** Whether this item can be expanded */
    isExpandable?: boolean;
    /** Whether this item is currently expanded */
    isExpanded?: boolean;
    /** Whether a child of this item is selected (shows indicator dot) */
    hasChildSelected?: boolean;
    /** Whether to show the format icon (Feature 097) */
    showFormatIcon?: boolean;
    /** Whether to show the info icon (Feature 098) */
    showInfoIcon?: boolean;
    /** Click handler */
    onClick: (event: React.MouseEvent) => void;
    /** Toggle expand/collapse handler */
    onToggleExpand?: (event: React.MouseEvent) => void;
    /** Format icon click handler (Feature 097) */
    onFormatClick?: (event: React.MouseEvent, feature: DebriefFeature) => void;
    /** Format icon click handler for child rows (positions, points, polygons) */
    onChildFormatClick?: (event: React.MouseEvent, displayItem: DisplayItem) => void;
    /** Info icon click handler for parent features (Feature 098) */
    onInfoClick?: (event: React.MouseEvent, feature: DebriefFeature) => void;
    /** Info icon click handler for child rows (Feature 098) */
    onChildInfoClick?: (event: React.MouseEvent, displayItem: DisplayItem) => void;
    /** Optional inline style */
    style?: CSSProperties;
}
/**
 * FeatureRow displays a single feature or child item in the list.
 */
export declare function FeatureRow({ feature, displayItem, isSelected, isHidden, depth, isExpandable, isExpanded, hasChildSelected: childSelected, showFormatIcon, showInfoIcon, onClick, onToggleExpand, onFormatClick, onChildFormatClick, onInfoClick, onChildInfoClick, style, }: FeatureRowProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=FeatureRow.d.ts.map