import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValueEditor } from '../ValueEditor';

describe('ValueEditor', () => {
  describe('flat-dropdown', () => {
    it('renders dropdown with available values', () => {
      render(
        <ValueEditor
          filterType="nationality"
          value=""
          onSelect={vi.fn()}
          onClose={vi.fn()}
          availableValues={['British', 'French', 'German']}
        />
      );

      expect(screen.getByTestId('value-editor-dropdown')).toBeInTheDocument();
      expect(screen.getByTestId('value-option-French')).toBeInTheDocument();
      expect(screen.getByTestId('value-option-British')).toBeInTheDocument();
    });

    it('fires onSelect with value when option clicked', () => {
      const onSelect = vi.fn();
      render(
        <ValueEditor
          filterType="nationality"
          value=""
          onSelect={onSelect}
          onClose={vi.fn()}
          availableValues={['British', 'French']}
        />
      );

      fireEvent.click(screen.getByTestId('value-option-French'));
      expect(onSelect).toHaveBeenCalledWith('French');
    });

    it('shows empty message when no values available', () => {
      render(
        <ValueEditor
          filterType="nationality"
          value=""
          onSelect={vi.fn()}
          onClose={vi.fn()}
          availableValues={[]}
        />
      );

      expect(screen.getByText('No values available')).toBeInTheDocument();
    });
  });

  describe('bucket (duration)', () => {
    it('renders fixed duration options', () => {
      render(
        <ValueEditor
          filterType="duration"
          value=""
          onSelect={vi.fn()}
          onClose={vi.fn()}
          availableValues={[]}
        />
      );

      expect(screen.getByTestId('value-editor-bucket')).toBeInTheDocument();
      expect(screen.getByText('Under 6 hours')).toBeInTheDocument();
      expect(screen.getByText('Over 10 days')).toBeInTheDocument();
    });

    it('fires onSelect with bucket value', () => {
      const onSelect = vi.fn();
      render(
        <ValueEditor
          filterType="duration"
          value=""
          onSelect={onSelect}
          onClose={vi.fn()}
          availableValues={[]}
        />
      );

      fireEvent.click(screen.getByTestId('value-option-<24H'));
      expect(onSelect).toHaveBeenCalledWith('<24H');
    });
  });

  describe('free-text', () => {
    it('renders text input for title', () => {
      render(
        <ValueEditor
          filterType="title"
          value=""
          onSelect={vi.fn()}
          onClose={vi.fn()}
          availableValues={[]}
        />
      );

      expect(screen.getByTestId('value-editor-free-text')).toBeInTheDocument();
      expect(screen.getByTestId('value-editor-text-input')).toBeInTheDocument();
    });

    it('renders text input for plot-contents', () => {
      render(
        <ValueEditor
          filterType="plot-contents"
          value=""
          onSelect={vi.fn()}
          onClose={vi.fn()}
          availableValues={[]}
        />
      );

      expect(screen.getByTestId('value-editor-free-text')).toBeInTheDocument();
    });

    it('fires onSelect on Enter key', () => {
      const onSelect = vi.fn();
      render(
        <ValueEditor
          filterType="title"
          value=""
          onSelect={onSelect}
          onClose={vi.fn()}
          availableValues={[]}
        />
      );

      const input = screen.getByTestId('value-editor-text-input');
      fireEvent.change(input, { target: { value: 'test query' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledWith('test query');
    });

    it('fires onSelect on Apply button click', () => {
      const onSelect = vi.fn();
      render(
        <ValueEditor
          filterType="title"
          value=""
          onSelect={onSelect}
          onClose={vi.fn()}
          availableValues={[]}
        />
      );

      const input = screen.getByTestId('value-editor-text-input');
      fireEvent.change(input, { target: { value: 'search term' } });
      fireEvent.click(screen.getByTestId('value-editor-apply'));
      expect(onSelect).toHaveBeenCalledWith('search term');
    });

    it('disables Apply button when input is empty', () => {
      render(
        <ValueEditor
          filterType="title"
          value=""
          onSelect={vi.fn()}
          onClose={vi.fn()}
          availableValues={[]}
        />
      );

      expect(screen.getByTestId('value-editor-apply')).toBeDisabled();
    });

    it('does not fire onSelect while typing', () => {
      const onSelect = vi.fn();
      render(
        <ValueEditor
          filterType="title"
          value=""
          onSelect={onSelect}
          onClose={vi.fn()}
          availableValues={[]}
        />
      );

      const input = screen.getByTestId('value-editor-text-input');
      fireEvent.change(input, { target: { value: 'partial' } });
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('typeahead (filename)', () => {
    const filenames = ['satc--bluetrack', 'satc--bluesensor', 'demo-tracks--alpha', 'demo-tracks--beta'];

    it('renders typeahead input', () => {
      render(
        <ValueEditor
          filterType="filename"
          value=""
          onSelect={vi.fn()}
          onClose={vi.fn()}
          availableValues={filenames}
        />
      );

      expect(screen.getByTestId('value-editor-typeahead')).toBeInTheDocument();
      expect(screen.getByTestId('value-editor-typeahead-input')).toBeInTheDocument();
    });

    it('filters available values as user types', () => {
      render(
        <ValueEditor
          filterType="filename"
          value=""
          onSelect={vi.fn()}
          onClose={vi.fn()}
          availableValues={filenames}
        />
      );

      const input = screen.getByTestId('value-editor-typeahead-input');
      fireEvent.change(input, { target: { value: 'satc' } });

      expect(screen.getByTestId('value-editor-typeahead-list')).toBeInTheDocument();
      expect(screen.getByTestId('value-option-satc--bluetrack')).toBeInTheDocument();
      expect(screen.getByTestId('value-option-satc--bluesensor')).toBeInTheDocument();
      expect(screen.queryByTestId('value-option-demo-tracks--alpha')).not.toBeInTheDocument();
    });

    it('fires onSelect when clicking a suggestion', () => {
      const onSelect = vi.fn();
      render(
        <ValueEditor
          filterType="filename"
          value=""
          onSelect={onSelect}
          onClose={vi.fn()}
          availableValues={filenames}
        />
      );

      const input = screen.getByTestId('value-editor-typeahead-input');
      fireEvent.change(input, { target: { value: 'blue' } });
      fireEvent.click(screen.getByTestId('value-option-satc--bluetrack'));
      expect(onSelect).toHaveBeenCalledWith('satc--bluetrack');
    });

    it('fires onSelect on Enter with highlighted suggestion', () => {
      const onSelect = vi.fn();
      render(
        <ValueEditor
          filterType="filename"
          value=""
          onSelect={onSelect}
          onClose={vi.fn()}
          availableValues={filenames}
        />
      );

      const input = screen.getByTestId('value-editor-typeahead-input');
      fireEvent.change(input, { target: { value: 'demo' } });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledWith('demo-tracks--alpha');
    });

    it('shows no matches message when nothing matches', () => {
      render(
        <ValueEditor
          filterType="filename"
          value=""
          onSelect={vi.fn()}
          onClose={vi.fn()}
          availableValues={filenames}
        />
      );

      const input = screen.getByTestId('value-editor-typeahead-input');
      fireEvent.change(input, { target: { value: 'zzzzz' } });
      expect(screen.getByText('No matches')).toBeInTheDocument();
    });

    it('does not show dropdown when input is empty', () => {
      render(
        <ValueEditor
          filterType="filename"
          value=""
          onSelect={vi.fn()}
          onClose={vi.fn()}
          availableValues={filenames}
        />
      );

      expect(screen.queryByTestId('value-editor-typeahead-list')).not.toBeInTheDocument();
    });
  });

  describe('hierarchical (vessel-class)', () => {
    it('renders CascadingMenu for vessel-class', () => {
      render(
        <ValueEditor
          filterType="vessel-class"
          value=""
          onSelect={vi.fn()}
          onClose={vi.fn()}
          availableValues={[]}
          taxonomy={[
            { id: 'surface', label: 'Surface', children: [{ id: 'warship', label: 'Warship' }] },
          ]}
        />
      );

      expect(screen.getByTestId('value-editor-hierarchical')).toBeInTheDocument();
    });

    it('selecting a branch node (not just leaf) fires onSelect', () => {
      const onSelect = vi.fn();
      render(
        <ValueEditor
          filterType="vessel-class"
          value=""
          onSelect={onSelect}
          onClose={vi.fn()}
          availableValues={[]}
          taxonomy={[
            {
              id: 'surface',
              label: 'Surface',
              children: [
                {
                  id: 'warship',
                  label: 'Warship',
                  children: [{ id: 'frigate', label: 'Frigate' }],
                },
              ],
            },
          ]}
        />
      );

      // Click "Surface" which is a branch node with children
      fireEvent.click(screen.getByTestId('menu-item-surface'));
      expect(onSelect).toHaveBeenCalledWith('surface');
    });
  });
});
