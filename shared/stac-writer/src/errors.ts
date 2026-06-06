/**
 * StacWriter error taxonomy. Every operation rejects with a StacWriterError
 * whose `kind` discriminates the failure mode. The `cause` chain is always
 * preserved — never swallowed (Article I.3 / FR-017).
 */

export type StacWriterErrorKind =
  | 'path-rejected'
  | 'stac-item-not-found'
  | 'bundled-item-read-only'
  | 'item-json-malformed'
  | 'stale-fingerprint'
  | 'validation-failed'
  | 'write-failed'
  | 'read-only-fs'
  | 'quota-exceeded'
  | 'indexeddb-unavailable'
  | 'empty-png';

export interface StacWriterErrorOptions {
  readonly path?: string;
  readonly cause?: unknown;
}

export class StacWriterError extends Error {
  readonly kind: StacWriterErrorKind;
  readonly path?: string;
  override readonly cause?: unknown;

  constructor(
    kind: StacWriterErrorKind,
    message: string,
    options?: StacWriterErrorOptions,
  ) {
    super(message);
    this.name = 'StacWriterError';
    this.kind = kind;
    this.path = options?.path;
    this.cause = options?.cause;
    // Restore prototype chain across compilation targets.
    Object.setPrototypeOf(this, StacWriterError.prototype);
  }

  /** Plain JSON projection — `cause` flattened to its message for clean
   *  serialisation across host boundaries. */
  toJSON(): {
    readonly name: string;
    readonly kind: StacWriterErrorKind;
    readonly message: string;
    readonly path?: string;
    readonly cause?: string;
  } {
    return {
      name: this.name,
      kind: this.kind,
      message: this.message,
      path: this.path,
      cause: serialiseCause(this.cause),
    };
  }
}

function serialiseCause(cause: unknown): string | undefined {
  if (cause === undefined || cause === null) return undefined;
  if (cause instanceof Error) return cause.message;
  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}

/**
 * Thrown when a filesystem-backed STAC store refuses a write because the
 * underlying disk / mount is read-only (EACCES / EROFS / EPERM, or a read-
 * only fs override). Mirrors `StacWriterError({ kind: 'read-only-fs' })` for
 * call sites that prefer an exception class with named identity over the
 * discriminated `kind` field.
 *
 * Re-located here (spec #192 T017) so `@debrief/session-state`'s
 * `saveSession` catch block can detect it cleanly via `instanceof` without
 * pulling in the VS Code extension package. Browser-safe — no Node imports.
 */
export class ReadOnlyFilesystemError extends Error {
  override readonly name = 'ReadOnlyFilesystemError' as const;
  readonly path: string;

  constructor(
    path: string,
    message: string = 'Cannot write item.json — filesystem is read-only',
  ) {
    super(message);
    this.path = path;
    // Restore prototype chain across compilation targets.
    Object.setPrototypeOf(this, ReadOnlyFilesystemError.prototype);
  }
}
