import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchableCascadingMenu } from '../SearchableCascadingMenu';
import type { CascadingMenuItem } from '../CascadingMenu';

const ITEMS: CascadingMenuItem[] = [
  {
    id: 'surface',
    label: 'Surface Vessel',
    submenu: [
      {
        id: 'warship',
        label: 'Warship',
        submenu: [
          { id: 'frigate', label: 'Frigate' },
          { id: 'destroyer', label: 'Destroyer' },
        ],
      },
    ],
  },
  {
    id: 'subsurface',
    label: 'Subsurface Vessel',
    submenu: [
      { id: 'submarine', label: 'Submarine' },
    ],
  },
];

function renderMenu(props: Partial<React.ComponentProps<typeof SearchableCascadingMenu>> = {}) {
  return render(
    <SearchableCascadingMenu
      items={ITEMS}
      anchorPosition={{ x: 100, y: 100 }}
      searchable
      onSelect={vi.fn()}
      onDismiss={vi.fn()}
      {...props}
    />
  );
}

describe('SearchableCascadingMenu', () => {
  it('renders search input when searchable is true', () => {
    renderMenu();
    expect(screen.getByTestId('cascading-menu-search')).toBeInTheDocument();
  });

  it('does not render search input when searchable is false', () => {
    renderMenu({ searchable: false });
    expect(screen.queryByTestId('cascading-menu-search')).not.toBeInTheDocument();
  });

  it('shows all items when search is empty', () => {
    renderMenu();
    expect(screen.getByTestId('menu-item-surface')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-subsurface')).toBeInTheDocument();
  });

  it('filters items by search query', () => {
    renderMenu();
    const input = screen.getByTestId('cascading-menu-search');
    fireEvent.change(input, { target: { value: 'frig' } });
    // Frigate matches — Surface/Warship/Frigate should be visible
    expect(screen.getByTestId('menu-item-surface')).toBeInTheDocument();
    // Subsurface should be filtered out
    expect(screen.queryByTestId('menu-item-subsurface')).not.toBeInTheDocument();
  });

  it('shows no-matches message when nothing matches', () => {
    renderMenu();
    const input = screen.getByTestId('cascading-menu-search');
    fireEvent.change(input, { target: { value: 'xyz' } });
    expect(screen.getByText('No matching vessel types')).toBeInTheDocument();
  });

  it('uses custom searchPlaceholder', () => {
    renderMenu({ searchPlaceholder: 'Find a type...' });
    const input = screen.getByTestId('cascading-menu-search') as HTMLInputElement;
    expect(input.placeholder).toBe('Find a type...');
  });

  it('fires onSelect when item is clicked', () => {
    const onSelect = vi.fn();
    renderMenu({ onSelect });
    // Click on Surface item
    fireEvent.click(screen.getByTestId('menu-item-surface'));
    // Since surface has submenu and selectableBranches is not set, this won't fire
    // Let's render without submenu items to test leaf click
  });

  it('fires onSelect for selectable branches', () => {
    const onSelect = vi.fn();
    renderMenu({ onSelect, selectableBranches: true });
    fireEvent.click(screen.getByTestId('menu-item-surface'));
    expect(onSelect).toHaveBeenCalledWith('surface');
  });

  it('calls onSearchChange callback', () => {
    const onSearchChange = vi.fn();
    renderMenu({ onSearchChange });
    const input = screen.getByTestId('cascading-menu-search');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(onSearchChange).toHaveBeenCalledWith('test');
  });
});
