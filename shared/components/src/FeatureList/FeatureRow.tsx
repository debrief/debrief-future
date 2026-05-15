import type { CSSProperties } from 'react';
import type { DebriefFeature } from '../utils/types';
import { isTrackFeature, isReferenceLocation, isMultiPointFeature, isMultiPolygonFeature } from '../utils/types';
import { getFeatureLabel, getFeatureColor } from '../utils/labels';
import type { DisplayItem } from './flattenFeatures';
import './FeatureList.css';

export interface FeatureRowProps {
  /** The feature to display (for top-level rows) */
  feature?: DebriefFeature;

  /** Display item for child rows (positions, points, etc.) */
  displayItem?: DisplayItem;

  /** Whether this row is selected */
  isSelected: boolean;

  /** Whether this feature is hidden (shows eye-slash indicator) */
  isHidden?: boolean;

  /** Nesting depth (0 = top-level) */
  depth?: number;

  /** Whether this item can be expanded */
  isExpandable?: boolean;

  /** Whether this item is currently expanded */
  isExpanded?: boolean;

  /** Whether a child of this item is selected (shows indicator dot) */
  hasChildSelected?: boolean;

  /** Whether to show the format icon (Feature 097) */
  showFormatIcon?: boolean;

  /** Whether to show the info icon (Feature 098) */
  showInfoIcon?: boolean;

  /** Click handler */
  onClick: (event: React.MouseEvent) => void;

  /** Toggle expand/collapse handler */
  onToggleExpand?: (event: React.MouseEvent) => void;

  /** Format icon click handler (Feature 097) */
  onFormatClick?: (event: React.MouseEvent, feature: DebriefFeature) => void;

  /** Format icon click handler for child rows (positions, points, polygons) */
  onChildFormatClick?: (event: React.MouseEvent, displayItem: DisplayItem) => void;

  /** Info icon click handler for parent features (Feature 098) */
  onInfoClick?: (event: React.MouseEvent, feature: DebriefFeature) => void;

  /** Info icon click handler for child rows (Feature 098) */
  onChildInfoClick?: (event: React.MouseEvent, displayItem: DisplayItem) => void;

  /** Optional inline style */
  style?: CSSProperties;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`debrief-feature-row__chevron${expanded ? ' debrief-feature-row__chevron--expanded' : ''}`}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 2.5L8 6L4.5 9.5" />
    </svg>
  );
}

/**
 * Get the type label for a feature.
 */
function getFeatureType(feature: DebriefFeature): string {
  if (isTrackFeature(feature)) {
    return feature.properties.track_type || 'TRACK';
  }
  if (isMultiPointFeature(feature)) {
    return 'MULTI_POINT';
  }
  if (isMultiPolygonFeature(feature)) {
    return 'MULTI_POLYGON';
  }
  if (isReferenceLocation(feature)) {
    return feature.properties.location_type || 'POINT';
  }
  return feature.properties.kind || 'ANNOTATION';
}

/**
 * Get additional info for a feature.
 */
function getFeatureInfo(feature: DebriefFeature): string | null {
  const parts: string[] = [];

  if (feature.id != null) {
    const idStr = String(feature.id);
    const shortId = idStr.length > 8 ? idStr.slice(0, 8) + '…' : idStr;
    parts.push(shortId);
  }

  if (isTrackFeature(feature)) {
    const positions = feature.properties.positions;
    let start: string | undefined = feature.properties.start_time;
    let end: string | undefined = feature.properties.end_time;

    if (!start && positions.length > 0) {
      start = positions[0]?.time;
    }
    if (!end && positions.length > 0) {
      end = positions[positions.length - 1]?.time;
    }

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      parts.push(`${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`);
    }
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * FeatureRow displays a single feature or child item in the list.
 */
export function FeatureRow({
  feature,
  displayItem,
  isSelected,
  isHidden = false,
  depth = 0,
  isExpandable = false,
  isExpanded = false,
  hasChildSelected: childSelected = false,
  showFormatIcon = false,
  showInfoIcon = false,
  onClick,
  onToggleExpand,
  onFormatClick,
  onChildFormatClick,
  onInfoClick,
  onChildInfoClick,
  style,
}: FeatureRowProps) {
  // Determine label, type, color based on whether this is a feature row or child row
  const isChildRow = !feature && displayItem;
  const baseLabel = feature ? getFeatureLabel(feature) : (displayItem?.label ?? '');
  // Spec #258 / FR-013, NEW-C — storyboard rows render `name (N)` with the
  // scene count always visible regardless of expand/collapse state.
  const isStoryboardRow = displayItem?.type === 'storyboard';
  const label =
    isStoryboardRow && typeof displayItem?.childCount === 'number'
      ? `${baseLabel} (${displayItem.childCount})`
      : baseLabel;
  const type = feature ? getFeatureType(feature) : null;
  const color = feature ? getFeatureColor(feature) : null;
  const info = feature ? getFeatureInfo(feature) : null;
  const sublabel = displayItem?.sublabel ?? null;

  const className = [
    'debrief-feature-row',
    isSelected && 'debrief-feature-row--selected',
    isHidden && 'debrief-feature-row--hidden',
    isChildRow && 'debrief-feature-row--child',
  ]
    .filter(Boolean)
    .join(' ');

  const paddingLeft = 12 + depth * 20;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // eslint-disable-next-line no-restricted-syntax
      onClick(e as unknown as React.MouseEvent);
    }
    if (e.key === 'ArrowRight' && isExpandable && !isExpanded && onToggleExpand) {
      e.preventDefault();
      // eslint-disable-next-line no-restricted-syntax
      onToggleExpand(e as unknown as React.MouseEvent);
    }
    if (e.key === 'ArrowLeft' && isExpandable && isExpanded && onToggleExpand) {
      e.preventDefault();
      // eslint-disable-next-line no-restricted-syntax
      onToggleExpand(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div
      className={className}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ ...style, paddingLeft: `${paddingLeft}px`, paddingRight: '12px' }}
      data-testid={`feature-row-${feature?.id ?? displayItem?.id ?? ''}`}
    >
      {isExpandable ? (
        <button
          className="debrief-feature-row__expand-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.(e);
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          tabIndex={-1}
        >
          <ChevronIcon expanded={isExpanded} />
          {childSelected && !isExpanded && (
            <span className="debrief-feature-row__child-selected-dot" />
          )}
        </button>
      ) : isStoryboardRow ? (
        // Spec #258 / FR-013 — empty storyboard renders a disabled chevron
        // so the parent row is still visually a parent (not mistaken for a
        // leaf alongside tracks).
        <button
          className="debrief-feature-row__expand-btn"
          disabled
          aria-label="No scenes to expand"
          tabIndex={-1}
        >
          <ChevronIcon expanded={false} />
        </button>
      ) : depth > 0 ? (
        <span className="debrief-feature-row__expand-spacer" />
      ) : null}

      {color && (
        <span
          className="debrief-feature-row__indicator"
          style={{ backgroundColor: color }}
        />
      )}
      <div className="debrief-feature-row__content">
        <span className="debrief-feature-row__name">{label}</span>
        {sublabel && <span className="debrief-feature-row__sublabel">{sublabel}</span>}
        {type && <span className="debrief-feature-row__type">{type}</span>}
      </div>
      {showFormatIcon && feature && onFormatClick && (
        <span
          className="debrief-feature-row__format-icon"
          title="Format"
          role="button"
          tabIndex={-1}
          data-testid={`format-icon-${feature.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onFormatClick(e, feature);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              // eslint-disable-next-line no-restricted-syntax
              onFormatClick(e as unknown as React.MouseEvent, feature);
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.5l1.5 1.5-9 9H3v-1.5l9-9z" />
            <path d="M10.5 4l1.5 1.5" />
            <path d="M2 13.5h12" />
          </svg>
        </span>
      )}
      {showFormatIcon && !feature && displayItem && onChildFormatClick &&
        (displayItem.type === 'position' || displayItem.type === 'point' || displayItem.type === 'polygon') && (
        <span
          className="debrief-feature-row__format-icon"
          title="Format"
          role="button"
          tabIndex={-1}
          data-testid={`format-icon-${displayItem.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onChildFormatClick(e, displayItem);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              // eslint-disable-next-line no-restricted-syntax
              onChildFormatClick(e as unknown as React.MouseEvent, displayItem);
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.5l1.5 1.5-9 9H3v-1.5l9-9z" />
            <path d="M10.5 4l1.5 1.5" />
            <path d="M2 13.5h12" />
          </svg>
        </span>
      )}
      {showInfoIcon && feature && onInfoClick && (
        <span
          className="debrief-feature-row__info-icon"
          title="Info"
          role="button"
          tabIndex={-1}
          data-testid={`info-icon-${feature.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onInfoClick(e, feature);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              // eslint-disable-next-line no-restricted-syntax
              onInfoClick(e as unknown as React.MouseEvent, feature);
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 7v4" />
            <path d="M8 5v0.5" />
          </svg>
        </span>
      )}
      {showInfoIcon && !feature && displayItem && onChildInfoClick &&
        (displayItem.type === 'position' || displayItem.type === 'point' || displayItem.type === 'polygon' || displayItem.type === 'contact') && (
        <span
          className="debrief-feature-row__info-icon"
          title="Info"
          role="button"
          tabIndex={-1}
          data-testid={`info-icon-${displayItem.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onChildInfoClick(e, displayItem);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              // eslint-disable-next-line no-restricted-syntax
              onChildInfoClick(e as unknown as React.MouseEvent, displayItem);
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 7v4" />
            <path d="M8 5v0.5" />
          </svg>
        </span>
      )}
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
      {!isHidden && info && feature && (
        <span
          className="debrief-feature-row__info"
          role="button"
          tabIndex={-1}
          title="Click for feature details"
          onClick={(e) => {
            e.stopPropagation();
            // eslint-disable-next-line no-restricted-syntax
            const props = feature.properties as unknown as Record<string, unknown>;
            const lines = [`id: ${String(feature.id)}`];
            for (const [k, v] of Object.entries(props)) {
              if (k === 'style' || k === 'position_style_overrides' || k === 'positions' || k === 'pointMetadata' || k === 'pointColors' || k === 'zones') {
                lines.push(`${k}: [${Array.isArray(v) ? v.length + ' items' : 'object'}]`);
              } else if (v !== null && v !== undefined && typeof v !== 'object') {
                lines.push(`${k}: ${String(v)}`);
              } else if (v !== null && v !== undefined) {
                lines.push(`${k}: ${JSON.stringify(v)}`);
              }
            }
            lines.push(`geometry.type: ${feature.geometry?.type ?? 'null'}`);
            window.alert(lines.join('\n'));
          }}
        >
          {info}
        </span>
      )}
      {!isHidden && info && !feature && <span className="debrief-feature-row__info">{info}</span>}
    </div>
  );
}
