/**
 * Read-only fixture helpers — Playwright (#192 Phase 6 / US-5, T052).
 *
 * In the web-shell, plot storage is backed by IndexedDB (or the bundled
 * read-only catalog), not a real filesystem. So instead of `fs.chmod 0444`
 * on an on-disk path, this fixture dispatches the read-only signal
 * directly via the session-state store's `setReadOnly` action — exactly
 * the same code path the producer rules from `contracts/read-only-signal.md`
 * fire under (host openPlot capability probe + saveSession EACCES escalation).
 *
 * The fixture is per-test (no committed permission-modified file): each
 * test calls `applyReadOnly()` after opening a plot, and the next test's
 * `page.goto('/')` resets the in-memory store. Mirrors the contract's
 * "permissions set per-test" requirement (tasks.md T052).
 *
 * Two helpers exposed:
 *
 *   - `applyReadOnly(page, reason)` — dispatch `setReadOnly(true, reason)`.
 *     Used by T050's pre-flight case (banner appears immediately on open)
 *     and by T051's post-write case (mid-session escalation after a
 *     simulated save failure).
 *   - `clearReadOnly(page)` — dispatch `setReadOnly(false, null)` to
 *     reset the signal mid-session, used by T051's permissions-restored
 *     recovery leg.
 *
 * Article I.3 — the signal flips via the same action callers see in
 * production; the test is a faithful integration check against the slice
 * + dispatcher, not a UI-stubbed approximation.
 */

import type { Page } from '@playwright/test';

/**
 * The default reason text matches the EACCES-derived message
 * `saveSession` synthesises in `services/session-state/src/persistence/save.ts`
 * for permission-denied filesystem errors.
 */
export const DEFAULT_EACCES_REASON =
  "EACCES: permission denied, save '/local-store/item.json'";

/**
 * Dispatch `setReadOnly(true, reason)` on the session-state store. The
 * panel subscribes via `selectIsReadOnly` / `selectReadOnlyReason` (or,
 * in the web-shell, the flattened `state.isReadOnly` slice fields) and
 * re-renders with the banner + disabled inputs.
 *
 * @param page    Playwright page handle.
 * @param reason  Human-readable reason string. Defaults to the
 *                EACCES-shaped message that `saveSession` would
 *                produce for a 0444 file on a Node host.
 */
export async function applyReadOnly(
  page: Page,
  reason: string = DEFAULT_EACCES_REASON,
): Promise<void> {
  await page.evaluate((r) => {
    window.__sessionStore.getState().setReadOnly(true, r);
  }, reason);
}

/**
 * Dispatch `setReadOnly(false, null)` to clear the read-only signal.
 * Mirrors the `openPlot` reset rule from the contract: any writable
 * plot opened after a prior RO transition resets the slice.
 */
export async function clearReadOnly(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__sessionStore.getState().setReadOnly(false, null);
  });
}

/**
 * Read the current read-only signal directly from the session-state
 * store. Used by assertions to confirm a `setReadOnly` call landed.
 */
export async function getReadOnlyState(page: Page): Promise<{
  isReadOnly: boolean;
  readOnlyReason: string | null;
}> {
  return await page.evaluate(() => {
    const s = window.__sessionStore.getState();
    return {
      isReadOnly: s.isReadOnly,
      readOnlyReason: s.readOnlyReason,
    };
  });
}
