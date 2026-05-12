/**
 * TS-only function-type aliases for the MCP cluster (#222).
 *
 * Per Research R-002: LinkML describes data shapes, not callable
 * signatures. These aliases are TS-side convenience wrappers whose
 * parameter and return types ARE schema-rooted (imported from the
 * generated types). The audit's R4 rule (schemas import) reclassifies
 * any file that imports from `@debrief/schemas` as schema-rooted.
 *
 * Populated in Phase 5 (T094) once `ToolResultForLog` exists in the
 * generated types.
 */

// Aliases will be added here when the underlying generated types land:
//   - ToolExecutor:        (tool_id, feature_ids, params) => Promise<ToolResultForLog>
//   - ToolVersionResolver: (tool_id) => Promise<string | null>

export {};
