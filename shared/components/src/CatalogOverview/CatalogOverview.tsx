/**
 * CatalogOverview component — displays a map of bounding boxes
 * and a timeline of temporal ranges for all items in a STAC catalog.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { MapContainer, Rectangle, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import type { CatalogOverviewProps, CatalogOverviewItem } from './types';
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
// Timeline helpers
// ============================================================================

function parseTime(s: string | null): number | null {
  if (!s) return null;
  const t = new Date(s).getTime();
  return isNaN(t) ? null : t;
}

interface TimeRange {
  min: number;
  max: number;
}

function computeTimeRange(items: CatalogOverviewItem[]): TimeRange | null {
  let min = Infinity, max = -Infinity;
  for (const item of items) {
    const start = parseTime(item.startDatetime) ?? parseTime(item.datetime);
    const end = parseTime(item.endDatetime) ?? parseTime(item.datetime);
    if (start !== null) min = Math.min(min, start);
    if (end !== null) max = Math.max(max, end);
  }
  if (min === Infinity) return null;
  // Ensure range is non-zero
  if (min === max) {
    min -= 3600000; // 1 hour
    max += 3600000;
  }
  return { min, max };
}

function formatDate(epoch: number): string {
  const d = new Date(epoch);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateRange(start: string | null, end: string | null, datetime: string | null): string {
  const s = start ?? datetime;
  const e = end ?? datetime;
  if (s && e && s !== e) {
    return `${new Date(s).toLocaleDateString()} – ${new Date(e).toLocaleDateString()}`;
  }
  if (s) {
    return new Date(s).toLocaleDateString();
  }
  return 'No time data';
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
}) => {
  const [splitRatio, setSplitRatio] = useState(initialSplitRatio);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Items with bbox for map
  const mapItems = useMemo(() => items.filter((i) => i.bbox !== null), [items]);
  const bounds = useMemo(() => combinedBounds(mapItems), [mapItems]);
  const timeRange = useMemo(() => computeTimeRange(items), [items]);

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

  if (items.length === 0) {
    return (
      <div className={`catalog-overview ${className ?? ''}`}>
        <div className="catalog-overview__empty">No items in this catalog</div>
      </div>
    );
  }

  // Timeline layout constants
  const ROW_HEIGHT = 24;
  const LABEL_WIDTH = 120;
  const CHART_LEFT = LABEL_WIDTH + 8;
  const CHART_RIGHT = 16;
  const AXIS_HEIGHT = 20;
  const svgHeight = items.length * ROW_HEIGHT + AXIS_HEIGHT + 4;

  return (
    <div
      ref={containerRef}
      className={`catalog-overview ${className ?? ''}`}
      style={{
        '--co-map-flex': splitRatio * 10,
        '--co-timeline-flex': (1 - splitRatio) * 10,
      } as React.CSSProperties}
    >
      {/* Map region */}
      <div className="catalog-overview__map">
        <MapContainer
          center={[0, 0]}
          zoom={2}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {bounds && <FitBounds bounds={bounds} />}
          {mapItems.map((item) => (
            <Rectangle
              key={item.id}
              bounds={bboxToBounds(item.bbox!)}
              pathOptions={{ color: 'var(--co-accent, #007fd4)', weight: 2, fillOpacity: 0.15 }}
              eventHandlers={{
                dblclick: () => handleItemDblClick(item.itemPath),
              }}
            >
              <Tooltip>
                <strong>{item.title}</strong>
                <br />
                {formatDateRange(item.startDatetime, item.endDatetime, item.datetime)}
              </Tooltip>
            </Rectangle>
          ))}
        </MapContainer>
      </div>

      {/* Drag bar */}
      <div
        className={`catalog-overview__dragbar ${isDragging ? 'catalog-overview__dragbar--active' : ''}`}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      />

      {/* Timeline region */}
      <div className="catalog-overview__timeline">
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
          {items.map((item, i) => {
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
      </div>
    </div>
  );
};
