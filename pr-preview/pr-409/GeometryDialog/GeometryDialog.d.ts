
export interface GeometryDialogProps {
    /** Display name of the feature (shown in dialog header) */
    featureName: string;
    /** GeoJSON geometry type */
    geometryType: string;
    /** GeoJSON coordinates array */
    coordinates: number[] | number[][] | number[][][] | number[][][][];
    /** Feature properties to display (optional) */
    properties?: Record<string, unknown>;
    /** Anchor position for dialog placement */
    anchorPosition: {
        x: number;
        y: number;
    };
    /** Callback when dialog should close */
    onDismiss: () => void;
}
/**
 * GeometryDialog displays a feature's geometry type, coordinates,
 * and properties in a fixed-position dialog anchored near the info button.
 *
 * Feature: 098-feature-info-button
 */
export declare function GeometryDialog({ featureName, geometryType, coordinates, properties, anchorPosition, onDismiss, }: GeometryDialogProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=GeometryDialog.d.ts.map