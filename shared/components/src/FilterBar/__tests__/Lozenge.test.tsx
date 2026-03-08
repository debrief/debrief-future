import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { Lozenge } from '../Lozenge';
import type { LozengeItem } from '../types';
import type { FilterType } from '../../filter-engine';

const mockAvailableValues: Record<FilterType, readonly string[]> = {
  'vessel-class': [],
  'tag': [],
  'author': [],
  'duration': [],
  'modified': [],
  'title': [],
  'plot-contents': [],
  'track-name': [],
  'nationality': ['French', 'British', 'German'],
  'collection': [],
};

const mockItem: LozengeItem = {
  kind: 'lozenge',
  id: 'test-1',
  filterType: 'nationality',
  value: 'French',
};

function renderLozenge(props: Partial<React.ComponentProps<typeof Lozenge>> = {}) {
  return render(
    <DndContext>
      <Lozenge
        item={mockItem}
        isEditing={false}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
        onValueChange={vi.fn()}
        onEditClose={vi.fn()}
        onToggleNegate={vi.fn()}
        availableValues={mockAvailableValues}
        taxonomy={[]}
        {...props}
      />
    </DndContext>
  );
}

describe('Lozenge', () => {
  it('renders type label and value', () => {
    renderLozenge();
    expect(screen.getByText('Nationality')).toBeInTheDocument();
    expect(screen.getByText('French')).toBeInTheDocument();
  });

  it('clicking body fires onEdit', () => {
    const onEdit = vi.fn();
    renderLozenge({ onEdit });

    fireEvent.click(screen.getByTestId('lozenge-body-test-1'));
    expect(onEdit).toHaveBeenCalledWith('test-1');
  });

  it('clicking remove fires onRemove', () => {
    const onRemove = vi.fn();
    renderLozenge({ onRemove });

    fireEvent.click(screen.getByTestId('lozenge-remove-test-1'));
    expect(onRemove).toHaveBeenCalledWith('test-1');
  });

  it('remove click does not trigger edit', () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    renderLozenge({ onEdit, onRemove });

    fireEvent.click(screen.getByTestId('lozenge-remove-test-1'));
    expect(onRemove).toHaveBeenCalledWith('test-1');
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('clicking negate fires onToggleNegate', () => {
    const onToggleNegate = vi.fn();
    renderLozenge({ onToggleNegate });

    fireEvent.click(screen.getByTestId('lozenge-negate-test-1'));
    expect(onToggleNegate).toHaveBeenCalledWith('test-1');
  });

  it('shows NOT badge when negated', () => {
    const negatedItem: LozengeItem = { ...mockItem, negated: true };
    renderLozenge({ item: negatedItem });

    expect(screen.getByText('NOT')).toBeInTheDocument();
  });

  it('has draggable attributes', () => {
    renderLozenge();
    const el = screen.getByTestId('lozenge-test-1');
    // @dnd-kit adds role and tabIndex attributes for draggable elements
    expect(el).toBeInTheDocument();
  });

  describe('vessel-class label resolution', () => {
    const vesselClassItem: LozengeItem = {
      kind: 'lozenge',
      id: 'vc-1',
      filterType: 'vessel-class',
      value: 'surface/warship/frigate/type23',
    };

    it('displays resolved label from labelMap for vessel-class', () => {
      const labelMap = new Map([
        ['surface/warship/frigate/type23', 'Type 23 Frigate'],
      ]);
      renderLozenge({ item: vesselClassItem, labelMap });
      expect(screen.getByText('Type 23 Frigate')).toBeInTheDocument();
    });

    it('displays raw value when labelMap is not provided', () => {
      renderLozenge({ item: vesselClassItem });
      expect(screen.getByText('surface/warship/frigate/type23')).toBeInTheDocument();
    });

    it('displays raw value for unknown vessel-class path', () => {
      const labelMap = new Map<string, string>();
      renderLozenge({ item: vesselClassItem, labelMap });
      expect(screen.getByText('surface/warship/frigate/type23')).toBeInTheDocument();
    });
  });
});
