/**
 * T060 — Contract tests for the Storybook `vscode-token-map.ts`.
 *
 * The Storybook decorator file (`.storybook/preview.tsx`) re-exports
 * the canonical map under a `--vscode-${string}`-keyed type. This test
 * verifies that the re-export is consistent with the runtime source
 * map, so a change to one cannot drift from the other.
 */

import { describe, it, expect } from 'vitest';
import {
  VS_CODE_TOKEN_MAP,
  REQUIRED_VS_CODE_KEYS,
} from '../vsCodeTokenMap';
import { VSCODE_TOKEN_MAP as STORYBOOK_TOKEN_MAP } from '../../../.storybook/vscode-token-map';

const VARIANTS = ['light', 'dark', 'high-contrast-light', 'high-contrast-dark'] as const;

describe('Storybook vscode-token-map (re-export of runtime map)', () => {
  it('is the same reference as the runtime map', () => {
    expect(STORYBOOK_TOKEN_MAP).toBe(VS_CODE_TOKEN_MAP);
  });

  it('every variant key has the same set of --vscode-* keys', () => {
    const reference = Object.keys(STORYBOOK_TOKEN_MAP.light).sort();
    for (const v of VARIANTS) {
      expect(Object.keys(STORYBOOK_TOKEN_MAP[v]).sort(), `variant=${v}`).toEqual(
        reference,
      );
    }
  });

  it('every value is a non-empty string', () => {
    for (const v of VARIANTS) {
      for (const [k, val] of Object.entries(STORYBOOK_TOKEN_MAP[v])) {
        expect(typeof val).toBe('string');
        expect(val, `${v}.${k}`).not.toBe('');
      }
    }
  });

  it('every required key starts with --vscode-', () => {
    for (const k of REQUIRED_VS_CODE_KEYS) {
      expect(k.startsWith('--vscode-')).toBe(true);
    }
  });
});
