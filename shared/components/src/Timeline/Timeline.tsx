import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import type { DebriefFeature, DebriefFeatureCollection, TimeExtent } from '../utils/types';
import { calculateTimeExtent } from '../utils/time';
import { renderTimeAxis, timeToX, xToTime } from './canvas/TimeAxis';
import { calculateFeatureBars, renderFeatureBars, findBarAtPoint, type FeatureBarInfo } from './canvas/FeatureBars';
import './Timeline.css';

export interface TimelineProps {
  /** GeoJSON features to display */
  features: DebriefFeatureCollection | DebriefFeature[];

  /** Set of selected feature IDs */
  selectedIds?: Set<string>;

  /** Callback when a feature bar is clicked */
  onSelect?: (featureId: string, event: React.MouseEvent) => void;

  /** Callback when clicking empty space */
  onBackgroundClick?: () => void;

  /** Callback when visible time range changes */
  onTimeRangeChange?: (timeExtent: TimeExtent) => void;

  /** Override time extent (for synchronized views) */
  timeExtent?: TimeExtent;

  /** Height of the component */
  height?: number;

  /** Height of each feature bar */
  barHeight?: number;

  /** CSS class name */
  className?: string;

  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Timeline component for displaying features on a time axis.
 * Uses HTML5 Canvas for efficient rendering of many features.
 *
 * @example
 * ```tsx
 * import { Timeline } from '@debrief/components/Timeline';
 *
 * <Timeline
 *   features={plotData}
 *   selectedIds={selection.selectedIds}
 *   onSelect={(id) => selection.toggle(id)}
 * />
 * ```
 */
export function Timeline({
  features,
  selectedIds = new Set(),
  onSelect,
  onBackgroundClick,
  onTimeRangeChange,
  timeExtent: propTimeExtent,
  height = 200,
  barHeight = 24,
  className,
  style,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const axisCanvasRef = useRef<HTMLCanvasElement>(null);
  const barsCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [width, setWidth] = useState(0);

  // Normalize features to array
  const featureArray = useMemo(() => {
    return Array.isArray(features) ? features : features.features;
  }, [features]);

  // Calculate or use provided time extent
  const timeExtent = useMemo<TimeExtent | null>(() => {
    if (propTimeExtent) return propTimeExtent;
    return calculateTimeExtent(featureArray);
  }, [featureArray, propTimeExtent]);

  // Calculate bar layout
  const bars = useMemo<FeatureBarInfo[]>(() => {
    if (!timeExtent || width === 0) return [];

    return calculateFeatureBars(featureArray, {
      width,
      height: height - 32, // Subtract axis height
      timeExtent,
      barHeight,
      selectedIds,
    });
  }, [featureArray, timeExtent, width, height, barHeight, selectedIds]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    setWidth(container.clientWidth);

    return () => resizeObserver.disconnect();
  }, []);

  // Render time axis
  useEffect(() => {
    const canvas = axisCanvasRef.current;
    if (!canvas || !timeExtent || width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (handle high DPI)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = 32 * dpr;
    ctx.scale(dpr, dpr);

    renderTimeAxis(ctx, {
      width,
      height: 32,
      timeExtent,
    });
  }, [width, timeExtent]);

  // Render feature bars
  useEffect(() => {
    const canvas = barsCanvasRef.current;
    if (!canvas || !timeExtent || width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (handle high DPI)
    const dpr = window.devicePixelRatio || 1;
    const barsHeight = height - 32;
    canvas.width = width * dpr;
    canvas.height = barsHeight * dpr;
    ctx.scale(dpr, dpr);

    renderFeatureBars(ctx, bars, {
      width,
      height: barsHeight,
      timeExtent,
      barHeight,
      selectedIds,
    });
  }, [width, timeExtent, bars, height, barHeight, selectedIds]);

  // Handle click
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = barsCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const bar = findBarAtPoint(x, y, bars);

      if (bar) {
        onSelect?.(bar.featureId, event);
      } else {
        onBackgroundClick?.();
      }
    },
    [bars, onSelect, onBackgroundClick]
  );

  // Handle mouse move for hover effects
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = barsCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const bar = findBarAtPoint(x, y, bars);
      setHoveredBar(bar?.featureId ?? null);

      canvas.style.cursor = bar ? 'pointer' : 'default';
    },
    [bars]
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoveredBar(null);
  }, []);

  const containerStyle: React.CSSProperties = {
    height,
    ...style,
  };

  // Calculate content height based on bars
  const contentHeight = useMemo(() => {
    if (bars.length === 0) return height - 32;
    const lastBar = bars[bars.length - 1];
    return Math.max(height - 32, (lastBar?.y ?? 0) + barHeight + 8);
  }, [bars, height, barHeight]);

  if (!timeExtent) {
    return (
      <div className={`debrief-timeline debrief-timeline--empty ${className ?? ''}`} style={containerStyle}>
        <div className="debrief-timeline__empty-message">
          No temporal data available
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`debrief-timeline ${className ?? ''}`}
      style={containerStyle}
    >
      <canvas
        ref={axisCanvasRef}
        className="debrief-timeline__axis"
        style={{ width: '100%', height: 32 }}
      />
      <div className="debrief-timeline__bars-container" style={{ height: height - 32 }}>
        <canvas
          ref={barsCanvasRef}
          className="debrief-timeline__bars"
          style={{ width: '100%', height: contentHeight }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      {hoveredBar && (
        <div className="debrief-timeline__tooltip">
          {bars.find((b) => b.featureId === hoveredBar)?.label}
        </div>
      )}
    </div>
  );
}
