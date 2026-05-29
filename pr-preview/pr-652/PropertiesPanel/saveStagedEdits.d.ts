import { DebriefFeature } from '../../../schemas/src/generated/typescript/index.ts';
import { UseStagedEditsApi } from '../ActivityPanel/useStagedEdits';
import { PropertiesProvenanceEntry } from './provenanceTypes';

/**
 * Writer result. Mirrors the existing `SaveResult` shape from
 * `services/session-state/src/persistence/save.ts:58–63` so existing call
 * sites can be wired in directly. The integration test uses this shape
 * verbatim.
 */
export interface SaveStagedEditsResult {
    success: boolean;
    error?: string;
}
/**
 * The writer takes a snapshot of features (already merged with the staged
 * edits) and persists them through the host's `saveSession` /
 * `updateItemMetadata` / writer abstraction.
 */
export type SaveWriter = (nextFeatures: DebriefFeature[]) => Promise<SaveStagedEditsResult>;
/**
 * The provenance appender adds one `PropertiesProvenanceEntry` to the
 * affected feature's provenance log. Matches the existing call site in
 * `apps/vscode/src/services/stacService.ts:1579–1660`.
 */
export type AppendProvenanceFn = (featureId: string, entry: PropertiesProvenanceEntry) => Promise<void> | void;
/**
 * Per-affected-feature provenance entry shape used in the LogEntry's
 * `inputs[]` list. Matches `useStagedEdits.ProvenancePath` 1:1 (re-exported
 * for symmetry — the staging hook returns the same shape).
 */
export interface ProvenanceInputPath {
    path: string;
    op: 'set' | 'revert';
}
export interface SaveStagedEditsInput {
    /** Snapshot of features at save time. Source: the host's features list. */
    features: DebriefFeature[];
    /** The staging hook returned by `useStagedEdits()`. */
    staging: UseStagedEditsApi;
    /** The host's writer surface (`saveSession` etc.). */
    writer: SaveWriter;
    /** The host's provenance appender. */
    appendProvenance: AppendProvenanceFn;
    /** Package version pin for the provenance entry's `method` field. */
    packageVersion: string;
    /** ULID / UUID generator. Default: `crypto.randomUUID()` when available. */
    generateActivityId?: () => string;
    /** Timestamp factory (`() => new Date().toISOString()` by default). */
    now?: () => string;
}
/**
 * Run the staged-edits save path end-to-end.
 *
 * Returns the writer's `SaveStagedEditsResult` so the caller can decide
 * whether to clear an outer "writeError" surface. On success the staging
 * buffer is cleared; on failure it is preserved.
 */
export declare function saveStagedEdits(input: SaveStagedEditsInput): Promise<SaveStagedEditsResult>;
//# sourceMappingURL=saveStagedEdits.d.ts.map