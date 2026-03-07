/**
 * TimeBrush — draggable brush overlay for temporal filtering (#131, US2).
 *
 * Renders on top of the timeline SVG. Users can drag left/right handles
 * to narrow the time range, drag the body to pan, or double-click to clear.
 */

import React, { useState, useCallback, useRef } from 'react';
import type { TimeSpan } from '../utils/temporal-types';
import type { TemporalFilter } from './types';

export interface TimeBrushProps {
  readonly timeRange: TimeSpan;
  readonly chartWidth: number;
  readonly chartHeight: number;
  readonly onFilterChange: (filter: TemporalFilter | null) => void;
  readonly offsetX?: number;
}

type DragTarget = 'left' | 'right' | 'body' | null;

const HANDLE_WIDTH = 6;
const MIN_BRUSH_PX = 10;

export const TimeBrush: React.FC<TimeBrushProps> = ({
  timeRange,
  chartWidth,
  chartHeight,
  onFilterChange,
  offsetX = 0,
}) => {
  // Brush state in pixel coordinates (0 = left edge, chartWidth = right edge)
  const [brushLeft, setBrushLeft] = useState(0);
  const [brushRight, setBrushRight] = useState(chartWidth);

  // Use refs for drag state to avoid stale closure issues
  const dragTargetRef = useRef<DragTarget>(null);
  const dragStartX = useRef(0);
  const dragStartLeft = useRef(0);
  const dragStartRight = useRef(0);
  const brushLeftRef = useRef(0);
  const brushRightRef = useRef(chartWidth);

  const pxToEpoch = useCallback((px: number): number => {
    const ratio = Math.max(0, Math.min(1, px / chartWidth));
    return timeRange.min + ratio * (timeRange.max - timeRange.min);
  }, [chartWidth, timeRange]);

  const emitFilter = useCallback((left: number, right: number) => {
    if (left <= 0 && right >= chartWidth) {
      onFilterChange(null);
      return;
    }
    const start = pxToEpoch(left);
    const end = pxToEpoch(right);
    onFilterChange({ start, end });
  }, [chartWidth, pxToEpoch, onFilterChange]);

  const updateBrush = useCallback((left: number, right: number) => {
    brushLeftRef.current = left;
    brushRightRef.current = right;
    setBrushLeft(left);
    setBrushRight(right);
  }, []);

  const handlePointerDown = useCallback((target: DragTarget) => (e: React.PointerEvent) => {
    e.stopPropagation();
    dragTargetRef.current = target;
    dragStartX.current = e.clientX;
    dragStartLeft.current = brushLeftRef.current;
    dragStartRight.current = brushRightRef.current;
    const el = e.target as SVGElement;
    if (typeof el.setPointerCapture === 'function') {
      el.setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const target = dragTargetRef.current;
    if (!target) return;
    const dx = e.clientX - dragStartX.current;
    const curLeft = brushLeftRef.current;
    const curRight = brushRightRef.current;

    if (target === 'left') {
      const newLeft = Math.max(0, Math.min(dragStartLeft.current + dx, curRight - MIN_BRUSH_PX));
      updateBrush(newLeft, curRight);
      emitFilter(newLeft, curRight);
    } else if (target === 'right') {
      const newRight = Math.min(chartWidth, Math.max(dragStartRight.current + dx, curLeft + MIN_BRUSH_PX));
      updateBrush(curLeft, newRight);
      emitFilter(curLeft, newRight);
    } else if (target === 'body') {
      const brushWidth = dragStartRight.current - dragStartLeft.current;
      let newLeft = dragStartLeft.current + dx;
      let newRight = dragStartRight.current + dx;
      if (newLeft < 0) {
        newLeft = 0;
        newRight = brushWidth;
      }
      if (newRight > chartWidth) {
        newRight = chartWidth;
        newLeft = chartWidth - brushWidth;
      }
      updateBrush(newLeft, newRight);
      emitFilter(newLeft, newRight);
    }
  }, [chartWidth, emitFilter, updateBrush]);

  const handlePointerUp = useCallback(() => {
    dragTargetRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(() => {
    updateBrush(0, chartWidth);
    onFilterChange(null);
  }, [chartWidth, onFilterChange, updateBrush]);

  return (
    <g
      data-testid="brush-container"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Left dimmed region */}
      {brushLeft > 0 && (
        <rect
          x={offsetX}
          y={0}
          width={brushLeft}
          height={chartHeight}
          className="timeline-view__brush-dim"
          data-testid="brush-dim-left"
        />
      )}

      {/* Right dimmed region */}
      {brushRight < chartWidth && (
        <rect
          x={offsetX + brushRight}
          y={0}
          width={chartWidth - brushRight}
          height={chartHeight}
          className="timeline-view__brush-dim"
          data-testid="brush-dim-right"
        />
      )}

      {/* Brush body (draggable) */}
      <rect
        x={offsetX + brushLeft}
        y={0}
        width={brushRight - brushLeft}
        height={chartHeight}
        className="timeline-view__brush-overlay"
        data-testid="brush-body"
        onPointerDown={handlePointerDown('body')}
        onDoubleClick={handleDoubleClick}
      />

      {/* Left handle */}
      <rect
        x={offsetX + brushLeft - HANDLE_WIDTH / 2}
        y={0}
        width={HANDLE_WIDTH}
        height={chartHeight}
        className="timeline-view__brush-handle"
        data-testid="brush-handle-left"
        onPointerDown={handlePointerDown('left')}
      />

      {/* Right handle */}
      <rect
        x={offsetX + brushRight - HANDLE_WIDTH / 2}
        y={0}
        width={HANDLE_WIDTH}
        height={chartHeight}
        className="timeline-view__brush-handle"
        data-testid="brush-handle-right"
        onPointerDown={handlePointerDown('right')}
      />
    </g>
  );
};
