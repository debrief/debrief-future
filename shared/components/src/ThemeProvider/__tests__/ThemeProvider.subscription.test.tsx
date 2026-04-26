/**
 * T014 — ThemeProvider subscribes to a `ThemeSource` and re-applies tokens.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { ThemeProvider } from '../ThemeProvider';
import { staticSource } from '../browserAdapter';
import { vsCodeBodyClassSource } from '../vsCodeAdapter';
import type { ResolvedVariant, ThemeSource } from '../ThemeSource';

describe('ThemeProvider — source subscription', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.body.className = '';
  });

  it('re-renders descendants when the source emits a new variant', () => {
    let listener: ((v: ResolvedVariant) => void) | null = null;
    const source: ThemeSource = {
      read: () => 'dark',
      subscribe: (cb) => {
        listener = cb;
        return () => {
          listener = null;
        };
      },
    };

    render(
      <ThemeProvider theme={{ variant: 'system' }} source={source}>
        <div>content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    act(() => {
      listener!('high-contrast-dark');
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe(
      'high-contrast-dark'
    );
  });

  it('updates --debrief-* CSS variables on each emission', () => {
    let listener: ((v: ResolvedVariant) => void) | null = null;
    const source: ThemeSource = {
      read: () => 'light',
      subscribe: (cb) => {
        listener = cb;
        return () => {};
      },
    };

    render(
      <ThemeProvider theme={{ variant: 'system' }} source={source}>
        <div>content</div>
      </ThemeProvider>
    );

    const lightBg = document.documentElement.style.getPropertyValue('--debrief-bg-primary');
    expect(lightBg).toBeTruthy();

    act(() => {
      listener!('dark');
    });

    const darkBg = document.documentElement.style.getPropertyValue('--debrief-bg-primary');
    expect(darkBg).not.toBe(lightBg);
  });

  it('cleanup removes the data-theme attribute on unmount', () => {
    const source = staticSource('dark');
    const { unmount } = render(
      <ThemeProvider theme={{ variant: 'system' }} source={source}>
        <div>content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    unmount();

    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('source.subscribe failure falls back to last read value (does not throw)', () => {
    const source: ThemeSource = {
      read: () => 'light',
      subscribe: () => {
        throw new Error('subscribe blew up');
      },
    };

    expect(() =>
      render(
        <ThemeProvider theme={{ variant: 'system' }} source={source}>
          <div>content</div>
        </ThemeProvider>
      )
    ).not.toThrow();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('auto-detects vsCodeBodyClassSource when body has a vscode-* class', () => {
    document.body.classList.add('vscode-high-contrast-light');

    render(
      <ThemeProvider theme={{ variant: 'system' }}>
        <div>content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.getAttribute('data-theme')).toBe(
      'high-contrast-light'
    );
  });

  it('explicit theme variant overrides the source', () => {
    const source = staticSource('dark');
    render(
      <ThemeProvider theme={{ variant: 'light' }} source={source}>
        <div>content</div>
      </ThemeProvider>
    );

    // theme.variant is 'light' (not 'system') — source value is ignored.
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('vsCodeBodyClassSource() is a constructable ThemeSource', () => {
    const source = vsCodeBodyClassSource();
    expect(typeof source.read).toBe('function');
    expect(typeof source.subscribe).toBe('function');
  });

  it('nested provider scopes data-theme to a local wrapper, not documentElement', () => {
    // The outer provider keeps documentElement at 'light'; the inner provider
    // should write 'dark' to a local wrapper instead of overwriting the outer.
    const { container } = render(
      <ThemeProvider theme={{ variant: 'light' }}>
        <ThemeProvider theme={{ variant: 'dark' }}>
          <div data-testid="nested-content">hello</div>
        </ThemeProvider>
      </ThemeProvider>
    );

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // The inner wrapper's data-theme should be 'dark'.
    const nestedRoots = container.querySelectorAll('[data-theme="dark"]');
    expect(nestedRoots.length).toBeGreaterThan(0);
  });

  it('nested provider injects its own --debrief-bg-primary via inline style', () => {
    const { container } = render(
      <ThemeProvider theme={{ variant: 'light' }}>
        <ThemeProvider theme={{ variant: 'dark' }}>
          <div data-testid="nested">x</div>
        </ThemeProvider>
      </ThemeProvider>
    );

    const wrapper = container.querySelector(
      '[data-theme="dark"]',
    ) as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    // The wrapper's inline style holds the dark background value, scoped
    // to its subtree (CSS cascade) rather than fighting with the outer's
    // documentElement value.
    expect(wrapper!.style.getPropertyValue('--debrief-bg-primary')).toBeTruthy();
  });
});
