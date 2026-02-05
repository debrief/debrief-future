/**
 * PositionSymbolsLayer - renders position symbols and labels for a track.
 *
 * Applies the style cascade:
 * default_position_style → interval rules (symbol_interval, label_interval) → position_style_overrides
 */

import { useMemo } from 'react';
import { CircleMarker, Tooltip, LayerGroup } from 'react-leaflet';
import type { TrackFeature, PositionStyle } from '@debrief/schemas';
import type { LatLngExpression } from 'leaflet';
import { computeAllPositionStyles } from '../utils/time';
import { getFeatureColor } from '../utils/labels';

export interface PositionSymbolsLayerProps {
  feature: TrackFeature;
  currentTime?: number;
  displayMode?: 'full' | 'trail';
  isSelected?: boolean;
}

/**
 * Default position style when none is provided.
 */
const DEFAULT_POSITION_STYLE: PositionStyle = {
  show_symbol: false,
  symbol: 'circle',
  show_label: false,
};

export function PositionSymbolsLayer({
  feature,
  currentTime,
  displayMode = 'full',
  isSelected = false,
}: PositionSymbolsLayerProps) {
  const props = feature.properties;
  const positions = props.positions ?? [];
  // Note: geometry.coordinates is typed as number[] in generated types but is actually [lon, lat][]
  const coordinates = (feature.geometry.coordinates as unknown as Array<[number, number]>) ?? [];
  const color = getFeatureColor(feature);

  // Get position styling configuration
  const defaultStyle = props.default_position_style ?? DEFAULT_POSITION_STYLE;
  const symbolInterval = props.symbol_interval;
  const labelInterval = props.label_interval;
  const overrides = props.position_style_overrides;

  // Compute resolved styles for all positions
  const resolvedStyles = useMemo(() => {
    if (positions.length === 0) return [];
    return computeAllPositionStyles(
      positions,
      defaultStyle,
      symbolInterval,
      labelInterval,
      overrides
    );
  }, [positions, defaultStyle, symbolInterval, labelInterval, overrides]);

  // Determine which positions are visible based on currentTime and displayMode
  const visibleRange = useMemo(() => {
    if (!currentTime || displayMode === 'full' || positions.length === 0) {
      return { start: 0, end: positions.length - 1 };
    }

    // Trail mode: only show positions up to currentTime
    let endIndex = positions.length - 1;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (!pos) continue;
      const posTime = Date.parse(pos.time);
      if (posTime > currentTime) {
        endIndex = Math.max(0, i - 1);
        break;
      }
    }

    return { start: 0, end: endIndex };
  }, [currentTime, displayMode, positions]);

  // Generate symbol/label elements
  const elements = useMemo(() => {
    const items: JSX.Element[] = [];

    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      const style = resolvedStyles[i];
      if (!style) continue;

      // Skip if neither symbol nor label should be shown
      if (!style.showSymbol && !style.showLabel) continue;

      // Get coordinate (GeoJSON is [lon, lat], Leaflet needs [lat, lon])
      const coord = coordinates[i];
      if (!coord) continue;
      const position: LatLngExpression = [coord[1], coord[0]];

      // Determine marker appearance
      const markerColor = isSelected ? 'var(--debrief-selection-border)' : color;
      const radius = getRadiusForShape(style.symbol);

      if (style.showSymbol) {
        items.push(
          <CircleMarker
            key={`symbol-${i}`}
            center={position}
            radius={radius}
            pathOptions={{
              color: markerColor,
              fillColor: markerColor,
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            {style.showLabel && style.labelText && (
              <Tooltip permanent direction="right" offset={[10, 0]}>
                {style.labelText}
              </Tooltip>
            )}
          </CircleMarker>
        );
      } else if (style.showLabel && style.labelText) {
        // Label only (no symbol)
        items.push(
          <CircleMarker
            key={`label-${i}`}
            center={position}
            radius={0}
            pathOptions={{ opacity: 0, fillOpacity: 0 }}
          >
            <Tooltip permanent direction="right" offset={[5, 0]}>
              {style.labelText}
            </Tooltip>
          </CircleMarker>
        );
      }
    }

    return items;
  }, [visibleRange, resolvedStyles, coordinates, color, isSelected]);

  if (elements.length === 0) return null;

  return <LayerGroup>{elements}</LayerGroup>;
}

/**
 * Get marker radius based on symbol shape.
 */
function getRadiusForShape(shape: 'circle' | 'square' | 'triangle'): number {
  switch (shape) {
    case 'square':
      return 6;
    case 'triangle':
      return 7;
    case 'circle':
    default:
      return 5;
  }
}
