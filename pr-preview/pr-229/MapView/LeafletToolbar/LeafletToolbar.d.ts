import { Bounds } from '../../utils/types';

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
}
/**
 * React wrapper component for the LeafletToolbar control.
 */
export declare function LeafletToolbar({ position, visibleBounds, fitPadding, showZoomControls, showFitButton, }: LeafletToolbarProps): null;
//# sourceMappingURL=LeafletToolbar.d.ts.map