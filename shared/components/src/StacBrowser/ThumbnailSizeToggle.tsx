import React from 'react';
import type { ThumbnailSize } from '../ExerciseListView/types';

export interface ThumbnailSizeToggleProps {
  size: ThumbnailSize;
  onSizeChange: (size: ThumbnailSize) => void;
}

const SIZE_OPTIONS: { value: ThumbnailSize; label: string; title: string }[] = [
  { value: 'small',  label: 'S', title: 'Small thumbnails' },
  { value: 'medium', label: 'M', title: 'Medium thumbnails' },
  { value: 'large',  label: 'L', title: 'Large thumbnails' },
];

export const ThumbnailSizeToggle: React.FC<ThumbnailSizeToggleProps> = ({ size, onSizeChange }) => (
  <div
    className="stac-browser__thumbnail-size-toggle"
    role="radiogroup"
    aria-label="Thumbnail size"
    data-testid="thumbnail-size-toggle"
  >
    {SIZE_OPTIONS.map((opt) => (
      <button
        key={opt.value}
        type="button"
        className={`stac-browser__thumbnail-size-btn${size === opt.value ? ' stac-browser__thumbnail-size-btn--active' : ''}`}
        aria-pressed={size === opt.value}
        title={opt.title}
        data-testid={`thumbnail-size-${opt.value}`}
        onClick={(e) => { e.stopPropagation(); onSizeChange(opt.value); }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
