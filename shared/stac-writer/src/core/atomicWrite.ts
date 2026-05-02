/**
 * Atomic-write helper signature. Implementation lives in
 * `apps/vscode/src/services/stacWriterFs.ts` (Node fs only); the type lives
 * here so the contract is browser-safe and adaptor-agnostic.
 *
 * The Node-fs adaptor uses a temp+rename sequence (with best-effort fsync)
 * to guarantee that readers never observe a partial write. The web-shell
 * adaptor relies on IndexedDB transaction atomicity instead — this helper
 * is irrelevant there.
 */

export interface AtomicWriteDeps {
  /** Test-injectable wall clock. */
  readonly nowMs: () => number;
  /** Test-injectable random ID generator (used to suffix temp files). */
  readonly randomId: () => string;
}

export interface AtomicWrite {
  (
    deps: AtomicWriteDeps,
    target: string,
    data: Uint8Array | string,
  ): Promise<void>;
}
