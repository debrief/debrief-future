/**
 * T011 — Tests for the body-class → variant boundary translator.
 *
 * Asserts the `bodyClassToVariant()` table:
 *   - Maps each `vscode-*` class to the expected variant.
 *   - Returns `null` for any non-VS-Code class.
 *   - Never returns `'system'`.
 */

import { describe, it, expect } from 'vitest';
import { bodyClassToVariant } from '../vsCodeAdapter';

function classListFrom(classes: string[]): DOMTokenList {
  // Build a DOMTokenList by attaching to a real element so `contains` works.
  const div = document.createElement('div');
  for (const c of classes) div.classList.add(c);
  return div.classList;
}

describe('bodyClassToVariant', () => {
  it('maps vscode-light → light', () => {
    expect(bodyClassToVariant(classListFrom(['vscode-light']))).toBe('light');
  });

  it('maps vscode-dark → dark', () => {
    expect(bodyClassToVariant(classListFrom(['vscode-dark']))).toBe('dark');
  });

  it('maps vscode-high-contrast → high-contrast-dark', () => {
    expect(bodyClassToVariant(classListFrom(['vscode-high-contrast']))).toBe(
      'high-contrast-dark'
    );
  });

  it('maps vscode-high-contrast-light → high-contrast-light', () => {
    expect(bodyClassToVariant(classListFrom(['vscode-high-contrast-light']))).toBe(
      'high-contrast-light'
    );
  });

  it('returns null when no vscode-* class is present', () => {
    expect(bodyClassToVariant(classListFrom([]))).toBeNull();
    expect(bodyClassToVariant(classListFrom(['some-other-class']))).toBeNull();
  });

  it('never returns the request token "system"', () => {
    // The contract: `'system'` is a request, never a value the source returns.
    const result = bodyClassToVariant(classListFrom(['vscode-light']));
    expect(result).not.toBe('system');
  });

  it('high-contrast classes take priority over basic dark/light when both present', () => {
    // VS Code dispatches `vscode-high-contrast` together with `vscode-dark`
    // for the high-contrast-dark theme. The HC variant must win.
    expect(
      bodyClassToVariant(classListFrom(['vscode-dark', 'vscode-high-contrast']))
    ).toBe('high-contrast-dark');
    expect(
      bodyClassToVariant(
        classListFrom(['vscode-light', 'vscode-high-contrast-light'])
      )
    ).toBe('high-contrast-light');
  });
});
