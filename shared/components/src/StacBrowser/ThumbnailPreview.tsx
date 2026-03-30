/**
 * ThumbnailPreview — gallery preview panel for the catalog browser (#174).
 *
 * Shows a large thumbnail image for the currently selected plot with
 * title overlay, prev/next navigation, and SVG fallback via onError.
 */

import React, { useCallback, useEffect } from 'react';
import type { CatalogOverviewItem } from '../filter-engine/types';
import './ThumbnailPreview.css';

export interface ThumbnailPreviewProps {
  /** Currently selected item to preview. */
  readonly item: CatalogOverviewItem | null;
  /** All items in the current filtered set (for prev/next navigation). */
  readonly items: readonly CatalogOverviewItem[];
  /** Called when navigating to a different item. */
  readonly onNavigate?: (itemId: string) => void;
  /** Called when the user double-clicks to open the item. */
  readonly onOpen?: (itemPath: string) => void;
}

export const ThumbnailPreview: React.FC<ThumbnailPreviewProps> = ({
  item,
  items,
  onNavigate,
  onOpen,
}) => {
  const currentIndex = item ? items.findIndex(i => i.id === item.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < items.length - 1;

  const goToPrev = useCallback(() => {
    const prevItem = items[currentIndex - 1];
    if (hasPrev && prevItem) {
      onNavigate?.(prevItem.id);
    }
  }, [hasPrev, items, currentIndex, onNavigate]);

  const goToNext = useCallback(() => {
    const nextItem = items[currentIndex + 1];
    if (hasNext && nextItem) {
      onNavigate?.(nextItem.id);
    }
  }, [hasNext, items, currentIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  // Empty state
  if (!item) {
    return (
      <div className="thumbnail-preview thumbnail-preview--empty" data-testid="thumbnail-preview">
        <div className="thumbnail-preview__placeholder">
          Select a plot to preview
        </div>
      </div>
    );
  }

  const thumbnailSrc = item.thumbnailHref ?? null;

  return (
    <div
      className="thumbnail-preview"
      data-testid="thumbnail-preview"
      onDoubleClick={() => onOpen?.(item.itemPath)}
    >
      <div className="thumbnail-preview__image-container">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={`Preview of ${item.title}`}
            className="thumbnail-preview__image"
            data-testid="thumbnail-preview-image"
            onError={(e) => {
              // Hide the image and show fallback
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="thumbnail-preview__fallback" data-testid="thumbnail-preview-fallback">
            <svg viewBox="0 0 800 600" className="thumbnail-preview__fallback-svg">
              <rect width="800" height="600" fill="var(--co-editor-background, #1e1e1e)" />
              <text
                x="400"
                y="300"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--co-descriptionForeground, #666)"
                fontSize="24"
              >
                No preview available
              </text>
            </svg>
          </div>
        )}
      </div>

      {/* Title overlay */}
      <div className="thumbnail-preview__title" data-testid="thumbnail-preview-title">
        {item.title}
      </div>

      {/* Navigation controls */}
      <div className="thumbnail-preview__nav">
        <button
          type="button"
          className="thumbnail-preview__nav-btn"
          data-testid="thumbnail-preview-prev"
          disabled={!hasPrev}
          onClick={goToPrev}
          aria-label="Previous plot"
        >
          &#x276E;
        </button>
        <span className="thumbnail-preview__nav-counter">
          {currentIndex + 1} / {items.length}
        </span>
        <button
          type="button"
          className="thumbnail-preview__nav-btn"
          data-testid="thumbnail-preview-next"
          disabled={!hasNext}
          onClick={goToNext}
          aria-label="Next plot"
        >
          &#x276F;
        </button>
      </div>
    </div>
  );
};
