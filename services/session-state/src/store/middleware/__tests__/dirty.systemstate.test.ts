/**
 * Feature 261 dirty-tracking contract (FR-019/FR-021).
 *
 * Each view-state mutation is exploration and leaves `dirty` false; a content
 * edit (modelled here by the Log Service `markDirty()`) sets it true.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../index.js';
import { DIRTY_TRIGGER_FIELDS } from '../dirty.js';

describe('261 dirty-tracking contract', () => {
  let store: SessionStoreApi;
  beforeEach(() => {
    store = createSessionStore();
  });

  it('DIRTY_TRIGGER_FIELDS is empty (no view-state field marks dirty via the wrapper)', () => {
    expect(DIRTY_TRIGGER_FIELDS.size).toBe(0);
  });

  const viewStateActions: Array<[string, (s: SessionStoreApi) => void]> = [
    ['setViewport', (s) => s.getState().setViewport(null)],
    ['setRotation', (s) => s.getState().setRotation(90)],
    ['setSelection', (s) => s.getState().setSelection(['f1'], 'f1')],
    ['setCurrentTime', (s) => s.getState().setCurrentTime(1234)],
    ['setTimeRange', (s) => s.getState().setTimeRange({ start: 0, end: 10 })],
    ['setTimeFilter', (s) => s.getState().setTimeFilter({ start: 1, end: 9 })],
    ['setDisplayMode', (s) => s.getState().setDisplayMode('trail')],
    ['setStepSize', (s) => s.getState().setStepSize({ value: 2, unit: 'hour' })],
    ['setPlaybackRate', (s) => s.getState().setPlaybackRate(4)],
    ['setHiddenFeatures', (s) => s.getState().setHiddenFeatures(['f1'])],
  ];

  for (const [name, act] of viewStateActions) {
    it(`${name} leaves dirty=false (FR-019)`, () => {
      act(store);
      expect(store.getState().dirty).toBe(false);
    });
  }

  it('a content edit (markDirty) sets dirty=true (FR-021)', () => {
    store.getState().markDirty();
    expect(store.getState().dirty).toBe(true);
  });
});
