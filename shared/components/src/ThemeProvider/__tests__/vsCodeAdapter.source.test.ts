/**
 * T013 — Tests for `vsCodeBodyClassSource()` — the live VS Code subscription.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vsCodeBodyClassSource } from '../vsCodeAdapter';

describe('vsCodeBodyClassSource', () => {
  beforeEach(() => {
    document.body.className = '';
  });

  afterEach(() => {
    document.body.className = '';
  });

  it('read() reflects the current body class', () => {
    document.body.classList.add('vscode-light');
    const source = vsCodeBodyClassSource();
    expect(source.read()).toBe('light');

    document.body.classList.remove('vscode-light');
    document.body.classList.add('vscode-dark');
    expect(source.read()).toBe('dark');
  });

  it('subscribe() fires when the body class mutates', async () => {
    document.body.classList.add('vscode-dark');
    const source = vsCodeBodyClassSource();
    const onChange = vi.fn();
    const cleanup = source.subscribe(onChange);

    document.body.classList.remove('vscode-dark');
    document.body.classList.add('vscode-light');

    // MutationObserver fires asynchronously — flush microtasks.
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    expect(onChange).toHaveBeenCalledWith('light');

    cleanup();
  });

  it('subscribe() fires when a vscode-theme-changed message arrives', async () => {
    document.body.classList.add('vscode-dark');
    const source = vsCodeBodyClassSource();
    const onChange = vi.fn();
    const cleanup = source.subscribe(onChange);

    // Mutate the body BEFORE dispatching the message — the source re-reads
    // the body class as the source of truth.
    document.body.classList.remove('vscode-dark');
    document.body.classList.add('vscode-high-contrast');

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'vscode-theme-changed', kind: 3 },
      })
    );

    await Promise.resolve();
    expect(onChange).toHaveBeenCalledWith('high-contrast-dark');

    cleanup();
  });

  it('cleanup disconnects observer + removes message listener', async () => {
    document.body.classList.add('vscode-dark');
    const source = vsCodeBodyClassSource();
    const onChange = vi.fn();
    const cleanup = source.subscribe(onChange);

    cleanup();
    onChange.mockClear();

    document.body.classList.remove('vscode-dark');
    document.body.classList.add('vscode-light');
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'vscode-theme-changed', kind: 1 },
      })
    );

    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('idempotent cleanup', () => {
    const source = vsCodeBodyClassSource();
    const cleanup = source.subscribe(() => {});
    cleanup();
    expect(() => cleanup()).not.toThrow();
  });

  it('de-duplicates back-to-back identical values', async () => {
    document.body.classList.add('vscode-dark');
    const source = vsCodeBodyClassSource();
    const onChange = vi.fn();
    const cleanup = source.subscribe(onChange);

    // Same value — body class did not actually change.
    document.body.classList.add('extra-class');
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    expect(onChange).not.toHaveBeenCalled();

    cleanup();
  });

  it('ignores non-theme messages', async () => {
    document.body.classList.add('vscode-dark');
    const source = vsCodeBodyClassSource();
    const onChange = vi.fn();
    const cleanup = source.subscribe(onChange);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'some-other-message' },
      })
    );

    await Promise.resolve();
    expect(onChange).not.toHaveBeenCalled();

    cleanup();
  });
});
