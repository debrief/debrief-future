import { DebriefFeature, DebriefFeatureCollection, TimeExtent } from '../utils/types';

export interface TimelineProps {
    /** GeoJSON features to display */
    features: DebriefFeatureCollection | DebriefFeature[];
    /** Set of selected feature IDs */
    selectedIds?: Set<string>;
    /** Callback when a feature bar is clicked */
    onSelect?: (featureId: string, event: React.MouseEvent) => void;
    /** Callback when clicking empty space */
    onBackgroundClick?: () => void;
    /** Callback when visible time range changes */
    onTimeRangeChange?: (timeExtent: TimeExtent) => void;
    /** Override time extent (for synchronized views) */
    timeExtent?: TimeExtent;
    /** Height of the component */
    height?: number;
    /** Height of each feature bar */
    barHeight?: number;
    /** CSS class name */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
}
/**
 * Timeline component for displaying features on a time axis.
 * Uses HTML5 Canvas for efficient rendering of many features.
 *
 * @example
 * ```tsx
 * import { Timeline } from '@debrief/components/Timeline';
 *
 * <Timeline
 *   features={plotData}
 *   selectedIds={selection.selectedIds}
 *   onSelect={(id) => selection.toggle(id)}
 * />
 * ```
 */
export declare function Timeline({ features, selectedIds, onSelect, onBackgroundClick, onTimeRangeChange: _onTimeRangeChange, timeExtent: propTimeExtent, height, barHeight, className, style, }: TimelineProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Timeline.d.ts.map