/**
 * Unit tests for PlatformValueEditor (#186).
 * Covers U17–U23 from contracts/test-list.md.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { PlatformValueEditor } from '../PlatformValueEditor';
import type { VesselTaxonomyNode } from '../../filter-engine';

afterEach(() => cleanup());

const AVAILABLE_VALUES = {
  nationality: ['DE', 'GB', 'US'] as readonly string[],
  domain: ['subsurface', 'surface'] as readonly string[],
  vessel_role: ['destroyer', 'frigate', 'submarine'] as readonly string[],
  vessel_type: ['type23', 'type26', 'type45'] as readonly string[],
} as const;

const TAXONOMY: readonly VesselTaxonomyNode[] = [
  {
    id: 'surface',
    label: 'Surface',
    children: [
      {
        id: 'warship',
        label: 'Warship',
        children: [
          {
            id: 'frigate',
            label: 'Frigate',
            children: [{ id: 'type23', label: 'Type 23' }],
          },
        ],
      },
    ],
  },
];

describe('PlatformValueEditor (#186)', () => {
  // U17
  it('U17: renders one picker per supported attribute', () => {
    render(
      <PlatformValueEditor
        initialAttributes={{}}
        availableValues={AVAILABLE_VALUES}
        taxonomy={TAXONOMY}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByTestId('platform-editor-row-nationality')).toBeTruthy();
    expect(screen.getByTestId('platform-editor-row-domain')).toBeTruthy();
    expect(screen.getByTestId('platform-editor-row-vessel_role')).toBeTruthy();
    expect(screen.getByTestId('platform-editor-row-vessel_type')).toBeTruthy();
    expect(screen.getByTestId('platform-editor-row-vessel_class')).toBeTruthy();
  });

  // U18
  it('U18: confirm disabled until at least one attribute has a value', () => {
    const onConfirm = vi.fn();
    render(
      <PlatformValueEditor
        initialAttributes={{}}
        availableValues={AVAILABLE_VALUES}
        taxonomy={TAXONOMY}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    const confirmBtn = screen.getByTestId('platform-editor-confirm') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    fireEvent.change(
      screen.getByTestId('platform-editor-select-nationality') as HTMLSelectElement,
      { target: { value: 'GB' } },
    );
    expect(confirmBtn.disabled).toBe(false);
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({ nationality: 'GB' });
  });

  // U19
  it('U19: clearing an attribute picker removes that attribute from the confirmed map', () => {
    const onConfirm = vi.fn();
    render(
      <PlatformValueEditor
        initialAttributes={{ nationality: 'GB', domain: 'subsurface' }}
        availableValues={AVAILABLE_VALUES}
        taxonomy={TAXONOMY}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    fireEvent.change(
      screen.getByTestId('platform-editor-select-domain') as HTMLSelectElement,
      { target: { value: '' } },
    );
    fireEvent.click(screen.getByTestId('platform-editor-confirm'));
    expect(onConfirm).toHaveBeenCalledWith({ nationality: 'GB' });
  });

  // U20
  it('U20: pre-fills from initialAttributes in edit mode', () => {
    render(
      <PlatformValueEditor
        initialAttributes={{ nationality: 'GB', vessel_role: 'frigate' }}
        availableValues={AVAILABLE_VALUES}
        taxonomy={TAXONOMY}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const natSelect = screen.getByTestId(
      'platform-editor-select-nationality',
    ) as HTMLSelectElement;
    expect(natSelect.value).toBe('GB');
    const roleSelect = screen.getByTestId(
      'platform-editor-select-vessel_role',
    ) as HTMLSelectElement;
    expect(roleSelect.value).toBe('frigate');
  });

  // U21
  it('U21: Cancel closes the editor without calling onConfirm', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <PlatformValueEditor
        initialAttributes={{ nationality: 'GB' }}
        availableValues={AVAILABLE_VALUES}
        taxonomy={TAXONOMY}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByTestId('platform-editor-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // U22
  it('U22: Escape key triggers onCancel', () => {
    const onCancel = vi.fn();
    render(
      <PlatformValueEditor
        initialAttributes={{ nationality: 'GB' }}
        availableValues={AVAILABLE_VALUES}
        taxonomy={TAXONOMY}
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  // U23
  it('U23: click-outside triggers onCancel', () => {
    const onCancel = vi.fn();
    render(
      <div>
        <div data-testid="outside">outside</div>
        <PlatformValueEditor
          initialAttributes={{ nationality: 'GB' }}
          availableValues={AVAILABLE_VALUES}
          taxonomy={TAXONOMY}
          onConfirm={() => {}}
          onCancel={onCancel}
        />
      </div>,
    );
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows empty-state hint when no distinct values and no taxonomy', () => {
    render(
      <PlatformValueEditor
        initialAttributes={{}}
        availableValues={{ nationality: [], domain: [], vessel_role: [], vessel_type: [] }}
        taxonomy={[]}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByTestId('platform-editor-empty')).toBeTruthy();
  });
});
