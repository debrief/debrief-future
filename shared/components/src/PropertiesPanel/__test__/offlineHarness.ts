/**
 * Offline-invariant test harness — patches `fetch` and `XMLHttpRequest` so any
 * accidental network egress from Properties Panel code surfaces as a loud
 * `OfflineInvariantError` during unit tests.
 *
 * Phase 1 placeholder — the full implementation lands in T022.
 */

export class OfflineInvariantError extends Error {
  constructor(resource: string) {
    super(
      `OfflineInvariantError: network call blocked during PropertiesPanel tests — ${resource}`,
    );
    this.name = 'OfflineInvariantError';
  }
}

export function installOfflineHarness(): void {
  throw new Error('installOfflineHarness: placeholder — implemented in T022');
}

export function uninstallOfflineHarness(): void {
  // Placeholder — real implementation arrives with installOfflineHarness.
}
