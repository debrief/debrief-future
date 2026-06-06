/**
 * Save journal — the write-ahead intent record that marks the filesystem
 * commit point for an atomic plot save (#268, ADR-039).
 *
 * `commitPlotSave` (stacWriterFs) stages every artefact as a temp file, then
 * atomically writes ONE journal listing the pending `temp → final` renames.
 * The atomic creation of that journal IS the commit point: `reconcilePlotSave`
 * rolls **back** before the journal exists (delete temps, keep originals) and
 * **forward** after it (re-apply the pending renames idempotently). The journal
 * lives at `<item-dir>/.save-journal.json` and is deleted on success.
 *
 * It never crosses the public `StacWriter` interface (FS-only; the browser host
 * relies on IndexedDB transaction atomicity). It is validated on read through
 * {@link parseSaveJournal} — no `any`, no unchecked casts (Article XV.5).
 */

/** Filename of the journal within an item directory. */
export const SAVE_JOURNAL_FILENAME = '.save-journal.json';

/** Current journal format version (forward-compat guard). */
export const SAVE_JOURNAL_VERSION = 1 as const;

/** A single pending `temp → final` rename, item-dir-relative. */
export interface SaveJournalRename {
  /** Item-dir-relative path of the staged temp file. */
  readonly temp: string;
  /** Item-dir-relative path of the final destination. */
  readonly final: string;
}

/**
 * The write-ahead intent record. Persisted atomically; its existence means a
 * save reached the commit point and `reconcilePlotSave` must roll forward.
 */
export interface SaveJournal {
  readonly version: typeof SAVE_JOURNAL_VERSION;
  /** Item this save belongs to (catalog-relative, for diagnostics). */
  readonly stacItemPath: string;
  /** `ctx.nowMs()` captured at the commit-point write. */
  readonly createdAtMs: number;
  /** Pending `temp → final` renames, in apply order. */
  readonly renames: ReadonlyArray<SaveJournalRename>;
}

/** Narrow `unknown` to a plain (non-array, non-null) object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRename(value: unknown): SaveJournalRename | null {
  if (!isPlainObject(value)) {
    return null;
  }
  const { temp, final } = value;
  if (typeof temp !== 'string' || temp.length === 0) {
    return null;
  }
  if (typeof final !== 'string' || final.length === 0) {
    return null;
  }
  return { temp, final };
}

/**
 * Validate untyped JSON as a {@link SaveJournal}. Returns the typed record, or
 * `null` when the input is missing, malformed, or a future/unknown version —
 * the caller then treats it as "no usable journal" and rolls back safely.
 */
export function parseSaveJournal(value: unknown): SaveJournal | null {
  if (!isPlainObject(value)) {
    return null;
  }
  if (value.version !== SAVE_JOURNAL_VERSION) {
    return null;
  }
  if (typeof value.stacItemPath !== 'string' || value.stacItemPath.length === 0) {
    return null;
  }
  if (typeof value.createdAtMs !== 'number' || !Number.isFinite(value.createdAtMs)) {
    return null;
  }
  if (!Array.isArray(value.renames)) {
    return null;
  }
  const renames: SaveJournalRename[] = [];
  for (const entry of value.renames) {
    const rename = parseRename(entry);
    if (rename === null) {
      return null;
    }
    renames.push(rename);
  }
  return {
    version: SAVE_JOURNAL_VERSION,
    stacItemPath: value.stacItemPath,
    createdAtMs: value.createdAtMs,
    renames,
  };
}
