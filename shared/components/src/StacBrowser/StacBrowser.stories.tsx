/**
 * StacBrowser Storybook stories.
 * Feature: 132-three-view-sync
 *
 * Demonstrates the synchronized three-view browser with filter bar,
 * exercise list, timeline, and map in a GoldenLayout container.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StacBrowser } from './StacBrowser';
import { ThemeProvider } from '../ThemeProvider';
import type { StacBrowserItem, VesselTaxonomyNode } from '../filter-engine/types';

// ─── Mock Data ────────────────────────────────────────────────────────────────

function makeItem(id: string, overrides: Partial<StacBrowserItem> = {}): StacBrowserItem {
  return {
    id,
    title: `Exercise ${id}`,
    itemPath: `/catalog/${id}/item.json`,
    bbox: null,
    datetime: null,
    startDatetime: '2025-01-01T00:00:00Z',
    endDatetime: '2025-01-15T00:00:00Z',
    vesselClasses: [],
    tags: [],
    featureTags: [],
    author: null,
    trackNames: [],
    nationalities: [],
    collection: null,
    modified: null,
    ...overrides,
  };
}

const MOCK_ITEMS: StacBrowserItem[] = [
  makeItem('ex-001', {
    title: 'North Atlantic Patrol',
    bbox: [-20, 50, -10, 60],
    startDatetime: '2025-01-01T00:00:00Z',
    endDatetime: '2025-01-15T00:00:00Z',
    vesselClasses: ['surface/warship/frigate/type23'],
    nationalities: ['British'],
    tags: ['asw', 'blue-water'],
    author: 'CDR Smith',
    trackNames: ['HMS Argyll', 'Contact Alpha'],
    collection: 'exercises-2025',
  }),
  makeItem('ex-002', {
    title: 'Mediterranean Carrier Strike',
    bbox: [10, 30, 30, 40],
    startDatetime: '2025-02-01T00:00:00Z',
    endDatetime: '2025-03-15T00:00:00Z',
    vesselClasses: ['surface/warship/destroyer/type45'],
    nationalities: ['French', 'British'],
    tags: ['carrier-ops', 'blue-water'],
    author: 'CDR Jones',
    trackNames: ['HMS Diamond', 'FS Aquitaine'],
    collection: 'exercises-2025',
  }),
  makeItem('ex-003', {
    title: 'Pacific Submarine Exercise',
    bbox: [140, 20, 160, 40],
    startDatetime: '2025-03-01T00:00:00Z',
    endDatetime: '2025-04-01T00:00:00Z',
    vesselClasses: ['submarine/nuclear/ssn'],
    nationalities: ['Japanese'],
    tags: ['asw'],
    author: 'CDR Tanaka',
    trackNames: ['JS Soryu'],
    collection: 'training-2025',
  }),
  makeItem('ex-004', {
    title: 'Baltic Surface Action',
    bbox: [15, 54, 25, 60],
    startDatetime: '2025-01-15T00:00:00Z',
    endDatetime: '2025-02-15T00:00:00Z',
    vesselClasses: ['surface/warship/frigate/type26'],
    nationalities: ['German'],
    tags: ['surface-action'],
    author: 'CDR Mueller',
    trackNames: ['FGS Sachsen'],
    collection: 'exercises-2025',
  }),
  makeItem('ex-005', {
    title: 'Exercise Without Bbox',
    bbox: null,
    startDatetime: '2025-01-10T00:00:00Z',
    endDatetime: '2025-01-20T00:00:00Z',
    nationalities: ['British'],
    tags: ['tabletop'],
    author: 'CDR Williams',
  }),
  makeItem('ex-006', {
    title: 'Exercise Without Time',
    bbox: [-5, 50, 5, 55],
    datetime: null,
    startDatetime: null,
    endDatetime: null,
    nationalities: ['French'],
    tags: ['historical'],
  }),
];

const MOCK_TAXONOMY: VesselTaxonomyNode[] = [
  {
    id: 'surface',
    label: 'Surface',
    children: [
      {
        id: 'warship',
        label: 'Warship',
        children: [
          {
            id: 'frigate',
            label: 'Frigate',
            children: [
              { id: 'type23', label: 'Type 23' },
              { id: 'type26', label: 'Type 26' },
            ],
          },
          {
            id: 'destroyer',
            label: 'Destroyer',
            children: [{ id: 'type45', label: 'Type 45' }],
          },
        ],
      },
    ],
  },
  {
    id: 'submarine',
    label: 'Submarine',
    children: [
      {
        id: 'nuclear',
        label: 'Nuclear',
        children: [
          { id: 'ssn', label: 'SSN' },
          { id: 'ssbn', label: 'SSBN' },
        ],
      },
    ],
  },
];

// ─── Storybook Meta ──────────────────────────────────────────────────────────

const meta: Meta<typeof StacBrowser> = {
  title: 'Browser/StacBrowser',
  component: StacBrowser,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ height: '100vh', width: '100%' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof StacBrowser>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** Default view with all exercises and no filters active. */
export const Default: Story = {
  args: {
    items: MOCK_ITEMS,
    taxonomy: MOCK_TAXONOMY,
    onItemSelect: (itemPath: string) => console.log('Selected:', itemPath),
  },
};

/** View with zero exercises — demonstrates empty state handling. */
export const ZeroResults: Story = {
  args: {
    items: [],
    taxonomy: MOCK_TAXONOMY,
    onItemSelect: (itemPath: string) => console.log('Selected:', itemPath),
  },
};

/** View with many exercises for scroll/performance testing. */
export const ManyExercises: Story = {
  args: {
    items: Array.from({ length: 50 }, (_, i) =>
      makeItem(`ex-${String(i + 1).padStart(3, '0')}`, {
        title: `Exercise ${i + 1}`,
        bbox: [-180 + (i * 7) % 360, -60 + (i * 3) % 120, -170 + (i * 7) % 360, -50 + (i * 3) % 120],
        startDatetime: new Date(2024, 0, 1 + i * 7).toISOString(),
        endDatetime: new Date(2024, 0, 8 + i * 7).toISOString(),
        vesselClasses: i % 3 === 0 ? ['submarine/nuclear/ssn'] : ['surface/warship/frigate/type23'],
        nationalities: ['British', 'French', 'German', 'Japanese'][i % 4] ? [['British', 'French', 'German', 'Japanese'][i % 4]!] : [],
      }),
    ),
    taxonomy: MOCK_TAXONOMY,
  },
};
