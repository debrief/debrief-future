# TypeScript API Contract: Tool Results Architecture

**Feature**: #041 Tool Results Architecture
**Date**: 2026-01-30

## Shared Diff Utility (`@debrief/diff`)

### `diffFeatureCollections.ts`

```typescript
interface ModifiedEntry {
  /** Feature ID */
  id: string;
  /** The updated feature from the new FeatureCollection */
  feature: GeoJSON.Feature;
}

interface FeatureCollectionDiff {
  /** Features present in new FC but not old */
  added: GeoJSON.Feature[];
  /** Feature IDs present in old FC but not new */
  removed: string[];
  /** Features present in both but changed */
  modified: ModifiedEntry[];
}

/**
 * Compute differences between two GeoJSON FeatureCollections.
 *
 * Features are matched by their `id` property (or `properties.id` as fallback).
 * A feature is "modified" if its JSON serialisation differs between old and new.
 *
 * @param oldFC - The previous FeatureCollection
 * @param newFC - The updated FeatureCollection
 * @returns Diff result with added, removed, and modified features
 *
 * @example
 * ```typescript
 * const diff = diffFeatureCollections(oldFC, newFC);
 * diff.added;    // Feature[]
 * diff.removed;  // string[]
 * diff.modified; // { id, feature }[]
 * ```
 */
function diffFeatureCollections(
  oldFC: GeoJSON.FeatureCollection,
  newFC: GeoJSON.FeatureCollection,
): FeatureCollectionDiff;
```

## Result Type Matching (Generated from LinkML)

```typescript
/** Top-level result types (generated from LinkML schema) */
type ResultTopType = "mutation" | "addition" | "deletion" | "artifact";

/**
 * Match a result type path against a prefix.
 *
 * Enables hierarchical degradation: consumers match as deep as they understand.
 *
 * @param typePath - Full type path (e.g., "artifact/report/ssa_assessment")
 * @param prefix - Prefix to match against (e.g., "artifact/report")
 * @returns true if typePath starts with prefix
 *
 * @example
 * ```typescript
 * matchesResultType("artifact/report/ssa_assessment", "artifact");       // true
 * matchesResultType("artifact/report/ssa_assessment", "artifact/report"); // true
 * matchesResultType("artifact/report/ssa_assessment", "mutation");       // false
 * ```
 */
function matchesResultType(typePath: string, prefix: string): boolean;

/**
 * Extract the top-level type from a result type path.
 *
 * @param typePath - Full type path
 * @returns The top-level type
 * @throws Error if the type path doesn't start with a valid top-level type
 */
function getTopLevelType(typePath: string): ResultTopType;
```

## Orchestrator: Content Array Processing

```typescript
/**
 * Process a multi-result tool response by iterating the content array
 * and calling the appropriate atomic STAC operation for each item.
 *
 * Each content item is processed sequentially in array order.
 * After each atomic operation, the diff utility is called and UI is updated.
 *
 * @param response - MCP tool response with content array
 * @param catalogPath - Path to the STAC catalog
 * @param plotId - Plot ID to update
 * @returns Array of FeatureCollectionDiff results (one per content item)
 *
 * @example
 * ```typescript
 * // Tool returns deletion + artifact
 * const diffs = await processToolResponse(response, catalogPath, plotId);
 * // diffs[0] = diff from deletion operation
 * // diffs[1] = diff from artifact storage (FC unchanged, but asset added)
 * ```
 */
async function processToolResponse(
  response: ToolResponse,
  catalogPath: string,
  plotId: string,
): Promise<FeatureCollectionDiff[]>;

interface ToolResponse {
  content: ContentItem[];
}

interface ContentItem {
  type: "text" | "resource" | "image";
  annotations: DebriefResultAnnotations;
  [key: string]: unknown;
}
```

## Debrief Result Annotations

```typescript
/** Annotations attached to MCP tool responses */
interface DebriefResultAnnotations {
  /** Hierarchical type path (e.g., "mutation/track/smoothed") */
  "debrief:resultType": string;
  /** Feature IDs used as input to the tool */
  "debrief:sourceFeatures": string[];
  /** Human-readable description */
  "debrief:label": string;
  /** Relative file path for artifacts (artifact results only) */
  "debrief:href"?: string;
  /** Feature IDs removed (deletion results only) */
  "debrief:deletedFeatures"?: string[];
}

/** Annotations attached to MCP error responses */
interface DebriefErrorData {
  /** Error category */
  "debrief:errorCategory": "invalid_input" | "algorithm_failure" | "resource_not_found";
  /** Feature IDs related to the error */
  "debrief:affectedFeatures": string[];
}
```
