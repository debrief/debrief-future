import { DrawingMode } from '../LeafletToolbar';

export interface DrawingGuidanceOverlayProps {
    /** Current drawing mode — null means overlay is hidden */
    drawingMode: DrawingMode;
}
/**
 * Renders guidance text when drawingMode is non-null.
 * Returns null when no drawing mode is active (FR-004).
 */
export declare function DrawingGuidanceOverlay({ drawingMode }: DrawingGuidanceOverlayProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=DrawingGuidanceOverlay.d.ts.map