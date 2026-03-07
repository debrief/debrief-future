/**
 * Storybook stories for TimelineView component (#131).
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TimelineView } from './TimelineView';
import type { StacBrowserItem } from '../filter-engine/types';
import type { TemporalFilter } from './types';

const meta: Meta<typeof TimelineView> = {
  title: 'Browser/TimelineView',
  component: TimelineView,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '400px', background: 'var(--vscode-editor-background, #1e1e1e)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TimelineView>;

// ============================================================================
// Fixture data
// ============================================================================

function makeStacItem(overrides: Partial<StacBrowserItem> & { id: string }): StacBrowserItem {
  return {
    title: overrides.title ?? overrides.id,
    itemPath: `exercises/${overrides.id}/item.json`,
    bbox: null,
    datetime: null,
    startDatetime: null,
    endDatetime: null,
    vesselClasses: [],
    tags: [],
    featureTags: [],
    author: null,
    trackNames: [],
    nationalities: [],
    collection: null,
    ...overrides,
  };
}

const TEN_ITEMS: StacBrowserItem[] = [
  makeStacItem({ id: 'alpha', title: 'Exercise Alpha', startDatetime: '2022-03-15T08:00:00Z', endDatetime: '2022-03-17T18:00:00Z' }),
  makeStacItem({ id: 'bravo', title: 'Exercise Bravo', startDatetime: '2022-06-01T06:00:00Z', endDatetime: '2022-06-05T22:00:00Z' }),
  makeStacItem({ id: 'charlie', title: 'Patrol Charlie', startDatetime: '2023-01-10T00:00:00Z', endDatetime: '2023-01-12T12:00:00Z' }),
  makeStacItem({ id: 'delta', title: 'Exercise Delta', startDatetime: '2023-04-20T14:00:00Z', endDatetime: '2023-04-25T20:00:00Z' }),
  makeStacItem({ id: 'echo', title: 'Exercise Echo', startDatetime: '2023-08-05T10:00:00Z', endDatetime: '2023-08-06T10:00:00Z' }),
  makeStacItem({ id: 'foxtrot', title: 'Exercise Foxtrot', startDatetime: '2023-11-15T06:00:00Z', endDatetime: '2023-12-01T18:00:00Z' }),
  makeStacItem({ id: 'golf', title: 'Exercise Golf', startDatetime: '2024-02-01T00:00:00Z', endDatetime: '2024-02-28T23:59:00Z' }),
  makeStacItem({ id: 'hotel', title: 'Exercise Hotel', startDatetime: '2024-05-10T08:00:00Z', endDatetime: '2024-05-15T18:00:00Z' }),
  makeStacItem({ id: 'india', title: 'Exercise India', startDatetime: '2024-09-01T06:00:00Z', endDatetime: '2024-09-10T22:00:00Z' }),
  makeStacItem({ id: 'juliet', title: 'Exercise Juliet', startDatetime: '2025-01-15T00:00:00Z', endDatetime: '2025-02-15T00:00:00Z' }),
];

const MANY_ITEMS: StacBrowserItem[] = Array.from({ length: 100 }, (_, i) => {
  const year = 2020 + Math.floor(i / 12);
  const month = (i % 12) + 1;
  return makeStacItem({
    id: `ex-${i}`,
    title: `Exercise ${String(i).padStart(3, '0')}`,
    startDatetime: `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`,
    endDatetime: `${year}-${String(month).padStart(2, '0')}-${10 + (i % 15)}T00:00:00Z`,
  });
});

const MIXED_ITEMS: StacBrowserItem[] = [
  makeStacItem({ id: 'range-1', title: 'Full Range', startDatetime: '2024-01-01T00:00:00Z', endDatetime: '2024-06-30T00:00:00Z' }),
  makeStacItem({ id: 'point-1', title: 'Single Point', datetime: '2024-03-15T12:00:00Z' }),
  makeStacItem({ id: 'no-time', title: 'No Time Data' }),
  makeStacItem({ id: 'range-2', title: 'Short Range', startDatetime: '2024-04-01T08:00:00Z', endDatetime: '2024-04-01T20:00:00Z' }),
];

// ============================================================================
// Time period panel component for stories
// ============================================================================

function TimePeriodPanel({ filter }: { readonly filter: TemporalFilter | null }) {
  return (
    <div
      data-testid="time-period-panel"
      style={{
        padding: '8px 12px',
        fontSize: '12px',
        fontFamily: 'var(--vscode-font-family, monospace)',
        color: '#ccc',
        background: '#252526',
        borderTop: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span style={{ color: '#888', fontWeight: 500 }}>Visible range:</span>
      {filter ? (
        <span>
          {new Date(filter.start).toISOString().replace('T', ' ').slice(0, 19)}
          {' \u2013 '}
          {new Date(filter.end).toISOString().replace('T', ' ').slice(0, 19)}
        </span>
      ) : (
        <span style={{ color: '#666', fontStyle: 'italic' }}>Full extent (scroll to zoom, drag to pan)</span>
      )}
    </div>
  );
}

// ============================================================================
// Stories
// ============================================================================

/** Default: 10 exercises with varied temporal ranges across 2022–2025 */
export const Default: Story = {
  args: {
    items: TEN_ITEMS,
  },
};

/** Interactive story with zoom/pan and time period panel */
export const WithZoomPan: Story = {
  render: () => {
    const [filter, setFilter] = useState<TemporalFilter | null>(null);
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          <TimelineView
            items={TEN_ITEMS}
            onTemporalFilterChange={setFilter}
            onItemSelect={(path) => console.log('Selected:', path)}
          />
        </div>
        <TimePeriodPanel filter={filter} />
      </div>
    );
  },
};

/** Empty state: no exercises */
export const Empty: Story = {
  args: {
    items: [],
  },
};

/** Single-datetime items showing as point markers */
export const SingleDatetime: Story = {
  args: {
    items: [
      makeStacItem({ id: 'pt-1', title: 'Patrol Alpha', datetime: '2024-03-15T12:00:00Z' }),
      makeStacItem({ id: 'pt-2', title: 'Patrol Bravo', datetime: '2024-06-20T08:00:00Z' }),
      makeStacItem({ id: 'pt-3', title: 'Patrol Charlie', datetime: '2024-09-10T18:00:00Z' }),
    ],
  },
};

/** 100+ exercises for scroll testing (SC-003) */
export const ManyItems: Story = {
  args: {
    items: MANY_ITEMS,
  },
};

/** Mixed metadata: range, single datetime, no time data */
export const MixedMetadata: Story = {
  args: {
    items: MIXED_ITEMS,
  },
};

/** With colour scheme: bars coloured by index */
export const WithColourScheme: Story = {
  args: {
    items: TEN_ITEMS,
    colourFn: (item: StacBrowserItem) => {
      const colours = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2980b9', '#27ae60', '#c0392b'];
      const idx = TEN_ITEMS.findIndex(i => i.id === item.id);
      return colours[idx % colours.length] ?? null;
    },
  },
};
