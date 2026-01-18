import type { CSSProperties } from 'react';
import type { DebriefFeature } from '../utils/types';
import { isTrackFeature } from '../utils/types';
import { getFeatureLabel, getFeatureColor } from '../utils/labels';
import './FeatureList.css';

export interface FeatureRowProps {
  /** The feature to display */
  feature: DebriefFeature;

  /** Whether this row is selected */
  isSelected: boolean;

  /** Click handler */
  onClick: () => void;

  /** Optional inline style */
  style?: CSSProperties;
}

/**
 * Get the type label for a feature.
 */
function getFeatureType(feature: DebriefFeature): string {
  if (isTrackFeature(feature)) {
    return feature.properties.track_type;
  }
  return feature.properties.location_type;
}

/**
 * Get additional info for a feature.
 */
function getFeatureInfo(feature: DebriefFeature): string | null {
  if (isTrackFeature(feature)) {
    const start = feature.properties.start_time;
    const end = feature.properties.end_time;
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`;
    }
  }
  return null;
}

/**
 * FeatureRow displays a single feature in the list.
 */
export function FeatureRow({
  feature,
  isSelected,
  onClick,
  style,
}: FeatureRowProps) {
  const label = getFeatureLabel(feature);
  const type = getFeatureType(feature);
  const color = getFeatureColor(feature);
  const info = getFeatureInfo(feature);

  const className = [
    'debrief-feature-row',
    isSelected && 'debrief-feature-row--selected',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={style}
    >
      <span
        className="debrief-feature-row__indicator"
        style={{ backgroundColor: color }}
      />
      <div className="debrief-feature-row__content">
        <span className="debrief-feature-row__name">{label}</span>
        <span className="debrief-feature-row__type">{type}</span>
      </div>
      {info && <span className="debrief-feature-row__info">{info}</span>}
    </div>
  );
}
