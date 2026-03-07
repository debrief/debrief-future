import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HistoricFiltersDropdown } from '../HistoricFiltersDropdown';
import type { SavedFilterConfiguration, FilterBarState } from '../types';

const SAMPLE_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', id: 'l1', filterType: 'nationality', value: 'French' },
  ],
};

const SAMPLE_CONFIGS: SavedFilterConfiguration[] = [
  {
    id: 'c1',
    name: 'UK Submarines',
    filterBarState: SAMPLE_STATE,
    cql2Json: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'c2',
    name: 'French ASW',
    filterBarState: SAMPLE_STATE,
    cql2Json: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
  },
];

function renderDropdown(overrides: Partial<React.ComponentProps<typeof HistoricFiltersDropdown>> = {}) {
  const defaultProps = {
    configurations: SAMPLE_CONFIGS,
    onRestore: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  return { ...render(<HistoricFiltersDropdown {...defaultProps} />), props: defaultProps };
}

describe('SavedFiltersDropdown', () => {
  it('renders the trigger button', () => {
    renderDropdown();
    expect(screen.getByTestId('saved-filters-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('saved-filters-trigger')).toHaveTextContent('Saved Filters');
  });

  it('shows dropdown on click', () => {
    renderDropdown();
    fireEvent.click(screen.getByTestId('saved-filters-trigger'));
    expect(screen.getByTestId('saved-filters-dropdown')).toBeInTheDocument();
  });

  it('closes dropdown on second click', () => {
    renderDropdown();
    fireEvent.click(screen.getByTestId('saved-filters-trigger'));
    fireEvent.click(screen.getByTestId('saved-filters-trigger'));
    expect(screen.queryByTestId('saved-filters-dropdown')).not.toBeInTheDocument();
  });

  it('shows empty message when no configurations', () => {
    renderDropdown({ configurations: [] });
    fireEvent.click(screen.getByTestId('saved-filters-trigger'));
    expect(screen.getByTestId('saved-filters-empty')).toHaveTextContent('No saved filters');
  });

  it('displays saved configurations', () => {
    renderDropdown();
    fireEvent.click(screen.getByTestId('saved-filters-trigger'));
    expect(screen.getByText('UK Submarines')).toBeInTheDocument();
    expect(screen.getByText('French ASW')).toBeInTheDocument();
  });

  it('calls onRestore when clicking a configuration', () => {
    const { props } = renderDropdown();
    fireEvent.click(screen.getByTestId('saved-filters-trigger'));
    fireEvent.click(screen.getByTestId('saved-filter-restore-c1'));

    expect(props.onRestore).toHaveBeenCalledWith(SAMPLE_CONFIGS[0]);
  });

  it('closes dropdown after restoring', () => {
    renderDropdown();
    fireEvent.click(screen.getByTestId('saved-filters-trigger'));
    fireEvent.click(screen.getByTestId('saved-filter-restore-c1'));

    expect(screen.queryByTestId('saved-filters-dropdown')).not.toBeInTheDocument();
  });

  it('calls onDelete when clicking delete button', () => {
    const { props } = renderDropdown();
    fireEvent.click(screen.getByTestId('saved-filters-trigger'));
    fireEvent.click(screen.getByTestId('saved-filter-delete-c2'));

    expect(props.onDelete).toHaveBeenCalledWith('c2');
  });

  it('does not trigger restore when clicking delete', () => {
    const { props } = renderDropdown();
    fireEvent.click(screen.getByTestId('saved-filters-trigger'));
    fireEvent.click(screen.getByTestId('saved-filter-delete-c1'));

    expect(props.onRestore).not.toHaveBeenCalled();
    expect(props.onDelete).toHaveBeenCalledWith('c1');
  });

  describe('delete-specific edge cases (T010)', () => {
    it('re-renders correctly after deletion removes an item', () => {
      const onDelete = vi.fn();
      const { rerender } = render(
        <HistoricFiltersDropdown
          configurations={SAMPLE_CONFIGS}
          onRestore={vi.fn()}
          onDelete={onDelete}
        />,
      );
      fireEvent.click(screen.getByTestId('saved-filters-trigger'));
      expect(screen.getByText('UK Submarines')).toBeInTheDocument();
      expect(screen.getByText('French ASW')).toBeInTheDocument();

      // Simulate parent removing the deleted config
      fireEvent.click(screen.getByTestId('saved-filter-delete-c1'));
      const remaining = SAMPLE_CONFIGS.filter((c) => c.id !== 'c1');
      rerender(
        <HistoricFiltersDropdown
          configurations={remaining}
          onRestore={vi.fn()}
          onDelete={onDelete}
        />,
      );

      expect(screen.queryByText('UK Submarines')).not.toBeInTheDocument();
      expect(screen.getByText('French ASW')).toBeInTheDocument();
    });

    it('shows empty message after deleting the last configuration', () => {
      const singleConfig = [SAMPLE_CONFIGS[0]!];
      const onDelete = vi.fn();
      const { rerender } = render(
        <HistoricFiltersDropdown
          configurations={singleConfig}
          onRestore={vi.fn()}
          onDelete={onDelete}
        />,
      );
      fireEvent.click(screen.getByTestId('saved-filters-trigger'));
      fireEvent.click(screen.getByTestId('saved-filter-delete-c1'));

      rerender(
        <HistoricFiltersDropdown
          configurations={[]}
          onRestore={vi.fn()}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByTestId('saved-filters-empty')).toHaveTextContent('No saved filters');
    });

    it('dropdown stays open after deleting an entry', () => {
      renderDropdown();
      fireEvent.click(screen.getByTestId('saved-filters-trigger'));
      fireEvent.click(screen.getByTestId('saved-filter-delete-c1'));

      expect(screen.getByTestId('saved-filters-dropdown')).toBeInTheDocument();
    });
  });
});
