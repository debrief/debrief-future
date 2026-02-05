import { DebriefFeature, DebriefFeatureCollection, Bounds, DisplayMode } from '../utils/types';

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
    /** Controlled viewport - when provided, map will update to this center/zoom.
     *  Use for programmatic viewport changes (e.g., setViewport messages from VS Code). */
    viewport?: {
        center: [number, number];
        zoom: number;
    };
    /** Programmatically trigger fit bounds. Increment to trigger a new fit. */
    fitBoundsTrigger?: number;
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
    /** Current time position for temporal rendering (epoch ms). Enables temporal track rendering when provided. */
    currentTime?: number;
    /** Track display mode: 'full' (entire track + marker) or 'trail' (snail-trail up to current time). */
    displayMode?: DisplayMode;
    /** Set of visible feature IDs. When provided, fit-to-window only considers these features. */
    visibleIds?: Set<string>;
    /** Whether to show the custom toolbar with zoom and fit buttons (default: true) */
    showToolbar?: boolean;
    /** Position of the toolbar (default: 'topleft') */
    toolbarPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
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
export declare function MapView({ features, selectedIds, onSelect, onBackgroundClick, onZoomChange, onBoundsChange, initialZoom, initialCenter, viewport, autoFitBounds, fitBoundsTrigger, tileLayerUrl, tileLayerAttribution, className, style, height, currentTime, displayMode, visibleIds, showToolbar, toolbarPosition, }: MapViewProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MapView.d.ts.map