/**
 * Storyboard CRUD error taxonomy (Feature 215, research.md R7).
 *
 * All errors carry a stable `code` string — consumers MUST match on
 * `err.code`, not on `instanceof` — because bundler name-mangling can
 * rename class identifiers. The codes are enumerable via the
 * `StoryboardErrorCode` union for exhaustiveness checks.
 */
export type StoryboardErrorCode = "DuplicateTimestamp" | "OrphanScene" | "UnknownStoryboard" | "UnknownScene" | "ReservedSlotViolation" | "DuplicateStoryboardName" | "ThumbnailDeepCopyFailed" | "SchemaMigrationFailed" | "InvariantViolation";
export declare abstract class StoryboardError extends Error {
    abstract readonly code: StoryboardErrorCode;
}
export declare class DuplicateTimestampError extends StoryboardError {
    readonly timestamp: string;
    readonly conflictingSceneId: string;
    readonly code = "DuplicateTimestamp";
    constructor(timestamp: string, conflictingSceneId: string);
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
//# sourceMappingURL=errors.d.ts.map