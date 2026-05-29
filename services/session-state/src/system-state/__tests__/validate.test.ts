import { describe, it, expect } from 'vitest';
import {
  temporalSchema,
  spatialSchema,
  selectionSchema,
  activeStoryboardSchema,
  checkTemporalCrossField,
} from '../validate.js';
import type { TemporalVariant } from '../types.js';

const validViewport = {
  coordinates: [
    { longitude: -3.5, latitude: 51.5 },
    { longitude: 2.5, latitude: 51.5 },
    { longitude: 2.5, latitude: 50.0 },
    { longitude: -3.5, latitude: 50.0 },
  ],
  zoom: 8,
};

describe('variant Zod schemas', () => {
  it('temporalSchema accepts a happy temporal feature, rejects a spatial one', () => {
    expect(
      temporalSchema.safeParse({
        kind: 'SYSTEM',
        state_type: 'temporal',
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-07T00:00:00Z',
      }).success,
    ).toBe(true);
    expect(
      temporalSchema.safeParse({ kind: 'SYSTEM', state_type: 'spatial', viewport: validViewport })
        .success,
    ).toBe(false);
  });

  it('spatialSchema requires a 4-coordinate viewport', () => {
    expect(
      spatialSchema.safeParse({ kind: 'SYSTEM', state_type: 'spatial', viewport: validViewport })
        .success,
    ).toBe(true);
    expect(
      spatialSchema.safeParse({
        kind: 'SYSTEM',
        state_type: 'spatial',
        viewport: { coordinates: [{ longitude: 0, latitude: 0 }] },
      }).success,
    ).toBe(false);
  });

  it('selectionSchema rejects non-string ids', () => {
    expect(
      selectionSchema.safeParse({ kind: 'SYSTEM', state_type: 'selection', selected_ids: ['a'] })
        .success,
    ).toBe(true);
    expect(
      selectionSchema.safeParse({ kind: 'SYSTEM', state_type: 'selection', selected_ids: [1] })
        .success,
    ).toBe(false);
  });

  it('activeStoryboardSchema requires active_storyboard_id', () => {
    expect(
      activeStoryboardSchema.safeParse({
        kind: 'SYSTEM',
        state_type: 'active_storyboard',
        active_storyboard_id: 'sb-1',
      }).success,
    ).toBe(true);
    expect(
      activeStoryboardSchema.safeParse({ kind: 'SYSTEM', state_type: 'active_storyboard' }).success,
    ).toBe(false);
  });

  it('rejects unknown extra keys (strict)', () => {
    expect(
      spatialSchema.safeParse({
        kind: 'SYSTEM',
        state_type: 'spatial',
        viewport: validViewport,
        bogus: true,
      }).success,
    ).toBe(false);
  });
});

describe('checkTemporalCrossField', () => {
  const base = (extra: Partial<TemporalVariant>): TemporalVariant => ({
    kind: 'SYSTEM',
    state_type: 'temporal',
    start_time: '2024-01-01T00:00:00Z',
    end_time: '2024-01-07T00:00:00Z',
    ...extra,
  });

  it('returns null for a consistent window', () => {
    expect(checkTemporalCrossField(base({ current_time: '2024-01-03T00:00:00Z' }))).toBeNull();
  });

  it('fires when current_time is out of window', () => {
    expect(checkTemporalCrossField(base({ current_time: '2024-02-01T00:00:00Z' }))).toMatch(
      /current_time/,
    );
  });

  it('fires when start_time > end_time', () => {
    expect(
      checkTemporalCrossField(
        base({ start_time: '2024-01-07T00:00:00Z', end_time: '2024-01-01T00:00:00Z' }),
      ),
    ).toMatch(/start_time/);
  });
});
