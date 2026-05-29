/**
 * Vitest cases for the multi-select emitter glue function.
 *
 * Cases mirror `contracts/multi-select-emitter.md` § "Vitest cases":
 *   1. plain click, empty selection → single
 *   2. plain click, existing selection → replaces
 *   3. modifier click, empty selection → single
 *   4. modifier click, adds to existing
 *   5. modifier click, removes from existing
 *   6. modifier removal leaves no features → primary null
 *   7. modifier removal: primary tracks the last remaining feature
 *   8. platform modifier detection across mocked navigator.platform
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  applyClickToSelection,
  getPlatformModifierKey,
  isMacPlatform,
  isPlatformModifier,
  type SelectionClickEvent,
  type SelectionState,
} from '../applyClickToSelection';

const event = (
  target: string,
  modifier: boolean,
  shift = false,
): SelectionClickEvent => ({ target, modifier, shift });

const state = (
  featureIds: string[],
  primary: string | null,
): SelectionState => ({ featureIds, primary });

describe('applyClickToSelection', () => {
  it('plain click on empty selection → single selection', () => {
    const next = applyClickToSelection({
      current: state([], null),
      event: event('A', false),
    });
    expect(next.featureIds).toEqual(['A']);
    expect(next.primary).toBe('A');
  });

  it('plain click replaces existing selection', () => {
    const next = applyClickToSelection({
      current: state(['A'], 'A'),
      event: event('B', false),
    });
    expect(next.featureIds).toEqual(['B']);
    expect(next.primary).toBe('B');
  });

  it('plain click replaces a multi-selection', () => {
    const next = applyClickToSelection({
      current: state(['A', 'B'], 'B'),
      event: event('C', false),
    });
    expect(next.featureIds).toEqual(['C']);
    expect(next.primary).toBe('C');
  });

  it('modifier click on empty selection → single (same as plain)', () => {
    const next = applyClickToSelection({
      current: state([], null),
      event: event('A', true),
    });
    expect(next.featureIds).toEqual(['A']);
    expect(next.primary).toBe('A');
  });

  it('modifier click adds to existing selection; new target becomes primary', () => {
    const next = applyClickToSelection({
      current: state(['A'], 'A'),
      event: event('B', true),
    });
    expect(next.featureIds).toEqual(['A', 'B']);
    expect(next.primary).toBe('B');
  });

  it('modifier click toggles off a member; primary tracks the last remaining feature', () => {
    // Toggle off the currently-primary "A" from ['A', 'B']
    const next = applyClickToSelection({
      current: state(['A', 'B'], 'A'),
      event: event('A', true),
    });
    expect(next.featureIds).toEqual(['B']);
    expect(next.primary).toBe('B');
  });

  it('modifier click that empties the selection → primary becomes null', () => {
    const next = applyClickToSelection({
      current: state(['A'], 'A'),
      event: event('A', true),
    });
    expect(next.featureIds).toEqual([]);
    expect(next.primary).toBeNull();
  });

  it('modifier click on a non-primary removes it but keeps the existing primary', () => {
    // Remove "A" from ['A', 'B', 'C'] where primary is "C"
    const next = applyClickToSelection({
      current: state(['A', 'B', 'C'], 'C'),
      event: event('A', true),
    });
    expect(next.featureIds).toEqual(['B', 'C']);
    expect(next.primary).toBe('C');
  });
});

describe('platform-modifier detection', () => {
  const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(
    globalThis.navigator,
    'platform',
  );

  const setPlatform = (value: string): void => {
    Object.defineProperty(globalThis.navigator, 'platform', {
      configurable: true,
      get: () => value,
    });
  };

  afterEach(() => {
    if (originalPlatformDescriptor) {
      Object.defineProperty(
        globalThis.navigator,
        'platform',
        originalPlatformDescriptor,
      );
    }
  });

  it('detects macOS → metaKey is the platform modifier', () => {
    setPlatform('MacIntel');
    expect(isMacPlatform()).toBe(true);
    expect(getPlatformModifierKey()).toBe('metaKey');
    expect(isPlatformModifier({ metaKey: true, ctrlKey: false })).toBe(true);
    expect(isPlatformModifier({ metaKey: false, ctrlKey: true })).toBe(false);
  });

  it('detects iPad → metaKey is the platform modifier', () => {
    setPlatform('iPad');
    expect(isMacPlatform()).toBe(true);
    expect(getPlatformModifierKey()).toBe('metaKey');
  });

  it('falls back to ctrlKey on Linux/Windows', () => {
    setPlatform('Linux x86_64');
    expect(isMacPlatform()).toBe(false);
    expect(getPlatformModifierKey()).toBe('ctrlKey');
    expect(isPlatformModifier({ metaKey: true, ctrlKey: false })).toBe(false);
    expect(isPlatformModifier({ metaKey: false, ctrlKey: true })).toBe(true);
  });
});

describe('shift is ignored by this helper (reserved for range-select)', () => {
  it('shift+plain still replaces selection', () => {
    const next = applyClickToSelection({
      current: state(['A', 'B'], 'B'),
      event: event('C', false, true),
    });
    expect(next.featureIds).toEqual(['C']);
    expect(next.primary).toBe('C');
  });
});
