import React, { useRef, useMemo, useCallback, useState, CSSProperties } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DebriefFeature, DebriefFeatureCollection } from '../utils/types';
import { FeatureRow } from './FeatureRow';
import { flattenFeatures, hasChildSelected } from './flattenFeatures';
import {
  applyClickToSelection,
  isPlatformModifier,
  type SelectionClickEvent,
} from '../utils/applyClickToSelection';
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
   * Optional structured-event callback emitted on plain/modifier clicks
   * (the two branches that route through the shared
   * `applyClickToSelection` helper). Consumers that need the modifier
   * bit — e.g. to compute `selection.primary` — should prefer this over
   * `onSelectionChange`. Not emitted on shift-range clicks (those are
   * list-only and have no clear single "target"). #192 Phase 5.
   */
  onSelectionEvent?: (event: SelectionClickEvent) => void;

  /**
   * @deprecated Use onSelectionChange for full multi-select support.
   * Simple callback when a feature is clicked (id only).
   */
  onSelect?: (id: string) => void;

  /** Called when a feature is expanded or collapsed */
  onToggleExpand?: (featureId: string, isExpanded: boolean) => void;

  /** Set of hidden feature IDs (shown with eye-slash icon) */
  hiddenIds?: Set<string>;

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

  /** Show format icon on rows for features with editable properties (Feature 097) */
  showFormatIcon?: boolean;

  /** Called when the format icon is clicked on a feature row (Feature 097) */
  onFormatClick?: (event: React.MouseEvent, feature: DebriefFeature) => void;

  /** Called when the format icon is clicked on a child row (position, point, polygon) */
  onChildFormatClick?: (event: React.MouseEvent, displayItem: import('./flattenFeatures').DisplayItem) => void;

  /** Show info icon on rows to display geometry data (Feature 098) */
  showInfoIcon?: boolean;

  /** Called when the info icon is clicked on a feature row (Feature 098) */
  onInfoClick?: (event: React.MouseEvent, feature: DebriefFeature) => void;

  /** Called when the info icon is clicked on a child row (Feature 098) */
  onChildInfoClick?: (event: React.MouseEvent, displayItem: import('./flattenFeatures').DisplayItem) => void;
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
 * FeatureList displays a virtualized list of features with expand/collapse
 * support for viewing child elements (positions, points, polygons).
 */
export function FeatureList({
  features,
  selectedIds = new Set(),
  hiddenIds,
  onSelectionChange,
  onSelectionEvent,
  onSelect,
  onToggleExpand,
  filter,
  height = 300,
  rowHeight = 40,
  className,
  style,
  showFormatIcon,
  onFormatClick,
  onChildFormatClick,
  showInfoIcon,
  onInfoClick,
  onChildInfoClick,
}: FeatureListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const lastClickedIndex = useRef<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Normalize and filter features
  const featureArray = useMemo(() => {
    const normalized = normalizeFeatures(features);
    if (filter) {
      return normalized.filter(filter);
    }
    return normalized;
  }, [features, filter]);

  // Flatten features with expansion state
  const flattenedItems = useMemo(
    () => flattenFeatures(featureArray, expandedIds),
    [featureArray, expandedIds],
  );

  const handleToggleExpand = useCallback(
    (itemId: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        const willExpand = !next.has(itemId);
        if (willExpand) {
          next.add(itemId);
        } else {
          next.delete(itemId);
        }
        onToggleExpand?.(itemId, willExpand);
        return next;
      });
    },
    [onToggleExpand],
  );

  const handleRowClick = useCallback(
    (index: number, mouseEvent: React.MouseEvent) => {
      const item = flattenedItems[index];
      if (!item) return;

      const itemId = item.id;

      // Legacy callback (single-id) — unchanged.
      if (!onSelectionChange) {
        onSelect?.(itemId);
        lastClickedIndex.current = index;
        return;
      }

      const isModifier = isPlatformModifier({
        ctrlKey: mouseEvent.ctrlKey,
        metaKey: mouseEvent.metaKey,
      });
      const isShift = mouseEvent.shiftKey;

      let next: Set<string>;
      let clickEvent: SelectionClickEvent | null = null;

      if (isShift && lastClickedIndex.current !== null) {
        // Shift-range is local to the list view — `applyClickToSelection`
        // intentionally reserves shift for future range-select. FeatureList
        // is row-indexed, so we keep the row-range logic here and only
        // converge the plain/modifier branches onto the shared helper.
        const start = Math.min(lastClickedIndex.current, index);
        const end = Math.max(lastClickedIndex.current, index);
        next = new Set(isModifier ? selectedIds : []);
        for (let i = start; i <= end; i++) {
          const it = flattenedItems[i];
          if (it) next.add(it.id);
        }
      } else {
        // Plain + modifier clicks route through the shared multi-select
        // emitter glue so the map and the Layers panel produce identical
        // selection sets for identical sequences (#192 Phase 5).
        const result = applyClickToSelection({
          current: {
            featureIds: Array.from(selectedIds),
            primary: null,
          },
          event: { target: itemId, modifier: isModifier, shift: isShift },
        });
        next = new Set(result.featureIds);
        clickEvent = { target: itemId, modifier: isModifier, shift: isShift };
      }

      lastClickedIndex.current = index;
      // When `onSelectionEvent` is provided, it is the authoritative
      // emit for plain/modifier clicks: the host computes the next
      // selection (incl. `primary`) via `applyClickToSelection` itself.
      // `onSelectionChange` would race against that calculation, so we
      // skip it for plain/modifier branches. Shift-range still emits
      // `onSelectionChange` because there is no single "target" for
      // the modifier-aware glue. (#192 Phase 5)
      if (clickEvent !== null && onSelectionEvent) {
        onSelectionEvent(clickEvent);
      } else {
        onSelectionChange(next);
      }
    },
    [flattenedItems, selectedIds, onSelectionChange, onSelectionEvent, onSelect],
  );

  // Setup virtualizer
  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
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
            const item = flattenedItems[virtualItem.index];
            if (!item) return null;
            const isSelected = selectedIds.has(item.id);
            const isHidden = hiddenIds?.has(item.id) ?? false;
            const isExpanded = expandedIds.has(item.id);
            const childSel = !isExpanded && hasChildSelected(item.id, selectedIds);

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
                  feature={item.feature ?? undefined}
                  displayItem={item.type !== 'feature' ? item : undefined}
                  isSelected={isSelected}
                  isHidden={isHidden}
                  depth={item.depth}
                  isExpandable={item.isExpandable}
                  isExpanded={isExpanded}
                  hasChildSelected={childSel}
                  showFormatIcon={showFormatIcon}
                  onFormatClick={onFormatClick}
                  onChildFormatClick={onChildFormatClick}
                  showInfoIcon={showInfoIcon}
                  onInfoClick={onInfoClick}
                  onChildInfoClick={onChildInfoClick}
                  onClick={(e) => handleRowClick(virtualItem.index, e)}
                  onToggleExpand={() => handleToggleExpand(item.id)}
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
