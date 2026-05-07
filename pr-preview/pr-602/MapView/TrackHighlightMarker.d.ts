/**
 * TrackHighlightMarker - displays a circle marker at the track's current time position.
 * Used in full-track mode to indicate where a vessel is at the selected time.
 */
export interface HighlightMarkerStyle {
    radius: number;
    fillColor: string;
    fillOpacity: number;
    strokeColor: string;
    strokeWeight: number;
}
export declare const DEFAULT_MARKER_STYLE: HighlightMarkerStyle;
export interface TrackHighlightMarkerProps {
    /** Position as [lat, lon] (Leaflet convention) */
    position: [number, number];
    style?: Partial<HighlightMarkerStyle>;
    tooltip?: string;
}
export declare function TrackHighlightMarker({ position, style, tooltip, }: TrackHighlightMarkerProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=TrackHighlightMarker.d.ts.map