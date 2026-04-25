/**
 * Storybook-side `--vscode-*` token map.
 *
 * Re-exports the canonical per-variant token map from `vsCodeTokenMap.ts`
 * so the Storybook decorator and the runtime ThemeProvider share a single
 * source of truth (#220 contracts/theme-source.md §4).
 *
 * Adding a new `--vscode-*` variable to a component CSS requires adding
 * it to the underlying map in
 * `shared/components/src/ThemeProvider/vsCodeTokenMap.ts` — the parity
 * test in `__tests__/vsCodeTokenMap.test.ts` enforces structural parity
 * across every variant.
 */

import {
  VS_CODE_TOKEN_MAP as RUNTIME_TOKEN_MAP,
  type VSCodeThemeVariant,
} from '../src/ThemeProvider/vsCodeTokenMap';

export type { VSCodeThemeVariant };
export type StorybookVariant = VSCodeThemeVariant;

/**
 * Mapped lookup with strict `--vscode-*`-prefixed keys.
 */
export type VsCodeTokenMap = {
  readonly [V in StorybookVariant]: Readonly<Record<`--vscode-${string}`, string>>;
};

export const VSCODE_TOKEN_MAP: VsCodeTokenMap = RUNTIME_TOKEN_MAP as VsCodeTokenMap;
