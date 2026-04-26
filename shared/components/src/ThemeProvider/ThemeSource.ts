/**
 * ThemeSource — live source of the active theme variant.
 *
 * Resolves to one of the four explicit variants. `'system'` is a request
 * (made by callers), never a value — sources always return concrete
 * variants.
 *
 * Implementations:
 *   - `vsCodeBodyClassSource()` — VS Code webviews (./vsCodeAdapter.ts)
 *   - `mediaQuerySource()` — Storybook, web-shell, generic browser (./browserAdapter.ts)
 *   - `staticSource(variant)` — pinned tests, frozen Storybook stories
 *
 * Contract (`contracts/theme-source.md`):
 *   1. `read()` returns one of the four explicit variants (never `'system'`).
 *   2. `subscribe()` returns a cleanup function whose effect is observable
 *      (after invocation, source mutations no longer fire `onChange`).
 *   3. `subscribe()` is re-entrancy safe — multiple concurrent subscribers
 *      all receive every change.
 *   4. The first `onChange` carries a value DIFFERENT from the most recent
 *      `read()` (no synthetic synchronous re-emit).
 *
 * Feature: 220-fix-theme-responsiveness
 */

import type { ThemeVariant } from './ThemeContext';

/**
 * The four explicit theme variants. `'system'` is excluded — sources always
 * resolve to a concrete variant before reaching consumers.
 */
export type ResolvedVariant = Exclude<ThemeVariant, 'system'>;

export interface ThemeSource {
  /** Synchronous read for first paint. Must not throw. */
  read(): ResolvedVariant;

  /**
   * Subscribe to live updates.
   * @param onChange called every time the variant changes; never called
   *                 with the same value back-to-back (de-duped by the source).
   * @returns cleanup function. Idempotent; safe to call multiple times.
   */
  subscribe(onChange: (variant: ResolvedVariant) => void): () => void;
}
