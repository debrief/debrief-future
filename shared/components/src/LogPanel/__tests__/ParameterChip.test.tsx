/**
 * Component tests for ParameterChip.
 *
 * Feature: 176-log-panel-ux (Gap 4: component test infra)
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ParameterChip } from '../ParameterChip';
import type { ParamChipData } from '../types';

function chip(overrides: Partial<ParamChipData> = {}): ParamChipData {
  return {
    name: 'speed',
    value: 30,
    paramType: 'number',
    isDefault: false,
    ...overrides,
  };
}

describe('ParameterChip', () => {
  it('renders with number type icon', () => {
    render(<ParameterChip chip={chip()} />);
    const el = screen.getByTestId('param-chip-speed');
    expect(el).toBeDefined();
    expect(el.getAttribute('data-param-type')).toBe('number');
    expect(el.textContent).toContain('#');
    expect(el.textContent).toContain('30');
  });

  it('renders colour swatch for colour type', () => {
    render(<ParameterChip chip={chip({ name: 'fill', value: 'green', paramType: 'colour' })} />);
    const el = screen.getByTestId('param-chip-fill');
    expect(el.getAttribute('data-param-type')).toBe('colour');
    // Should contain the block swatch character
    expect(el.textContent).toContain('\u2588');
    expect(el.textContent).toContain('green');
  });

  it('renders boolean with yes/no', () => {
    render(<ParameterChip chip={chip({ name: 'visible', value: true, paramType: 'boolean' })} />);
    const el = screen.getByTestId('param-chip-visible');
    expect(el.textContent).toContain('yes');
    expect(el.textContent).toContain('\u22A4'); // ⊤
  });

  it('renders boolean false with no', () => {
    render(<ParameterChip chip={chip({ name: 'visible', value: false, paramType: 'boolean' })} />);
    const el = screen.getByTestId('param-chip-visible');
    expect(el.textContent).toContain('no');
    expect(el.textContent).toContain('\u22A5'); // ⊥
  });

  it('renders enum with list icon', () => {
    render(<ParameterChip chip={chip({ name: 'mode', value: 'linear', paramType: 'enum' })} />);
    const el = screen.getByTestId('param-chip-mode');
    expect(el.textContent).toContain('\u2261'); // ≡
    expect(el.textContent).toContain('linear');
  });

  it('shows non-default marker when isDefault is false', () => {
    render(<ParameterChip chip={chip({ isDefault: false })} />);
    const marker = screen.getByLabelText('non-default value');
    expect(marker).toBeDefined();
  });

  it('hides non-default marker when isDefault is true', () => {
    render(<ParameterChip chip={chip({ isDefault: true })} />);
    const marker = screen.queryByLabelText('non-default value');
    expect(marker).toBeNull();
  });

  it('renders plain text for null paramType', () => {
    render(<ParameterChip chip={chip({ name: 'name', value: 'HMS Foo', paramType: null })} />);
    const el = screen.getByTestId('param-chip-name');
    expect(el.getAttribute('data-param-type')).toBe('unknown');
    expect(el.textContent).toContain('HMS Foo');
  });
});
