/**
 * Spec 260 — viewport lock reject branch on the MCP `session.setViewport`
 * tool.
 *
 * Covers contract: `specs/260-viewport-lock/contracts/mcp-setViewport.md`.
 *  - T013: locked → structured rejection, viewport unchanged.
 *  - T014: unlocked → no regression, errorCode absent.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSessionStore,
  type SessionStoreApi,
} from '../../../src/store/index.js';
import { setViewport } from '../../../src/server/tools/setViewport.js';
import type { ViewportPolygon, Coordinate } from '@debrief/schemas';

const VALID_FOUR_CORNERS: Coordinate[] = [
  { longitude: -5, latitude: 55 }, // NW
  { longitude: 5, latitude: 55 }, // NE
  { longitude: 5, latitude: 50 }, // SE
  { longitude: -5, latitude: 50 }, // SW
];

describe('setViewport — viewport lock reject branch (spec 260)', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  // T013 — locked path.
  it('rejects with errorCode VIEWPORT_LOCKED when viewport is locked', () => {
    const priorViewport: ViewportPolygon | null = store.getState().viewport;
    store.getState().setViewportLocked(true);

    const result = setViewport(store, { coordinates: VALID_FOUR_CORNERS });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VIEWPORT_LOCKED');
    expect(result.error).toMatch(/locked/i);
    // Viewport MUST NOT change while locked.
    expect(store.getState().viewport).toBe(priorViewport);
  });

  // T013b — reject runs BEFORE validation (locked is the dominant signal).
  it('rejects with VIEWPORT_LOCKED even when coordinates would otherwise be invalid', () => {
    store.getState().setViewportLocked(true);
    const invalidCoordinates: Coordinate[] = [
      { longitude: 999, latitude: 999 }, // out of range
      { longitude: 5, latitude: 55 },
      { longitude: 5, latitude: 50 },
      { longitude: -5, latitude: 50 },
    ];

    const result = setViewport(store, { coordinates: invalidCoordinates });

    // Locked wins over validation — a coincidental "your coordinates are
    // invalid" error must not surface here (it would confuse LLM callers).
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VIEWPORT_LOCKED');
    expect(result.error).toMatch(/locked/i);
  });

  // T014 — unlocked path, no regression.
  it('processes valid input as before when viewport is unlocked (FR-010)', () => {
    expect(store.getState().viewportLocked).toBe(false);

    const result = setViewport(store, { coordinates: VALID_FOUR_CORNERS });

    expect(result.success).toBe(true);
    expect(result.errorCode).toBeUndefined();
    expect(result.viewport?.coordinates).toEqual(VALID_FOUR_CORNERS);
    expect(store.getState().viewport?.coordinates).toEqual(VALID_FOUR_CORNERS);
  });

  it('processes input identically to pre-feature behaviour when the lock toggles off mid-session', () => {
    // Lock + reject.
    store.getState().setViewportLocked(true);
    expect(setViewport(store, { coordinates: VALID_FOUR_CORNERS }).success).toBe(
      false,
    );

    // Unlock + succeed — the second call must look identical to a fresh,
    // never-locked path.
    store.getState().setViewportLocked(false);
    const result = setViewport(store, { coordinates: VALID_FOUR_CORNERS });

    expect(result.success).toBe(true);
    expect(result.errorCode).toBeUndefined();
    expect(store.getState().viewport?.coordinates).toEqual(VALID_FOUR_CORNERS);
  });
});
