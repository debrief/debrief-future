import type { DebriefFeature, TimeExtent } from '../../utils/types';
import { isTrackFeature } from '../../utils/types';
import { getFeatureColor, getFeatureLabel } from '../../utils/labels';
import { parseTime } from '../../utils/time';

export interface FeatureBarsConfig {
  /** Canvas width in pixels */
  width: number;

  /** Canvas height in pixels (excluding axis) */
  height: number;

  /** Time extent [startMs, endMs] */
  timeExtent: TimeExtent;

  /** Height of each feature bar */
  barHeight?: number;

  /** Vertical padding between bars */
  barPadding?: number;

  /** Corner radius for bars */
  barRadius?: number;

  /** Selected feature IDs */
  selectedIds?: Set<string>;

  /** Selection highlight color */
  selectionColor?: string;

  /** Font family for labels */
  fontFamily?: string;

  /** Font size for labels */
  fontSize?: number;
}

export interface FeatureBarInfo {
  featureId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  isSelected: boolean;
}

/**
 * Calculate bar positions and dimensions for all features.
 */
export function calculateFeatureBars(
  features: DebriefFeature[],
  config: FeatureBarsConfig
): FeatureBarInfo[] {
  const {
    width,
    timeExtent,
    barHeight = 24,
    barPadding = 4,
    selectedIds = new Set(),
  } = config;

  const [startTime, endTime] = timeExtent;
  const duration = endTime - startTime;

  if (duration <= 0) return [];

  const bars: FeatureBarInfo[] = [];
  let yOffset = barPadding;

  for (const feature of features) {
    // Get time range for this feature
    let featureStart: number | null = null;
    let featureEnd: number | null = null;

    if (isTrackFeature(feature)) {
      featureStart = parseTime(feature.properties.start_time);
      featureEnd = parseTime(feature.properties.end_time);
    } else {
      featureStart = parseTime(feature.properties.valid_from);
      featureEnd = parseTime(feature.properties.valid_until);
    }

    // Skip features without time data
    if (featureStart === null || featureEnd === null) {
      continue;
    }

    // Calculate bar position
    const x = ((featureStart - startTime) / duration) * width;
    const barWidth = Math.max(
      4, // Minimum width
      ((featureEnd - featureStart) / duration) * width
    );

    bars.push({
      featureId: feature.id,
      x: Math.max(0, x),
      y: yOffset,
      width: Math.min(barWidth, width - x),
      height: barHeight,
      label: getFeatureLabel(feature),
      color: getFeatureColor(feature),
      isSelected: selectedIds.has(feature.id),
    });

    yOffset += barHeight + barPadding;
  }

  return bars;
}

/**
 * Render feature bars on a canvas context.
 */
export function renderFeatureBars(
  ctx: CanvasRenderingContext2D,
  bars: FeatureBarInfo[],
  config: FeatureBarsConfig
): void {
  const {
    width,
    height,
    barRadius = 3,
    selectionColor = 'rgba(0, 102, 204, 0.3)',
    fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif',
    fontSize = 11,
  } = config;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw background
  ctx.fillStyle = 'var(--debrief-bg-primary, #ffffff)';
  ctx.fillRect(0, 0, width, height);

  // Draw grid lines (light horizontal lines between bars)
  ctx.strokeStyle = 'var(--debrief-timeline-grid-color, rgba(0, 0, 0, 0.05))';
  ctx.lineWidth = 1;

  for (const bar of bars) {
    ctx.beginPath();
    ctx.moveTo(0, bar.y + bar.height + 2);
    ctx.lineTo(width, bar.y + bar.height + 2);
    ctx.stroke();
  }

  // Draw bars
  for (const bar of bars) {
    const { x, y, width: barWidth, height: barHeight, color, isSelected, label } = bar;

    // Draw selection highlight
    if (isSelected) {
      ctx.fillStyle = selectionColor;
      ctx.fillRect(0, y - 2, width, barHeight + 4);

      ctx.strokeStyle = 'var(--debrief-selection-border, #0066cc)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
    }

    // Draw bar with rounded corners
    ctx.fillStyle = color;
    ctx.beginPath();
    if (barWidth > barRadius * 2) {
      ctx.roundRect(x, y, barWidth, barHeight, barRadius);
    } else {
      ctx.rect(x, y, barWidth, barHeight);
    }
    ctx.fill();

    // Draw bar border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw label if bar is wide enough
    if (barWidth > 40) {
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Truncate label if needed
      const maxLabelWidth = barWidth - 8;
      let displayLabel = label;
      let labelWidth = ctx.measureText(displayLabel).width;

      while (labelWidth > maxLabelWidth && displayLabel.length > 3) {
        displayLabel = displayLabel.slice(0, -4) + '...';
        labelWidth = ctx.measureText(displayLabel).width;
      }

      if (labelWidth <= maxLabelWidth) {
        // Add text shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(displayLabel, x + 4, y + barHeight / 2);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
    }
  }
}

/**
 * Find bar at a given point.
 */
export function findBarAtPoint(
  x: number,
  y: number,
  bars: FeatureBarInfo[]
): FeatureBarInfo | null {
  for (const bar of bars) {
    if (
      x >= bar.x &&
      x <= bar.x + bar.width &&
      y >= bar.y &&
      y <= bar.y + bar.height
    ) {
      return bar;
    }
  }
  return null;
}
