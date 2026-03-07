import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { OrContainer } from '../OrContainer';
import type { OrContainerItem, LozengeItem } from '../types';
import type { FilterType } from '../../filter-engine';

const emptyValues: Record<FilterType, readonly string[]> = {
  'vessel-class': [],
  'tag': [],
  'author': [],
  'duration': [],
  'modified': [],
  'title': [],
  'plot-contents': [],
  'track-name': [],
  'nationality': ['French', 'British'],
  'collection': [],
};

const childA: LozengeItem = { kind: 'lozenge', id: 'c1', filterType: 'nationality', value: 'French' };
const childB: LozengeItem = { kind: 'lozenge', id: 'c2', filterType: 'nationality', value: 'British' };

const containerWithChildren: OrContainerItem = {
  kind: 'or-container',
  id: 'or-1',
  children: [childA, childB],
};

const emptyContainer: OrContainerItem = {
  kind: 'or-container',
  id: 'or-2',
  children: [],
};

function renderOrContainer(item: OrContainerItem, props: Partial<React.ComponentProps<typeof OrContainer>> = {}) {
  return render(
    <DndContext>
      <OrContainer
        item={item}
        editingId={null}
        onAddChildType={vi.fn()}
        onRemove={vi.fn()}
        onEditLozenge={vi.fn()}
        onRemoveLozenge={vi.fn()}
        onValueChange={vi.fn()}
        onEditClose={vi.fn()}
        onToggleNegate={vi.fn()}
        availableValues={emptyValues}
        taxonomy={[]}
        {...props}
      />
    </DndContext>
  );
}

describe('OrContainer', () => {
  it('renders child lozenges', () => {
    renderOrContainer(containerWithChildren);
    expect(screen.getByText('French')).toBeInTheDocument();
    expect(screen.getByText('British')).toBeInTheDocument();
  });

  it('renders OR label', () => {
    renderOrContainer(containerWithChildren);
    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('mini (+) button opens type dropdown', () => {
    renderOrContainer(emptyContainer);
    fireEvent.click(screen.getByTestId('or-container-add-or-2'));
    expect(screen.getByTestId('or-container-menu-or-2')).toBeInTheDocument();
  });

  it('fires onAddChildType when type selected from mini menu', () => {
    const onAddChildType = vi.fn();
    renderOrContainer(emptyContainer, { onAddChildType });

    fireEvent.click(screen.getByTestId('or-container-add-or-2'));
    fireEvent.click(screen.getByTestId('or-child-type-nationality'));
    expect(onAddChildType).toHaveBeenCalledWith('or-2', 'nationality');
  });

  it('remove button fires onRemove', () => {
    const onRemove = vi.fn();
    renderOrContainer(emptyContainer, { onRemove });

    fireEvent.click(screen.getByTestId('or-container-remove-or-2'));
    expect(onRemove).toHaveBeenCalledWith('or-2');
  });

  it('renders with droppable attributes', () => {
    renderOrContainer(emptyContainer);
    expect(screen.getByTestId('or-container-or-2')).toBeInTheDocument();
  });

  describe('label map forwarding', () => {
    const vesselChild: LozengeItem = {
      kind: 'lozenge',
      id: 'vc-1',
      filterType: 'vessel-class',
      value: 'surface/warship/frigate/type23',
    };

    const containerWithVessel: OrContainerItem = {
      kind: 'or-container',
      id: 'or-v',
      children: [vesselChild],
    };

    it('forwards labelMap to child Lozenges', () => {
      const labelMap = new Map([
        ['surface/warship/frigate/type23', 'Type 23 Frigate'],
      ]);
      renderOrContainer(containerWithVessel, { labelMap });
      expect(screen.getByText('Type 23 Frigate')).toBeInTheDocument();
    });
  });
});
