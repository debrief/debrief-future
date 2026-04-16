import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import { FilterBar } from './FilterBar';
import { ThemeProvider } from '../ThemeProvider';
import { InMemoryStorage } from './savedFiltersStorage';
import type { StacBrowserItem, VesselTaxonomyNode } from '../filter-engine';
import type { FilterBarState, SavedFiltersCollection } from './types';
import type { PlatformRecord } from '@debrief/schemas';

// --- Mock Data (reused from FilterBar.stories) ---

function makeItem(id: string, overrides: Partial<StacBrowserItem> = {}): StacBrowserItem {
  return {
    id,
    title: `Exercise ${id}`,
    itemPath: `/catalog/${id}/item.json`,
    bbox: null,
    datetime: null,
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-01T12:00:00Z',
    platforms: [],
    tags: [],
    featureTags: [],
    author: null,
    collection: null,
    modified: null,
    ...overrides,
  };
}

const MOCK_ITEMS: StacBrowserItem[] = [
  makeItem('ex-001', {
    title: 'CASEX Alpha',
    platforms: [
      { id: 'ARGYLL', name: 'HMS Argyll', nationality: 'FR', vessel_class: 'surface/warship/frigate/type23', vessel_role: 'frigate', domain: 'surface' },
    ] satisfies PlatformRecord[],
    tags: ['convoy', 'blue-water'],
    author: 'CDR Smith',
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-01T04:00:00Z',
  }),
  makeItem('ex-002', {
    title: 'CASEX Bravo',
    platforms: [
      { id: 'DIAMOND', name: 'HMS Diamond', nationality: 'GB', vessel_class: 'surface/warship/destroyer/type45', vessel_role: 'destroyer', domain: 'surface' },
    ] satisfies PlatformRecord[],
    tags: ['asw', 'shallow-water'],
    author: 'CDR Jones',
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-02T12:00:00Z',
  }),
  makeItem('ex-003', {
    title: 'GROUPEX Charlie',
    platforms: [
      { id: 'ARGYLL', name: 'HMS Argyll', nationality: 'FR', vessel_class: 'surface/warship/frigate/type23', vessel_role: 'frigate', domain: 'surface' },
      { id: 'DIAMOND', name: 'HMS Diamond', nationality: 'GB', vessel_class: 'surface/warship/destroyer/type45', vessel_role: 'destroyer', domain: 'surface' },
    ] satisfies PlatformRecord[],
    tags: ['convoy', 'asw'],
    author: 'CDR Smith',
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-04T00:00:00Z',
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
];

// --- Pre-populated saved filters ---

const SAVED_COLLECTION: SavedFiltersCollection = {
  version: 1,
  configurations: [
    {
      id: 'saved-1',
      name: 'French Exercises',
      filterBarState: {
        items: [
          { kind: 'lozenge', shape: 'simple', id: 's1-l1', filterType: 'nationality', value: 'French' },
        ],
      },
      cql2Json: { op: 'eq', args: [{ property: 'nationality' }, 'French'] },
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
    {
      id: 'saved-2',
      name: 'ASW Convoy',
      filterBarState: {
        items: [
          { kind: 'lozenge', shape: 'simple', id: 's2-l1', filterType: 'tag', value: 'asw' },
          { kind: 'lozenge', shape: 'simple', id: 's2-l2', filterType: 'tag', value: 'convoy' },
        ],
      },
      cql2Json: { op: 'and', args: [] },
      createdAt: '2026-02-15T08:00:00.000Z',
      updatedAt: '2026-02-15T08:00:00.000Z',
    },
  ],
};

// --- Wrapper with saved filters storage ---

function SavedFiltersWrapper({
  items,
  taxonomy,
  initialFilterState,
  initialSaved,
}: {
  items: StacBrowserItem[];
  taxonomy: VesselTaxonomyNode[];
  initialFilterState?: FilterBarState;
  initialSaved?: SavedFiltersCollection;
}) {
  const [storage] = useState(() => new InMemoryStorage(initialSaved));
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
        initialFilterState={initialFilterState}
        savedFiltersStorage={storage}
      />
      <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--vscode-descriptionForeground, #666)' }}>
        Showing {filteredCount} of {items.length} exercises
      </div>
    </div>
  );
}

// --- Storybook Meta ---

const meta: Meta = {
  title: 'FilterBar/Saved Filters',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Save, restore, and delete named filter configurations. Saved filters persist via platform-native storage.',
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
type Story = StoryObj;

// --- Stories ---

export const Empty: Story = {
  name: 'Empty (No Saved Filters)',
  render: () => (
    <SavedFiltersWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
  ),
};

export const WithSaved: Story = {
  name: 'With Saved Filters',
  render: () => (
    <SavedFiltersWrapper
      items={MOCK_ITEMS}
      taxonomy={MOCK_TAXONOMY}
      initialSaved={SAVED_COLLECTION}
    />
  ),
};

export const SaveFlow: Story = {
  name: 'Save Flow',
  render: () => (
    <SavedFiltersWrapper
      items={MOCK_ITEMS}
      taxonomy={MOCK_TAXONOMY}
      initialFilterState={{
        items: [
          { kind: 'lozenge', shape: 'simple', id: 'demo-1', filterType: 'nationality', value: 'French' },
          { kind: 'lozenge', shape: 'simple', id: 'demo-2', filterType: 'tag', value: 'convoy' },
        ],
      }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Filter bar pre-populated with active filters. Click Save to name and persist the current configuration.',
      },
    },
  },
};

// Platform chip round-trip (#186)
export const PlatformChipRoundTrip: Story = {
  name: 'Platform chip round-trip',
  render: () => (
    <SavedFiltersWrapper
      items={MOCK_ITEMS}
      taxonomy={MOCK_TAXONOMY}
      initialFilterState={{
        items: [
          {
            kind: 'lozenge',
            shape: 'platform',
            id: 'plat-saved-1',
            filterType: 'platform',
            attributes: { nationality: 'GB', vessel_role: 'frigate' },
          },
          {
            kind: 'lozenge',
            shape: 'simple',
            id: 'saved-tag-1',
            filterType: 'tag',
            value: 'convoy',
          },
        ],
      }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Save a filter containing a platform chip, clear the bar, then restore — the chip ' +
          'and its attributes should be identical. The CQL2 JSON emitted before save and after ' +
          'restore is equal (#186, U32/U35).',
      },
    },
  },
};
