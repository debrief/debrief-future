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
import {
  computeAllPositionStyles,
  assertNever,
  InvalidPointShapeError,
  type PointShape,
  type ResolvedPositionStyle,
} from '@debrief/utils';
import { getFeatureColor } from '../utils/labels';

/**
 * @deprecated Use `PointShape` from `@debrief/utils` (re-exported from
 * `@debrief/components`). Preserved as an alias for any out-of-tree consumer
 * that imported the name directly from this module.
 */
export type SymbolShape = PointShape;

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
export function svgPathForShape(shape: PointShape, size: number): string {
  switch (shape) {
    case 'circle':
      // Circle is rendered by Leaflet's CircleMarker; the SVG path is empty
      // because there is no DivIcon to place for a circle.
      return '';
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
      return assertNever(shape);
  }
}

/**
 * Create a Leaflet DivIcon with an SVG symbol for non-circle shapes.
 */
function createShapeIcon(
  shape: PointShape,
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
      ? { show_symbol: false, symbol: pointStyle.shape as PointShape, show_label: false }
      : DEFAULT_POSITION_STYLE
  );
  const symbolInterval = props.symbol_interval;
  const labelInterval = props.label_interval;
  const overrides = props.position_style_overrides;

  // Compute resolved styles for all positions.
  // If any override carries an unknown symbol, `resolvePositionStyle` throws
  // `InvalidPointShapeError`; log to the console (the shared LogService is
  // not currently wired through this component — see #201 evidence) and
  // return an empty style list so the track still renders its polyline but
  // no symbols/labels get drawn with stale-or-invalid styling (FR-018).
  const resolvedStyles = useMemo<ResolvedPositionStyle[]>(() => {
    if (positions.length === 0) return [];
    try {
      return computeAllPositionStyles(
        positions,
        defaultStyle,
        symbolInterval,
        labelInterval,
        overrides
      );
    } catch (err) {
      if (err instanceof InvalidPointShapeError) {
        const typed: InvalidPointShapeError = err;
        // eslint-disable-next-line no-console
        console.error(
          `[PositionSymbolsLayer] feature=${String(feature.id)} invalid ` +
            `override symbol ${JSON.stringify(typed.offendingValue)} — ` +
            `expected one of ${typed.validShapes.join(', ')}`
        );
        return [];
      }
      throw err;
    }
  }, [feature.id, positions, defaultStyle, symbolInterval, labelInterval, overrides]);

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

      // Check if this specific position is individually selected via its selection path
      const isIndividuallySelected =
        selectedIds?.has(`${featureId}/positions/${i}`) ?? false;

      // Show symbol if it should be shown OR if this position is individually selected.
      // Parent track selection (isSelected) should NOT force-show hidden points —
      // it only highlights points that are already visible.
      const shouldShowSymbol = style.showSymbol || isIndividuallySelected;

      // Apply selection highlight only to points that are actually visible
      const isPositionSelected = isIndividuallySelected ||
        (isSelected && shouldShowSymbol);

      // Skip if neither symbol nor label should be shown
      if (!shouldShowSymbol && !style.showLabel) continue;

      // Get coordinate (GeoJSON is [lon, lat], Leaflet needs [lat, lon])
      const coord = coordinates[i];
      if (!coord) continue;
      const position: LatLngExpression = [coord[1], coord[0]];

      // Determine marker appearance — read overrides from style.point.*
      const markerFillColor = (pointStyle?.fill_color as string) ?? color;
      const markerStrokeColor = color;
      const baseRadius = (pointStyle?.radius as number) ?? getRadiusForShape(style.symbol);
      const markerRadius = isPositionSelected ? baseRadius + 3 : baseRadius;
      const markerFillOpacity = isPositionSelected ? 0.9 : (pointStyle?.fill_opacity as number) ?? 0.7;
      const weight = isPositionSelected ? 3 : 2;

      if (shouldShowSymbol) {
        const shape: PointShape = style.symbol;
        const tooltip = style.showLabel && style.labelText ? (
          <Tooltip permanent direction="right" offset={[10, 0]}>
            {style.labelText}
          </Tooltip>
        ) : null;

        switch (shape) {
          case 'circle':
            // Leaflet's native CircleMarker is more performant than a DivIcon
            // and is the only shape that does not need an SVG path.
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
                {tooltip}
              </CircleMarker>
            );
            break;
          case 'square':
          case 'triangle':
          case 'diamond':
          case 'cross': {
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
                {tooltip}
              </Marker>
            );
            break;
          }
          default:
            assertNever(shape);
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
  }, [visibleRange, resolvedStyles, coordinates, color, isSelected, selectedIds, featureId, pointStyle]);

  if (elements.length === 0) return null;

  return <LayerGroup>{elements}</LayerGroup>;
}

/**
 * Get marker radius based on symbol shape.
 */
function getRadiusForShape(shape: PointShape): number {
  switch (shape) {
    case 'circle':
      return 5;
    case 'square':
      return 6;
    case 'triangle':
      return 7;
    case 'diamond':
      return 7;
    case 'cross':
      return 7;
    default:
      return assertNever(shape);
  }
}
