import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import { FilterBar } from './FilterBar';
import { ThemeProvider } from '../ThemeProvider';
import type { StacBrowserItem, VesselTaxonomyNode } from '../filter-engine';

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
    trackNames: ['HMS Argyll', 'Contact Bravo'],
    collection: 'exercises-2024',
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-01T04:00:00Z',
  }),
  makeItem('ex-002', {
    title: 'CASEX Bravo',
    nationalities: ['British'],
    tags: ['asw', 'shallow-water'],
    vesselClasses: ['surface/warship/destroyer/type45'],
    author: 'CDR Jones',
    trackNames: ['HMS Diamond', 'Unknown Alpha'],
    collection: 'exercises-2024',
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-02T12:00:00Z',
  }),
  makeItem('ex-003', {
    title: 'GROUPEX Charlie',
    nationalities: ['French', 'British'],
    tags: ['convoy', 'asw'],
    vesselClasses: ['surface/warship/frigate/type23', 'surface/warship/destroyer/type45'],
    author: 'CDR Smith',
    featureTags: ['high-priority', 'reviewed'],
    trackNames: ['HMS Argyll', 'HMS Diamond', 'FS Aquitaine'],
    collection: 'exercises-2024',
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-04T00:00:00Z',
  }),
  makeItem('ex-004', {
    title: 'TACEX Delta',
    nationalities: ['German'],
    tags: ['surface-action'],
    vesselClasses: ['surface/warship/frigate/type26'],
    author: 'CDR Mueller',
    trackNames: ['FGS Sachsen'],
    collection: 'training-2025',
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-15T00:00:00Z',
  }),
  makeItem('ex-005', {
    title: 'ASW Exercise Echo',
    nationalities: ['French'],
    tags: ['asw'],
    vesselClasses: ['submarine/nuclear/ssn'],
    author: 'CDR Dupont',
    trackNames: ['FS Rubis'],
    collection: 'training-2025',
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

// --- Wrapper for interactive state ---

function FilterBarWrapper({ items, taxonomy }: { items: StacBrowserItem[]; taxonomy: VesselTaxonomyNode[] }) {
  const [filteredCount, setFilteredCount] = useState(items.length);

  const handleFiltered = useCallback((filtered: StacBrowserItem[]) => {
    setFilteredCount(filtered.length);
  }, []);

  return (
    <div>
      <FilterBar
        items={items}
        taxonomy={taxonomy}
        onFilteredItems={handleFiltered}
      />
      <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--vscode-descriptionForeground, #666)' }}>
        Showing {filteredCount} of {items.length} exercises
      </div>
    </div>
  );
}

// --- Storybook Meta ---

const meta: Meta<typeof FilterBar> = {
  title: 'FilterBar',
  component: FilterBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Persistent filter bar with lozenge UI, AND/OR logic, and drag-to-group support. All 10 SRD filter types with type-specific input methods.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FilterBar>;

// --- Stories ---

export const Empty: Story = {
  render: () => (
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
  ),
};

export const SingleFilter: Story = {
  name: 'Single Filter',
  render: () => (
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow.',
      },
    },
  },
};

export const MultipleAND: Story = {
  name: 'Multiple AND Filters',
  render: () => (
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear.',
      },
    },
  },
};

export const OrGroup: Story = {
  name: 'OR Group',
  render: () => (
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.',
      },
    },
  },
};

export const Interactive: Story = {
  name: 'Interactive',
  render: () => (
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy.',
      },
    },
  },
};

export const AllFilterTypes: Story = {
  name: 'All Filter Types',
  render: () => (
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text).',
      },
    },
  },
};

export const ZeroResults: Story = {
  name: 'Zero Results',
  render: () => (
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.',
      },
    },
  },
};
