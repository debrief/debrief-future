import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { ExerciseListView } from './ExerciseListView';
import type { ExerciseListItem, RecentlyOpenedEntry } from './types';

// ── Mock Data ──────────────────────────────────────────────────────

function makeItem(overrides: Partial<ExerciseListItem> = {}): ExerciseListItem {
  return {
    id: 'item-1',
    title: 'Exercise Alpha',
    itemPath: 'exercises/alpha/item.json',
    bbox: [-5, 49, 2, 52] as [number, number, number, number],
    datetime: '2024-03-15T08:00:00Z',
    startDatetime: '2024-03-15T08:00:00Z',
    endDatetime: '2024-03-17T18:00:00Z',
    vesselClasses: ['Destroyer'],
    tags: ['training'],
    author: 'Jane Smith',
    nationalities: ['GB'],
    trackNames: ['HMS Defender'],
    trackDataHref: 'exercises/alpha/data.geojson',
    ...overrides,
  };
}

function makeItems(count: number): ExerciseListItem[] {
  return Array.from({ length: count }, (_, i) =>
    makeItem({
      id: `item-${i}`,
      title: `Exercise ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? i.toString() : ''}`,
      itemPath: `exercises/item-${i}/item.json`,
      startDatetime: new Date(2024, 0, 1 + i).toISOString(),
      endDatetime: new Date(2024, 0, 2 + i * 2).toISOString(),
    }),
  );
}

function makeRecentItems(count: number): RecentlyOpenedEntry[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    plotId: `recent-${i}`,
    title: `Recent Exercise ${i + 1}`,
    storeId: 'default-store',
    lastOpened: new Date(now - (i + 1) * 3_600_000).toISOString(),
    uri: `debrief://store/default-store/exercises/recent-${i}/item.json`,
  }));
}

// ── Vitest Mocking ─────────────────────────────────────────────────

// Mock useVirtualizer to render all items in test
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        index: i,
        start: i * estimateSize(),
        size: estimateSize(),
      })),
    getTotalSize: () => count * estimateSize(),
  }),
}));

// ── Tests ──────────────────────────────────────────────────────────

describe('ExerciseListView', () => {
  // ── US1: Browse exercises in scrollable list ──

  describe('US1: Scrollable Exercise List', () => {
    it('T011: renders all items with virtualisation', () => {
      const items = makeItems(10);
      render(<ExerciseListView items={items} />);
      const rows = screen.getAllByTestId('exercise-list-item-row');
      expect(rows).toHaveLength(10);
    });

    it('T012: displays title, metadata summary, date, thumbnail for each item', () => {
      const item = makeItem({
        vesselClasses: ['Destroyer', 'Submarine'],
        tags: ['training'],
        author: 'Jane Smith',
      });
      render(<ExerciseListView items={[item]} />);

      expect(screen.getByTestId('exercise-item-title')).toHaveTextContent('Exercise Alpha');
      expect(screen.getByTestId('exercise-item-date')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-item-meta')).toHaveTextContent('Destroyer');
      expect(screen.getByTestId('exercise-item-meta')).toHaveTextContent('Jane Smith');
      expect(screen.getByTestId('spatial-thumbnail')).toBeInTheDocument();
    });

    it('T013: truncates metadata with "+N more" for long arrays', () => {
      const item = makeItem({
        vesselClasses: ['Frigate', 'Destroyer', 'Submarine', 'Carrier', 'Cruiser'],
      });
      render(<ExerciseListView items={[item]} />);

      const meta = screen.getByTestId('exercise-item-meta');
      expect(meta).toHaveTextContent('+2 more');
    });

    it('T014: truncates long title with aria-label for accessibility', () => {
      const longTitle = 'A Very Long Exercise Title That Should Be Truncated In The Display';
      const item = makeItem({ title: longTitle });
      render(<ExerciseListView items={[item]} />);

      const row = screen.getByTestId('exercise-list-item-row');
      expect(row).toHaveAttribute('aria-label', longTitle);
      const title = screen.getByTestId('exercise-item-title');
      expect(title).toHaveAttribute('title', longTitle);
    });

    it('T015: shows empty state when no items', () => {
      render(<ExerciseListView items={[]} />);
      expect(screen.getByText('No exercises found')).toBeInTheDocument();
      expect(screen.getByText(/Adjust your filters/)).toBeInTheDocument();
    });
  });

  // ── US2: Continue Recent Work ──

  describe('US2: Recently Opened Section', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('T022: renders recently opened section at top with relative timestamps', () => {
      const items = makeItems(5);
      const recentItems = makeRecentItems(3);
      render(<ExerciseListView items={items} recentItems={recentItems} />);

      const section = screen.getByTestId('recent-section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveTextContent('Recently Opened');

      const recentEntries = within(section).getAllByTestId('recent-item');
      expect(recentEntries).toHaveLength(3);
    });

    it('T023: hides recently opened section when no recent items', () => {
      const items = makeItems(5);
      render(<ExerciseListView items={items} recentItems={[]} />);
      expect(screen.queryByTestId('recent-section')).not.toBeInTheDocument();
    });

    it('T024: clicking recent item calls onItemSelect with URI', () => {
      const items = makeItems(5);
      const recentItems = makeRecentItems(2);
      const onItemSelect = vi.fn();
      render(
        <ExerciseListView
          items={items}
          recentItems={recentItems}
          onItemSelect={onItemSelect}
        />,
      );

      const firstRecent = screen.getAllByTestId('recent-item')[0];
      fireEvent.click(firstRecent);
      expect(onItemSelect).toHaveBeenCalledWith(recentItems[0].uri);
    });

    it('T025: recent items render independently of main exercise list (stale items)', () => {
      const items = makeItems(3);
      // Recent items reference exercises NOT in the main list
      const staleRecent: RecentlyOpenedEntry[] = [
        {
          plotId: 'deleted-exercise',
          title: 'Deleted Exercise',
          storeId: 'default-store',
          lastOpened: new Date('2024-06-15T10:00:00Z').toISOString(),
          uri: 'debrief://store/default-store/exercises/deleted/item.json',
        },
      ];
      render(<ExerciseListView items={items} recentItems={staleRecent} />);

      const section = screen.getByTestId('recent-section');
      expect(within(section).getByText('Deleted Exercise')).toBeInTheDocument();
    });
  });

  // ── US3: Sort Exercises ──

  describe('US3: Sort Exercises', () => {
    it('T028: sorts by recency (date descending) by default', () => {
      const items = [
        makeItem({ id: 'old', title: 'Old', startDatetime: '2024-01-01T00:00:00Z' }),
        makeItem({ id: 'new', title: 'New', startDatetime: '2024-06-01T00:00:00Z' }),
      ];
      render(<ExerciseListView items={items} />);

      const rows = screen.getAllByTestId('exercise-item-title');
      expect(rows[0]).toHaveTextContent('New');
      expect(rows[1]).toHaveTextContent('Old');
    });

    it('T029: sorts by title alphabetically when selected', () => {
      const items = [
        makeItem({ id: 'b', title: 'Bravo Exercise' }),
        makeItem({ id: 'a', title: 'Alpha Exercise' }),
      ];
      render(
        <ExerciseListView
          items={items}
          initialSort={{ dimension: 'title', direction: 'asc' }}
        />,
      );

      const rows = screen.getAllByTestId('exercise-item-title');
      expect(rows[0]).toHaveTextContent('Alpha');
      expect(rows[1]).toHaveTextContent('Bravo');
    });

    it('T030: sorts by duration (longest first) when selected', () => {
      const items = [
        makeItem({
          id: 'short',
          title: 'Short',
          startDatetime: '2024-01-01T00:00:00Z',
          endDatetime: '2024-01-01T01:00:00Z', // 1 hour
        }),
        makeItem({
          id: 'long',
          title: 'Long',
          startDatetime: '2024-01-01T00:00:00Z',
          endDatetime: '2024-01-10T00:00:00Z', // 9 days
        }),
      ];
      render(
        <ExerciseListView
          items={items}
          initialSort={{ dimension: 'duration', direction: 'desc' }}
        />,
      );

      const rows = screen.getAllByTestId('exercise-item-title');
      expect(rows[0]).toHaveTextContent('Long');
      expect(rows[1]).toHaveTextContent('Short');
    });

    it('T031: clicking same sort toggles direction', () => {
      const items = [
        makeItem({ id: 'a', title: 'Alpha', startDatetime: '2024-01-01T00:00:00Z' }),
        makeItem({ id: 'b', title: 'Bravo', startDatetime: '2024-06-01T00:00:00Z' }),
      ];
      render(<ExerciseListView items={items} />);

      // Default: recency desc (Bravo first)
      let rows = screen.getAllByTestId('exercise-item-title');
      expect(rows[0]).toHaveTextContent('Bravo');

      // Click recency again → asc (Alpha first)
      fireEvent.click(screen.getByTestId('sort-btn-recency'));
      rows = screen.getAllByTestId('exercise-item-title');
      expect(rows[0]).toHaveTextContent('Alpha');
    });

    it('T032: null dates/durations sort to end', () => {
      const items = [
        makeItem({
          id: 'no-date',
          title: 'No Date',
          startDatetime: null,
          endDatetime: null,
          datetime: null,
        }),
        makeItem({
          id: 'with-date',
          title: 'With Date',
          startDatetime: '2024-06-01T00:00:00Z',
          endDatetime: '2024-06-02T00:00:00Z',
        }),
      ];
      render(<ExerciseListView items={items} />);

      const rows = screen.getAllByTestId('exercise-item-title');
      expect(rows[0]).toHaveTextContent('With Date');
      expect(rows[1]).toHaveTextContent('No Date');
    });
  });

  // ── US4: Select Exercise to Open ──

  describe('US4: Select Exercise', () => {
    it('T035: clicking exercise row calls onItemSelect with itemPath', () => {
      const onItemSelect = vi.fn();
      const items = [makeItem()];
      render(<ExerciseListView items={items} onItemSelect={onItemSelect} />);

      fireEvent.click(screen.getByTestId('exercise-list-item-row'));
      expect(onItemSelect).toHaveBeenCalledWith('exercises/alpha/item.json');
    });

    it('T036: list retains sort state after item selection', () => {
      const onItemSelect = vi.fn();
      const items = [
        makeItem({ id: 'a', title: 'Alpha' }),
        makeItem({ id: 'b', title: 'Bravo' }),
      ];
      render(
        <ExerciseListView
          items={items}
          onItemSelect={onItemSelect}
          initialSort={{ dimension: 'title', direction: 'asc' }}
        />,
      );

      // Verify sort order
      let rows = screen.getAllByTestId('exercise-item-title');
      expect(rows[0]).toHaveTextContent('Alpha');

      // Click first item
      fireEvent.click(screen.getAllByTestId('exercise-list-item-row')[0]);
      expect(onItemSelect).toHaveBeenCalled();

      // Sort order preserved
      rows = screen.getAllByTestId('exercise-item-title');
      expect(rows[0]).toHaveTextContent('Alpha');
    });
  });

  // ── Thumbnail Size ──

  describe('Thumbnail Size', () => {
    it('uses default row height of 80px for small thumbnails', () => {
      const items = makeItems(3);
      const { container } = render(<ExerciseListView items={items} />);
      const content = container.querySelector('.exercise-list-view__content') as HTMLElement;
      // 3 items * 80px = 240px
      expect(content.style.height).toBe('240px');
    });

    it('uses taller rows for medium thumbnails', () => {
      const items = makeItems(3);
      const { container } = render(<ExerciseListView items={items} thumbnailSize="medium" />);
      const content = container.querySelector('.exercise-list-view__content') as HTMLElement;
      // 3 items * 105px = 315px
      expect(content.style.height).toBe('315px');
    });

    it('uses tallest rows for large thumbnails', () => {
      const items = makeItems(3);
      const { container } = render(<ExerciseListView items={items} thumbnailSize="large" />);
      const content = container.querySelector('.exercise-list-view__content') as HTMLElement;
      // 3 items * 135px = 405px
      expect(content.style.height).toBe('405px');
    });
  });

  // ── Lazy GeoJSON Loading ──

  describe('Lazy GeoJSON Loading', () => {
    it('T021: requests track data for visible items', () => {
      const onRequestTrackData = vi.fn();
      const items = [makeItem()];
      render(
        <ExerciseListView
          items={items}
          onRequestTrackData={onRequestTrackData}
        />,
      );

      expect(onRequestTrackData).toHaveBeenCalledWith('item-1', 'exercises/alpha/data.geojson');
    });
  });
});
