import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThumbnailPreview } from '../ThumbnailPreview';
import type { CatalogOverviewItem } from '../../filter-engine/types';

function makeItem(id: string, title: string, overviewHref?: string): CatalogOverviewItem {
  return {
    id,
    title,
    itemPath: `./${id}/item.json`,
    bbox: [-4, 50, -3, 51],
    datetime: '2024-01-01T00:00:00Z',
    startDatetime: null,
    endDatetime: null,
    // spec 241: ThumbnailPreview prefers overviewHref (800x600) for the
    // preview pane and only falls back to thumbnailHref when overview is
    // missing.
    thumbnailHref: null,
    overviewHref: overviewHref ?? null,
  };
}

describe('ThumbnailPreview', () => {
  it('shows empty state when no item selected', () => {
    render(<ThumbnailPreview item={null} items={[]} />);
    expect(screen.getByText('Select a plot to preview')).toBeTruthy();
  });

  it('renders overview image when item has overviewHref', () => {
    const item = makeItem('a', 'Alpha', '/path/to/overview.png');
    render(<ThumbnailPreview item={item} items={[item]} />);
    const img = screen.getByTestId('thumbnail-preview-image') as HTMLImageElement;
    expect(img.src).toContain('/path/to/overview.png');
  });

  it('renders fallback when item has no overviewHref or thumbnailHref', () => {
    const item = makeItem('a', 'Alpha');
    render(<ThumbnailPreview item={item} items={[item]} />);
    expect(screen.getByTestId('thumbnail-preview-fallback')).toBeTruthy();
  });

  it('falls back to small thumbnailHref when overview is missing', () => {
    const item: CatalogOverviewItem = {
      ...makeItem('b', 'Bravo'),
      thumbnailHref: '/path/to/small.png',
      overviewHref: null,
    };
    render(<ThumbnailPreview item={item} items={[item]} />);
    const img = screen.getByTestId('thumbnail-preview-image') as HTMLImageElement;
    expect(img.src).toContain('/path/to/small.png');
  });

  it('fires onOpen on double-click', () => {
    const item = makeItem('a', 'Alpha');
    const onOpen = vi.fn();
    render(<ThumbnailPreview item={item} items={[item]} onOpen={onOpen} />);

    fireEvent.doubleClick(screen.getByTestId('thumbnail-preview'));
    expect(onOpen).toHaveBeenCalledWith('./a/item.json');
  });
});
