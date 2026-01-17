import { useRef, useMemo, CSSProperties } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DebriefFeature, DebriefFeatureCollection } from '../utils/types';
import { FeatureRow } from './FeatureRow';
import './FeatureList.css';

export interface FeatureListProps {
  /** Features to display - either FeatureCollection or array */
  features: DebriefFeatureCollection | DebriefFeature[];

  /** Set of selected feature IDs */
  selectedIds?: Set<string>;

  /** Callback when a feature is clicked */
  onSelect?: (id: string) => void;

  /** Optional filter function */
  filter?: (feature: DebriefFeature) => boolean;

  /** Height of the list container in pixels */
  height?: number;

  /** Height of each row in pixels */
  rowHeight?: number;

  /** Additional CSS class name */
  className?: string;

  /** Additional inline styles */
  style?: CSSProperties;
}

/**
 * Normalize features input to array.
 */
function normalizeFeatures(
  features: DebriefFeatureCollection | DebriefFeature[]
): DebriefFeature[] {
  if (Array.isArray(features)) {
    return features;
  }
  return features.features;
}

/**
 * FeatureList displays a virtualized list of features.
 *
 * Uses @tanstack/react-virtual for efficient rendering of large lists.
 *
 * @example
 * ```tsx
 * <FeatureList
 *   features={featureCollection}
 *   selectedIds={selectedIds}
 *   onSelect={(id) => toggleSelection(id)}
 *   height={400}
 * />
 * ```
 */
export function FeatureList({
  features,
  selectedIds = new Set(),
  onSelect,
  filter,
  height = 300,
  rowHeight = 40,
  className,
  style,
}: FeatureListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Normalize and filter features
  const featureArray = useMemo(() => {
    const normalized = normalizeFeatures(features);
    if (filter) {
      return normalized.filter(filter);
    }
    return normalized;
  }, [features, filter]);

  // Setup virtualizer
  const virtualizer = useVirtualizer({
    count: featureArray.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const containerClassName = [
    'debrief-feature-list',
    featureArray.length === 0 && 'debrief-feature-list--empty',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const containerStyle: CSSProperties = {
    height: `${height}px`,
    ...style,
  };

  // Empty state
  if (featureArray.length === 0) {
    return (
      <div className={containerClassName} style={containerStyle}>
        <div className="debrief-feature-list__empty">No features available</div>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={containerClassName} style={containerStyle}>
      <div
        ref={parentRef}
        className="debrief-feature-list__scroll"
        style={{ height: '100%', overflow: 'auto' }}
      >
        <div
          className="debrief-feature-list__content"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const feature = featureArray[virtualItem.index];
            const isSelected = selectedIds.has(feature.id);

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <FeatureRow
                  feature={feature}
                  isSelected={isSelected}
                  onClick={() => onSelect?.(feature.id)}
                  style={{ height: '100%' }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
