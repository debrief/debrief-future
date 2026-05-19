/**
 * Vitest for FeatureEditorMode body (Spec 192, Phase 3, T026).
 *
 * TDD per Article VII.1 — these tests are authored before the body lands
 * in T027. They drive the four assertions in tasks.md T026:
 *
 *   1. Header shows the feature display name.
 *   2. Form renders inputs for editable LinkML slots derived from the
 *      schema (driven through the existing PropertiesForm widget machinery).
 *   3. Override fields are visually distinguished from auto-derived (FR-005).
 *   4. Dirty indicator flips on any change.
 *
 * Per the brief: the visual distinction reuses the shipped `DerivationChip`
 * in `PropertiesForm` (testid `properties-chip-override`) — no new widget.
 * The component composes `PropertiesForm` rather than re-implementing it.
 *
 * Note: the offline harness installed by `vitest.config.ts setupFiles`
 * blocks `fetch` / `XMLHttpRequest`, so the JSON-schema import in
 * `FeatureEditorMode` must be a synchronous bundle (not a dynamic fetch).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type {
  DebriefFeature,
  TrackFeature,
  TrackProperties,
} from '@debrief/schemas';
import { renderHook } from '@testing-library/react';
import { useStagedEdits } from '../../ActivityPanel/useStagedEdits';
import { FeatureEditorMode } from '../modes/FeatureEditorMode';

// ─── Fixture builders ────────────────────────────────────────────────

function buildTrack(
  id: string,
  overrides: Partial<TrackProperties> = {},
): TrackFeature {
  const props: TrackProperties = {
    kind: 'TRACK',
    platform_id: 'PLT-001',
    platform_name: 'HMS Test',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z' },
      { time: '2024-01-15T08:05:00Z' },
    ],
    style: {} as TrackProperties['style'],
    default_position_style: {} as TrackProperties['default_position_style'],
    ...overrides,
  } as TrackProperties;
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      // eslint-disable-next-line no-restricted-syntax -- test fixture coords
      coordinates: [
        [-5, 50],
        [-4.9, 50],
      ] as unknown as number[],
    },
    properties: props,
  } as TrackFeature;
}

// Renders FeatureEditorMode with a real `useStagedEdits` hook so the
// dirty-indicator assertion exercises the actual reducer + selector.
function renderWithRealStaging(
  feature: DebriefFeature,
  options: { readOnly?: boolean } = {},
): {
  staging: ReturnType<typeof useStagedEdits>;
  rerender: (next: DebriefFeature) => void;
} {
  const hook = renderHook(() => useStagedEdits());

  function ModeHarness({ f }: { f: DebriefFeature }): React.ReactElement {
    return (
      <FeatureEditorMode
        feature={f}
        readOnly={options.readOnly ?? false}
        setFeatureField={hook.result.current.setFeatureField}
        revertField={hook.result.current.revertField}
        unrevertField={hook.result.current.unrevertField}
      />
    );
  }

  const view = render(<ModeHarness f={feature} />);
  return {
    staging: hook.result.current,
    rerender: (next) => view.rerender(<ModeHarness f={next} />),
  };
}

describe('FeatureEditorMode (Spec 192, T026)', () => {
  // ─── Header ────────────────────────────────────────────────────────
  it('renders the mode container with a stable testid', () => {
    const feature = buildTrack('track-1');
    renderWithRealStaging(feature);
    expect(screen.getByTestId('properties-mode-feature')).toBeDefined();
  });

  it('header shows the feature display name (platform_name)', () => {
    const feature = buildTrack('track-1', { platform_name: 'HMS Phoenix' });
    renderWithRealStaging(feature);
    expect(
      screen.getByTestId('properties-mode-feature').textContent,
    ).toMatch(/HMS Phoenix/);
  });

  it('header falls back to platform_id when no display name is set', () => {
    const feature = buildTrack('track-1', {
      platform_name: undefined,
      platform_id: 'PLT-XYZ',
    });
    renderWithRealStaging(feature);
    expect(
      screen.getByTestId('properties-mode-feature').textContent,
    ).toMatch(/PLT-XYZ/);
  });

  // ─── Editable LinkML slot rendering ─────────────────────────────────
  it('renders inputs for every editable LinkML slot on a TrackFeature', () => {
    const feature = buildTrack('track-1');
    renderWithRealStaging(feature);
    // The seven editable slots derived from TrackProperties (Pick<>):
    // display_name, nationality, vessel_class, vessel_type, vessel_role,
    // domain, tags. Each MUST surface as a `properties-field-<slot>` row.
    for (const slot of [
      'display_name',
      'nationality',
      'vessel_class',
      'vessel_type',
      'vessel_role',
      'domain',
      'tags',
    ]) {
      expect(
        screen.getByTestId(`properties-field-${slot}`),
        `expected a row for ${slot}`,
      ).toBeDefined();
    }
  });

  it('per-field data-testid follows the slot-name convention (T028)', () => {
    const feature = buildTrack('track-1');
    renderWithRealStaging(feature);
    // The brief calls these out specifically — the slot-name testids on
    // the field rows are the Playwright + a11y anchor surface.
    expect(screen.getByTestId('properties-field-tags')).toBeDefined();
    expect(screen.getByTestId('properties-field-display_name')).toBeDefined();
  });

  // ─── Override vs auto-derived visual distinction (FR-005) ───────────
  it('per-platform override fields render the override chip when set', () => {
    // Setting `vessel_role` makes it an explicit override → derivation
    // becomes "override" and the existing DerivationChip in PropertiesForm
    // surfaces a `data-testid="properties-chip-override"` element.
    const feature = buildTrack('track-1', { vessel_role: 'frigate' });
    renderWithRealStaging(feature);
    const overrideChips = screen.queryAllByTestId('properties-chip-override');
    expect(overrideChips.length).toBeGreaterThan(0);
  });

  it('per-platform override fields without an explicit value do NOT render the override chip', () => {
    // No override set → no `properties-chip-override` for that slot.
    const feature = buildTrack('track-1', {
      vessel_role: undefined,
      vessel_class: undefined,
      vessel_type: undefined,
      nationality: undefined,
      display_name: undefined,
      domain: undefined,
    });
    renderWithRealStaging(feature);
    const overrideChips = screen.queryAllByTestId('properties-chip-override');
    expect(overrideChips.length).toBe(0);
  });

  it('the `tags` slot (base property, never an override) does NOT render the override chip', () => {
    // tags is a BaseFeatureProperties slot — not one of the six FR-005
    // override slots — so its derivation is always "user".
    const feature = buildTrack('track-1', { tags: ['alpha', 'beta'] });
    renderWithRealStaging(feature);
    // The tags row must render, but with no override chip inside.
    const tagsRow = screen.getByTestId('properties-field-tags');
    expect(
      tagsRow.querySelector('[data-testid="properties-chip-override"]'),
    ).toBeNull();
  });

  // ─── Dirty indicator + staged-edit threading ────────────────────────
  it('isDirty() is false on initial render with no edits', () => {
    const feature = buildTrack('track-1');
    const { staging } = renderWithRealStaging(feature);
    expect(staging.isDirty()).toBe(false);
  });

  it('typing into the tags input routes through setFeatureField with the feature id and slot key', () => {
    const feature = buildTrack('track-1', { tags: ['alpha'] });
    const setFeatureField = vi.fn();
    const revertField = vi.fn();
    const unrevertField = vi.fn();

    render(
      <FeatureEditorMode
        feature={feature}
        readOnly={false}
        setFeatureField={setFeatureField}
        revertField={revertField}
        unrevertField={unrevertField}
      />,
    );

    // The ArrayWidget renders its input under
    // `data-testid="array-widget-input-tags"` (see ArrayWidget.tsx).
    // Pressing Enter on a non-empty draft commits the full new array.
    const addInput = screen.getByTestId('array-widget-input-tags');
    fireEvent.change(addInput, { target: { value: 'gamma' } });
    fireEvent.keyDown(addInput, { key: 'Enter', code: 'Enter' });

    expect(setFeatureField).toHaveBeenCalled();
    // The first arg must be the feature id; the second the slot key.
    const [featureId, slot, next] = setFeatureField.mock.calls[0]!;
    expect(featureId).toBe('track-1');
    expect(slot).toBe('tags');
    // next is the new array (existing alpha + new gamma).
    expect(next).toEqual(['alpha', 'gamma']);
  });

  it('isDirty() flips to true after an edit is staged through the real hook', () => {
    const feature = buildTrack('track-1', { tags: ['alpha'] });
    const hook = renderHook(() => useStagedEdits());

    function Harness({ f }: { f: DebriefFeature }): React.ReactElement {
      return (
        <FeatureEditorMode
          feature={f}
          readOnly={false}
          setFeatureField={hook.result.current.setFeatureField}
          revertField={hook.result.current.revertField}
          unrevertField={hook.result.current.unrevertField}
        />
      );
    }

    render(<Harness f={feature} />);
    expect(hook.result.current.isDirty()).toBe(false);

    const addInput = screen.getByTestId('array-widget-input-tags');
    fireEvent.change(addInput, { target: { value: 'gamma' } });
    fireEvent.keyDown(addInput, { key: 'Enter', code: 'Enter' });

    expect(hook.result.current.isDirty()).toBe(true);
  });

  it('readOnly disables every input by stamping aria-disabled on the mode container', () => {
    const feature = buildTrack('track-1');
    renderWithRealStaging(feature, { readOnly: true });
    expect(
      screen.getByTestId('properties-mode-feature').getAttribute('aria-disabled'),
    ).toBe('true');
  });
});
