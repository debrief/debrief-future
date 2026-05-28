import { default as React, CSSProperties } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { DebriefFeature, DebriefFeatureCollection } from '../utils/types';
import { SelectionClickEvent } from '../utils/applyClickToSelection';

export interface FeatureListProps {
    /** Features to display - either FeatureCollection or array */
    features: DebriefFeatureCollection | DebriefFeature[];
    /** Set of selected feature IDs */
    selectedIds?: Set<string>;
    /**
     * Called with the new complete selection set after a click.
     * Supports standard list selection: click to select one,
     * Ctrl/Cmd-click to toggle individual items,
     * Shift-click to select a contiguous range.
     */
    onSelectionChange?: (ids: Set<string>) => void;
    /**
     * Optional structured-event callback emitted on plain/modifier clicks
     * (the two branches that route through the shared
     * `applyClickToSelection` helper). Consumers that need the modifier
     * bit — e.g. to compute `selection.primary` — should prefer this over
     * `onSelectionChange`. Not emitted on shift-range clicks (those are
     * list-only and have no clear single "target"). #192 Phase 5.
     */
    onSelectionEvent?: (event: SelectionClickEvent) => void;
    /**
     * @deprecated Use onSelectionChange for full multi-select support.
     * Simple callback when a feature is clicked (id only).
     */
    onSelect?: (id: string) => void;
    /** Called when a feature is expanded or collapsed */
    onToggleExpand?: (featureId: string, isExpanded: boolean) => void;
    /** Set of hidden feature IDs (shown with eye-slash icon) */
    hiddenIds?: Set<string>;
    /** Optional filter function */
    filter?: (feature: DebriefFeature) => boolean;
    /** Height of the list container in pixels */
    height?: number;
    /** Height of each row in pixels */
    rowHeight?: number;
    /** Additional CSS class name */
    className?: string;
    /** Additional inline styles */
    style?: CSSProperties;
    /** Show format icon on rows for features with editable properties (Feature 097) */
    showFormatIcon?: boolean;
    /** Called when the format icon is clicked on a feature row (Feature 097) */
    onFormatClick?: (event: React.MouseEvent, feature: DebriefFeature) => void;
    /** Called when the format icon is clicked on a child row (position, point, polygon) */
    onChildFormatClick?: (event: React.MouseEvent, displayItem: import('./flattenFeatures').DisplayItem) => void;
    /** Show info icon on rows to display geometry data (Feature 098) */
    showInfoIcon?: boolean;
    /** Called when the info icon is clicked on a feature row (Feature 098) */
    onInfoClick?: (event: React.MouseEvent, feature: DebriefFeature) => void;
    /** Called when the info icon is clicked on a child row (Feature 098) */
    onChildInfoClick?: (event: React.MouseEvent, displayItem: import('./flattenFeatures').DisplayItem) => void;
}
/**
 * FeatureList displays a virtualized list of features with expand/collapse
 * support for viewing child elements (positions, points, polygons).
 */
export declare function FeatureList({ features, selectedIds, hiddenIds, onSelectionChange, onSelectionEvent, onSelect, onToggleExpand, filter, height, rowHeight, className, style, showFormatIcon, onFormatClick, onChildFormatClick, showInfoIcon, onInfoClick, onChildInfoClick, }: FeatureListProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=FeatureList.d.ts.map