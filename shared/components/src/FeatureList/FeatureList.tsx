import { useRef, useMemo, useCallback, CSSProperties } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DebriefFeature, DebriefFeatureCollection } from '../utils/types';
import { FeatureRow } from './FeatureRow';
import './FeatureList.css';

export interface FeatureListProps {
  /** Features to display - either FeatureCollection or array */
  features: DebriefFeatureCollection | DebriefFeature[];

  /** Set of selected feature IDs */
  selectedIds?: Set<string>;

  /**
   * Called with the new complete selection set after a click.
   * Supports standard list selection: click to select one,
   * Ctrl/Cmd-click to toggle individual items,
   * Shift-click to select a contiguous range.
   */
  onSelectionChange?: (ids: Set<string>) => void;

  /**
   * @deprecated Use onSelectionChange for full multi-select support.
   * Simple callback when a feature is clicked (id only).
   */
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
  onSelectionChange,
  onSelect,
  filter,
  height = 300,
  rowHeight = 40,
  className,
  style,
}: FeatureListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const lastClickedIndex = useRef<number | null>(null);

  // Normalize and filter features
  const featureArray = useMemo(() => {
    const normalized = normalizeFeatures(features);
    if (filter) {
      return normalized.filter(filter);
    }
    return normalized;
  }, [features, filter]);

  const handleRowClick = useCallback(
    (index: number, event: React.MouseEvent) => {
      const feature = featureArray[index];
      if (!feature) return;

      // Legacy callback
      if (!onSelectionChange) {
        onSelect?.(feature.id);
        lastClickedIndex.current = index;
        return;
      }

      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;

      let next: Set<string>;

      if (isShift && lastClickedIndex.current !== null) {
        // Range select: from last-clicked to current
        const start = Math.min(lastClickedIndex.current, index);
        const end = Math.max(lastClickedIndex.current, index);
        next = new Set(isCtrl ? selectedIds : []);
        for (let i = start; i <= end; i++) {
          const f = featureArray[i];
          if (f) next.add(f.id);
        }
      } else if (isCtrl) {
        // Toggle individual item
        next = new Set(selectedIds);
        if (next.has(feature.id)) {
          next.delete(feature.id);
        } else {
          next.add(feature.id);
        }
      } else {
        // Plain click: select only this item
        next = new Set([feature.id]);
      }

      lastClickedIndex.current = index;
      onSelectionChange(next);
    },
    [featureArray, selectedIds, onSelectionChange, onSelect],
  );

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
            if (!feature) return null;
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
                  onClick={(e) => handleRowClick(virtualItem.index, e)}
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
