/**
 * CatalogOverview component — displays a map of bounding boxes
 * and a timeline of temporal ranges for all items in a STAC catalog.
 *
 * The map always shows ALL items with bounding boxes; the timeline
 * filters internally to show only items overlapping the current map
 * viewport (items without bbox are always shown in the timeline).
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { MapContainer, Rectangle, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression, LeafletMouseEvent } from 'leaflet';
import type { CatalogOverviewProps, CatalogOverviewItem } from './types';
import type { Bounds } from '../utils/types';
import { bboxOverlapsViewport } from '../utils/bounds';
import './CatalogOverview.css';

// ============================================================================
// Map helpers
// ============================================================================

/** Convert a bbox [west, south, east, north] to Leaflet bounds */
function bboxToBounds(bbox: [number, number, number, number]): LatLngBoundsExpression {
  const [west, south, east, north] = bbox;
  return [[south, west], [north, east]];
}

/** Compute combined bounds from items that have bbox */
function combinedBounds(items: CatalogOverviewItem[]): LatLngBoundsExpression | null {
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  for (const item of items) {
    if (!item.bbox) continue;
    const [west, south, east, north] = item.bbox;
    minLng = Math.min(minLng, west);
    minLat = Math.min(minLat, south);
    maxLng = Math.max(maxLng, east);
    maxLat = Math.max(maxLat, north);
  }
  if (minLat === Infinity) return null;
  return [[minLat, minLng], [maxLat, maxLng]];
}

/** Auto-fit map to bounds */
function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }): null {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [20, 20] });
    }
  }, [map, bounds]);
  return null;
}

// ============================================================================
// Viewport change handler (fires debounced moveend)
// ============================================================================

const DEBOUNCE_MS = 150;

function ViewportTracker({
  onViewportChange,
  onInternalViewportChange,
}: {
  onViewportChange?: (bounds: Bounds | null) => void;
  onInternalViewportChange: (bounds: Bounds | null) => void;
}): null {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const b = map.getBounds();
      if (!b || !b.isValid()) return;
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      const viewport: Bounds = [sw.lng, sw.lat, ne.lng, ne.lat];
      onInternalViewportChange(viewport);
      onViewportChange?.(viewport);
    } catch {
      // Map not fully initialised yet
    }
  }, [onViewportChange, onInternalViewportChange]);

  // useMapEvents gives us the map instance
  const mapRef = useRef<L.Map | null>(null);
  const map = useMapEvents({
    moveend: () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(emitViewport, DEBOUNCE_MS);
    },
  });
  mapRef.current = map;

  // Emit initial viewport after map is ready
  useEffect(() => {
    // Slight delay to allow map to fully initialise
    timerRef.current = setTimeout(emitViewport, 50);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ============================================================================
// Timeline helpers (extracted to utils/timeline-helpers.ts for shared use)
// ============================================================================

import { parseTime, computeTimeRange, formatDateRange } from '../utils/timeline-helpers';

function formatDate(epoch: number): string {
  const d = new Date(epoch);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ============================================================================
// Tooltip state
// ============================================================================

interface TooltipState {
  x: number;
  y: number;
  text: string;
}

// ============================================================================
// Main Component
// ============================================================================

export const CatalogOverview: React.FC<CatalogOverviewProps> = ({
  items,
  onItemSelect,
  initialSplitRatio = 0.6,
  onSplitRatioChange,
  className,
  onViewportChange,
  colorMap,
  hideTimeline = false,
}) => {
  const [splitRatio, setSplitRatio] = useState(initialSplitRatio);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [viewportBounds, setViewportBounds] = useState<Bounds | null>(null);

  // Items with bbox for map (map always shows ALL items)
  const mapItems = useMemo(() => items.filter((i) => i.bbox !== null), [items]);
  const bounds = useMemo(() => combinedBounds(mapItems), [mapItems]);

  // Memoize Rectangle rendering list with colorMap (T011)
  const rectangles = useMemo(() => mapItems.map((item) => {
    const colour = colorMap?.get(item.id) ?? 'var(--co-accent, #007fd4)';
    return {
      id: item.id,
      bounds: bboxToBounds(item.bbox!),
      colour,
      itemPath: item.itemPath,
      title: item.title,
      startDatetime: item.startDatetime,
      endDatetime: item.endDatetime,
      datetime: item.datetime,
    };
  }), [mapItems, colorMap]);

  // Timeline items: filter to viewport-overlapping items (T020)
  // Items without bbox are always included in the timeline (FR-005)
  const timelineItems = useMemo(() => {
    if (!viewportBounds) return items;
    return items.filter((item) => {
      if (item.bbox === null) return true;
      return bboxOverlapsViewport(item.bbox, viewportBounds);
    });
  }, [items, viewportBounds]);

  const timeRange = useMemo(() => computeTimeRange(timelineItems), [timelineItems]);

  // Determine empty state for map overlay (T021)
  const hasSpatialData = mapItems.length > 0;
  const viewportHasItems = viewportBounds === null || timelineItems.some((i) => i.bbox !== null);

  // Drag bar handlers
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = Math.max(0.1, Math.min(0.9, (e.clientY - rect.top) / rect.height));
    setSplitRatio(ratio);
  }, [isDragging]);

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    // Notify host of new ratio
    if (onSplitRatioChange) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const ratio = Math.max(0.1, Math.min(0.9, (e.clientY - rect.top) / rect.height));
        onSplitRatioChange(ratio);
      }
    }
  }, [isDragging, onSplitRatioChange]);

  const handleItemDblClick = useCallback((itemPath: string) => {
    onItemSelect?.(itemPath);
  }, [onItemSelect]);

  const handleInternalViewportChange = useCallback((bounds: Bounds | null) => {
    setViewportBounds(bounds);
  }, []);

  if (items.length === 0) {
    return (
      <div className={`catalog-overview ${className ?? ''}`}>
        <div className="catalog-overview__empty" data-testid="no-items-message">No items in this catalog</div>
      </div>
    );
  }

  // Timeline layout constants
  const ROW_HEIGHT = 24;
  const LABEL_WIDTH = 120;
  const CHART_LEFT = LABEL_WIDTH + 8;
  const CHART_RIGHT = 16;
  const AXIS_HEIGHT = 20;
  const svgHeight = timelineItems.length * ROW_HEIGHT + AXIS_HEIGHT + 4;

  return (
    <div
      ref={containerRef}
      className={`catalog-overview ${className ?? ''}`}
      style={{
        '--co-map-flex': hideTimeline ? 1 : splitRatio * 10,
        '--co-timeline-flex': hideTimeline ? 0 : (1 - splitRatio) * 10,
      } as React.CSSProperties}
    >
      {/* Map region */}
      <div className="catalog-overview__map">
        <MapContainer
          center={[0, 0]}
          zoom={2}
          scrollWheelZoom={true}
          doubleClickZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {bounds && <FitBounds bounds={bounds} />}
          <ViewportTracker
            onViewportChange={onViewportChange}
            onInternalViewportChange={handleInternalViewportChange}
          />
          {rectangles.map((r) => (
            <Rectangle
              key={r.id}
              bounds={r.bounds}
              pathOptions={{ color: r.colour, weight: 2, fillOpacity: 0.15 }}
              eventHandlers={{
                dblclick: (e: LeafletMouseEvent) => {
                  // Stop Leaflet from zooming on double-click
                  e.originalEvent.preventDefault();
                  e.originalEvent.stopPropagation();
                  handleItemDblClick(r.itemPath);
                },
              }}
            >
              <Tooltip>
                <strong>{r.title}</strong>
                <br />
                {formatDateRange(r.startDatetime, r.endDatetime, r.datetime)}
              </Tooltip>
            </Rectangle>
          ))}
        </MapContainer>

        {/* Empty state overlays (T021) */}
        {!hasSpatialData && (
          <div className="catalog-overview__overlay" data-testid="no-spatial-data-overlay">
            No spatial data available
          </div>
        )}
        {hasSpatialData && !viewportHasItems && (
          <div className="catalog-overview__overlay" data-testid="no-matches-overlay">
            No exercises in this area
          </div>
        )}
      </div>

      {/* Drag bar — hidden when timeline is suppressed */}
      {!hideTimeline && (
        <div
          className={`catalog-overview__dragbar ${isDragging ? 'catalog-overview__dragbar--active' : ''}`}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
        />
      )}

      {/* Timeline region — hidden when external timeline panel is provided */}
      {!hideTimeline && <div className="catalog-overview__timeline">
        {tooltip && (
          <div className="catalog-overview__tooltip" style={{ left: tooltip.x + 12, top: tooltip.y - 20 }}>
            {tooltip.text}
          </div>
        )}
        <svg width="100%" height={svgHeight} viewBox={`0 0 800 ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
          {/* Time axis */}
          {timeRange && (
            <>
              <text
                x={CHART_LEFT}
                y={svgHeight - 2}
                className="catalog-overview__timeline-axis-label"
              >
                {formatDate(timeRange.min)}
              </text>
              <text
                x={800 - CHART_RIGHT}
                y={svgHeight - 2}
                className="catalog-overview__timeline-axis-label"
                textAnchor="end"
              >
                {formatDate(timeRange.max)}
              </text>
              <line
                x1={CHART_LEFT}
                y1={svgHeight - AXIS_HEIGHT}
                x2={800 - CHART_RIGHT}
                y2={svgHeight - AXIS_HEIGHT}
                stroke="currentColor"
                opacity={0.3}
              />
            </>
          )}

          {/* Item rows */}
          {timelineItems.map((item, i) => {
            const y = i * ROW_HEIGHT + 4;
            const barY = y + 4;
            const barHeight = ROW_HEIGHT - 8;
            const chartWidth = 800 - CHART_LEFT - CHART_RIGHT;

            const startEpoch = parseTime(item.startDatetime) ?? parseTime(item.datetime);
            const endEpoch = parseTime(item.endDatetime) ?? parseTime(item.datetime);
            const hasTime = startEpoch !== null;
            const tooltipText = `${item.title}\n${formatDateRange(item.startDatetime, item.endDatetime, item.datetime)}`;

            return (
              <g key={item.id}>
                {/* Label */}
                <text
                  x={4}
                  y={y + ROW_HEIGHT / 2}
                  className="catalog-overview__timeline-label"
                >
                  {item.title.length > 16 ? item.title.slice(0, 15) + '…' : item.title}
                </text>

                {hasTime && timeRange ? (
                  startEpoch === endEpoch ? (
                    /* Point marker for single-datetime items */
                    <circle
                      cx={CHART_LEFT + ((startEpoch! - timeRange.min) / (timeRange.max - timeRange.min)) * chartWidth}
                      cy={y + ROW_HEIGHT / 2}
                      r={5}
                      className="catalog-overview__timeline-point"
                      onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, text: tooltipText })}
                      onMouseLeave={() => setTooltip(null)}
                      onDoubleClick={() => handleItemDblClick(item.itemPath)}
                    />
                  ) : (
                    /* Bar for range items */
                    <rect
                      x={CHART_LEFT + ((startEpoch! - timeRange.min) / (timeRange.max - timeRange.min)) * chartWidth}
                      y={barY}
                      width={Math.max(4, (((endEpoch ?? startEpoch!) - startEpoch!) / (timeRange.max - timeRange.min)) * chartWidth)}
                      height={barHeight}
                      rx={2}
                      className="catalog-overview__timeline-bar"
                      onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, text: tooltipText })}
                      onMouseLeave={() => setTooltip(null)}
                      onDoubleClick={() => handleItemDblClick(item.itemPath)}
                    />
                  )
                ) : (
                  /* No time data */
                  <text
                    x={CHART_LEFT}
                    y={y + ROW_HEIGHT / 2}
                    className="catalog-overview__timeline-no-data"
                  >
                    no time data
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>}
    </div>
  );
};
