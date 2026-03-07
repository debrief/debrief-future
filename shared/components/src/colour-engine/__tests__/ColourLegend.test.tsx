/**
 * Unit tests for the ColourLegend component (#134).
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColourLegend } from '../ColourLegend';
import type { LegendModel, ColourDimension } from '../types';

const categoricalDimension: ColourDimension = {
  id: 'vessel-class',
  label: 'Vessel Class',
  type: 'categorical',
  resolve: () => null,
};

const gradientDimension: ColourDimension = {
  id: 'age',
  label: 'Age',
  type: 'gradient',
  resolve: () => null,
};

describe('ColourLegend', () => {
  it('renders nothing when legend is null', () => {
    const { container } = render(
      <ColourLegend legend={null} unclassifiedColour="#999" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders categorical entries with swatches', () => {
    const legend: LegendModel = {
      dimension: categoricalDimension,
      entries: [
        { label: 'Frigate', colour: '#4477AA', count: 5 },
        { label: 'Destroyer', colour: '#EE6677', count: 3 },
      ],
      gradient: null,
      hasUnclassified: false,
    };

    render(<ColourLegend legend={legend} unclassifiedColour="#999" />);

    expect(screen.getByTestId('colour-legend-title')).toHaveTextContent('Vessel Class');
    expect(screen.getByTestId('colour-legend-entries')).toBeInTheDocument();
    expect(screen.getByText('Frigate')).toBeInTheDocument();
    expect(screen.getByText('Destroyer')).toBeInTheDocument();
    expect(screen.getByText('(5)')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('renders gradient bar with range labels', () => {
    const legend: LegendModel = {
      dimension: gradientDimension,
      entries: [],
      gradient: {
        minLabel: 'Jan 2020',
        maxLabel: 'Mar 2026',
        minColour: '#C8D6E5',
        maxColour: '#2E86DE',
      },
      hasUnclassified: false,
    };

    render(<ColourLegend legend={legend} unclassifiedColour="#999" />);

    expect(screen.getByTestId('colour-legend-gradient')).toBeInTheDocument();
    expect(screen.getByText('Jan 2020')).toBeInTheDocument();
    expect(screen.getByText('Mar 2026')).toBeInTheDocument();
  });

  it('shows Unclassified entry when hasUnclassified is true', () => {
    const legend: LegendModel = {
      dimension: categoricalDimension,
      entries: [{ label: 'Frigate', colour: '#4477AA', count: 5 }],
      gradient: null,
      hasUnclassified: true,
    };

    render(<ColourLegend legend={legend} unclassifiedColour="#999" />);

    expect(screen.getByText('Unclassified')).toBeInTheDocument();
  });

  it('does not show Unclassified entry when hasUnclassified is false', () => {
    const legend: LegendModel = {
      dimension: categoricalDimension,
      entries: [{ label: 'Frigate', colour: '#4477AA', count: 5 }],
      gradient: null,
      hasUnclassified: false,
    };

    render(<ColourLegend legend={legend} unclassifiedColour="#999" />);

    expect(screen.queryByText('Unclassified')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const legend: LegendModel = {
      dimension: categoricalDimension,
      entries: [],
      gradient: null,
      hasUnclassified: false,
    };

    render(<ColourLegend legend={legend} unclassifiedColour="#999" className="custom-class" />);

    const element = screen.getByTestId('colour-legend');
    expect(element.className).toContain('custom-class');
  });

  it('has correct aria-label', () => {
    const legend: LegendModel = {
      dimension: categoricalDimension,
      entries: [],
      gradient: null,
      hasUnclassified: false,
    };

    render(<ColourLegend legend={legend} unclassifiedColour="#999" />);

    expect(screen.getByRole('region')).toHaveAttribute(
      'aria-label',
      'Colour legend: Vessel Class'
    );
  });
});
