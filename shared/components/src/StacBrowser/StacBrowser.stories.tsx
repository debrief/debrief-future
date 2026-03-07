/**
 * Storybook stories for StacBrowser component (#132).
 * Tasks: T057, T086
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '../ThemeProvider';
import { StacBrowser } from './StacBrowser';
import type { StacBrowserItem, VesselTaxonomyNode } from '../filter-engine/types';

// --- Mock Data ---

function makeItem(id: string, overrides: Partial<StacBrowserItem> = {}): StacBrowserItem {
  return {
    id,
    title: `Exercise ${id}`,
    itemPath: `/catalog/${id}/item.json`,
    bbox: null,
    datetime: null,
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-01T12:00:00Z',
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
    title: 'CASEX Alpha',
    nationalities: ['French'],
    tags: ['convoy', 'blue-water'],
    vesselClasses: ['surface/warship/frigate/type23'],
    author: 'CDR Smith',
    bbox: [-5, 48, 2, 52],
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-01T04:00:00Z',
  }),
  makeItem('ex-002', {
    title: 'CASEX Bravo',
    nationalities: ['British'],
    tags: ['asw', 'shallow-water'],
    vesselClasses: ['surface/warship/destroyer/type45'],
    author: 'CDR Jones',
    bbox: [-10, 50, -5, 55],
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-02T12:00:00Z',
  }),
  makeItem('ex-003', {
    title: 'GROUPEX Charlie',
    nationalities: ['French', 'British'],
    tags: ['convoy', 'asw'],
    vesselClasses: ['surface/warship/frigate/type23', 'surface/warship/destroyer/type45'],
    author: 'CDR Smith',
    bbox: [0, 45, 10, 50],
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-04T00:00:00Z',
  }),
  makeItem('ex-004', {
    title: 'TACEX Delta',
    nationalities: ['German'],
    tags: ['surface-action'],
    vesselClasses: ['surface/warship/frigate/type26'],
    author: 'CDR Mueller',
    bbox: [15, 55, 25, 60],
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-15T00:00:00Z',
  }),
  makeItem('ex-005', {
    title: 'ASW Exercise Echo',
    nationalities: ['French'],
    tags: ['asw'],
    vesselClasses: ['submarine/nuclear/ssn'],
    author: 'CDR Dupont',
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-01T02:00:00Z',
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
            children: [
              { id: 'type45', label: 'Type 45' },
            ],
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

// --- Storybook Meta ---

const meta: Meta<typeof StacBrowser> = {
  title: 'StacBrowser',
  component: StacBrowser,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Three-view synchronized browser: FilterBar + ExerciseList + MapView + TimelineView with shared filter state across metadata, spatial, and temporal axes.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ height: '100vh' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StacBrowser>;

// --- Stories ---

export const Default: Story = {
  render: () => (
    <StacBrowser
      items={MOCK_ITEMS}
      taxonomy={MOCK_TAXONOMY}
      onItemSelect={(path) => console.log('Selected:', path)}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Default StacBrowser with 5 exercises. Use the FilterBar to add metadata filters and watch all views update.',
      },
    },
  },
};

export const Empty: Story = {
  name: 'No Exercises',
  render: () => (
    <StacBrowser items={[]} taxonomy={MOCK_TAXONOMY} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'StacBrowser with no exercise data loaded.',
      },
    },
  },
};

export const WithCustomClass: Story = {
  name: 'Custom Styling',
  render: () => (
    <StacBrowser
      items={MOCK_ITEMS}
      taxonomy={MOCK_TAXONOMY}
      className="custom-stac-browser"
    />
  ),
};
