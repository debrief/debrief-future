import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FilterDropdown } from './FilterDropdown';
import { ThemeProvider } from '../ThemeProvider';
import type { FilterState } from './types';
import { DEFAULT_FILTER_STATE } from './types';

const meta: Meta<typeof FilterDropdown> = {
  title: 'Components/LayersToolbar/FilterDropdown',
  component: FilterDropdown,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'FilterDropdown provides text search, scope selection, feature type checkboxes, visibility filters, temporal range, and apply-to-selection actions.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ maxWidth: 300 }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FilterDropdown>;

function InteractiveFilter() {
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);

  return (
    <div>
      <FilterDropdown
        filterState={filterState}
        onFilterChange={setFilterState}
        onApplyToSelection={(action) => console.log('Apply to selection:', action)}
      />
      <pre style={{ marginTop: 16, fontSize: 11, color: '#666' }}>
        {JSON.stringify(filterState, null, 2)}
      </pre>
    </div>
  );
}

export const Default: Story = {
  render: () => <InteractiveFilter />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive filter dropdown showing all sections. State displayed below.',
      },
    },
  },
};

export const WithActiveTextFilter: Story = {
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      textQuery: 'HMS',
    });
    return (
      <FilterDropdown
        filterState={filterState}
        onFilterChange={setFilterState}
        onApplyToSelection={(action) => console.log('Apply:', action)}
      />
    );
  },
};

export const WithTypeFilters: Story = {
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      featureTypes: {
        tracks: true,
        contacts: false,
        zones: false,
        annotations: true,
      },
    });
    return (
      <FilterDropdown
        filterState={filterState}
        onFilterChange={setFilterState}
      />
    );
  },
};

export const WithTemporalFilters: Story = {
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      temporal: {
        after: '2024-06-15T08:00',
        before: '2024-06-15T20:00',
      },
    });
    return (
      <FilterDropdown
        filterState={filterState}
        onFilterChange={setFilterState}
      />
    );
  },
};

export const WithAllFiltersActive: Story = {
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      textQuery: 'Victory',
      searchScope: { name: true, type: false, platform: true, attachments: false },
      featureTypes: { tracks: true, contacts: false, zones: false, annotations: false },
      visibility: 'visible-only',
      temporal: { after: '2024-06-15T08:00', before: '2024-06-15T20:00' },
    });
    return (
      <FilterDropdown
        filterState={filterState}
        onFilterChange={setFilterState}
        onApplyToSelection={(action) => console.log('Apply:', action)}
      />
    );
  },
};

export const DarkTheme: Story = {
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
    return (
      <ThemeProvider theme={{ variant: 'dark' }}>
        <FilterDropdown
          filterState={filterState}
          onFilterChange={setFilterState}
          onApplyToSelection={(action) => console.log('Apply:', action)}
        />
      </ThemeProvider>
    );
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
