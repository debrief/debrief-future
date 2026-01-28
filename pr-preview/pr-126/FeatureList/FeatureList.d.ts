import { CSSProperties } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { DebriefFeature, DebriefFeatureCollection } from '../utils/types';

export interface FeatureListProps {
    /** Features to display - either FeatureCollection or array */
    features: DebriefFeatureCollection | DebriefFeature[];
    /** Set of selected feature IDs */
    selectedIds?: Set<string>;
    /** Callback when a feature is clicked */
    onSelect?: (id: string) => void;
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
export declare function FeatureList({ features, selectedIds, onSelect, filter, height, rowHeight, className, style, }: FeatureListProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=FeatureList.d.ts.map