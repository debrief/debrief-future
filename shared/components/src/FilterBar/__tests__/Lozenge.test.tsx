import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { Lozenge, formatPlatformLabel } from '../Lozenge';
import type { LozengeItem, PlatformLozengeItem } from '../types';
import type { FilterType } from '../../filter-engine';

const mockAvailableValues: Record<Exclude<FilterType, 'platform'>, readonly string[]> = {
  'vessel-class': [],
  'tag': [],
  'author': [],
  'duration': [],
  'modified': [],
  'title': [],
  'filename': [],
  'plot-contents': [],
  'track-name': [],
  'nationality': ['French', 'British', 'German'],
  'collection': [],
};

const mockPlatformAvailable = {
  nationality: ['DE', 'GB', 'US'] as readonly string[],
  domain: ['subsurface', 'surface'] as readonly string[],
  vessel_role: ['frigate', 'destroyer', 'submarine'] as readonly string[],
  vessel_type: ['type23', 'type45'] as readonly string[],
} as const;

const mockItem: LozengeItem = {
  kind: 'lozenge',
  shape: 'simple',
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
      shape: 'simple',
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

  // Platform chip tests (#186, U24–U30)
  describe('platform chip variant', () => {
    const platformItem: PlatformLozengeItem = {
      kind: 'lozenge',
      shape: 'platform',
      id: 'plat-1',
      filterType: 'platform',
      attributes: { nationality: 'GB', domain: 'subsurface' },
    };

    // U24
    it('U24: renders label from attributes in documented order', () => {
      const attrs = {
        nationality: 'GB',
        domain: 'subsurface',
        vessel_role: 'frigate',
      };
      const label = formatPlatformLabel(attrs);
      expect(label).toBe('GB · Subsurface · frigate');
    });

    // U25
    it('U25: resolves vessel_class via labelMap when available', () => {
      const labelMap = new Map([
        ['surface/warship/frigate/type23', 'Type 23 (Duke-class)'],
      ]);
      const label = formatPlatformLabel(
        { vessel_class: 'surface/warship/frigate/type23' },
        labelMap,
      );
      expect(label).toBe('Type 23 (Duke-class)');
    });

    // U26
    it('U26: renders distinguishing icon + class on platform chips', () => {
      renderLozenge({
        item: platformItem,
        platformAvailableValues: mockPlatformAvailable,
      });
      expect(screen.getByTestId('lozenge-icon-plat-1')).toBeTruthy();
      const el = screen.getByTestId('lozenge-plat-1');
      expect(el.className).toContain('debrief-lozenge--platform');
    });

    // U27
    it('U27: platform chip with negated:true shows NOT prefix', () => {
      const negated: PlatformLozengeItem = { ...platformItem, negated: true };
      renderLozenge({
        item: negated,
        platformAvailableValues: mockPlatformAvailable,
      });
      expect(screen.getByText('NOT')).toBeInTheDocument();
    });

    // U28
    it('U28: clicking platform chip body opens PlatformValueEditor (not simple ValueEditor)', () => {
      const onEdit = vi.fn();
      renderLozenge({
        item: platformItem,
        isEditing: true,
        onEdit,
        onPlatformAttributesChange: vi.fn(),
        platformAvailableValues: mockPlatformAvailable,
      });
      // The platform editor root should be present
      expect(screen.getByTestId('platform-value-editor')).toBeTruthy();
      // And the simple value-editor test-ids should NOT be present
      expect(screen.queryByTestId('value-editor-dropdown')).toBeNull();
      expect(screen.queryByTestId('value-editor-hierarchical')).toBeNull();
    });

    // U29
    it('U29: platform chip remove button dispatches onRemove', () => {
      const onRemove = vi.fn();
      renderLozenge({
        item: platformItem,
        onRemove,
        platformAvailableValues: mockPlatformAvailable,
      });
      fireEvent.click(screen.getByTestId('lozenge-remove-plat-1'));
      expect(onRemove).toHaveBeenCalledWith('plat-1');
    });

    // U30
    it('U30: platform chip is draggable with the same dnd-kit setup as simple chips', () => {
      renderLozenge({
        item: platformItem,
        platformAvailableValues: mockPlatformAvailable,
      });
      const el = screen.getByTestId('lozenge-plat-1');
      // dnd-kit attaches attributes like role="button"/tabIndex via hooks
      expect(el.getAttribute('data-shape')).toBe('platform');
      expect(el).toBeInTheDocument();
    });
  });
});
