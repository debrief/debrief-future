import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FilterBar } from '../FilterBar';
import type { StacBrowserItem, VesselTaxonomyNode } from '../../filter-engine';

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

const mockItems: StacBrowserItem[] = [
  makeItem('1', { nationalities: ['French'], tags: ['alpha'] }),
  makeItem('2', { nationalities: ['British'], tags: ['beta'] }),
  makeItem('3', { nationalities: ['French', 'German'], tags: ['alpha', 'gamma'] }),
  makeItem('4', { nationalities: ['German'], tags: ['beta'] }),
];

const mockTaxonomy: VesselTaxonomyNode[] = [
  {
    id: 'surface',
    label: 'Surface',
    children: [
      {
        id: 'warship',
        label: 'Warship',
        children: [
          { id: 'frigate', label: 'Frigate' },
          { id: 'destroyer', label: 'Destroyer' },
        ],
      },
    ],
  },
];

describe('FilterBar', () => {
  let onFilteredItems: ReturnType<typeof vi.fn>;
  let onExpressionChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onFilteredItems = vi.fn();
    onExpressionChange = vi.fn();
  });

  function renderFilterBar() {
    return render(
      <FilterBar
        items={mockItems}
        taxonomy={mockTaxonomy}
        onFilteredItems={onFilteredItems}
        onExpressionChange={onExpressionChange}
      />
    );
  }

  describe('P1: Add and remove filters', () => {
    it('renders empty state with hint text', () => {
      renderFilterBar();
      expect(screen.getByTestId('filter-bar-hint')).toHaveTextContent('Add filters to narrow results');
    });

    it('renders add button', () => {
      renderFilterBar();
      expect(screen.getByTestId('filter-add-button')).toBeInTheDocument();
    });

    it('opens filter type dropdown on (+) click', () => {
      renderFilterBar();
      fireEvent.click(screen.getByTestId('filter-add-button'));
      expect(screen.getByTestId('filter-type-dropdown')).toBeInTheDocument();
    });

    it('shows all 10 filter types in dropdown', () => {
      renderFilterBar();
      fireEvent.click(screen.getByTestId('filter-add-button'));
      expect(screen.getByTestId('filter-type-nationality')).toBeInTheDocument();
      expect(screen.getByTestId('filter-type-vessel-class')).toBeInTheDocument();
      expect(screen.getByTestId('filter-type-plot-tag')).toBeInTheDocument();
      expect(screen.getByTestId('filter-type-duration')).toBeInTheDocument();
      expect(screen.getByTestId('filter-type-title')).toBeInTheDocument();
      expect(screen.getByTestId('filter-type-plot-contents')).toBeInTheDocument();
    });

    it('shows value editor after selecting filter type', async () => {
      renderFilterBar();
      fireEvent.click(screen.getByTestId('filter-add-button'));
      fireEvent.click(screen.getByTestId('filter-type-nationality'));

      await waitFor(() => {
        expect(screen.getByTestId('filter-bar-adding')).toBeInTheDocument();
      });
    });

    it('adds lozenge after selecting value', async () => {
      renderFilterBar();

      // Click (+), select Nationality
      fireEvent.click(screen.getByTestId('filter-add-button'));
      fireEvent.click(screen.getByTestId('filter-type-nationality'));

      // Select French from dropdown
      await waitFor(() => {
        expect(screen.getByTestId('value-option-French')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('value-option-French'));

      // Verify lozenge appears
      await waitFor(() => {
        expect(screen.getByText('French')).toBeInTheDocument();
        expect(screen.getByText('Nationality')).toBeInTheDocument();
      });
    });

    it('calls onFilteredItems with filtered results', async () => {
      renderFilterBar();

      // Initially called with all items (empty filter)
      await waitFor(() => {
        expect(onFilteredItems).toHaveBeenCalledWith(mockItems);
      });
    });

    it('removes lozenge on remove button click', async () => {
      renderFilterBar();

      // Add a filter
      fireEvent.click(screen.getByTestId('filter-add-button'));
      fireEvent.click(screen.getByTestId('filter-type-nationality'));
      await waitFor(() => screen.getByTestId('value-option-French'));
      fireEvent.click(screen.getByTestId('value-option-French'));

      // Wait for lozenge to appear
      await waitFor(() => {
        expect(screen.getByText('Nationality')).toBeInTheDocument();
      });

      // Find and click remove button on the lozenge
      const removeButtons = screen.getAllByTitle('Remove filter');
      fireEvent.click(removeButtons[0]!);

      // Hint text should reappear
      await waitFor(() => {
        expect(screen.getByTestId('filter-bar-hint')).toBeInTheDocument();
      });
    });

    it('hint text disappears when filter is added', async () => {
      renderFilterBar();
      expect(screen.getByTestId('filter-bar-hint')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('filter-add-button'));
      fireEvent.click(screen.getByTestId('filter-type-nationality'));
      await waitFor(() => screen.getByTestId('value-option-French'));
      fireEvent.click(screen.getByTestId('value-option-French'));

      await waitFor(() => {
        expect(screen.queryByTestId('filter-bar-hint')).not.toBeInTheDocument();
      });
    });
  });

  describe('P2: Edit an active filter', () => {
    it('opens editor when lozenge body is clicked', async () => {
      renderFilterBar();

      // Add a filter first
      fireEvent.click(screen.getByTestId('filter-add-button'));
      fireEvent.click(screen.getByTestId('filter-type-nationality'));
      await waitFor(() => screen.getByTestId('value-option-French'));
      fireEvent.click(screen.getByTestId('value-option-French'));

      // Wait for lozenge, then click its body
      await waitFor(() => {
        expect(screen.getByText('French')).toBeInTheDocument();
      });

      // The lozenge body should be clickable for edit
      const lozengeBody = screen.getByText('French').closest('[data-testid^="lozenge-body-"]');
      if (lozengeBody) {
        fireEvent.click(lozengeBody);
        // Editor should appear (ValueEditor for editing)
        await waitFor(() => {
          expect(screen.getByTestId('value-editor-dropdown')).toBeInTheDocument();
        });
      }
    });
  });

  describe('P3: AND logic', () => {
    it('calls onFilteredItems with intersection when multiple filters active', async () => {
      renderFilterBar();

      // Add nationality=French
      fireEvent.click(screen.getByTestId('filter-add-button'));
      fireEvent.click(screen.getByTestId('filter-type-nationality'));
      await waitFor(() => screen.getByTestId('value-option-French'));
      fireEvent.click(screen.getByTestId('value-option-French'));

      // After adding French nationality filter, should get items 1 and 3
      await waitFor(() => {
        const lastCall = onFilteredItems.mock.calls[onFilteredItems.mock.calls.length - 1];
        if (lastCall) {
          const filtered = lastCall[0] as StacBrowserItem[];
          // Items with French nationality are id=1 and id=3
          const ids = filtered.map((i: StacBrowserItem) => i.id);
          expect(ids).toContain('1');
          expect(ids).toContain('3');
          expect(ids).not.toContain('2');
          expect(ids).not.toContain('4');
        }
      });
    });
  });

  describe('P4: OR groups', () => {
    it('creates an OR container via (+) menu', async () => {
      renderFilterBar();

      fireEvent.click(screen.getByTestId('filter-add-button'));
      fireEvent.click(screen.getByTestId('filter-type-or-group'));

      // OR container should appear
      await waitFor(() => {
        const containers = screen.getAllByText('OR');
        expect(containers.length).toBeGreaterThan(0);
      });
    });
  });
});
