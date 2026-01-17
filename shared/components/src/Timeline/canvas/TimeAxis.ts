import type { TimeExtent } from '../../utils/types';
import { formatTime } from '../../utils/time';

export interface TimeAxisConfig {
  /** Canvas width in pixels */
  width: number;

  /** Height of the time axis in pixels */
  height: number;

  /** Time extent [startMs, endMs] */
  timeExtent: TimeExtent;

  /** Font family */
  fontFamily?: string;

  /** Font size in pixels */
  fontSize?: number;

  /** Text color */
  textColor?: string;

  /** Grid line color */
  gridColor?: string;

  /** Tick color */
  tickColor?: string;
}

/**
 * Calculate nice tick intervals for the time axis.
 */
function calculateTickInterval(durationMs: number, maxTicks: number): number {
  const intervals = [
    1000,               // 1 second
    5000,               // 5 seconds
    10000,              // 10 seconds
    30000,              // 30 seconds
    60000,              // 1 minute
    300000,             // 5 minutes
    600000,             // 10 minutes
    1800000,            // 30 minutes
    3600000,            // 1 hour
    7200000,            // 2 hours
    14400000,           // 4 hours
    21600000,           // 6 hours
    43200000,           // 12 hours
    86400000,           // 1 day
    172800000,          // 2 days
    604800000,          // 1 week
  ];

  for (const interval of intervals) {
    if (durationMs / interval <= maxTicks) {
      return interval;
    }
  }

  return intervals[intervals.length - 1];
}

/**
 * Render the time axis on a canvas context.
 */
export function renderTimeAxis(
  ctx: CanvasRenderingContext2D,
  config: TimeAxisConfig
): void {
  const {
    width,
    height,
    timeExtent,
    fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif',
    fontSize = 10,
    textColor = '#666666',
    gridColor = 'rgba(0, 0, 0, 0.1)',
    tickColor = '#999999',
  } = config;

  const [startTime, endTime] = timeExtent;
  const duration = endTime - startTime;

  if (duration <= 0) return;

  // Clear axis area
  ctx.clearRect(0, 0, width, height);

  // Draw background
  ctx.fillStyle = 'var(--debrief-bg-secondary, #f8f9fa)';
  ctx.fillRect(0, 0, width, height);

  // Draw top border
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0.5);
  ctx.lineTo(width, 0.5);
  ctx.stroke();

  // Calculate tick interval
  const maxTicks = Math.floor(width / 80); // One tick every ~80px
  const tickInterval = calculateTickInterval(duration, maxTicks);

  // Round start time to tick interval
  const firstTick = Math.ceil(startTime / tickInterval) * tickInterval;

  // Draw ticks and labels
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let time = firstTick; time <= endTime; time += tickInterval) {
    const x = ((time - startTime) / duration) * width;

    // Draw tick
    ctx.strokeStyle = tickColor;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 6);
    ctx.stroke();

    // Draw label
    const label = formatTime(time, 'short');
    ctx.fillStyle = textColor;
    ctx.fillText(label, x, 8);
  }

  // Draw date at start if time range spans multiple days
  if (duration > 86400000) {
    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    const dateLabel = new Date(startTime).toLocaleDateString();
    ctx.fillText(dateLabel, 4, 8);
  }
}

/**
 * Convert x coordinate to time.
 */
export function xToTime(x: number, width: number, timeExtent: TimeExtent): number {
  const [startTime, endTime] = timeExtent;
  return startTime + (x / width) * (endTime - startTime);
}

/**
 * Convert time to x coordinate.
 */
export function timeToX(time: number, width: number, timeExtent: TimeExtent): number {
  const [startTime, endTime] = timeExtent;
  return ((time - startTime) / (endTime - startTime)) * width;
}
