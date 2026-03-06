/**
 * Schema cache for tool parameter schemas.
 *
 * REVIEW DECISION (113-review, 3A): The SchemaCache interface, SchemaCacheEntry
 * type, and CreateSchemaCache factory have been removed. Use a plain
 * Map<string, ReadonlyArray<ParameterSchemaEntry>> stored in a React useRef
 * within the webview component.
 *
 * Implementation:
 * ```typescript
 * const schemaCacheRef = useRef(new Map<string, ReadonlyArray<ParameterSchemaEntry>>());
 *
 * // On schema:response
 * schemaCacheRef.current.set(toolId, parameters);
 *
 * // On card flip
 * const cached = schemaCacheRef.current.get(toolId);
 * if (cached) { renderControls(cached); } else { sendSchemaRequest(toolId); }
 *
 * // On session change
 * schemaCacheRef.current.clear();
 * ```
 *
 * The Map provides get, set, has, clear, and size natively.
 * No custom interface, factory, or cache entry wrapper needed.
 */

export {}; // Keep file as a documentation artifact; no exports needed.
