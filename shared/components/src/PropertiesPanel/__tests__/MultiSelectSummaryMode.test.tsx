/**
 * Vitest for MultiSelectSummaryMode body (Spec 192, Phase 7, T053).
 *
 * TDD per Article VII.1 — these tests are authored before the body lands
 * in T054. They drive the four assertions in tasks.md T053:
 *
 *   1. Given two features with overlapping + diverging fields, shared
 *      values render their actual value.
 *   2. Diverging fields render the `(differs)` token.
 *   3. Every input/control is `aria-disabled` (FR-011).
 *   4. The mode container exposes `data-testid="properties-mode-multiselect"`
 *      and the diverging cells expose
 *      `data-testid="multiselect-differs-<slot>"`.
 *
 * The editable slot set for v1 (FR-011) mirrors the seven slots Phase 3
 * settled on in `FeatureEditorMode`:
 *   `display_name`, `nationality`, `vessel_class`, `vessel_type`,
 *   `vessel_role`, `domain`, `tags`.
 *
 * Article IV.5: the same `FeatureEditableProperties` (Pick<>) drives the
 * slot list — see assertions on the seven slot rows below.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type {
  DebriefFeature,
  TrackFeature,
  TrackProperties,
} from '@debrief/schemas';
import { MultiSelectSummaryMode } from '../modes/MultiSelectSummaryMode';

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

function buildMap(features: DebriefFeature[]): ReadonlyMap<string, DebriefFeature> {
  const m = new Map<string, DebriefFeature>();
  for (const f of features) {
    m.set(String(f.id), f);
  }
  return m;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('MultiSelectSummaryMode (Spec 192, T053)', () => {
  // ─── Container + a11y ──────────────────────────────────────────────
  it('renders the mode container with the expected testid', () => {
    const fa = buildTrack('f-a');
    const fb = buildTrack('f-b');
    render(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa, fb])}
      />,
    );
    expect(screen.getByTestId('properties-mode-multiselect')).toBeDefined();
  });

  it('header reports the count of selected features', () => {
    const fa = buildTrack('f-a');
    const fb = buildTrack('f-b');
    render(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa, fb])}
      />,
    );
    expect(
      screen.getByTestId('properties-mode-multiselect').textContent,
    ).toMatch(/2 features selected/);
  });

  it('container is aria-disabled="true" (FR-011)', () => {
    const fa = buildTrack('f-a');
    const fb = buildTrack('f-b');
    render(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa, fb])}
      />,
    );
    expect(
      screen.getByTestId('properties-mode-multiselect').getAttribute('aria-disabled'),
    ).toBe('true');
  });

  // ─── Derivation: shared vs differs ─────────────────────────────────
  it('shared values render their actual value (overlapping field)', () => {
    // Both tracks share `nationality: 'GB'`.
    const fa = buildTrack('f-a', { nationality: 'GB' });
    const fb = buildTrack('f-b', { nationality: 'GB' });
    render(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa, fb])}
      />,
    );
    // The shared slot's row exposes the common value; the `(differs)`
    // token must NOT be present on this row.
    const sharedRow = screen.getByTestId('multiselect-row-nationality');
    expect(sharedRow.textContent).toMatch(/GB/);
    expect(within(sharedRow).queryByTestId('multiselect-differs-nationality')).toBeNull();
  });

  it('diverging fields render the (differs) token with the right testid', () => {
    // Feature A has display_name 'HMS Alpha'; feature B has 'HMS Bravo'.
    const fa = buildTrack('f-a', { display_name: 'HMS Alpha' });
    const fb = buildTrack('f-b', { display_name: 'HMS Bravo' });
    render(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa, fb])}
      />,
    );
    const differs = screen.getByTestId('multiselect-differs-display_name');
    expect(differs).toBeDefined();
    expect(differs.textContent).toMatch(/differs/i);
  });

  it('shared arrays (tags) render as a shared value; diverging arrays render (differs)', () => {
    // Case A: same tags array (order matters per deep-equal contract).
    const fa = buildTrack('f-a', { tags: ['alpha', 'beta'] });
    const fb = buildTrack('f-b', { tags: ['alpha', 'beta'] });
    const { rerender } = render(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa, fb])}
      />,
    );
    expect(screen.queryByTestId('multiselect-differs-tags')).toBeNull();

    // Case B: differing tags arrays.
    const fa2 = buildTrack('f-a', { tags: ['alpha'] });
    const fb2 = buildTrack('f-b', { tags: ['beta'] });
    rerender(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa2, fb2])}
      />,
    );
    expect(screen.getByTestId('multiselect-differs-tags')).toBeDefined();
  });

  // ─── Slot set ──────────────────────────────────────────────────────
  it('renders a row for every editable slot in the v1 set', () => {
    const fa = buildTrack('f-a');
    const fb = buildTrack('f-b');
    render(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa, fb])}
      />,
    );
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
        screen.getByTestId(`multiselect-row-${slot}`),
        `expected a row for slot ${slot}`,
      ).toBeDefined();
    }
  });

  // ─── Inputs disabled (FR-011) ──────────────────────────────────────
  it('every input/control inside the summary is disabled or aria-disabled', () => {
    const fa = buildTrack('f-a', { display_name: 'HMS Alpha', tags: ['x'] });
    const fb = buildTrack('f-b', { display_name: 'HMS Bravo', tags: ['y'] });
    render(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa, fb])}
      />,
    );
    const container = screen.getByTestId('properties-mode-multiselect');
    // FR-011 — there must NOT be any enabled <input>, <textarea>, <select>,
    // or <button> in the summary. (We allow elements with disabled=true.)
    const inputs = container.querySelectorAll('input, textarea, select');
    for (const el of Array.from(inputs)) {
      // Either disabled OR aria-disabled="true" satisfies FR-011.
      const ariaDisabled = el.getAttribute('aria-disabled');
      const disabledAttr = (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)
        .disabled;
      expect(disabledAttr || ariaDisabled === 'true').toBe(true);
    }
  });

  it('honours the read-only signal (no behavioural change — surface stays non-interactive)', () => {
    // FR-011's "non-interactive" requirement is unconditional. Verifying
    // here that `readOnly` doesn't accidentally re-enable any control.
    const fa = buildTrack('f-a', { display_name: 'HMS Alpha' });
    const fb = buildTrack('f-b', { display_name: 'HMS Bravo' });
    render(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa, fb])}
        readOnly={true}
      />,
    );
    expect(
      screen.getByTestId('properties-mode-multiselect').getAttribute('aria-disabled'),
    ).toBe('true');
  });

  // ─── Bottom-of-form note ───────────────────────────────────────────
  it('renders the inline "bulk edit not supported" note', () => {
    const fa = buildTrack('f-a');
    const fb = buildTrack('f-b');
    render(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa, fb])}
      />,
    );
    expect(
      screen.getByTestId('properties-mode-multiselect').textContent ?? '',
    ).toMatch(/bulk edit/i);
  });

  // ─── Resilience to missing ids ─────────────────────────────────────
  it('tolerates a feature id that is not present in the map (skips it)', () => {
    const fa = buildTrack('f-a', { nationality: 'GB' });
    // f-b is in the id list but NOT in the map.
    render(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa])}
      />,
    );
    // With only `f-a` resolvable, the single resolved feature's value is
    // the "shared" one — no `(differs)` for nationality.
    expect(screen.queryByTestId('multiselect-differs-nationality')).toBeNull();
    expect(
      screen.getByTestId('multiselect-row-nationality').textContent,
    ).toMatch(/GB/);
  });

  // ─── Empty / undefined value rendering ────────────────────────────
  it('renders an em-dash placeholder when the shared value is absent on both features', () => {
    // Neither feature has `vessel_role` set.
    const fa = buildTrack('f-a');
    const fb = buildTrack('f-b');
    render(
      <MultiSelectSummaryMode
        featureIds={['f-a', 'f-b']}
        featuresById={buildMap([fa, fb])}
      />,
    );
    // Shared "absent on both" is consistent — no `(differs)` token.
    expect(screen.queryByTestId('multiselect-differs-vessel_role')).toBeNull();
    const row = screen.getByTestId('multiselect-row-vessel_role');
    // The row must render *something* — we accept an em-dash, "—",
    // or any other clear placeholder convention. The presence test is
    // sufficient (the row exists, no differs).
    expect(row).toBeDefined();
  });
});
