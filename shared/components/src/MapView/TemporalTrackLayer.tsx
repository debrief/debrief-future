/**
 * TemporalTrackLayer - renders a single track with temporal awareness.
 *
 * Supports two display modes:
 * - 'full': Renders entire track path with a highlight marker at the current time position
 * - 'trail': Renders only the track path from start up to the current time (snail-trail)
 */

import { useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import type { PathOptions } from 'leaflet';
import type { DisplayMode, DebriefFeature } from '../utils/types';
import { isTrackFeature } from '../utils/types';
import { useTemporalTrack } from './useTemporalTrack';
import { TrackHighlightMarker } from './TrackHighlightMarker';
import type { HighlightMarkerStyle } from './TrackHighlightMarker';
import { getFeatureColor } from '../utils/labels';
import { PositionSymbolsLayer } from './PositionSymbolsLayer';

export interface TemporalTrackLayerProps {
  feature: DebriefFeature;
  currentTime: number;
  displayMode: DisplayMode;
  isSelected?: boolean;
  /** Full set of selected IDs — forwarded to PositionSymbolsLayer for per-position highlighting */
  selectedIds?: Set<string>;
  markerStyle?: Partial<HighlightMarkerStyle>;
  onClick?: (featureId: string, event: React.MouseEvent) => void;
}

export function TemporalTrackLayer({
  feature,
  currentTime,
  displayMode,
  isSelected = false,
  selectedIds,
  markerStyle,
  onClick,
}: TemporalTrackLayerProps) {
  const { renderState, renderKey, hasTemporalData } = useTemporalTrack(
    feature,
    currentTime,
    displayMode
  );

  const color = getFeatureColor(feature);

  const geojsonData = useMemo(() => {
    if (!hasTemporalData || renderState.visibleCoordinates.length < 2) return null;
    return {
      type: 'Feature' as const,
      id: feature.id,
      geometry: {
        type: 'LineString' as const,
        coordinates: renderState.visibleCoordinates,
      },
      properties: feature.properties,
    };
  }, [feature.id, feature.properties, renderState.visibleCoordinates, hasTemporalData]);

  const style = useMemo((): PathOptions => ({
    color,
    weight: isSelected ? 4 : 3,
    opacity: 1,
    className: isSelected ? 'debrief-map-feature--selected' : undefined,
  }), [isSelected, color]);

  const onEachFeature = useMemo(() => {
    if (!onClick) return undefined;
    return (_feat: GeoJSON.Feature, layer: L.Layer) => {
      layer.on('click', (e) => {
        const leafletEvent = e as L.LeafletMouseEvent;
        leafletEvent.originalEvent?.stopPropagation();
        onClick(String(feature.id), leafletEvent.originalEvent as unknown as React.MouseEvent);
      });
    };
  }, [onClick, feature.id]);

  if (!geojsonData) return null;

  // Convert marker position from [lon, lat] to [lat, lon] for Leaflet
  const markerLatLng = renderState.markerPosition
    ? [renderState.markerPosition[1], renderState.markerPosition[0]] as [number, number]
    : null;

  return (
    <>
      <GeoJSON
        key={renderKey}
        data={geojsonData as unknown as GeoJSON.GeoJsonObject}
        style={() => style}
        onEachFeature={onEachFeature}
      />
      {renderState.showMarker && markerLatLng && (
        <TrackHighlightMarker
          position={markerLatLng}
          style={markerStyle}
          tooltip={(feature.properties as unknown as Record<string, string>)?.name}
        />
      )}
      {isTrackFeature(feature) && (
        <PositionSymbolsLayer
          feature={feature}
          currentTime={currentTime}
          displayMode={displayMode}
          isSelected={isSelected}
          selectedIds={selectedIds}
        />
      )}
    </>
  );
}
