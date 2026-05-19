/**
 * Storyboard CRUD error taxonomy (Feature 215, research.md R7; updated #259).
 *
 * All errors carry a stable `code` string — consumers MUST match on
 * `err.code`, not on `instanceof` — because bundler name-mangling can
 * rename class identifiers. The codes are enumerable via the
 * `StoryboardErrorCode` union for exhaustiveness checks.
 *
 * #259 changes: `DuplicateTimestampError` is removed (the underlying
 * constraint is relaxed — multiple Scenes may share a timestamp).
 * Four new errors are added to enforce the replacement invariants
 * around the new `creation_order` slot:
 *   - `DuplicateCreationOrderError`        (FC-I4)
 *   - `CreationOrderOutOfRangeError`       (reorder bounds)
 *   - `MissingCreationOrderError`          (FC-I5 — pre-#259 plot)
 *   - `UnsupportedSchemaVersionError`      (FC-V1 — pre-#259 plot)
 */
export type StoryboardErrorCode = "OrphanScene" | "UnknownStoryboard" | "UnknownScene" | "ReservedSlotViolation" | "DuplicateStoryboardName" | "ThumbnailDeepCopyFailed" | "SchemaMigrationFailed" | "InvariantViolation" | "DuplicateCreationOrder" | "CreationOrderOutOfRange" | "MissingCreationOrder" | "UnsupportedSchemaVersion" | "SceneFlavourXorViolation" | "SceneTimeRangeEndNotAfterStart";
export declare abstract class StoryboardError extends Error {
    abstract readonly code: StoryboardErrorCode;
}
export declare class OrphanSceneError extends StoryboardError {
    readonly sceneId: string;
    readonly storyboardId: string;
    readonly code = "OrphanScene";
    constructor(sceneId: string, storyboardId: string);
}
export declare class UnknownStoryboardError extends StoryboardError {
    readonly storyboardId: string;
    readonly code = "UnknownStoryboard";
    constructor(storyboardId: string);
}
export declare class UnknownSceneError extends StoryboardError {
    readonly sceneId: string;
    readonly code = "UnknownScene";
    constructor(sceneId: string);
}
export declare class ReservedSlotViolationError extends StoryboardError {
    readonly field: string;
    readonly value: unknown;
    readonly code = "ReservedSlotViolation";
    constructor(field: string, value: unknown);
}
export declare class DuplicateStoryboardNameError extends StoryboardError {
    readonly name: string;
    readonly conflictingStoryboardId: string;
    readonly code = "DuplicateStoryboardName";
    constructor(name: string, conflictingStoryboardId: string);
}
export declare class ThumbnailDeepCopyFailedError extends StoryboardError {
    readonly cause: unknown;
    readonly code = "ThumbnailDeepCopyFailed";
    constructor(cause: unknown);
}
export declare class SchemaMigrationFailedError extends StoryboardError {
    readonly fromVersion: number;
    readonly toVersion: number;
    readonly cause: unknown;
    readonly code = "SchemaMigrationFailed";
    constructor(fromVersion: number, toVersion: number, cause: unknown);
}
export declare class InvariantViolationError extends StoryboardError {
    readonly detail: string;
    readonly code = "InvariantViolation";
    constructor(detail: string);
}
export declare class DuplicateCreationOrderError extends StoryboardError {
    readonly storyboardId: string;
    readonly creationOrder: number;
    readonly conflictingSceneIds: readonly [string, string];
    readonly code = "DuplicateCreationOrder";
    constructor(storyboardId: string, creationOrder: number, conflictingSceneIds: readonly [string, string]);
}
export declare class CreationOrderOutOfRangeError extends StoryboardError {
    readonly storyboardId: string;
    readonly sceneId: string;
    readonly providedIndex: number;
    readonly tiedGroupSize: number;
    readonly code = "CreationOrderOutOfRange";
    constructor(storyboardId: string, sceneId: string, providedIndex: number, tiedGroupSize: number);
}
export declare class MissingCreationOrderError extends StoryboardError {
    readonly storyboardId: string;
    readonly sceneId: string;
    readonly code = "MissingCreationOrder";
    constructor(storyboardId: string, sceneId: string);
}
export declare class UnsupportedSchemaVersionError extends StoryboardError {
    readonly storyboardId: string;
    readonly foundVersion: number;
    readonly requiredMinimum: number;
    readonly code = "UnsupportedSchemaVersion";
    constructor(storyboardId: string, foundVersion: number, requiredMinimum?: number);
}
export declare class SceneFlavourXorViolationError extends StoryboardError {
    readonly sceneId: string;
    readonly timeRangePresent: boolean;
    readonly viewportEndPresent: boolean;
    readonly code = "SceneFlavourXorViolation";
    constructor(sceneId: string, timeRangePresent: boolean, viewportEndPresent: boolean);
}
export declare class SceneTimeRangeEndNotAfterStartError extends StoryboardError {
    readonly sceneId: string;
    readonly start: string;
    readonly end: string;
    readonly code = "SceneTimeRangeEndNotAfterStart";
    constructor(sceneId: string, start: string, end: string);
}
//# sourceMappingURL=errors.d.ts.map