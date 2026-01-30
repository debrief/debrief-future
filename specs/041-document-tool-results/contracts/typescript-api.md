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
