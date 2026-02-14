import { Bounds } from '../../utils/types';

/** Drawing mode values matching session-state DrawingMode type */
export type DrawingMode = 'point' | 'rectangle' | 'polygon' | 'polyline' | null;
export interface LeafletToolbarProps {
    /** Position of the toolbar on the map */
    position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
    /** Bounds of visible features for fit-to-window functionality */
    visibleBounds: Bounds | null;
    /** Padding percentage when fitting bounds (default: 0.1 = 10%) */
    fitPadding?: number;
    /** Whether to show zoom controls (default: true) */
    showZoomControls?: boolean;
    /** Whether to show fit-to-window button (default: true) */
    showFitButton?: boolean;
    /** Current drawing mode (null = no drawing active) */
    drawingMode?: DrawingMode;
    /** Callback when drawing mode changes */
    onDrawingModeChange?: (mode: DrawingMode) => void;
    /** Callback when a shape is drawn via Geoman. Called with raw GeoJSON and the active drawing mode. */
    onShapeCreated?: (geojson: GeoJSON.Feature, mode: DrawingMode) => void;
}
/**
 * React wrapper component for the LeafletToolbar control.
 */
export declare function LeafletToolbar({ position, visibleBounds, fitPadding, showZoomControls, showFitButton, drawingMode, onDrawingModeChange, onShapeCreated, }: LeafletToolbarProps): null;
//# sourceMappingURL=LeafletToolbar.d.ts.map