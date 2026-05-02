/**
 * IndexedDB capability probe for the web-shell.
 *
 * Article IV.4 — this file is one of two production files allowed to
 * read browser persistence globals directly (the other is
 * `stacWriterIdb.ts`). Everywhere else routes through the StacWriter
 * interface.
 *
 * Drives the FR-WEB-029a "Session-only" badge:
 *   - capability().available === true   → badge hidden, captures persist.
 *   - capability().available === false  → badge shown, capture attempts
 *                                         fail loudly with the structured
 *                                         `reason` from this report.
 *
 * Idempotent and cheap. Called at App boot and may be re-called when
 * storage state changes (e.g. after a `navigator.storage.persist()` grant).
 */

import type { CapabilityReport } from '@debrief/stac-writer';

export const WRITER_DB_NAME = 'debrief-stac-writer-v1';

/**
 * Probe IndexedDB availability and write-readiness.
 *
 * Failure modes mapped to `CapabilityReport.reason`:
 *   - `unavailable` — `globalThis.indexedDB` is undefined (very old browsers,
 *     mobile policies, or some private-mode configurations).
 *   - `denied`      — `IDBOpenDBRequest.onerror` fires with permission denied
 *     (Firefox private mode, browser policy refusal).
 *   - `quota`       — open succeeds but a probe transaction throws
 *     `QuotaExceededError`.
 *   - `idb-version-mismatch` — open returns a version older than expected,
 *     suggesting the user has a newer build's database from a different
 *     deploy slice.
 */
export async function probeIndexedDbCapability(): Promise<CapabilityReport> {
  if (typeof globalThis.indexedDB === 'undefined' || globalThis.indexedDB === null) {
    return { available: false, persistent: false, reason: 'unavailable' };
  }

  // Try to open the writer database. We don't trigger an upgrade here —
  // openDB is the writer's job — but we do confirm the browser will let us
  // open at all.
  try {
    const opened = await openProbe();
    opened.close();
  } catch (cause) {
    return classifyOpenError(cause);
  }

  // Probe persistence grant. `navigator.storage.persisted()` is best-effort;
  // a missing API is treated as "not yet granted" (still available).
  let persistent = false;
  try {
    const storageApi = (globalThis.navigator as Navigator | undefined)?.storage;
    if (storageApi !== undefined && typeof storageApi.persisted === 'function') {
      persistent = await storageApi.persisted();
    }
  } catch {
    // Not fatal — persistence grant not measurable.
  }

  return { available: true, persistent };
}

function openProbe(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = globalThis.indexedDB.open(WRITER_DB_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    req.onupgradeneeded = () => {};
  });
}

function classifyOpenError(cause: unknown): CapabilityReport {
  if (cause instanceof DOMException) {
    if (cause.name === 'QuotaExceededError') {
      return { available: false, persistent: false, reason: 'quota' };
    }
    if (
      cause.name === 'SecurityError' ||
      cause.name === 'InvalidAccessError' ||
      cause.name === 'NotAllowedError'
    ) {
      return { available: false, persistent: false, reason: 'denied' };
    }
    if (cause.name === 'VersionError') {
      return {
        available: false,
        persistent: false,
        reason: 'idb-version-mismatch',
      };
    }
  }
  return { available: false, persistent: false, reason: 'unavailable' };
}

/**
 * Request `navigator.storage.persist()` once on first successful write.
 * The caller (writer) records `meta.firstWriteAt` and `meta.persistGranted`
 * so this is never re-called.
 */
export async function requestPersistOnce(): Promise<boolean> {
  try {
    const storageApi = (globalThis.navigator as Navigator | undefined)?.storage;
    if (storageApi === undefined || typeof storageApi.persist !== 'function') {
      return false;
    }
    return await storageApi.persist();
  } catch {
    return false;
  }
}
