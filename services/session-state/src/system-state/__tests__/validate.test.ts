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

describe('checkTemporalCrossField (spec 267 — severity-split result)', () => {
  const base = (extra: Partial<TemporalVariant>): TemporalVariant => ({
    kind: 'SYSTEM',
    state_type: 'temporal',
    start_time: '2024-01-01T00:00:00Z',
    end_time: '2024-01-07T00:00:00Z',
    ...extra,
  });

  // ── ok ────────────────────────────────────────────────────────────────────
  it('returns ok for a current_time inside the window', () => {
    expect(checkTemporalCrossField(base({ current_time: '2024-01-03T00:00:00Z' }))).toEqual({
      status: 'ok',
    });
  });

  it('returns ok when current_time is absent', () => {
    expect(checkTemporalCrossField(base({}))).toEqual({ status: 'ok' });
  });

  it('returns ok on the start boundary (current_time == start_time)', () => {
    expect(checkTemporalCrossField(base({ current_time: '2024-01-01T00:00:00Z' }))).toEqual({
      status: 'ok',
    });
  });

  it('returns ok on the end boundary (current_time == end_time)', () => {
    expect(checkTemporalCrossField(base({ current_time: '2024-01-07T00:00:00Z' }))).toEqual({
      status: 'ok',
    });
  });

  // ── recoverable-playhead ────────────────────────────────────────────────────
  it('is recoverable (clamp to start) when current_time is before start_time', () => {
    const res = checkTemporalCrossField(base({ current_time: '2023-12-20T00:00:00Z' }));
    expect(res.status).toBe('recoverable-playhead');
    if (res.status === 'recoverable-playhead') {
      expect(res.edge).toBe('start');
      expect(res.clampedCurrentTime).toBe('2024-01-01T00:00:00Z');
      expect(res.message).toMatch(/current_time/);
    }
  });

  it('is recoverable (clamp to end) when current_time is after end_time', () => {
    const res = checkTemporalCrossField(base({ current_time: '2024-02-01T00:00:00Z' }));
    expect(res.status).toBe('recoverable-playhead');
    if (res.status === 'recoverable-playhead') {
      expect(res.edge).toBe('end');
      expect(res.clampedCurrentTime).toBe('2024-01-07T00:00:00Z');
    }
  });

  it('clamps to the single instant for a single-instant window (start == end)', () => {
    const res = checkTemporalCrossField(
      base({
        start_time: '2024-03-15T12:00:00Z',
        end_time: '2024-03-15T12:00:00Z',
        current_time: '2024-03-16T00:00:00Z',
      }),
    );
    expect(res.status).toBe('recoverable-playhead');
    if (res.status === 'recoverable-playhead') {
      expect(res.edge).toBe('end');
      expect(res.clampedCurrentTime).toBe('2024-03-15T12:00:00Z');
    }
  });

  // ── fatal ─────────────────────────────────────────────────────────────────
  it('is fatal when start_time > end_time (incoherent window)', () => {
    const res = checkTemporalCrossField(
      base({ start_time: '2024-01-07T00:00:00Z', end_time: '2024-01-01T00:00:00Z' }),
    );
    expect(res.status).toBe('fatal');
    if (res.status === 'fatal') {
      expect(res.message).toMatch(/start_time/);
    }
  });

  it('is fatal (precedence) when the window is incoherent AND current_time is out of range', () => {
    const res = checkTemporalCrossField(
      base({
        start_time: '2024-01-07T00:00:00Z',
        end_time: '2024-01-01T00:00:00Z',
        current_time: '2024-02-01T00:00:00Z',
      }),
    );
    expect(res.status).toBe('fatal');
  });

  it('is fatal when start_time is unparseable', () => {
    expect(checkTemporalCrossField(base({ start_time: 'not-a-date' })).status).toBe('fatal');
  });

  it('is fatal when end_time is unparseable', () => {
    expect(checkTemporalCrossField(base({ end_time: 'not-a-date' })).status).toBe('fatal');
  });

  it('is fatal when current_time is present but unparseable', () => {
    expect(checkTemporalCrossField(base({ current_time: 'not-a-date' })).status).toBe('fatal');
  });
});
