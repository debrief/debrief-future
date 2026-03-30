import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThumbnailPreview } from '../ThumbnailPreview';
import type { CatalogOverviewItem } from '../../filter-engine/types';

function makeItem(id: string, title: string, thumbnailHref?: string): CatalogOverviewItem {
  return {
    id,
    title,
    itemPath: `./${id}/item.json`,
    bbox: [-4, 50, -3, 51],
    datetime: '2024-01-01T00:00:00Z',
    startDatetime: null,
    endDatetime: null,
    thumbnailHref: thumbnailHref ?? null,
    thumbnailSmHref: null,
  };
}

describe('ThumbnailPreview', () => {
  it('shows empty state when no item selected', () => {
    render(<ThumbnailPreview item={null} items={[]} />);
    expect(screen.getByText('Select a plot to preview')).toBeTruthy();
  });

  it('renders thumbnail image when item has thumbnailHref', () => {
    const item = makeItem('a', 'Alpha', '/path/to/thumbnail.png');
    render(<ThumbnailPreview item={item} items={[item]} />);
    const img = screen.getByTestId('thumbnail-preview-image') as HTMLImageElement;
    expect(img.src).toContain('/path/to/thumbnail.png');
  });

  it('renders fallback when item has no thumbnailHref', () => {
    const item = makeItem('a', 'Alpha');
    render(<ThumbnailPreview item={item} items={[item]} />);
    expect(screen.getByTestId('thumbnail-preview-fallback')).toBeTruthy();
  });

  it('shows the item title', () => {
    const item = makeItem('a', 'My Exercise');
    render(<ThumbnailPreview item={item} items={[item]} />);
    expect(screen.getByTestId('thumbnail-preview-title').textContent).toBe('My Exercise');
  });

  it('navigates to next item on next button click', () => {
    const items = [makeItem('a', 'A'), makeItem('b', 'B'), makeItem('c', 'C')];
    const onNavigate = vi.fn();
    render(<ThumbnailPreview item={items[0]} items={items} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByTestId('thumbnail-preview-next'));
    expect(onNavigate).toHaveBeenCalledWith('b');
  });

  it('navigates to previous item on prev button click', () => {
    const items = [makeItem('a', 'A'), makeItem('b', 'B'), makeItem('c', 'C')];
    const onNavigate = vi.fn();
    render(<ThumbnailPreview item={items[1]} items={items} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByTestId('thumbnail-preview-prev'));
    expect(onNavigate).toHaveBeenCalledWith('a');
  });

  it('disables prev button at first item', () => {
    const items = [makeItem('a', 'A'), makeItem('b', 'B')];
    render(<ThumbnailPreview item={items[0]} items={items} />);
    expect((screen.getByTestId('thumbnail-preview-prev') as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables next button at last item', () => {
    const items = [makeItem('a', 'A'), makeItem('b', 'B')];
    render(<ThumbnailPreview item={items[1]} items={items} />);
    expect((screen.getByTestId('thumbnail-preview-next') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows counter as "1 / 3" for first of three items', () => {
    const items = [makeItem('a', 'A'), makeItem('b', 'B'), makeItem('c', 'C')];
    render(<ThumbnailPreview item={items[0]} items={items} />);
    expect(screen.getByText('1 / 3')).toBeTruthy();
  });

  it('navigates via keyboard arrow keys', () => {
    const items = [makeItem('a', 'A'), makeItem('b', 'B'), makeItem('c', 'C')];
    const onNavigate = vi.fn();
    render(<ThumbnailPreview item={items[1]} items={items} onNavigate={onNavigate} />);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onNavigate).toHaveBeenCalledWith('c');

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onNavigate).toHaveBeenCalledWith('a');
  });

  it('fires onOpen on double-click', () => {
    const item = makeItem('a', 'Alpha');
    const onOpen = vi.fn();
    render(<ThumbnailPreview item={item} items={[item]} onOpen={onOpen} />);

    fireEvent.doubleClick(screen.getByTestId('thumbnail-preview'));
    expect(onOpen).toHaveBeenCalledWith('./a/item.json');
  });
});
