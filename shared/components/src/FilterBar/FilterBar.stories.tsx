import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import { FilterBar } from './FilterBar';
import { ThemeProvider } from '../ThemeProvider';
import type { StacBrowserItem, VesselTaxonomyNode } from '../filter-engine';
import type { FilterBarState } from './types';

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

function FilterBarWrapper({
  items,
  taxonomy,
  initialFilterState,
}: {
  items: StacBrowserItem[];
  taxonomy: VesselTaxonomyNode[];
  initialFilterState?: FilterBarState;
}) {
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
      />
      <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--vscode-descriptionForeground, #666)' }}>
        Showing {filteredCount} of {items.length} exercises
      </div>
    </div>
  );
}

// --- Pre-populated filter states for stories ---

const SINGLE_FILTER_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', id: 'story-1', filterType: 'nationality', value: 'French' },
  ],
};

const MULTIPLE_AND_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', id: 'story-1', filterType: 'nationality', value: 'French' },
    { kind: 'lozenge', id: 'story-2', filterType: 'tag', value: 'asw' },
  ],
};

const OR_GROUP_STATE: FilterBarState = {
  items: [
    {
      kind: 'or-container',
      id: 'story-or-1',
      children: [
        { kind: 'lozenge', id: 'story-or-c1', filterType: 'nationality', value: 'French' },
        { kind: 'lozenge', id: 'story-or-c2', filterType: 'nationality', value: 'British' },
      ],
    },
    { kind: 'lozenge', id: 'story-3', filterType: 'tag', value: 'convoy' },
  ],
};

const ALL_TYPES_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', id: 'story-t1', filterType: 'vessel-class', value: 'surface/warship/frigate/type23' },
    { kind: 'lozenge', id: 'story-t2', filterType: 'tag', value: 'asw' },
    { kind: 'lozenge', id: 'story-t3', filterType: 'author', value: 'CDR Smith' },
    { kind: 'lozenge', id: 'story-t4', filterType: 'nationality', value: 'French' },
    { kind: 'lozenge', id: 'story-t5', filterType: 'duration', value: '<24H' },
    { kind: 'lozenge', id: 'story-t6', filterType: 'title', value: 'CASEX' },
  ],
};

const ZERO_RESULTS_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', id: 'story-z1', filterType: 'nationality', value: 'German' },
    { kind: 'lozenge', id: 'story-z2', filterType: 'author', value: 'CDR Smith' },
  ],
};

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
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={SINGLE_FILTER_STATE} />
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
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={MULTIPLE_AND_STATE} />
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
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={OR_GROUP_STATE} />
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
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ALL_TYPES_STATE} />
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
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ZERO_RESULTS_STATE} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.',
      },
    },
  },
};

// --- Vessel Taxonomy Stories (#133) ---

const VESSEL_CLASS_SELECTED_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', id: 'vc-1', filterType: 'vessel-class', value: 'surface/warship/frigate/type23' },
  ],
};

const BRANCH_SELECTED_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', id: 'vc-branch', filterType: 'vessel-class', value: 'surface/warship' },
  ],
};

export const VesselTaxonomyNavigation: Story = {
  name: 'Vessel Taxonomy Navigation',
  render: () => (
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={VESSEL_CLASS_SELECTED_STATE} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Vessel class lozenge displays human-readable label "Type 23" (not raw path). Click the lozenge to re-edit — the current selection is marked with ✓ in the dropdown.',
      },
    },
  },
};

export const VesselTaxonomySearch: Story = {
  name: 'Vessel Taxonomy Search',
  render: () => (
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → Vessel Class to open the dropdown. A search input appears above the tree. Type to filter — e.g., "type 23" shows only matching nodes with ancestor paths preserved.',
      },
    },
  },
};

export const VesselTaxonomyCounts: Story = {
  name: 'Vessel Taxonomy Counts',
  render: () => (
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → Vessel Class. Each node shows a count badge (e.g., "Surface (4)"). Nodes with zero matches are dimmed and disabled. Counts update as other filters narrow the data set.',
      },
    },
  },
};

export const VesselTaxonomyBranchSelection: Story = {
  name: 'Vessel Taxonomy Branch Selection',
  render: () => (
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={BRANCH_SELECTED_STATE} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Branch node "Warship" selected — lozenge shows "Vessel Class: Warship". Filtering matches all warship subtypes (frigates, destroyers). Click the lozenge to see "Warship" marked as current.',
      },
    },
  },
};
