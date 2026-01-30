/**
 * Storybook stories for CatalogOverview component.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CatalogOverview } from './CatalogOverview';
import type { CatalogOverviewItem } from './types';

const meta: Meta<typeof CatalogOverview> = {
  title: 'Components/CatalogOverview',
  component: CatalogOverview,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '600px', background: '#1e1e1e' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CatalogOverview>;

// ============================================================================
// Fixture data
// ============================================================================

const FIXTURE_ITEMS: CatalogOverviewItem[] = [
  {
    id: 'exercise-alpha',
    title: 'Exercise Alpha',
    itemPath: 'exercises/alpha/item.json',
    bbox: [-5.5, 49.5, 1.5, 52.0],
    datetime: '2024-03-15T08:00:00Z',
    startDatetime: '2024-03-15T08:00:00Z',
    endDatetime: '2024-03-17T18:00:00Z',
  },
  {
    id: 'exercise-bravo',
    title: 'Exercise Bravo',
    itemPath: 'exercises/bravo/item.json',
    bbox: [-10.0, 47.0, -3.0, 50.5],
    datetime: '2024-04-01T06:00:00Z',
    startDatetime: '2024-04-01T06:00:00Z',
    endDatetime: '2024-04-05T22:00:00Z',
  },
  {
    id: 'patrol-charlie',
    title: 'Patrol Charlie',
    itemPath: 'patrols/charlie/item.json',
    bbox: [2.0, 50.0, 8.0, 54.0],
    datetime: '2024-03-20T00:00:00Z',
    startDatetime: '2024-03-20T00:00:00Z',
    endDatetime: '2024-03-25T12:00:00Z',
  },
];

const ITEMS_NO_BBOX: CatalogOverviewItem[] = [
  {
    id: 'item-no-bbox',
    title: 'No Bbox Item',
    itemPath: 'items/no-bbox/item.json',
    bbox: null,
    datetime: '2024-05-01T12:00:00Z',
    startDatetime: '2024-05-01T12:00:00Z',
    endDatetime: '2024-05-02T12:00:00Z',
  },
  ...FIXTURE_ITEMS.slice(0, 1),
];

const ITEMS_NO_TIME: CatalogOverviewItem[] = [
  {
    id: 'item-no-time',
    title: 'No Time Item',
    itemPath: 'items/no-time/item.json',
    bbox: [-3.0, 50.0, 0.0, 52.0],
    datetime: null,
    startDatetime: null,
    endDatetime: null,
  },
  ...FIXTURE_ITEMS.slice(0, 1),
];

const SINGLE_ITEM: CatalogOverviewItem[] = [
  {
    id: 'single-item',
    title: 'Single Exercise',
    itemPath: 'exercises/single/item.json',
    bbox: [-2.0, 50.5, 1.0, 52.0],
    datetime: '2024-06-01T08:00:00Z',
    startDatetime: '2024-06-01T08:00:00Z',
    endDatetime: '2024-06-01T08:00:00Z',
  },
];

const MANY_ITEMS: CatalogOverviewItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: `item-${i}`,
  title: `Exercise ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) || ''}`,
  itemPath: `exercises/item-${i}/item.json`,
  bbox: [
    -10 + (i % 5) * 4,
    45 + (i % 4) * 2,
    -10 + (i % 5) * 4 + 3,
    45 + (i % 4) * 2 + 2,
  ] as [number, number, number, number],
  datetime: new Date(2024, 0, 1 + i * 7).toISOString(),
  startDatetime: new Date(2024, 0, 1 + i * 7).toISOString(),
  endDatetime: new Date(2024, 0, 1 + i * 7 + 5).toISOString(),
}));

const OVERLAPPING_ITEMS: CatalogOverviewItem[] = [
  {
    id: 'overlap-1',
    title: 'Overlap A',
    itemPath: 'items/overlap-1/item.json',
    bbox: [-5, 50, 0, 52],
    datetime: '2024-01-01T00:00:00Z',
    startDatetime: '2024-01-01T00:00:00Z',
    endDatetime: '2024-01-20T00:00:00Z',
  },
  {
    id: 'overlap-2',
    title: 'Overlap B',
    itemPath: 'items/overlap-2/item.json',
    bbox: [-3, 49, 2, 51],
    datetime: '2024-01-10T00:00:00Z',
    startDatetime: '2024-01-10T00:00:00Z',
    endDatetime: '2024-01-30T00:00:00Z',
  },
  {
    id: 'overlap-3',
    title: 'Overlap C',
    itemPath: 'items/overlap-3/item.json',
    bbox: [-1, 51, 4, 53],
    datetime: '2024-01-15T00:00:00Z',
    startDatetime: '2024-01-15T00:00:00Z',
    endDatetime: '2024-02-10T00:00:00Z',
  },
];

// ============================================================================
// Stories
// ============================================================================

/** Default view with multiple items */
export const Default: Story = {
  render: () => (
    <CatalogOverview
      items={FIXTURE_ITEMS}
      onItemSelect={(path) => console.log('Selected:', path)}
    />
  ),
};

/** Empty catalog — no items */
export const EmptyCatalog: Story = {
  render: () => (
    <CatalogOverview items={[]} onItemSelect={console.log} />
  ),
};

/** Some items missing bbox — only items with bbox appear on map */
export const MissingBbox: Story = {
  render: () => (
    <CatalogOverview
      items={ITEMS_NO_BBOX}
      onItemSelect={(path) => console.log('Selected:', path)}
    />
  ),
};

/** Items missing temporal metadata — "no time data" shown on timeline */
export const MissingTime: Story = {
  render: () => (
    <CatalogOverview
      items={ITEMS_NO_TIME}
      onItemSelect={(path) => console.log('Selected:', path)}
    />
  ),
};

/** Single item */
export const SingleItem: Story = {
  render: () => (
    <CatalogOverview
      items={SINGLE_ITEM}
      onItemSelect={(path) => console.log('Selected:', path)}
    />
  ),
};

/** Many items — performance test */
export const ManyItems: Story = {
  render: () => (
    <CatalogOverview
      items={MANY_ITEMS}
      onItemSelect={(path) => console.log('Selected:', path)}
    />
  ),
};

/** Overlapping time ranges */
export const OverlappingRanges: Story = {
  render: () => (
    <CatalogOverview
      items={OVERLAPPING_ITEMS}
      onItemSelect={(path) => console.log('Selected:', path)}
    />
  ),
};

/** Mixed metadata — some items have all data, some miss bbox, some miss time */
export const MixedMetadata: Story = {
  render: () => (
    <CatalogOverview
      items={[...FIXTURE_ITEMS, ...ITEMS_NO_BBOX.slice(0, 1), ...ITEMS_NO_TIME.slice(0, 1)]}
      onItemSelect={(path) => console.log('Selected:', path)}
    />
  ),
};

/** Resizable drag bar demo with controlled state */
export const ResizableDemo: Story = {
  render: () => {
    const [ratio, setRatio] = useState(0.6);
    return (
      <CatalogOverview
        items={FIXTURE_ITEMS}
        onItemSelect={(path) => console.log('Selected:', path)}
        initialSplitRatio={ratio}
        onSplitRatioChange={setRatio}
      />
    );
  },
};

/** Light theme */
export const LightTheme: Story = {
  decorators: [
    (Story) => (
      <div
        style={{
          width: '100%',
          height: '600px',
          background: '#ffffff',
          '--vscode-editor-background': '#ffffff',
          '--vscode-editor-foreground': '#333333',
          '--vscode-focusBorder': '#0066cc',
          '--vscode-charts-blue': '#0066cc',
          '--vscode-charts-yellow': '#cc8800',
          '--vscode-panel-border': '#cccccc',
          '--vscode-editorHoverWidget-background': '#f5f5f5',
          '--vscode-editorHoverWidget-foreground': '#333333',
          '--vscode-sash-hoverBorder': '#0066cc',
        } as React.CSSProperties}
      >
        <Story />
      </div>
    ),
  ],
  render: () => (
    <CatalogOverview
      items={FIXTURE_ITEMS}
      onItemSelect={(path) => console.log('Selected:', path)}
    />
  ),
};

/** Dark theme (default VS Code) */
export const DarkTheme: Story = {
  render: () => (
    <CatalogOverview
      items={FIXTURE_ITEMS}
      onItemSelect={(path) => console.log('Selected:', path)}
    />
  ),
};
