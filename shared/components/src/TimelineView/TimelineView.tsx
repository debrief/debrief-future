/**
 * TimelineView — Gantt-style timeline component for STAC exercises (#131).
 *
 * Displays horizontal bars for each exercise's temporal extent.
 * Supports Ctrl+wheel zoom and drag-to-pan on the time axis.
 * Plain scroll navigates the exercise list vertically.
 * A reset button zooms out to show the full time range.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { TimelineViewProps, TimelineBarData, StacBrowserItem } from './types';
import type { TimeSpan } from '../utils/temporal-types';
import {
  parseTime,
  computeTimeRange,
  computeBarX,
  computeBarWidth,
  formatTimeByRange,
  formatDateRange,
} from '../utils/timeline-helpers';
import './TimelineView.css';

// Layout constants
const ROW_HEIGHT = 30;
const LABEL_FONT_SIZE = 11;
const LABEL_WIDTH = 160;
const CHART_LEFT = LABEL_WIDTH + 8;
const CHART_RIGHT = 16;
const SVG_WIDTH = 800;
const AXIS_HEIGHT = 24;
const DEFAULT_BAR_COLOUR = 'var(--co-accent, #007fd4)';
const POINT_RADIUS = 5;
const MIN_BAR_LABEL_CHARS = 24;

// Zoom constants
const ZOOM_FACTOR = 0.15;
const MIN_RANGE_MS = 60_000; // 1 minute minimum visible range
const ZOOM_HINT_TIMEOUT_MS = 2000;

// Platform-aware zoom hint text
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const ZOOM_HINT_TEXT = isMac ? '\u2318 + scroll to zoom' : 'Ctrl + scroll to zoom';

interface TooltipState {
  x: number;
  y: number;
  title: string;
  dateRange: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  items,
  onTemporalFilterChange,
  onItemSelect,
  colourFn,
  className,
}) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom hint state (shown when user scrolls without Ctrl/Cmd)
  const [showZoomHint, setShowZoomHint] = useState(false);
  const zoomHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up zoom hint timer on unmount
  useEffect(() => {
    return () => {
      if (zoomHintTimerRef.current) clearTimeout(zoomHintTimerRef.current);
    };
  }, []);

  // Full data time range
  const fullRange = useMemo(() => computeTimeRange(items as StacBrowserItem[]), [items]);

  // Viewport: the currently visible time range (starts as full range)
  const [viewRange, setViewRange] = useState<TimeSpan | null>(null);

  // Reset viewRange only when fullRange values actually change (not just reference)
  const prevFullRangeRef = useRef(fullRange);
  useEffect(() => {
    const prev = prevFullRangeRef.current;
    const changed = fullRange && (!prev || prev.min !== fullRange.min || prev.max !== fullRange.max);
    const wasNull = !prev && fullRange;
    if (changed || wasNull) {
      setViewRange(fullRange);
    }
    prevFullRangeRef.current = fullRange;
  }, [fullRange]);

  const effectiveView = viewRange ?? fullRange;

  const chartWidth = SVG_WIDTH - CHART_LEFT - CHART_RIGHT;

  // Check if we're zoomed in
  const isZoomed = useMemo(() => {
    if (!fullRange || !effectiveView) return false;
    return effectiveView.min > fullRange.min || effectiveView.max < fullRange.max;
  }, [fullRange, effectiveView]);

  // Emit temporal filter when view range changes
  useEffect(() => {
    if (!onTemporalFilterChange || !fullRange || !effectiveView) return;
    if (isZoomed) {
      onTemporalFilterChange({ start: effectiveView.min, end: effectiveView.max });
    } else {
      onTemporalFilterChange(null);
    }
  }, [effectiveView, fullRange, isZoomed, onTemporalFilterChange]);

  // Pan state refs
  const isPanning = useRef(false);
  const panStartX = useRef(0);
  const panStartRange = useRef<TimeSpan | null>(null);

  // Compute bar layout data using the viewport range
  const bars: TimelineBarData[] = useMemo(() => {
    return items.map((item, i) => {
      const startEpoch = parseTime(item.startDatetime) ?? parseTime(item.datetime);
      const endEpoch = parseTime(item.endDatetime) ?? parseTime(item.datetime);
      const hasTime = startEpoch !== null;
      const isPoint = hasTime && startEpoch === endEpoch;

      let colour: string | null = null;
      if (colourFn && hasTime) {
        try {
          colour = colourFn(item);
        } catch {
          colour = null;
        }
      }

      return {
        item,
        x: hasTime && effectiveView ? computeBarX(startEpoch!, effectiveView, chartWidth) : 0,
        width: hasTime && !isPoint && effectiveView
          ? computeBarWidth(startEpoch!, endEpoch!, effectiveView, chartWidth)
          : 0,
        y: i * ROW_HEIGHT,
        isPoint: !!isPoint,
        colour,
        hasTime,
      };
    });
  }, [items, effectiveView, chartWidth, colourFn]);

  // Generate axis tick labels from viewport
  const axisLabels = useMemo(() => {
    if (!effectiveView) return [];
    const rangeSpan = effectiveView.max - effectiveView.min;
    const tickCount = Math.max(2, Math.min(6, Math.floor(chartWidth / 100)));
    const labels: Array<{ x: number; text: string }> = [];
    for (let i = 0; i < tickCount; i++) {
      const ratio = i / (tickCount - 1);
      const epoch = effectiveView.min + ratio * rangeSpan;
      labels.push({
        x: ratio * chartWidth,
        text: formatTimeByRange(epoch, rangeSpan),
      });
    }
    return labels;
  }, [effectiveView, chartWidth]);

  // --- Zoom via mouse wheel (native listener to allow preventDefault) ---
  // Store latest values in refs so the native listener always sees current state
  const effectiveViewRef = useRef(effectiveView);
  effectiveViewRef.current = effectiveView;
  const fullRangeRef = useRef(fullRange);
  fullRangeRef.current = fullRange;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function onWheel(e: WheelEvent) {
      // Only zoom on Ctrl+wheel (Cmd+wheel on Mac)
      if (!e.ctrlKey && !e.metaKey) {
        // Show zoom hint briefly, let event bubble for vertical scroll
        setShowZoomHint(true);
        if (zoomHintTimerRef.current) clearTimeout(zoomHintTimerRef.current);
        zoomHintTimerRef.current = setTimeout(() => setShowZoomHint(false), ZOOM_HINT_TIMEOUT_MS);
        return;
      }

      const view = effectiveViewRef.current;
      const full = fullRangeRef.current;
      if (!view || !full) return;

      e.preventDefault(); // Prevent browser zoom when Ctrl/Cmd held

      const rect = svg!.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
      const chartX = svgX - CHART_LEFT;
      const ratio = Math.max(0, Math.min(1, chartX / chartWidth));

      const cursorTime = view.min + ratio * (view.max - view.min);

      const direction = e.deltaY > 0 ? 1 : -1;
      const factor = 1 + direction * ZOOM_FACTOR;

      const newSpan = Math.max(MIN_RANGE_MS, (view.max - view.min) * factor);

      let newMin = cursorTime - ratio * newSpan;
      let newMax = cursorTime + (1 - ratio) * newSpan;

      if (newMin < full.min) {
        newMin = full.min;
        newMax = Math.min(full.max, newMin + newSpan);
      }
      if (newMax > full.max) {
        newMax = full.max;
        newMin = Math.max(full.min, newMax - newSpan);
      }

      setViewRange({ min: newMin, max: newMax });
    }

    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [chartWidth]);

  // --- Pan via mouse drag ---
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!effectiveView) return;
    // Only pan on the chart area (not on bars — those have their own handlers)
    isPanning.current = true;
    panStartX.current = e.clientX;
    panStartRange.current = { ...effectiveView };
    const el = e.currentTarget as SVGElement;
    if (typeof el.setPointerCapture === 'function') {
      el.setPointerCapture(e.pointerId);
    }
  }, [effectiveView]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current || !panStartRange.current || !fullRange) return;
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const pxPerMs = (panStartRange.current.max - panStartRange.current.min) / (rect.width * (chartWidth / SVG_WIDTH));
    const dx = panStartX.current - e.clientX; // dragging left moves time forward
    const dtMs = dx * pxPerMs;

    let newMin = panStartRange.current.min + dtMs;
    let newMax = panStartRange.current.max + dtMs;

    // Clamp to full data range
    const span = newMax - newMin;
    if (newMin < fullRange.min) {
      newMin = fullRange.min;
      newMax = newMin + span;
    }
    if (newMax > fullRange.max) {
      newMax = fullRange.max;
      newMin = newMax - span;
    }

    setViewRange({ min: newMin, max: newMax });
  }, [fullRange, chartWidth]);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
    panStartRange.current = null;
  }, []);

  // --- Reset zoom ---
  const handleReset = useCallback(() => {
    setViewRange(fullRange);
  }, [fullRange]);

  // --- Programmatic zoom in/out (centered) ---
  const handleZoomIn = useCallback(() => {
    const view = effectiveView;
    const full = fullRange;
    if (!view || !full) return;
    const span = view.max - view.min;
    const newSpan = Math.max(MIN_RANGE_MS, span * (1 - ZOOM_FACTOR));
    const center = (view.min + view.max) / 2;
    let newMin = center - newSpan / 2;
    let newMax = center + newSpan / 2;
    if (newMin < full.min) { newMin = full.min; newMax = newMin + newSpan; }
    if (newMax > full.max) { newMax = full.max; newMin = Math.max(full.min, newMax - newSpan); }
    setViewRange({ min: newMin, max: newMax });
  }, [effectiveView, fullRange]);

  const handleZoomOut = useCallback(() => {
    const view = effectiveView;
    const full = fullRange;
    if (!view || !full) return;
    const span = view.max - view.min;
    const newSpan = span * (1 + ZOOM_FACTOR);
    const center = (view.min + view.max) / 2;
    let newMin = center - newSpan / 2;
    let newMax = center + newSpan / 2;
    if (newMin < full.min) { newMin = full.min; newMax = Math.min(full.max, newMin + newSpan); }
    if (newMax > full.max) { newMax = full.max; newMin = Math.max(full.min, newMax - newSpan); }
    setViewRange({ min: newMin, max: newMax });
  }, [effectiveView, fullRange]);

  const handleMouseEnter = useCallback((item: StacBrowserItem, e: React.MouseEvent) => {
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      title: item.title,
      dateRange: formatDateRange(item.startDatetime, item.endDatetime, item.datetime),
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleItemDblClick = useCallback((itemPath: string) => {
    onItemSelect?.(itemPath);
  }, [onItemSelect]);

  // Empty state
  if (items.length === 0) {
    return (
      <div className={`timeline-view ${className ?? ''}`} data-testid="timeline-view">
        <div className="timeline-view__empty" data-testid="timeline-empty">
          No matches
        </div>
      </div>
    );
  }

  const barsHeight = items.length * ROW_HEIGHT;

  return (
    <div ref={containerRef} className={`timeline-view ${className ?? ''}`} data-testid="timeline-view">
      {/* Tooltip */}
      {tooltip && (
        <div
          className="timeline-view__tooltip"
          data-testid="timeline-tooltip"
          style={{ left: tooltip.x + 12, top: tooltip.y - 24 }}
        >
          <strong>{tooltip.title}</strong>
          {'\n'}
          {tooltip.dateRange}
        </div>
      )}

      {/* Scrollable bar area */}
      <div
        ref={scrollRef}
        className="timeline-view__scroll-area"
        data-testid="timeline-scroll-area"
        style={{ overflowY: 'auto' }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height={barsHeight}
          viewBox={`0 0 ${SVG_WIDTH} ${barsHeight}`}
          preserveAspectRatio="xMidYMin meet"
          data-testid="timeline-bars-svg"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={isPanning.current ? 'timeline-view__svg--panning' : ''}
          style={{ cursor: isZoomed ? 'grab' : 'default' }}
        >
          {/* Clip path for the chart area — bars/points must not overflow into labels or beyond right edge */}
          <defs>
            <clipPath id="chart-clip">
              <rect x={CHART_LEFT} y={0} width={chartWidth} height={barsHeight} />
            </clipPath>
          </defs>

          {/* Row backgrounds */}
          {bars.map((bar) => (
            <rect
              key={`bg-${bar.item.id}`}
              x={0}
              y={bar.y}
              width={SVG_WIDTH}
              height={ROW_HEIGHT}
              className="timeline-view__row-bg"
            />
          ))}

          {/* Item rows */}
          {bars.map((bar) => {
            const labelY = bar.y + ROW_HEIGHT / 2;
            const truncTitle = bar.item.title.length > MIN_BAR_LABEL_CHARS
              ? bar.item.title.slice(0, MIN_BAR_LABEL_CHARS - 1) + '\u2026'
              : bar.item.title;

            return (
              <g key={bar.item.id}>
                {/* Label (outside clip — always visible) */}
                <text
                  x={4}
                  y={labelY}
                  className="timeline-view__label"
                  data-testid={`timeline-label-${bar.item.id}`}
                  style={{ fontSize: `${LABEL_FONT_SIZE}px` }}
                >
                  {truncTitle}
                </text>
              </g>
            );
          })}

          {/* Clipped chart content — bars and points constrained to chart area */}
          <g clipPath="url(#chart-clip)">
            {bars.map((bar) => {
              const labelY = bar.y + ROW_HEIGHT / 2;
              const barY = bar.y + 4;
              const barHeight = ROW_HEIGHT - 8;
              const fillColour = bar.colour ?? DEFAULT_BAR_COLOUR;

              if (!bar.hasTime || !effectiveView) {
                return (
                  <text
                    key={bar.item.id}
                    x={CHART_LEFT}
                    y={labelY}
                    className="timeline-view__no-data"
                    data-testid={`timeline-nodata-${bar.item.id}`}
                  >
                    no time data
                  </text>
                );
              }

              return bar.isPoint ? (
                <circle
                  key={bar.item.id}
                  cx={CHART_LEFT + bar.x}
                  cy={labelY}
                  r={POINT_RADIUS}
                  fill={fillColour}
                  className="timeline-view__point"
                  data-testid={`timeline-point-${bar.item.id}`}
                  onMouseEnter={(e) => handleMouseEnter(bar.item, e)}
                  onMouseLeave={handleMouseLeave}
                  onDoubleClick={() => handleItemDblClick(bar.item.itemPath)}
                />
              ) : (
                <rect
                  key={bar.item.id}
                  x={CHART_LEFT + bar.x}
                  y={barY}
                  width={bar.width}
                  height={barHeight}
                  rx={2}
                  fill={fillColour}
                  className="timeline-view__bar"
                  data-testid={`timeline-bar-${bar.item.id}`}
                  onMouseEnter={(e) => handleMouseEnter(bar.item, e)}
                  onMouseLeave={handleMouseLeave}
                  onDoubleClick={() => handleItemDblClick(bar.item.itemPath)}
                />
              );
            })}
          </g>

          {/* Full-height zoom indicator lines at viewport edges when zoomed */}
          {isZoomed && effectiveView && fullRange && (
            <g data-testid="zoom-indicator">
              <rect
                x={CHART_LEFT}
                y={0}
                width={chartWidth}
                height={barsHeight}
                fill="none"
                stroke="var(--co-accent, #007fd4)"
                strokeWidth={1}
                strokeDasharray="4 2"
                opacity={0.3}
                pointerEvents="none"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Zoom hint overlay */}
      {showZoomHint && (
        <div className="timeline-view__zoom-hint" data-testid="timeline-zoom-hint" role="status">
          {ZOOM_HINT_TEXT}
        </div>
      )}

      {/* Fixed time axis + permanent zoom controls */}
      <div className="timeline-view__axis" data-testid="timeline-axis">
        <div className="timeline-view__axis-row">
          <svg
            width="100%"
            height={AXIS_HEIGHT}
            viewBox={`0 0 ${SVG_WIDTH} ${AXIS_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className="timeline-view__axis-svg"
          >
            {/* Axis line */}
            <line
              x1={CHART_LEFT}
              y1={2}
              x2={SVG_WIDTH - CHART_RIGHT}
              y2={2}
              className="timeline-view__axis-line"
            />

            {/* Axis labels */}
            {axisLabels.map((label, i) => (
              <text
                key={i}
                x={CHART_LEFT + label.x}
                y={AXIS_HEIGHT - 4}
                className="timeline-view__axis-label"
                data-testid="timeline-axis-label"
                textAnchor={
                  i === 0 ? 'start' :
                  i === axisLabels.length - 1 ? 'end' :
                  'middle'
                }
              >
                {label.text}
              </text>
            ))}
          </svg>

          {/* Permanent zoom controls */}
          <div className="timeline-view__controls" data-testid="timeline-controls">
            <button
              className="timeline-view__ctrl-btn"
              onClick={handleZoomIn}
              title="Zoom in"
              data-testid="timeline-zoom-in"
              type="button"
            >
              +
            </button>
            <button
              className="timeline-view__ctrl-btn"
              onClick={handleZoomOut}
              title="Zoom out"
              data-testid="timeline-zoom-out"
              type="button"
            >
              &minus;
            </button>
            <button
              className={`timeline-view__ctrl-btn ${!isZoomed ? 'timeline-view__ctrl-btn--disabled' : ''}`}
              onClick={handleReset}
              disabled={!isZoomed}
              title="Zoom to fit (show full time range)"
              data-testid="timeline-reset-btn"
              type="button"
            >
              &#x21A9;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
