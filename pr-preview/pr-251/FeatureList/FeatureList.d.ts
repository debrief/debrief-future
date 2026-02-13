import { CSSProperties } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { DebriefFeature, DebriefFeatureCollection } from '../utils/types';

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
     * @deprecated Use onSelectionChange for full multi-select support.
     * Simple callback when a feature is clicked (id only).
     */
    onSelect?: (id: string) => void;
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
}
/**
 * FeatureList displays a virtualized list of features.
 *
 * Uses @tanstack/react-virtual for efficient rendering of large lists.
 *
 * @example
 * ```tsx
 * <FeatureList
 *   features={featureCollection}
 *   selectedIds={selectedIds}
 *   onSelect={(id) => toggleSelection(id)}
 *   height={400}
 * />
 * ```
 */
export declare function FeatureList({ features, selectedIds, hiddenIds, onSelectionChange, onSelect, filter, height, rowHeight, className, style, }: FeatureListProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=FeatureList.d.ts.map