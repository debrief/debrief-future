import { PropertiesProvenanceEntry as Generated } from '../../../schemas/src/generated/typescript/index.ts';

export declare const PROPERTIES_PANEL_TOOL_SENTINEL: "debrief.propertiesPanel";
/**
 * Per-commit provenance entry for the Properties Panel.
 *
 * Inherits `activity_id`, `timestamp`, `fields` from the LinkML-generated type;
 * narrows `tool`, `method`, `source` to the literal forms that today's
 * production write sites (stacService.ts, stacWriterIdb.ts) rely on for
 * compile-time typo detection.
 */
export type PropertiesProvenanceEntry = Omit<Generated, 'tool' | 'method' | 'source'> & {
    /** Sentinel identifying the Properties Panel as the writer. */
    tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL;
    /** Versioned method identifier, e.g. `properties-panel@1.0.0`. */
    method: `properties-panel@${string}`;
    /** Always 'user' for Properties Panel entries. */
    source: 'user';
};
/**
 * Runtime predicate used by integration tests to verify a written entry
 * satisfies the contract.
 */
export declare function isValidPropertiesProvenanceEntry(entry: unknown): entry is PropertiesProvenanceEntry;
/** Max entries retained on `item.properties["debrief:provenance_log"]`. */
export declare const PROVENANCE_LOG_CAP: 500;
/** Sibling JSONL archive for rotated entries. */
export declare const PROVENANCE_LOG_ARCHIVE_FILENAME: "provenance_log_archive.jsonl";
//# sourceMappingURL=provenanceTypes.d.ts.map