/**
 * TrackHighlightMarker - displays a circle marker at the track's current time position.
 * Used in full-track mode to indicate where a vessel is at the selected time.
 */

import { CircleMarker, Tooltip } from 'react-leaflet';

export interface HighlightMarkerStyle {
  radius: number;
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWeight: number;
}

export const DEFAULT_MARKER_STYLE: HighlightMarkerStyle = {
  radius: 8,
  fillColor: '#ff6b6b',
  fillOpacity: 1.0,
  strokeColor: '#ffffff',
  strokeWeight: 2,
};

export interface TrackHighlightMarkerProps {
  /** Position as [lat, lon] (Leaflet convention) */
  position: [number, number];
  style?: Partial<HighlightMarkerStyle>;
  tooltip?: string;
}

export function TrackHighlightMarker({
  position,
  style,
  tooltip,
}: TrackHighlightMarkerProps) {
  const s = { ...DEFAULT_MARKER_STYLE, ...style };

  return (
    <CircleMarker
      center={position}
      radius={s.radius}
      pathOptions={{
        fillColor: s.fillColor,
        fillOpacity: s.fillOpacity,
        color: s.strokeColor,
        weight: s.strokeWeight,
      }}
    >
      {tooltip && <Tooltip direction="top">{tooltip}</Tooltip>}
    </CircleMarker>
  );
}
