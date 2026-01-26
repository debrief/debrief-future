/**
 * TimeScrubber component - draggable time slider.
 */

import { useCallback, useRef, useState } from 'react';
import type { TimeScrubberProps } from './types';
import { timeToPercent, percentToTime, formatTime } from './timeUtils';

/**
 * A draggable time scrubber for navigating through a time range.
 *
 * @example
 * ```tsx
 * <TimeScrubber
 *   timeExtent={[startTime, endTime]}
 *   currentTime={currentTime}
 *   onTimeChange={setCurrentTime}
 * />
 * ```
 */
export function TimeScrubber({
  timeExtent,
  currentTime,
  onTimeChange,
  disabled = false,
  className,
}: TimeScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [start, end] = timeExtent;
  const percent = timeToPercent(currentTime, start, end);

  // Calculate time from mouse position
  const getTimeFromMouseEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const track = trackRef.current;
      if (!track) return currentTime;

      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const clickPercent = (x / width) * 100;

      return percentToTime(clickPercent, start, end);
    },
    [start, end, currentTime]
  );

  // Handle click on track
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      const time = getTimeFromMouseEvent(e);
      onTimeChange(time);
    },
    [disabled, getTimeFromMouseEvent, onTimeChange]
  );

  // Handle drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const time = getTimeFromMouseEvent(moveEvent);
        onTimeChange(time);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [disabled, getTimeFromMouseEvent, onTimeChange]
  );

  // Handle touch events for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      setIsDragging(true);

      const getTouchTime = (touchEvent: TouchEvent) => {
        const touch = touchEvent.touches[0];
        const track = trackRef.current;
        if (!track || !touch) return currentTime;

        const rect = track.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const width = rect.width;
        const touchPercent = (x / width) * 100;

        return percentToTime(touchPercent, start, end);
      };

      const handleTouchMove = (moveEvent: TouchEvent) => {
        moveEvent.preventDefault();
        const time = getTouchTime(moveEvent);
        onTimeChange(time);
      };

      const handleTouchEnd = () => {
        setIsDragging(false);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      // Initial touch position
      const touch = e.touches[0];
      if (touch) {
        const track = trackRef.current;
        if (track) {
          const rect = track.getBoundingClientRect();
          const x = touch.clientX - rect.left;
          const width = rect.width;
          const touchPercent = (x / width) * 100;
          const time = percentToTime(touchPercent, start, end);
          onTimeChange(time);
        }
      }
    },
    [disabled, start, end, currentTime, onTimeChange]
  );

  return (
    <div
      className={`debrief-time-scrubber ${disabled ? 'debrief-time-scrubber--disabled' : ''} ${isDragging ? 'debrief-time-scrubber--dragging' : ''} ${className ?? ''}`}
      aria-label="Time scrubber"
      aria-valuemin={start}
      aria-valuemax={end}
      aria-valuenow={currentTime}
      aria-valuetext={formatTime(currentTime)}
      role="slider"
      tabIndex={disabled ? -1 : 0}
    >
      {/* Time range labels */}
      <div className="debrief-time-scrubber__labels">
        <span className="debrief-time-scrubber__label debrief-time-scrubber__label--start">
          {formatTime(start)}
        </span>
        <span className="debrief-time-scrubber__label debrief-time-scrubber__label--end">
          {formatTime(end)}
        </span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="debrief-time-scrubber__track"
        onClick={handleTrackClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Progress fill */}
        <div
          className="debrief-time-scrubber__fill"
          style={{ width: `${percent}%` }}
        />

        {/* Thumb */}
        <div
          className="debrief-time-scrubber__thumb"
          style={{ left: `${percent}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
