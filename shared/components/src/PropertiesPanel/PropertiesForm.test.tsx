/**
 * Component tests for PropertiesForm.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PropertiesForm } from './PropertiesForm';
import type { PropertiesFormField } from './types';

function field(
  overrides: Partial<PropertiesFormField> & Pick<PropertiesFormField, 'key' | 'spec'>,
): PropertiesFormField {
  return {
    key: overrides.key,
    label: overrides.label ?? overrides.key,
    value: overrides.value ?? null,
    spec: overrides.spec,
    derivation: overrides.derivation ?? 'user',
    required: overrides.required ?? false,
    error: overrides.error ?? null,
    ...(overrides.readOnly !== undefined ? { readOnly: overrides.readOnly } : {}),
  };
}

describe('PropertiesForm', () => {
  it('renders a skeleton when loading', () => {
    render(
      <PropertiesForm
        fields={[]}
        onCommitField={() => {}}
        loading={true}
        readOnly={false}
        writeError={null}
      />,
    );
    expect(screen.getByTestId('properties-form').getAttribute('data-loading')).toBe('true');
    expect(screen.getByTestId('properties-skeleton-row-0')).toBeDefined();
    expect(screen.getByTestId('properties-skeleton-row-2')).toBeDefined();
  });

  it('renders a readOnly banner', () => {
    render(
      <PropertiesForm
        fields={[field({ key: 'title', spec: { kind: 'string' } })]}
        onCommitField={() => {}}
        loading={false}
        readOnly={true}
        writeError={null}
      />,
    );
    expect(screen.getByTestId('properties-readonly-banner').textContent).toMatch(
      /read-only/,
    );
  });

  it('renders a writeError banner', () => {
    render(
      <PropertiesForm
        fields={[]}
        onCommitField={() => {}}
        loading={false}
        readOnly={false}
        writeError="Stale edit — please reload"
      />,
    );
    expect(screen.getByTestId('properties-write-error').textContent).toMatch(
      /Stale edit/,
    );
  });

  it('renders each widget kind without crashing', () => {
    render(
      <PropertiesForm
        fields={[
          field({ key: 'title', value: 'hi', spec: { kind: 'string' } }),
          field({ key: 'count', value: 3, spec: { kind: 'number', integer: true } }),
          field({ key: 'active', value: true, spec: { kind: 'boolean' } }),
          field({
            key: 'severity',
            value: 'high',
            spec: { kind: 'enum', allowedValues: ['low', 'high'] },
          }),
          field({
            key: 'start_datetime',
            value: '2025-01-01T00:00:00Z',
            spec: { kind: 'datetime' },
          }),
          field({ key: 'bbox', value: [0, 0, 1, 1], spec: { kind: 'bbox' } }),
          field({ key: 'tags', value: ['a'], spec: { kind: 'string-array' } }),
          field({
            key: 'platforms',
            value: [{ id: 'NELSON' }],
            spec: { kind: 'platform-array' },
          }),
        ]}
        onCommitField={() => {}}
        loading={false}
        readOnly={false}
        writeError={null}
      />,
    );
    expect(screen.getByTestId('properties-field-title')).toBeDefined();
    expect(screen.getByTestId('properties-field-count')).toBeDefined();
    expect(screen.getByTestId('properties-field-active')).toBeDefined();
    expect(screen.getByTestId('properties-field-severity')).toBeDefined();
    expect(screen.getByTestId('datetime-widget-input-start_datetime')).toBeDefined();
    expect(screen.getByTestId('bbox-widget-input-bbox-W')).toBeDefined();
    expect(screen.getByTestId('array-widget-input-tags')).toBeDefined();
    expect(screen.getByTestId('platform-array-widget-platforms')).toBeDefined();
  });

  it('renders auto-derived chip for auto-derived fields', () => {
    render(
      <PropertiesForm
        fields={[
          field({
            key: 'start_datetime',
            value: '2025-01-01T00:00:00Z',
            spec: { kind: 'datetime' },
            derivation: 'auto-derived',
          }),
        ]}
        onCommitField={() => {}}
        loading={false}
        readOnly={false}
        writeError={null}
      />,
    );
    expect(screen.getByTestId('properties-chip-auto-derived').textContent).toMatch(
      /auto-derived/,
    );
  });

  it('renders override chip for overridden fields', () => {
    render(
      <PropertiesForm
        fields={[
          field({
            key: 'start_datetime',
            value: '2025-01-01T00:00:00Z',
            spec: { kind: 'datetime' },
            derivation: 'override',
          }),
        ]}
        onCommitField={() => {}}
        loading={false}
        readOnly={false}
        writeError={null}
      />,
    );
    expect(screen.getByTestId('properties-chip-override').textContent).toMatch(
      /override/,
    );
  });

  it('renders inline field error when field.error is set', () => {
    render(
      <PropertiesForm
        fields={[
          field({
            key: 'title',
            value: '',
            spec: { kind: 'string' },
            error: 'Title is required',
          }),
        ]}
        onCommitField={() => {}}
        loading={false}
        readOnly={false}
        writeError={null}
      />,
    );
    expect(screen.getByTestId('properties-field-error-title').textContent).toBe(
      'Title is required',
    );
  });

  it('adds a `*` suffix on required field labels', () => {
    render(
      <PropertiesForm
        fields={[
          field({ key: 'title', value: '', spec: { kind: 'string' }, required: true }),
        ]}
        onCommitField={() => {}}
        loading={false}
        readOnly={false}
        writeError={null}
      />,
    );
    const row = screen.getByTestId('properties-field-title');
    expect(row.textContent).toContain('*');
  });

  it('passes disabled to widgets when readOnly', () => {
    render(
      <PropertiesForm
        fields={[field({ key: 'tags', value: ['a'], spec: { kind: 'string-array' } })]}
        onCommitField={() => {}}
        loading={false}
        readOnly={true}
        writeError={null}
      />,
    );
    // ArrayWidget hides the input when disabled.
    expect(screen.queryByTestId('array-widget-input-tags')).toBeNull();
  });

  it('disables a single field when field.readOnly=true even with form editable', () => {
    render(
      <PropertiesForm
        fields={[
          field({ key: 'tags', value: ['a'], spec: { kind: 'string-array' } }),
          field({
            key: 'platforms',
            value: [{ id: 'X' }],
            spec: { kind: 'platform-array' },
            readOnly: true,
          }),
        ]}
        onCommitField={() => {}}
        loading={false}
        readOnly={false}
        writeError={null}
      />,
    );
    // Tag input still there (form-editable).
    expect(screen.getByTestId('array-widget-input-tags')).toBeInTheDocument();
    // Platform row rendered, but its add/delete affordances are gone.
    expect(screen.queryByTestId('platform-array-add-platforms')).toBeNull();
    expect(screen.queryByTestId('platform-array-delete-platforms-0')).toBeNull();
  });

  it('renders unsupported fields as disabled read-only with tooltip', () => {
    render(
      <PropertiesForm
        fields={[
          field({
            key: 'weird',
            value: { nested: true },
            spec: { kind: 'unsupported', reason: 'nested object' },
          }),
        ]}
        onCommitField={() => {}}
        loading={false}
        readOnly={false}
        writeError={null}
      />,
    );
    const el = screen.getByTestId('properties-unsupported-weird') as HTMLInputElement;
    expect(el.disabled).toBe(true);
    expect(el.title).toBe('nested object');
  });

  it('forwards commits from scalar widgets to onCommitField', () => {
    const onCommit = vi.fn();
    render(
      <PropertiesForm
        fields={[field({ key: 'tags', value: [], spec: { kind: 'string-array' } })]}
        onCommitField={onCommit}
        loading={false}
        readOnly={false}
        writeError={null}
      />,
    );
    const input = screen.getByTestId('array-widget-input-tags') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'new-tag' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('tags', ['new-tag']);
  });
});
