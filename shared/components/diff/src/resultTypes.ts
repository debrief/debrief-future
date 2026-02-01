/**
 * Result type matching utilities for hierarchical type degradation.
 *
 * Enables consumers to match result types at any depth in the hierarchy.
 */

export type ResultTopType = "mutation" | "addition" | "deletion" | "artifact";

const VALID_TOP_TYPES: ReadonlySet<string> = new Set<ResultTopType>([
  "mutation",
  "addition",
  "deletion",
  "artifact",
]);

/**
 * Match a result type path against a prefix.
 *
 * Matching is segment-based: "mutation" matches "mutation/track/smoothed"
 * but "mut" does not.
 */
export function matchesResultType(typePath: string, prefix: string): boolean {
  if (!typePath || !prefix) return false;
  const pathSegments = typePath.split("/");
  const prefixSegments = prefix.split("/");
  if (prefixSegments.length > pathSegments.length) return false;
  for (let i = 0; i < prefixSegments.length; i++) {
    if (pathSegments[i] !== prefixSegments[i]) return false;
  }
  return true;
}

/**
 * Extract the top-level type from a result type path.
 *
 * @throws Error if the type path doesn't start with a valid top-level type
 */
export function getTopLevelType(typePath: string): ResultTopType {
  if (!typePath) throw new Error("typePath must be a non-empty string");
  const firstSegment = typePath.split("/")[0];
  if (!VALID_TOP_TYPES.has(firstSegment)) {
    throw new Error(
      `Invalid top-level type: '${firstSegment}'. Must be one of: mutation, addition, deletion, artifact`,
    );
  }
  return firstSegment as ResultTopType;
}
