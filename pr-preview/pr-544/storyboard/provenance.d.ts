import { LogEntry } from '../../../schemas/src/generated/typescript/index.ts';
import { SceneFeature, StoryboardFeature } from './types';

export declare const STORYBOARD_CRUD_TOOL = "storyboard-crud";
export declare const STORYBOARD_CRUD_TOOL_VERSION = "1.0.0";
export declare const STORYBOARD_CRUD_EXECUTION_DURATION = "PT0S";
export type StoryboardCrudOp = "create" | "rename" | "describe" | "delete" | "restore" | "update-to-current" | "duplicate" | "copy-in" | "insert-middle" | "refresh-thumbnail";
export interface StoryboardCrudLogEntryInput {
    op: StoryboardCrudOp;
    actor: string;
    now: string;
    summary: string;
    used: string[];
    generated: string[];
    activityId: string;
    rationale?: string;
}
/**
 * Build a LogEntry encoding a single storyboard CRUD mutation.
 * Pure — no I/O, no mutation of inputs.
 */
export declare function buildStoryboardCrudLogEntry(input: StoryboardCrudLogEntryInput): LogEntry;
/**
 * Read the `op` string from a storyboard-crud-emitted LogEntry. Returns
 * null if the entry was not emitted by this module.
 */
export declare function readStoryboardCrudOp(entry: LogEntry): StoryboardCrudOp | null;
/** Derived accessor: first provenance entry timestamp (= created_at). */
export declare function getCreatedAt(feature: StoryboardFeature | SceneFeature): string;
/** Derived accessor: last provenance entry timestamp (= last_modified_at). */
export declare function getLastModifiedAt(feature: StoryboardFeature | SceneFeature): string;
/** Derived accessor: agent on the first provenance entry (= created_by). */
export declare function getCreatedBy(feature: StoryboardFeature | SceneFeature): string | null;
/** Derived accessor: agent on the last provenance entry (= last_modified_by). */
export declare function getLastModifiedBy(feature: StoryboardFeature | SceneFeature): string | null;
//# sourceMappingURL=provenance.d.ts.map