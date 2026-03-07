import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SaveFilterButton } from '../SaveFilterButton';
import type { FilterBarState } from '../types';

const SAMPLE_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', id: 'l1', filterType: 'nationality', value: 'French' },
  ],
};
const SAMPLE_CQL2: Record<string, unknown> = { op: 'and', args: [] };

function renderButton(overrides: Partial<React.ComponentProps<typeof SaveFilterButton>> = {}) {
  const defaultProps = {
    currentFilterBarState: SAMPLE_STATE,
    currentCql2Json: SAMPLE_CQL2,
    hasActiveFilters: true,
    nameExists: () => false,
    onSave: vi.fn(),
    ...overrides,
  };
  return { ...render(<SaveFilterButton {...defaultProps} />), props: defaultProps };
}

describe('SaveFilterButton', () => {
  it('renders the save button', () => {
    renderButton();
    expect(screen.getByTestId('save-filter-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('save-filter-trigger')).toHaveTextContent('Save');
  });

  it('is disabled when no active filters', () => {
    renderButton({ hasActiveFilters: false });
    expect(screen.getByTestId('save-filter-trigger')).toBeDisabled();
  });

  it('opens popover on click', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('save-filter-trigger'));
    expect(screen.getByTestId('save-filter-popover')).toBeInTheDocument();
    expect(screen.getByTestId('save-filter-name-input')).toBeInTheDocument();
  });

  it('calls onSave with name when confirmed', () => {
    const { props } = renderButton();
    fireEvent.click(screen.getByTestId('save-filter-trigger'));
    fireEvent.change(screen.getByTestId('save-filter-name-input'), {
      target: { value: 'My Filter' },
    });
    fireEvent.click(screen.getByTestId('save-filter-confirm'));

    expect(props.onSave).toHaveBeenCalledWith(SAMPLE_STATE, SAMPLE_CQL2, 'My Filter');
  });

  it('calls onSave without name when left blank', () => {
    const { props } = renderButton();
    fireEvent.click(screen.getByTestId('save-filter-trigger'));
    fireEvent.click(screen.getByTestId('save-filter-confirm'));

    expect(props.onSave).toHaveBeenCalledWith(SAMPLE_STATE, SAMPLE_CQL2, undefined);
  });

  it('closes popover on cancel', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('save-filter-trigger'));
    expect(screen.getByTestId('save-filter-popover')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('save-filter-cancel'));
    expect(screen.queryByTestId('save-filter-popover')).not.toBeInTheDocument();
  });

  it('shows overwrite prompt for duplicate name', () => {
    renderButton({ nameExists: (n) => n === 'Existing' });
    fireEvent.click(screen.getByTestId('save-filter-trigger'));
    fireEvent.change(screen.getByTestId('save-filter-name-input'), {
      target: { value: 'Existing' },
    });
    fireEvent.click(screen.getByTestId('save-filter-confirm'));

    expect(screen.getByTestId('save-filter-overwrite')).toBeInTheDocument();
  });

  it('saves on overwrite confirmation', () => {
    const { props } = renderButton({ nameExists: (n) => n === 'Existing' });
    fireEvent.click(screen.getByTestId('save-filter-trigger'));
    fireEvent.change(screen.getByTestId('save-filter-name-input'), {
      target: { value: 'Existing' },
    });
    fireEvent.click(screen.getByTestId('save-filter-confirm'));
    fireEvent.click(screen.getByTestId('save-filter-overwrite-confirm'));

    expect(props.onSave).toHaveBeenCalledWith(SAMPLE_STATE, SAMPLE_CQL2, 'Existing');
  });

  it('saves on Enter key', () => {
    const { props } = renderButton();
    fireEvent.click(screen.getByTestId('save-filter-trigger'));
    fireEvent.change(screen.getByTestId('save-filter-name-input'), {
      target: { value: 'Enter Filter' },
    });
    fireEvent.keyDown(screen.getByTestId('save-filter-name-input'), { key: 'Enter' });

    expect(props.onSave).toHaveBeenCalledWith(SAMPLE_STATE, SAMPLE_CQL2, 'Enter Filter');
  });

  it('closes on Escape key', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('save-filter-trigger'));
    fireEvent.keyDown(screen.getByTestId('save-filter-name-input'), { key: 'Escape' });

    expect(screen.queryByTestId('save-filter-popover')).not.toBeInTheDocument();
  });
});
