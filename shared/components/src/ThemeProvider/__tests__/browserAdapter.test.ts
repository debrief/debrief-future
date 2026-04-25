/**
 * T012 — Tests for `mediaQuerySource()` and `staticSource()`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mediaQuerySource, staticSource } from '../browserAdapter';

interface MockMql {
  matches: boolean;
  media: string;
  listeners: Array<(e: MediaQueryListEvent) => void>;
  addEventListener(_type: 'change', cb: (e: MediaQueryListEvent) => void): void;
  removeEventListener(_type: 'change', cb: (e: MediaQueryListEvent) => void): void;
}

function makeMatcher(initial: Record<string, boolean>): {
  matchMedia: (query: string) => MockMql;
  fire: (query: string, matches: boolean) => void;
  mqls: Map<string, MockMql>;
} {
  const mqls = new Map<string, MockMql>();
  const matchMedia = (query: string): MockMql => {
    let mql = mqls.get(query);
    if (!mql) {
      mql = {
        matches: !!initial[query],
        media: query,
        listeners: [],
        addEventListener(_type, cb) {
          this.listeners.push(cb);
        },
        removeEventListener(_type, cb) {
          this.listeners = this.listeners.filter((x) => x !== cb);
        },
      };
      mqls.set(query, mql);
    }
    return mql;
  };
  const fire = (query: string, matches: boolean) => {
    const mql = mqls.get(query);
    if (!mql) return;
    mql.matches = matches;
    for (const cb of [...mql.listeners]) {
      cb({ matches, media: query } as unknown as MediaQueryListEvent);
    }
  };
  return { matchMedia, fire, mqls };
}

describe('mediaQuerySource', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
  });

  it('read() returns one of the four explicit variants', () => {
    const { matchMedia } = makeMatcher({});
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    const source = mediaQuerySource();
    const result = source.read();
    expect(['light', 'dark', 'high-contrast-light', 'high-contrast-dark']).toContain(result);
  });

  it('resolves prefers-color-scheme: dark to dark variant', () => {
    const { matchMedia } = makeMatcher({ '(prefers-color-scheme: dark)': true });
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    const source = mediaQuerySource();
    expect(source.read()).toBe('dark');
  });

  it('resolves prefers-contrast: more + dark to high-contrast-dark', () => {
    const { matchMedia } = makeMatcher({
      '(prefers-color-scheme: dark)': true,
      '(prefers-contrast: more)': true,
    });
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    const source = mediaQuerySource();
    expect(source.read()).toBe('high-contrast-dark');
  });

  it('resolves prefers-contrast: more + light to high-contrast-light', () => {
    const { matchMedia } = makeMatcher({
      '(prefers-contrast: more)': true,
    });
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    const source = mediaQuerySource();
    expect(source.read()).toBe('high-contrast-light');
  });

  it('subscribe() fires when prefers-color-scheme changes', () => {
    const { matchMedia, fire } = makeMatcher({});
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    const source = mediaQuerySource();
    const onChange = vi.fn();
    const cleanup = source.subscribe(onChange);

    fire('(prefers-color-scheme: dark)', true);
    expect(onChange).toHaveBeenCalledWith('dark');

    cleanup();
  });

  it('subscribe() fires when prefers-contrast changes', () => {
    const { matchMedia, fire } = makeMatcher({});
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    const source = mediaQuerySource();
    const onChange = vi.fn();
    const cleanup = source.subscribe(onChange);

    fire('(prefers-contrast: more)', true);
    expect(onChange).toHaveBeenCalledWith('high-contrast-light');

    cleanup();
  });

  it('cleanup removes listeners', () => {
    const { matchMedia, mqls, fire } = makeMatcher({});
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    const source = mediaQuerySource();
    const onChange = vi.fn();
    const cleanup = source.subscribe(onChange);

    cleanup();
    fire('(prefers-color-scheme: dark)', true);

    expect(onChange).not.toHaveBeenCalled();
    // listeners detached
    for (const mql of mqls.values()) {
      expect(mql.listeners.length).toBe(0);
    }
  });

  it('multiple concurrent subscribers all receive change', () => {
    const { matchMedia, fire } = makeMatcher({});
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    const source = mediaQuerySource();
    const a = vi.fn();
    const b = vi.fn();
    const cleanupA = source.subscribe(a);
    const cleanupB = source.subscribe(b);

    fire('(prefers-color-scheme: dark)', true);
    expect(a).toHaveBeenCalledWith('dark');
    expect(b).toHaveBeenCalledWith('dark');

    cleanupA();
    cleanupB();
  });

  it('idempotent cleanup (calling cleanup twice does not throw)', () => {
    const { matchMedia } = makeMatcher({});
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    const source = mediaQuerySource();
    const cleanup = source.subscribe(() => {});
    cleanup();
    expect(() => cleanup()).not.toThrow();
  });
});

describe('staticSource', () => {
  it('always reports the fixed variant', () => {
    const source = staticSource('high-contrast-dark');
    expect(source.read()).toBe('high-contrast-dark');
  });

  it('subscribe is a no-op (returns idempotent cleanup)', () => {
    const source = staticSource('light');
    const onChange = vi.fn();
    const cleanup = source.subscribe(onChange);
    expect(typeof cleanup).toBe('function');
    cleanup();
    expect(onChange).not.toHaveBeenCalled();
  });
});
