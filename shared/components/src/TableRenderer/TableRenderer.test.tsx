/**
 * Tests for TableRenderer component.
 * Feature: 177-tabular-results-panel
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TableRenderer } from './TableRenderer';

describe('TableRenderer', () => {
  it('renders empty state when data is empty', () => {
    render(<TableRenderer data={[]} />);
    expect(screen.getByTestId('table-renderer-empty')).toBeTruthy();
    expect(screen.getByText('No data to display')).toBeTruthy();
  });

  it('renders a table with column headers from data keys', () => {
    const data = [
      { metric: 'speed', value: 12.34 },
      { metric: 'bearing', value: 45.67 },
    ];
    render(<TableRenderer data={data} />);
    expect(screen.getByTestId('table-renderer')).toBeTruthy();
    expect(screen.getByText('metric')).toBeTruthy();
    expect(screen.getByText('value')).toBeTruthy();
  });

  it('renders data values in cells', () => {
    const data = [{ name: 'Alpha', count: 42 }];
    render(<TableRenderer data={data} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('formats numbers to 4 significant figures', () => {
    const data = [{ value: 3.14159 }];
    render(<TableRenderer data={data} />);
    expect(screen.getByText('3.142')).toBeTruthy();
  });

  it('shows em-dash for null values', () => {
    const data = [{ value: null }];
    render(<TableRenderer data={data} />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('has accessible table role and aria-label', () => {
    const data = [{ x: 1 }];
    render(<TableRenderer data={data} />);
    const table = screen.getByRole('table');
    expect(table).toBeTruthy();
    expect(table.getAttribute('aria-label')).toBe('Tool results');
  });

  it('applies custom className', () => {
    const data = [{ x: 1 }];
    const { container } = render(<TableRenderer data={data} className="my-table" />);
    const wrapper = container.querySelector('.my-table');
    expect(wrapper).toBeTruthy();
  });
});
