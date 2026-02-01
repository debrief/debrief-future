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

  /** Whether this feature is hidden (shows eye-slash indicator) */
  isHidden?: boolean;

  /** Click handler */
  onClick: (event: React.MouseEvent) => void;

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
  isHidden = false,
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
    isHidden && 'debrief-feature-row--hidden',
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
          onClick(e as unknown as React.MouseEvent);
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
      {isHidden && (
        <span className="debrief-feature-row__hidden-icon" title="Hidden">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 2l12 12" />
            <path d="M6.5 6.5a2 2 0 0 0 3 3" />
            <path d="M3.5 5.5C2.2 6.8 1.5 8 1.5 8s2.5 4.5 6.5 4.5c1 0 1.9-.3 2.7-.7" />
            <path d="M10.7 10.7c2-1.3 3.3-2.7 3.3-2.7S11.5 3.5 8 3.5c-.7 0-1.3.1-1.9.3" />
          </svg>
        </span>
      )}
      {!isHidden && info && <span className="debrief-feature-row__info">{info}</span>}
    </div>
  );
}
