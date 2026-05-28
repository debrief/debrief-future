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
import { isPlatformModifier, type SelectionClickEvent } from '../utils/applyClickToSelection';

export interface TemporalTrackLayerProps {
  feature: DebriefFeature;
  currentTime: number;
  displayMode: DisplayMode;
  isSelected?: boolean;
  /** Full set of selected IDs — forwarded to PositionSymbolsLayer for per-position highlighting */
  selectedIds?: Set<string>;
  markerStyle?: Partial<HighlightMarkerStyle>;
  /**
   * Click callback — uses the same `SelectionClickEvent` shape as
   * `MapView.onSelect` so the multi-select emitter stays consistent
   * between static and temporal track layers (#192 Phase 5).
   */
  onClick?: (event: SelectionClickEvent) => void;
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

  // Read line style from feature properties (set by Format menu)
  // eslint-disable-next-line no-restricted-syntax
  const featureStyle = (feature.properties as unknown as Record<string, unknown>)?.style as
    | Record<string, unknown>
    | undefined;
  // eslint-disable-next-line no-restricted-syntax
  const lineStyle = featureStyle?.line as Record<string, unknown> | undefined;

  const style = useMemo((): PathOptions => ({
    color,
    weight: isSelected ? 4 : (lineStyle?.weight as number) ?? 3,
    opacity: (lineStyle?.opacity as number) ?? 1,
    dashArray: (lineStyle?.dash_array as string) ?? undefined,
  }), [isSelected, color, lineStyle]);

  const onEachFeature = useMemo(() => {
    return (_feat: GeoJSON.Feature, layer: L.Layer) => {
      // Apply selected CSS class on layer options before DOM insertion
      if (isSelected && 'options' in layer) {
        const path = layer as L.Path;
        path.options.className = ((path.options.className ?? '') + ' debrief-map-feature--selected').trim();
      }

      if (onClick) {
        layer.on('click', (e) => {
          const leafletEvent = e as L.LeafletMouseEvent;
          const original = leafletEvent.originalEvent;
          original?.stopPropagation();
          onClick({
            target: String(feature.id),
            modifier: isPlatformModifier({
              ctrlKey: original?.ctrlKey ?? false,
              metaKey: original?.metaKey ?? false,
            }),
            shift: original?.shiftKey === true,
          });
        });
      }
    };
  }, [onClick, feature.id, isSelected]);

  if (!geojsonData) return null;

  // Convert marker position from [lon, lat] to [lat, lon] for Leaflet
  const markerLatLng = renderState.markerPosition
    ? [renderState.markerPosition[1], renderState.markerPosition[0]] as [number, number]
    : null;

  return (
    <>
      <GeoJSON
        key={`${renderKey}-sel-${isSelected ? 1 : 0}`}
        // eslint-disable-next-line no-restricted-syntax
        data={geojsonData as unknown as GeoJSON.GeoJsonObject}
        style={() => style}
        onEachFeature={onEachFeature}
      />
      {renderState.showMarker && markerLatLng && (
        <TrackHighlightMarker
          position={markerLatLng}
          style={markerStyle}
          // eslint-disable-next-line no-restricted-syntax
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
