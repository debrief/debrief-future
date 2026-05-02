import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExerciseListItemRow } from '../ExerciseListItemRow';
import type { ExerciseListItem } from '../types';

function makeItem(overrides: Partial<ExerciseListItem> = {}): ExerciseListItem {
  return {
    id: 'test-1',
    title: 'Test Exercise',
    itemPath: './test-1/item.json',
    bbox: [-4, 50, -3, 51],
    datetime: '2024-01-01T00:00:00Z',
    startDatetime: '2024-01-01T00:00:00Z',
    endDatetime: '2024-01-01T12:00:00Z',
    platforms: [],
    tags: [],
    author: null,
    trackDataHref: null,
    ...overrides,
  };
}

describe('ExerciseListItemRow', () => {
  it('renders raster thumbnail when thumbnailHref is present', () => {
    const item = makeItem({ thumbnailHref: '/thumbs/test-sm.png' });
    render(<ExerciseListItemRow item={item} />);

    const img = screen.getByTestId('raster-thumbnail') as HTMLImageElement;
    expect(img.src).toContain('/thumbs/test-sm.png');
  });

  it('hides SpatialThumbnail when raster thumbnail is present', () => {
    const item = makeItem({ thumbnailHref: '/thumbs/test-sm.png' });
    const { container } = render(<ExerciseListItemRow item={item} />);

    // The SpatialThumbnail wrapper div should be hidden
    const thumbnailWrapper = container.querySelector('.exercise-list-item-row__thumbnail > div');
    expect(thumbnailWrapper).toBeTruthy();
    expect((thumbnailWrapper as HTMLElement).style.display).toBe('none');
  });

  it('renders SpatialThumbnail fallback when thumbnailHref is null', () => {
    const item = makeItem({ thumbnailHref: null });
    render(<ExerciseListItemRow item={item} />);

    // No raster thumbnail should be present
    expect(screen.queryByTestId('raster-thumbnail')).toBeNull();
  });

  it('renders SpatialThumbnail fallback when thumbnailHref is undefined', () => {
    const item = makeItem();
    render(<ExerciseListItemRow item={item} />);

    expect(screen.queryByTestId('raster-thumbnail')).toBeNull();
  });

  it('applies highlighted class when highlighted prop is true', () => {
    const item = makeItem();
    render(<ExerciseListItemRow item={item} highlighted={true} />);

    const row = screen.getByTestId('exercise-list-item-row');
    expect(row.className).toContain('exercise-list-item-row--highlighted');
  });

  it('calls onHighlight on single click when provided', () => {
    const item = makeItem();
    const onHighlight = vi.fn();
    render(<ExerciseListItemRow item={item} onHighlight={onHighlight} />);

    screen.getByTestId('exercise-list-item-row').click();
    expect(onHighlight).toHaveBeenCalledWith('test-1');
  });

  it('calls onSelect on double click when onHighlight provided', () => {
    const item = makeItem();
    const onSelect = vi.fn();
    const onHighlight = vi.fn();
    render(<ExerciseListItemRow item={item} onSelect={onSelect} onHighlight={onHighlight} />);

    const row = screen.getByTestId('exercise-list-item-row');
    row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith('./test-1/item.json');
  });

  it('uses default small thumbnail dimensions', () => {
    const item = makeItem({ thumbnailHref: '/thumbs/test-sm.png' });
    render(<ExerciseListItemRow item={item} />);

    const img = screen.getByTestId('raster-thumbnail') as HTMLImageElement;
    expect(img.width).toBe(60);
    expect(img.height).toBe(45);
  });

  it('uses medium thumbnail dimensions when thumbnailSize is medium', () => {
    const item = makeItem({ thumbnailHref: '/thumbs/test-sm.png' });
    render(<ExerciseListItemRow item={item} thumbnailSize="medium" />);

    const img = screen.getByTestId('raster-thumbnail') as HTMLImageElement;
    expect(img.width).toBe(120);
    expect(img.height).toBe(90);
  });

  it('uses large thumbnail dimensions when thumbnailSize is large', () => {
    const item = makeItem({ thumbnailHref: '/thumbs/test-sm.png' });
    render(<ExerciseListItemRow item={item} thumbnailSize="large" />);

    const img = screen.getByTestId('raster-thumbnail') as HTMLImageElement;
    expect(img.width).toBe(180);
    expect(img.height).toBe(135);
  });

  it('passes correct dimensions to SpatialThumbnail for large size', () => {
    const item = makeItem({ thumbnailHref: null, bbox: [-4, 50, -3, 51] });
    render(<ExerciseListItemRow item={item} thumbnailSize="large" />);

    const spatial = screen.getByTestId('spatial-thumbnail');
    expect(spatial.style.width).toBe('168px');
    expect(spatial.style.height).toBe('168px');
  });
});
