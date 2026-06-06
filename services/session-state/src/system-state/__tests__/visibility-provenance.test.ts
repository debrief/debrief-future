/**
 * Visibility-change provenance tests (feature 261, FR-013/FR-021, T083).
 *
 * Covers the shared builder (`buildVisibilityChangeLogEntry`) and the save-time
 * diff-and-append helper (`applyVisibilityWithProvenance`): provenance is
 * recorded on the affected feature's own log, bounded to genuine transitions
 * (not every transient toggle).
 */
import { describe, it, expect } from 'vitest';
import { buildVisibilityChangeLogEntry } from '../../log/entryBuilder.js';
import { VISIBILITY_CHANGE_TOOL_SENTINEL } from '../../log/types.js';
import type { LogEntry } from '../../log/types.js';
import {
  applyVisibilityWithProvenance,
  applyVisibilityToFeatureCollection,
} from '../visibility.js';
import type { PlotFeature, PlotFeatureCollection } from '../types.js';

function feature(id: string, props: Record<string, unknown> = {}): PlotFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: { ...props },
  };
}

function fc(features: PlotFeature[]): PlotFeatureCollection {
  return { type: 'FeatureCollection', features };
}

const OPTS = { actor: 'tester', timestamp: '2026-06-01T00:00:00.000Z' };

describe('buildVisibilityChangeLogEntry', () => {
  it('marks the entry with the visibility sentinel and the feature id', () => {
    const entry = buildVisibilityChangeLogEntry({
      feature_id: 'track-1',
      visible: false,
      actor: 'tester',
      timestamp: '2026-06-01T00:00:00.000Z',
    });
    expect(entry.was_generated_by.tool).toBe(VISIBILITY_CHANGE_TOOL_SENTINEL);
    expect(entry.used).toEqual(['track-1']);
    expect(entry.generated).toEqual(['track-1']);
    expect(entry.timestamp).toBe('2026-06-01T00:00:00.000Z');
    expect(entry.rationale).toBe('Feature hidden');
    expect(entry.was_generated_by.parameters.actor!.value).toBe('tester');
    expect(entry.was_generated_by.parameters.visible!.value).toBe(false);
  });

  it('uses a "Feature shown" rationale when made visible', () => {
    const entry = buildVisibilityChangeLogEntry({
      feature_id: 'track-1',
      visible: true,
      actor: 'tester',
      timestamp: '2026-06-01T00:00:00.000Z',
    });
    expect(entry.rationale).toBe('Feature shown');
    expect(entry.was_generated_by.parameters.visible!.value).toBe(true);
  });
});

describe('applyVisibilityWithProvenance', () => {
  it('appends one entry when a visible feature is hidden, and sets visible:false', () => {
    const out = applyVisibilityWithProvenance(fc([feature('a')]), ['a'], OPTS);
    const props = out.features[0]!.properties as Record<string, unknown>;
    expect(props.visible).toBe(false);
    const prov = props.provenance as LogEntry[];
    expect(prov).toHaveLength(1);
    expect(prov[0]!.was_generated_by.tool).toBe(VISIBILITY_CHANGE_TOOL_SENTINEL);
    expect(prov[0]!.rationale).toBe('Feature hidden');
  });

  it('appends one entry when a hidden feature is revealed, and clears the flag', () => {
    const out = applyVisibilityWithProvenance(fc([feature('a', { visible: false })]), [], OPTS);
    const props = out.features[0]!.properties as Record<string, unknown>;
    expect('visible' in props).toBe(false);
    const prov = props.provenance as LogEntry[];
    expect(prov).toHaveLength(1);
    expect(prov[0]!.rationale).toBe('Feature shown');
  });

  it('records NO entry for an unchanged visible feature (bounded to transitions)', () => {
    const input = fc([feature('a')]);
    const out = applyVisibilityWithProvenance(input, [], OPTS);
    const props = out.features[0]!.properties as Record<string, unknown>;
    expect(props.provenance).toBeUndefined();
    // unchanged feature is passed through by reference (no new object allocated)
    expect(out.features[0]).toBe(input.features[0]);
  });

  it('records NO entry for an already-hidden feature that stays hidden', () => {
    const out = applyVisibilityWithProvenance(fc([feature('a', { visible: false })]), ['a'], OPTS);
    const props = out.features[0]!.properties as Record<string, unknown>;
    expect(props.visible).toBe(false);
    expect(props.provenance).toBeUndefined();
  });

  it('preserves an existing provenance log and appends to it', () => {
    const prior = buildVisibilityChangeLogEntry({
      feature_id: 'a',
      visible: true,
      actor: 'tester',
      timestamp: '2026-05-31T00:00:00.000Z',
    });
    const out = applyVisibilityWithProvenance(
      fc([feature('a', { provenance: [prior] })]),
      ['a'],
      OPTS,
    );
    const prov = (out.features[0]!.properties as Record<string, unknown>).provenance as LogEntry[];
    expect(prov).toHaveLength(2);
    expect(prov[0]).toBe(prior);
    expect(prov[1]!.rationale).toBe('Feature hidden');
  });

  it('passes through a feature with no id (cannot be addressed)', () => {
    const noId: PlotFeature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {},
    };
    const out = applyVisibilityWithProvenance(fc([noId]), ['whatever'], OPTS);
    expect(out.features[0]).toBe(noId);
  });

  it('does not mutate the input FeatureCollection', () => {
    const input = fc([feature('a')]);
    const snapshot = JSON.parse(JSON.stringify(input));
    applyVisibilityWithProvenance(input, ['a'], OPTS);
    expect(input).toEqual(snapshot);
  });

  it('sets the same visible flags as the flag-only helper', () => {
    const features = [feature('a'), feature('b', { visible: false }), feature('c')];
    const flagOnly = applyVisibilityToFeatureCollection(fc(features), ['a']);
    const withProv = applyVisibilityWithProvenance(fc(features), ['a'], OPTS);
    for (let i = 0; i < features.length; i++) {
      const a = flagOnly.features[i]!.properties as Record<string, unknown>;
      const b = withProv.features[i]!.properties as Record<string, unknown>;
      expect(b.visible).toEqual(a.visible);
    }
  });
});
