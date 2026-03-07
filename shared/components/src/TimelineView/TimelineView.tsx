/**
 * TimelineView — Gantt-style timeline component for STAC exercises (#131).
 *
 * Displays horizontal bars for each exercise's temporal extent,
 * provides interactive brush filtering, supports exercise selection
 * via double-click, and integrates with the colour scheme engine.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { TimelineViewProps, TimelineBarData, TemporalFilter, StacBrowserItem } from './types';
import {
  parseTime,
  computeTimeRange,
  computeBarX,
  computeBarWidth,
  formatTimeByRange,
  formatDateRange,
} from '../utils/timeline-helpers';
import { TimeBrush } from './TimeBrush';
import './TimelineView.css';

// Layout constants
const ROW_HEIGHT = 28;
const LABEL_WIDTH = 130;
const CHART_LEFT = LABEL_WIDTH + 8;
const CHART_RIGHT = 16;
const SVG_WIDTH = 800;
const AXIS_HEIGHT = 24;
const DEFAULT_BAR_COLOUR = 'var(--co-accent, #007fd4)';
const POINT_RADIUS = 5;
const MIN_BAR_LABEL_CHARS = 18;

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

  const chartWidth = SVG_WIDTH - CHART_LEFT - CHART_RIGHT;

  // Compute time range from all items
  const timeRange = useMemo(() => computeTimeRange(items as StacBrowserItem[]), [items]);

  // Compute bar layout data
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
          // Art. V.1: graceful fallback on colour function failure
          colour = null;
        }
      }

      return {
        item,
        x: hasTime && timeRange ? computeBarX(startEpoch!, timeRange, chartWidth) : 0,
        width: hasTime && !isPoint && timeRange
          ? computeBarWidth(startEpoch!, endEpoch!, timeRange, chartWidth)
          : 0,
        y: i * ROW_HEIGHT,
        isPoint: !!isPoint,
        colour,
        hasTime,
      };
    });
  }, [items, timeRange, chartWidth, colourFn]);

  // Generate axis tick labels
  const axisLabels = useMemo(() => {
    if (!timeRange) return [];
    const rangeSpan = timeRange.max - timeRange.min;
    const tickCount = Math.max(2, Math.min(6, Math.floor(chartWidth / 100)));
    const labels: Array<{ x: number; text: string }> = [];
    for (let i = 0; i < tickCount; i++) {
      const ratio = i / (tickCount - 1);
      const epoch = timeRange.min + ratio * rangeSpan;
      labels.push({
        x: ratio * chartWidth,
        text: formatTimeByRange(epoch, rangeSpan),
      });
    }
    return labels;
  }, [timeRange, chartWidth]);

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

  const handleBrushFilterChange = useCallback((filter: TemporalFilter | null) => {
    onTemporalFilterChange?.(filter);
  }, [onTemporalFilterChange]);

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
    <div className={`timeline-view ${className ?? ''}`} data-testid="timeline-view">
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
          width="100%"
          height={barsHeight}
          viewBox={`0 0 ${SVG_WIDTH} ${barsHeight}`}
          preserveAspectRatio="xMidYMid meet"
          data-testid="timeline-bars-svg"
        >
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
            const barY = bar.y + 4;
            const barHeight = ROW_HEIGHT - 8;
            const fillColour = bar.colour ?? DEFAULT_BAR_COLOUR;
            const truncTitle = bar.item.title.length > MIN_BAR_LABEL_CHARS
              ? bar.item.title.slice(0, MIN_BAR_LABEL_CHARS - 1) + '\u2026'
              : bar.item.title;

            return (
              <g key={bar.item.id}>
                {/* Label */}
                <text
                  x={4}
                  y={labelY}
                  className="timeline-view__label"
                  data-testid={`timeline-label-${bar.item.id}`}
                >
                  {truncTitle}
                </text>

                {bar.hasTime && timeRange ? (
                  bar.isPoint ? (
                    /* Point marker for single-datetime items */
                    <circle
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
                    /* Bar for range items */
                    <rect
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
                  )
                ) : (
                  /* No time data */
                  <text
                    x={CHART_LEFT}
                    y={labelY}
                    className="timeline-view__no-data"
                    data-testid={`timeline-nodata-${bar.item.id}`}
                  >
                    no time data
                  </text>
                )}
              </g>
            );
          })}

          {/* Brush overlay for temporal filtering */}
          {timeRange && onTemporalFilterChange && (
            <TimeBrush
              timeRange={timeRange}
              chartWidth={chartWidth}
              chartHeight={barsHeight}
              onFilterChange={handleBrushFilterChange}
              offsetX={CHART_LEFT}
            />
          )}
        </svg>
      </div>

      {/* Fixed time axis */}
      <div className="timeline-view__axis" data-testid="timeline-axis">
        <svg
          width="100%"
          height={AXIS_HEIGHT}
          viewBox={`0 0 ${SVG_WIDTH} ${AXIS_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
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
      </div>
    </div>
  );
};
