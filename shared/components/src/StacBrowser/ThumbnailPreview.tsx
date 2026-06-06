/**
 * ThumbnailPreview — inline preview for the catalog browser (#174).
 *
 * Shows a large thumbnail image for the currently selected plot.
 * Displayed inline within the exercises panel when an item is highlighted.
 */

import React, { useEffect, useState } from 'react';
import type { CatalogOverviewItem } from '../filter-engine/types';
import './ThumbnailPreview.css';

export interface ThumbnailPreviewProps {
  /** Currently selected item to preview. */
  readonly item: CatalogOverviewItem | null;
  /** All items in the current filtered set. */
  readonly items: readonly CatalogOverviewItem[];
  /** Called when the user double-clicks to open the item. */
  readonly onOpen?: (itemPath: string) => void;
}

export const ThumbnailPreview: React.FC<ThumbnailPreviewProps> = ({
  item,
  onOpen,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset error state when the selected item changes
  useEffect(() => {
    setImageError(false);
  }, [item?.id]);

  if (!item) {
    return (
      <div className="thumbnail-preview thumbnail-preview--empty" data-testid="thumbnail-preview">
        <div className="thumbnail-preview__placeholder">
          Select a plot to preview
        </div>
      </div>
    );
  }

  // spec 241: prefer the large overview (800x600) for the preview pane;
  // fall back to the small thumbnail when the overview hasn't been captured.
  const thumbnailSrc = item.overviewHref ?? item.thumbnailHref ?? null;
  const showFallback = !thumbnailSrc || imageError;

  return (
    <div
      className="thumbnail-preview"
      data-testid="thumbnail-preview"
      onDoubleClick={() => onOpen?.(item.itemPath)}
      title="Double-click to open"
    >
      <div className="thumbnail-preview__image-container">
        {!showFallback ? (
          <img
            src={thumbnailSrc}
            alt={`Preview of ${item.title}`}
            className="thumbnail-preview__image"
            data-testid="thumbnail-preview-image"
            onError={() => setImageError(true)}
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
    </div>
  );
};
