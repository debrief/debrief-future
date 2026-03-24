/**
 * PositionSymbolsLayer - renders position symbols and labels for a track.
 *
 * Applies the style cascade:
 * default_position_style → interval rules (symbol_interval, label_interval) → position_style_overrides
 */

/* eslint-disable react/prop-types */ // TypeScript handles prop validation

import { useMemo } from 'react';
import { CircleMarker, Marker, Tooltip, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import type { TrackFeature, PositionStyle } from '@debrief/schemas';
import type { LatLngExpression } from 'leaflet';
import { computeAllPositionStyles } from '../utils/time';
import { getFeatureColor } from '../utils/labels';

export type SymbolShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross';

export interface PositionSymbolsLayerProps {
  feature: TrackFeature;
  currentTime?: number;
  displayMode?: 'full' | 'trail';
  isSelected?: boolean;
  /** Full set of selected IDs — enables per-position highlighting via paths like 'track-001/positions/4' */
  selectedIds?: Set<string>;
}

/**
 * Default position style when none is provided.
 */
const DEFAULT_POSITION_STYLE: PositionStyle = {
  show_symbol: false,
  symbol: 'circle',
  show_label: false,
};

/**
 * Build an SVG path `d` attribute for a given shape, centred at (size, size)
 * within a (size*2 × size*2) viewBox.
 */
export function svgPathForShape(shape: SymbolShape, size: number): string {
  switch (shape) {
    case 'square': {
      const half = size * 0.75;
      return `M${size - half},${size - half} h${half * 2} v${half * 2} h${-half * 2} Z`;
    }
    case 'triangle': {
      // Equilateral triangle pointing up
      const h = size * 0.85;
      return `M${size},${size - h} L${size + h},${size + h * 0.6} L${size - h},${size + h * 0.6} Z`;
    }
    case 'diamond': {
      const d = size * 0.85;
      return `M${size},${size - d} L${size + d},${size} L${size},${size + d} L${size - d},${size} Z`;
    }
    case 'cross': {
      const arm = size * 0.85;
      const t = size * 0.3; // arm thickness
      return [
        `M${size - t},${size - arm}`,
        `h${t * 2} v${arm - t}`,
        `h${arm - t} v${t * 2}`,
        `h${-(arm - t)} v${arm - t}`,
        `h${-t * 2} v${-(arm - t)}`,
        `h${-(arm - t)} v${-t * 2}`,
        `h${arm - t} Z`,
      ].join(' ');
    }
    default:
      return ''; // circle handled by CircleMarker
  }
}

/**
 * Create a Leaflet DivIcon with an SVG symbol for non-circle shapes.
 */
function createShapeIcon(
  shape: SymbolShape,
  size: number,
  fillColor: string,
  strokeColor: string,
  fillOpacity: number,
  weight: number,
  isSelected: boolean,
): L.DivIcon {
  const viewSize = size * 2;
  const d = svgPathForShape(shape, size);
  const className = isSelected ? 'debrief-map-feature--selected' : '';
  const html = `<svg width="${viewSize}" height="${viewSize}" viewBox="0 0 ${viewSize} ${viewSize}" xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="${fillColor}" fill-opacity="${fillOpacity}" stroke="${strokeColor}" stroke-width="${weight}"/></svg>`;
  return L.divIcon({
    html,
    className: `debrief-symbol-icon ${className}`.trim(),
    iconSize: [viewSize, viewSize],
    iconAnchor: [size, size],
  });
}

export function PositionSymbolsLayer({
  feature,
  currentTime,
  displayMode = 'full',
  isSelected = false,
  selectedIds,
}: PositionSymbolsLayerProps) {
  const props = feature.properties;
  const color = getFeatureColor(feature);

  // Memoize positions and coordinates to stabilize useMemo dependencies
  const positions = useMemo(() => props.positions ?? [], [props.positions]);
  const coordinates = useMemo(
    // eslint-disable-next-line no-restricted-syntax
    () => (feature.geometry.coordinates as unknown as Array<[number, number]>) ?? [],
    [feature.geometry.coordinates]
  );

  // Get position styling configuration.
  // Fall back to style.point (set by apply-symbol-style tool) when
  // default_position_style is absent.
  const explicitDps = props.default_position_style;
  // eslint-disable-next-line no-restricted-syntax
  const pointStyle = (props.style as unknown as Record<string, unknown> | undefined)?.point as
    | Record<string, unknown>
    | undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultStyle: PositionStyle = explicitDps ?? (
    pointStyle?.shape
      ? { show_symbol: true, symbol: pointStyle.shape as string, show_label: false }
      : DEFAULT_POSITION_STYLE
  );
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
  const featureId = feature.id;
  const elements = useMemo(() => {
    const items: JSX.Element[] = [];

    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      const style = resolvedStyles[i];
      if (!style) continue;

      // Check if this specific position is selected via its selection path
      const isPositionSelected = isSelected ||
        (selectedIds?.has(`${featureId}/positions/${i}`) ?? false);

      // Show symbol if it should be shown OR if this position is individually selected
      const shouldShowSymbol = style.showSymbol || isPositionSelected;

      // Skip if neither symbol nor label should be shown
      if (!shouldShowSymbol && !style.showLabel) continue;

      // Get coordinate (GeoJSON is [lon, lat], Leaflet needs [lat, lon])
      const coord = coordinates[i];
      if (!coord) continue;
      const position: LatLngExpression = [coord[1], coord[0]];

      // Determine marker appearance — per-position overrides take priority
      const hasOverrideColor = !!style.fillColor || !!style.strokeColor;
      const markerFillColor = style.fillColor ?? color;
      const markerStrokeColor = style.strokeColor ?? color;
      const baseRadius = style.radius ?? getRadiusForShape(style.symbol);
      const markerRadius = isPositionSelected ? baseRadius + 3 : baseRadius;
      const markerFillOpacity = style.fillOpacity ?? (isPositionSelected ? 0.9 : 0.7);
      const weight = isPositionSelected ? 3 : 2;

      // Show symbol if it has a per-position colour override (even if normally hidden)
      const showForOverride = hasOverrideColor && !shouldShowSymbol;
      if (showForOverride) {
        // Override colour forces the position to be visible
      }

      if (shouldShowSymbol || showForOverride) {
        const shape = style.symbol as SymbolShape;
        if (shape === 'circle' || !shape) {
          // Circle: use Leaflet's native CircleMarker (most performant)
          items.push(
            <CircleMarker
              key={`symbol-${i}`}
              center={position}
              radius={markerRadius}
              pathOptions={{
                color: markerStrokeColor,
                fillColor: markerFillColor,
                fillOpacity: markerFillOpacity,
                weight,
                className: isPositionSelected ? 'debrief-map-feature--selected' : undefined,
              }}
            >
              {style.showLabel && style.labelText && (
                <Tooltip permanent direction="right" offset={[10, 0]}>
                  {style.labelText}
                </Tooltip>
              )}
            </CircleMarker>
          );
        } else {
          // Non-circle shape: use Marker with SVG DivIcon
          const icon = createShapeIcon(
            shape, markerRadius, markerFillColor, markerStrokeColor,
            markerFillOpacity, weight, isPositionSelected,
          );
          items.push(
            <Marker
              key={`symbol-${i}`}
              position={position}
              icon={icon}
              interactive={false}
            >
              {style.showLabel && style.labelText && (
                <Tooltip permanent direction="right" offset={[10, 0]}>
                  {style.labelText}
                </Tooltip>
              )}
            </Marker>
          );
        }
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
  }, [visibleRange, resolvedStyles, coordinates, color, isSelected, selectedIds, featureId]);

  if (elements.length === 0) return null;

  return <LayerGroup>{elements}</LayerGroup>;
}

/**
 * Get marker radius based on symbol shape.
 */
function getRadiusForShape(shape: SymbolShape): number {
  switch (shape) {
    case 'square':
      return 6;
    case 'triangle':
      return 7;
    case 'diamond':
      return 7;
    case 'cross':
      return 7;
    case 'circle':
    default:
      return 5;
  }
}
