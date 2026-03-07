/**
 * Unit tests for the ColourDimensionSelector component (#134).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColourDimensionSelector } from '../ColourDimensionSelector';
import { builtInDimensions } from '../registry';

describe('ColourDimensionSelector', () => {
  it('renders with all dimension options', () => {
    render(
      <ColourDimensionSelector
        dimensions={builtInDimensions}
        activeDimensionId={null}
        onDimensionChange={() => {}}
      />
    );

    const select = screen.getByTestId('colour-dimension-select') as HTMLSelectElement;
    // "None" + 2 built-in dimensions
    expect(select.options).toHaveLength(3);
    expect(select.options[0].text).toBe('None');
    expect(select.options[1].text).toBe('Age');
    expect(select.options[2].text).toBe('Tag');
  });

  it('shows active dimension as selected', () => {
    render(
      <ColourDimensionSelector
        dimensions={builtInDimensions}
        activeDimensionId="tag"
        onDimensionChange={() => {}}
      />
    );

    const select = screen.getByTestId('colour-dimension-select') as HTMLSelectElement;
    expect(select.value).toBe('tag');
  });

  it('calls onDimensionChange with dimension id on selection', () => {
    const onChange = vi.fn();
    render(
      <ColourDimensionSelector
        dimensions={builtInDimensions}
        activeDimensionId={null}
        onDimensionChange={onChange}
      />
    );

    const select = screen.getByTestId('colour-dimension-select');
    fireEvent.change(select, { target: { value: 'age' } });
    expect(onChange).toHaveBeenCalledWith('age');
  });

  it('calls onDimensionChange with null when "None" is selected', () => {
    const onChange = vi.fn();
    render(
      <ColourDimensionSelector
        dimensions={builtInDimensions}
        activeDimensionId="age"
        onDimensionChange={onChange}
      />
    );

    const select = screen.getByTestId('colour-dimension-select');
    fireEvent.change(select, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('renders the label', () => {
    render(
      <ColourDimensionSelector
        dimensions={builtInDimensions}
        activeDimensionId={null}
        onDimensionChange={() => {}}
      />
    );

    expect(screen.getByText('Colour by')).toBeInTheDocument();
  });
});
