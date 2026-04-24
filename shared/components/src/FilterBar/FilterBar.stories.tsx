import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import { FilterBar } from './FilterBar';
import { ThemeProvider } from '../ThemeProvider';
import { InMemoryStorage } from './savedFiltersStorage';
import type { StacBrowserItem, VesselTaxonomyNode } from '../filter-engine';
import type { FilterBarState } from './types';
import type { PlatformRecord } from '@debrief/schemas';
import type { LLMClient, LiveOutcome, EnumBundle } from '../nl-cql2';

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
      { id: 'CONTACT-BRAVO', name: 'Contact Bravo', domain: 'unknown' },
    ] satisfies PlatformRecord[],
    tags: ['convoy', 'blue-water'],
    author: 'CDR Smith',
    collection: 'exercises-2024',
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-01T04:00:00Z',
  }),
  makeItem('ex-002', {
    title: 'CASEX Bravo',
    platforms: [
      { id: 'DIAMOND', name: 'HMS Diamond', nationality: 'GB', vessel_class: 'surface/warship/destroyer/type45', vessel_role: 'destroyer', domain: 'surface' },
      { id: 'UNKNOWN-ALPHA', name: 'Unknown Alpha', domain: 'unknown' },
    ] satisfies PlatformRecord[],
    tags: ['asw', 'shallow-water'],
    author: 'CDR Jones',
    collection: 'exercises-2024',
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-02T12:00:00Z',
  }),
  makeItem('ex-003', {
    title: 'GROUPEX Charlie',
    platforms: [
      { id: 'ARGYLL', name: 'HMS Argyll', nationality: 'GB', vessel_class: 'surface/warship/frigate/type23', vessel_role: 'frigate', domain: 'surface' },
      { id: 'DIAMOND', name: 'HMS Diamond', nationality: 'GB', vessel_class: 'surface/warship/destroyer/type45', vessel_role: 'destroyer', domain: 'surface' },
      { id: 'AQUITAINE', name: 'FS Aquitaine', nationality: 'FR', vessel_class: 'surface/warship/frigate/type23', vessel_role: 'frigate', domain: 'surface' },
    ] satisfies PlatformRecord[],
    tags: ['convoy', 'asw'],
    author: 'CDR Smith',
    featureTags: ['high-priority', 'reviewed'],
    collection: 'exercises-2024',
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-04T00:00:00Z',
  }),
  makeItem('ex-004', {
    title: 'TACEX Delta',
    platforms: [
      { id: 'SACHSEN', name: 'FGS Sachsen', nationality: 'DE', vessel_class: 'surface/warship/frigate/type26', vessel_role: 'frigate', domain: 'surface' },
    ] satisfies PlatformRecord[],
    tags: ['surface-action'],
    author: 'CDR Mueller',
    collection: 'training-2025',
    startDatetime: '2025-06-01T00:00:00Z',
    endDatetime: '2025-06-15T00:00:00Z',
  }),
  makeItem('ex-005', {
    title: 'ASW Exercise Echo',
    platforms: [
      { id: 'RUBIS', name: 'FS Rubis', nationality: 'FR', vessel_class: 'subsurface/submarine/ssn', vessel_role: 'ssn', domain: 'subsurface' },
    ] satisfies PlatformRecord[],
    tags: ['asw'],
    author: 'CDR Dupont',
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
    { kind: 'lozenge', shape: 'simple', id: 'story-1', filterType: 'nationality', value: 'French' },
  ],
};

const MULTIPLE_AND_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', shape: 'simple', id: 'story-1', filterType: 'nationality', value: 'French' },
    { kind: 'lozenge', shape: 'simple', id: 'story-2', filterType: 'tag', value: 'asw' },
  ],
};

const OR_GROUP_STATE: FilterBarState = {
  items: [
    {
      kind: 'or-container',
      id: 'story-or-1',
      children: [
        { kind: 'lozenge', shape: 'simple', id: 'story-or-c1', filterType: 'nationality', value: 'French' },
        { kind: 'lozenge', shape: 'simple', id: 'story-or-c2', filterType: 'nationality', value: 'British' },
      ],
    },
    { kind: 'lozenge', shape: 'simple', id: 'story-3', filterType: 'tag', value: 'convoy' },
  ],
};

const ALL_TYPES_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', shape: 'simple', id: 'story-t1', filterType: 'vessel-class', value: 'surface/warship/frigate/type23' },
    { kind: 'lozenge', shape: 'simple', id: 'story-t2', filterType: 'tag', value: 'asw' },
    { kind: 'lozenge', shape: 'simple', id: 'story-t3', filterType: 'author', value: 'CDR Smith' },
    { kind: 'lozenge', shape: 'simple', id: 'story-t4', filterType: 'nationality', value: 'French' },
    { kind: 'lozenge', shape: 'simple', id: 'story-t5', filterType: 'duration', value: '<24H' },
    { kind: 'lozenge', shape: 'simple', id: 'story-t6', filterType: 'title', value: 'CASEX' },
  ],
};

const ZERO_RESULTS_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', shape: 'simple', id: 'story-z1', filterType: 'nationality', value: 'German' },
    { kind: 'lozenge', shape: 'simple', id: 'story-z2', filterType: 'author', value: 'CDR Smith' },
  ],
};

// Platform chip story states (#186)

const PLATFORM_CHIP_STATE: FilterBarState = {
  items: [
    {
      kind: 'lozenge',
      shape: 'platform',
      id: 'story-p1',
      filterType: 'platform',
      attributes: { nationality: 'GB', domain: 'subsurface' },
    },
  ],
};

const PLATFORM_AND_TAG_STATE: FilterBarState = {
  items: [
    {
      kind: 'lozenge',
      shape: 'platform',
      id: 'story-p2',
      filterType: 'platform',
      attributes: { nationality: 'GB', vessel_role: 'frigate' },
    },
    { kind: 'lozenge', shape: 'simple', id: 'story-t-exercise', filterType: 'tag', value: 'convoy' },
  ],
};

const PLATFORM_OR_STATE: FilterBarState = {
  items: [
    {
      kind: 'or-container',
      id: 'story-or-plat',
      children: [
        {
          kind: 'lozenge',
          shape: 'platform',
          id: 'story-p3',
          filterType: 'platform',
          attributes: { nationality: 'GB', domain: 'subsurface' },
        },
        {
          kind: 'lozenge',
          shape: 'platform',
          id: 'story-p4',
          filterType: 'platform',
          attributes: { nationality: 'DE', vessel_role: 'frigate' },
        },
      ],
    },
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

// --- Platform Chip Stories (#186) ---

export const WithPlatformChip: Story = {
  name: 'With Platform Chip',
  render: () => (
    <FilterBarWrapper
      items={MOCK_ITEMS}
      taxonomy={MOCK_TAXONOMY}
      initialFilterState={PLATFORM_CHIP_STATE}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Compound "GB + Subsurface" platform chip (#186). The chip serialises to one ' +
          '`array_filter` CQL2 node over `debrief:platforms`, matching only plots where a ' +
          'single platform record satisfies all selected attributes.',
      },
    },
  },
};

export const PlatformChipPlusTag: Story = {
  name: 'Platform Chip + Tag',
  render: () => (
    <FilterBarWrapper
      items={MOCK_ITEMS}
      taxonomy={MOCK_TAXONOMY}
      initialFilterState={PLATFORM_AND_TAG_STATE}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A platform chip alongside a tag chip. Combines via top-level AND: only items with ' +
          'a matching platform AND the required tag appear.',
      },
    },
  },
};

export const PlatformChipOrGroup: Story = {
  name: 'Platform Chips in an OR Group',
  render: () => (
    <FilterBarWrapper
      items={MOCK_ITEMS}
      taxonomy={MOCK_TAXONOMY}
      initialFilterState={PLATFORM_OR_STATE}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Two platform chips inside an OR container: "British submarines OR German frigates".',
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

export const QuickSearchDemo: Story = {
  name: 'Quick Search',
  render: () => (
    <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Type in the Quick Search box to filter exercises by title in real-time. ' +
          'Press Enter to "graduate" the search into a title lozenge. ' +
          'Press Escape to clear. Keyboard shortcuts: "/" or Ctrl+F to focus.',
      },
    },
  },
};

export const WithSavedFilters: Story = {
  name: 'With Saved Filters',
  render: () => {
    const storage = new InMemoryStorage({
      version: 1,
      configurations: [
        {
          id: 'demo-saved-1',
          name: 'French Exercises',
          filterBarState: SINGLE_FILTER_STATE,
          cql2Json: {},
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
        },
      ],
    });
    return (
      <div>
        <FilterBar
          items={MOCK_ITEMS}
          taxonomy={MOCK_TAXONOMY}
          onFilteredItems={() => {}}
          savedFiltersStorage={storage}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'FilterBar with saved filters integration. Use Save to persist and Historic Filters to restore.',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// #191 T052 — NL mode with a deterministic stub client
// ---------------------------------------------------------------------------

const NL_STUB_ENUMS: EnumBundle = {
  vessel_class_tree: {},
  nationalities: ['GB', 'FR', 'DE'],
  exercise_names: [],
  tags: ['alpha', 'beta'],
  feature_tags: [],
  _meta: {
    canonicalisation: 'storybook-stub',
    exercise_parse_rule: 'storybook-stub',
    generated_from_catalog: 'storybook-stub',
    generated_from_registry: 'storybook-stub',
    tool: 'storybook-stub',
  },
};

/**
 * Canned outcome map keyed by lowercased phrase substring. Any phrase
 * matching `auth-failure` / `rate-limit` / `provider-error` / `timeout` /
 * `malformed` / `not-configured` / `ceiling-reached` returns the matching
 * failure outcome — exercising the banner matrix. Everything else produces
 * a success with nationality chips derived from the phrase.
 */
const STUB_CANNED: Array<[string, LiveOutcome]> = [
  ['auth-failure', { kind: 'auth-failure', providerStatus: 401, durationMs: 42 }],
  ['rate-limit', { kind: 'rate-limit', providerStatus: 429, retryAfterSeconds: 30, durationMs: 42 }],
  ['provider-error', { kind: 'provider-error', providerStatus: 502, durationMs: 42 }],
  ['timeout', { kind: 'timeout', durationMs: 12000 }],
  ['malformed', { kind: 'malformed-response', reason: 'non-json', durationMs: 42, responseBytes: 128 }],
  ['not-configured', { kind: 'not-configured', reason: 'no-key', durationMs: 0 }],
  ['ceiling-reached', { kind: 'ceiling-reached', ceiling: 50, durationMs: 0 }],
];

function stubSuccessForPhrase(phrase: string): LiveOutcome {
  const lower = phrase.toLowerCase();
  const lozenges: Array<{ filterType: string; value: string }> = [];
  if (/\buk|british|royal navy\b/.test(lower)) {
    lozenges.push({ filterType: 'nationality', value: 'GB' });
  }
  if (/french|france/.test(lower)) {
    lozenges.push({ filterType: 'nationality', value: 'FR' });
  }
  if (/german|germany|bundes/.test(lower)) {
    lozenges.push({ filterType: 'nationality', value: 'DE' });
  }
  if (lozenges.length === 0) {
    lozenges.push({ filterType: 'title', value: phrase });
  }
  const rawResponse = JSON.stringify({ cql2: {}, lozenges, unrecognised_terms: [] });
  return {
    kind: 'success',
    rawResponse,
    durationMs: 42,
    responseBytes: rawResponse.length,
    model: 'claude-haiku-4-5-20251001',
  };
}

function createStubClient(opts: { latencyMs?: number } = {}): LLMClient {
  let aborted = false;
  return {
    async generate(prompt: string): Promise<LiveOutcome> {
      aborted = false;
      // Extract the phrase from the prompt suffix (`Phrase: …`).
      const match = prompt.match(/Phrase:\s*(.*)$/m);
      const phrase = match?.[1] ?? prompt;
      const lower = phrase.toLowerCase();

      // Simulate latency so supersession-style interactions are observable.
      const delay = opts.latencyMs ?? 200;
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (aborted) {
        return { kind: 'transport-error', reason: 'cancelled', durationMs: delay };
      }

      for (const [key, outcome] of STUB_CANNED) {
        if (lower.includes(key)) return outcome;
      }
      return stubSuccessForPhrase(phrase);
    },
    abort() {
      aborted = true;
    },
  };
}

function NlModeWrapper(): React.ReactElement {
  const [filteredCount, setFilteredCount] = useState(MOCK_ITEMS.length);
  const handleFiltered = useCallback((filtered: StacBrowserItem[]) => {
    setFilteredCount(filtered.length);
  }, []);

  // Fresh stub client per render so the story re-initialises cleanly.
  const [client] = useState(() => createStubClient({ latencyMs: 300 }));

  return (
    <div>
      <FilterBar
        items={MOCK_ITEMS}
        taxonomy={MOCK_TAXONOMY}
        onFilteredItems={handleFiltered}
        llmClient={client}
        nlEnums={NL_STUB_ENUMS}
        liveModeLabel="Live · Anthropic · claude-haiku-4-5-20251001 (stub)"
      />
      <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--vscode-descriptionForeground, #666)' }}>
        <div>Showing {filteredCount} of {MOCK_ITEMS.length} exercises</div>
        <div style={{ marginTop: 4, opacity: 0.7 }}>
          Try: &ldquo;UK submarines&rdquo;, &ldquo;French frigates&rdquo;,
          &ldquo;auth-failure&rdquo;, &ldquo;timeout&rdquo;, &ldquo;rate-limit&rdquo;,
          &ldquo;malformed&rdquo;, &ldquo;ceiling-reached&rdquo;.
        </div>
      </div>
    </div>
  );
}

export const NlModeWithStubClient: Story = {
  name: 'NL Mode — with stub client',
  render: () => <NlModeWrapper />,
  parameters: {
    docs: {
      description: {
        story:
          'FilterBar in #191 NL mode driven by a deterministic stub LLM client. Typing a recognised phrase applies chips; typing one of the 7 failure keywords renders the matching banner. Used by the E2E suite for theme + interaction screenshots.',
      },
    },
  },
};
