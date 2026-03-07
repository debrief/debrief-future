/**
 * Storybook stories for ExerciseListView component (#129).
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ExerciseListView } from './ExerciseListView';
import type { ExerciseListItem, RecentlyOpenedEntry, GeoJSONFeatureCollection } from './types';
import {
  MOCK_100_ITEMS,
  MOCK_5_ITEMS,
  MOCK_RECENT_ITEMS,
  createMockTrackData,
} from './__fixtures__/mockData';

const meta: Meta<typeof ExerciseListView> = {
  title: 'Components/ExerciseListView',
  component: ExerciseListView,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '400px', height: '700px', background: 'var(--vscode-editor-background, #1e1e1e)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ExerciseListView>;

/** Handler that logs the selected item path. */
const handleSelect = (path: string): void => {
  console.log('Selected:', path);
};

/** Wrapper that simulates lazy GeoJSON loading with synthetic data. */
function WithTrackData({
  items,
  recentItems,
  initialSort,
}: {
  items: readonly ExerciseListItem[];
  recentItems?: readonly RecentlyOpenedEntry[];
  initialSort?: { dimension: 'recency' | 'title' | 'duration'; direction: 'asc' | 'desc' };
}) {
  const [trackDataMap, setTrackDataMap] = useState<Map<string, GeoJSONFeatureCollection>>(new Map());
  const pendingRef = useRef(new Set<string>());

  const handleRequestTrackData = useCallback((itemId: string, _href: string) => {
    if (pendingRef.current.has(itemId)) return;
    pendingRef.current.add(itemId);

    // Simulate async load
    const item = items.find(i => i.id === itemId);
    if (!item?.bbox) return;

    setTimeout(() => {
      const data = createMockTrackData(item.bbox!, Math.floor(Math.random() * 3) + 1);
      setTrackDataMap(prev => new Map(prev).set(itemId, data));
    }, 100 + Math.random() * 200);
  }, [items]);

  return (
    <ExerciseListView
      items={items}
      recentItems={recentItems}
      onItemSelect={handleSelect}
      onRequestTrackData={handleRequestTrackData}
      trackData={trackDataMap}
      initialSort={initialSort}
    />
  );
}

/** Default view with 100 items and lazy-loaded track thumbnails */
export const Default: Story = {
  render: () => <WithTrackData items={MOCK_100_ITEMS} />,
};

/** List with recently opened exercises at the top */
export const WithRecentItems: Story = {
  render: () => (
    <WithTrackData items={MOCK_100_ITEMS} recentItems={MOCK_RECENT_ITEMS} />
  ),
};

/** Empty state — no exercises in the store */
export const EmptyState: Story = {
  render: () => (
    <ExerciseListView items={[]} onItemSelect={handleSelect} />
  ),
};

/** No matches — would be shown when filters exclude all items */
export const NoMatches: Story = {
  render: () => (
    <ExerciseListView items={[]} onItemSelect={handleSelect} />
  ),
};

/** Sorted alphabetically by title */
export const SortByTitle: Story = {
  render: () => (
    <WithTrackData
      items={MOCK_100_ITEMS}
      initialSort={{ dimension: 'title', direction: 'asc' }}
    />
  ),
};

/** Sorted by duration (longest first) */
export const SortByDuration: Story = {
  render: () => (
    <WithTrackData
      items={MOCK_100_ITEMS}
      initialSort={{ dimension: 'duration', direction: 'desc' }}
    />
  ),
};

/** Short list with only 5 items */
export const FewItems: Story = {
  render: () => <WithTrackData items={MOCK_5_ITEMS} />,
};

/** Light theme variant */
export const LightTheme: Story = {
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '700px',
          background: '#ffffff',
          // @ts-expect-error CSS custom properties
          '--vscode-editor-background': '#ffffff',
          '--vscode-editor-foreground': '#333333',
          '--vscode-focusBorder': '#0066cc',
          '--vscode-list-hoverBackground': '#f0f0f0',
          '--vscode-list-activeSelectionBackground': '#ddeeff',
          '--vscode-panel-border': '#e0e0e0',
          '--vscode-descriptionForeground': '#666666',
          '--vscode-badge-background': '#e0e0e0',
          '--vscode-badge-foreground': '#333333',
          '--vscode-editorWidget-background': '#f5f5f5',
          '--vscode-charts-blue': '#0066cc',
          '--vscode-charts-red': '#cc0000',
          '--vscode-charts-green': '#009900',
          '--vscode-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          '--vscode-font-size': '13px',
        } as React.CSSProperties}
      >
        <Story />
      </div>
    ),
  ],
  render: () => (
    <WithTrackData items={MOCK_100_ITEMS} recentItems={MOCK_RECENT_ITEMS} />
  ),
};
