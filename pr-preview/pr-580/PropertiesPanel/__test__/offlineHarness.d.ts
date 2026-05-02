/**
 * Offline-invariant test harness — throws `OfflineInvariantError` on any
 * `fetch` or `XMLHttpRequest` attempted by PropertiesPanel code during unit
 * tests (FR-010, Decision 10, SC-005).
 *
 * Installed via vitest `setupFiles` so the invariant is enforced for every
 * test in `@debrief/components` without per-file boilerplate.
 */
export declare class OfflineInvariantError extends Error {
    constructor(resource: string);
}
export declare function installOfflineHarness(): void;
export declare function uninstallOfflineHarness(): void;
//# sourceMappingURL=offlineHarness.d.ts.map