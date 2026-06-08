/**
 * Unit tests for layoutPersistence — spec 281 T013.
 *
 * Key assertion: loadLayout() returns null when localStorage contains a layout
 * with version=2 (legacy fixed-25% sidebar), now that LAYOUT_VERSION=3.
 *
 * The global setup.ts already calls localStorage.clear() in beforeEach/afterEach,
 * so no per-file clear needed.
 */

import { describe, it, expect } from 'vitest';
import {
  LAYOUT_VERSION,
  LAYOUT_STORAGE_KEY,
  loadLayout,
  saveLayout,
} from './layoutPersistence';

// Registered panel types used in all tests
const REGISTERED_TYPES = ['navigation', 'activity', 'log', 'map', 'chart'] as const;

// A minimal valid v3 layout config that passes type and essential-panel validation.
const VALID_CONFIG = {
  root: {
    type: 'row',
    content: [
      {
        type: 'column',
        content: [
          { type: 'component', componentType: 'navigation', title: 'Navigation' },
          { type: 'component', componentType: 'activity', title: 'Activity' },
          { type: 'component', componentType: 'log', title: 'Log' },
        ],
      },
      {
        type: 'column',
        content: [
          { type: 'component', componentType: 'map', title: 'Map' },
        ],
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Version checks
// ─────────────────────────────────────────────────────────────────────────────

describe('LAYOUT_VERSION', () => {
  it('is 3 (bumped from 2 in spec 281 T016)', () => {
    expect(LAYOUT_VERSION).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Legacy v2 layout — must be discarded (T013 core assertion)
// ─────────────────────────────────────────────────────────────────────────────

describe('loadLayout — version mismatch', () => {
  it('returns null for a v2 persisted layout (legacy fixed-25% sidebar)', () => {
    // Seed localStorage as if the old v2 code had saved the layout.
    const legacyPayload = JSON.stringify({
      version: 2,
      config: VALID_CONFIG,
    });
    localStorage.setItem(LAYOUT_STORAGE_KEY, legacyPayload);

    const result = loadLayout([...REGISTERED_TYPES]);
    expect(result).toBeNull();
  });

  it('returns null for a v1 persisted layout', () => {
    const oldPayload = JSON.stringify({
      version: 1,
      config: VALID_CONFIG,
    });
    localStorage.setItem(LAYOUT_STORAGE_KEY, oldPayload);

    const result = loadLayout([...REGISTERED_TYPES]);
    expect(result).toBeNull();
  });

  it('returns null for a future version', () => {
    const futurePayload = JSON.stringify({
      version: 99,
      config: VALID_CONFIG,
    });
    localStorage.setItem(LAYOUT_STORAGE_KEY, futurePayload);

    const result = loadLayout([...REGISTERED_TYPES]);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Current v3 layout — happy path
// ─────────────────────────────────────────────────────────────────────────────

describe('loadLayout — v3 happy path', () => {
  it('returns config when version matches and all types are registered', () => {
    const payload = JSON.stringify({
      version: LAYOUT_VERSION, // 3
      config: VALID_CONFIG,
    });
    localStorage.setItem(LAYOUT_STORAGE_KEY, payload);

    const result = loadLayout([...REGISTERED_TYPES]);
    expect(result).not.toBeNull();
  });

  it('roundtrips via saveLayout/loadLayout', () => {
    saveLayout(VALID_CONFIG);
    const result = loadLayout([...REGISTERED_TYPES]);
    expect(result).not.toBeNull();
    expect(JSON.stringify(result)).toBe(JSON.stringify(VALID_CONFIG));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('loadLayout — edge cases', () => {
  it('returns null when localStorage is empty', () => {
    // setup.ts already clears localStorage; confirm null on empty
    expect(loadLayout([...REGISTERED_TYPES])).toBeNull();
  });

  it('returns null for corrupted JSON', () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, 'not-json{{{');
    expect(loadLayout([...REGISTERED_TYPES])).toBeNull();
  });

  it('returns null when an unregistered component type is present', () => {
    const badConfig = {
      root: {
        type: 'component',
        componentType: 'unknown-panel',
        title: 'Unknown',
      },
    };
    const payload = JSON.stringify({ version: LAYOUT_VERSION, config: badConfig });
    localStorage.setItem(LAYOUT_STORAGE_KEY, payload);
    expect(loadLayout([...REGISTERED_TYPES])).toBeNull();
  });
});
