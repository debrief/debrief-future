import { DebriefFeature, DebriefFeatureCollection, Bounds } from '../utils/types';

export interface MapViewProps {
    /** GeoJSON features to display */
    features: DebriefFeatureCollection | DebriefFeature[];
    /** Set of selected feature IDs */
    selectedIds?: Set<string>;
    /** Callback when a feature is clicked */
    onSelect?: (featureId: string, event: React.MouseEvent) => void;
    /** Callback when clicking empty space (for clearing selection) */
    onBackgroundClick?: () => void;
    /** Callback when zoom level changes */
    onZoomChange?: (zoom: number) => void;
    /** Callback when map bounds change */
    onBoundsChange?: (bounds: Bounds) => void;
    /** Initial zoom level */
    initialZoom?: number;
    /** Initial center [lat, lon] */
    initialCenter?: [number, number];
    /** Whether to auto-fit bounds to features */
    autoFitBounds?: boolean;
    /** Tile layer URL (default: OpenStreetMap) */
    tileLayerUrl?: string;
    /** Tile layer attribution */
    tileLayerAttribution?: string;
    /** CSS class name */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
    /** Height of the map (default: 400px) */
    height?: number | string;
}
/**
 * MapView component for displaying GeoJSON features on an interactive map.
 *
 * @example
 * ```tsx
 * import { MapView } from '@debrief/components/MapView';
 *
 * <MapView
 *   features={plotData}
 *   selectedIds={selection.selectedIds}
 *   onSelect={(id) => selection.toggle(id)}
 * />
 * ```
 */
export declare function MapView({ features, selectedIds, onSelect, onBackgroundClick, onZoomChange, onBoundsChange, initialZoom, initialCenter, autoFitBounds, tileLayerUrl, tileLayerAttribution, className, style, height, }: MapViewProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MapView.d.ts.map