# Research: PROV Log Input Snapshot for Mutation Replay

**Feature**: 116-fix-move-tool-bearing
**Date**: 2026-03-01

## Gap Analysis

### Current State

The inputState mechanism is **partially implemented** across two layers:

| Layer | Component | inputState Support | Status |
|-------|-----------|-------------------|--------|
| **Schema** | `shared/schemas/src/linkml/log-entry.yaml` | Not defined | Missing |
| **Python** | `services/calc/debrief_calc/models.py` (LogEntry) | Not defined | Missing |
| **Python** | `services/calc/debrief_calc/provenance.py` (create_log_entry) | Not accepted | Missing |
| **Python** | `services/calc/debrief_calc/executor.py` | Not captured | Missing |
| **TypeScript** | `services/session-state/src/log/types.ts` (LogEntry) | `inputState?: InputFeatureState[] \| null` | Complete |
| **TypeScript** | `services/session-state/src/log/entryBuilder.ts` | `buildLogEntry()` stores inputState | Complete |
| **TypeScript** | `apps/vscode/src/commands/executeTool.ts` | Captures `preToolInputState` before mutation tools | Complete |
| **TypeScript** | `services/session-state/src/log/logService.ts` | `tuneEntry()` restores from inputState | Complete |
| **TypeScript** | `services/session-state/src/log/replayEngine.ts` | Builds replay plan correctly | Complete |

### Current Flow (What Works)

1. VS Code extension captures pre-tool geometry in `executeTool.ts:145-162`
2. After Python tool returns, TypeScript `entryBuilder.buildLogEntry()` creates a LogEntry WITH inputState
3. This entry is persisted on the GeoJSON feature's `provenance` array
4. During replay, `logService.tuneEntry()` reads inputState, restores features, re-executes

### What's Broken

1. **Schema violation (Constitution II.1)**: `InputFeatureState` is hand-written in TypeScript, not derived from LinkML master schema
2. **Python model gap**: The Python `LogEntry` Pydantic model has no `inputState` field, so round-trip through Python would drop the data
3. **Server-side gap**: If a tool is invoked directly via MCP (not through VS Code), no inputState is captured
4. **No fixture**: No golden fixture validates inputState in the provenance array
5. **No round-trip test**: No test verifies inputState survives Python → JSON → TypeScript → JSON → Python

---

## Decision 1: Where to Capture inputState

**Decision**: Capture inputState in the **Python executor** (`executor.py`), not in the tool handler.

**Rationale**:
- The executor already has access to `context.features` (the input features) before calling the handler
- Keeps tool handlers simple — they don't need to know about inputState
- Consistent with existing pattern: provenance is created in the executor, not the handler
- Works for all mutation tools (current and future) without per-tool changes
- The VS Code side already captures it as a redundant safety net; having both is belt-and-suspenders

**Alternatives Considered**:
1. **Capture in each tool handler** — Rejected: requires each mutation tool to know about inputState; error-prone for new tools
2. **Capture only in TypeScript** (keep current approach) — Rejected: violates Constitution IV (services are authoritative), leaves MCP-only invocations unsupported
3. **Capture in MCP wrapper** — Rejected: violates Constitution IV.3 (domain logic in pure Python, not MCP layer)

---

## Decision 2: What to Store in the Snapshot

**Decision**: Store geometry + kind-specific spatial properties (e.g., `center`, `origin`). Exclude provenance, styling, and non-spatial metadata.

**Rationale**:
- Geometry coordinates are what mutation tools modify
- Kind-specific spatial properties (`center` for circles, `origin` for vectors) are derived from and kept in sync with geometry
- Provenance is append-only and must not be restored during replay (would lose subsequent entries)
- Styling properties are not affected by spatial mutations
- Matches the existing TypeScript implementation in `executeTool.ts:153-161`

**Alternatives Considered**:
1. **Store full feature snapshot** — Rejected: unnecessary overhead, risks restoring non-spatial changes made between operations
2. **Store geometry only** — Rejected: some tools depend on derived spatial properties (e.g., move-shape updates `center` property on circles); these must also be captured
3. **Store only coordinate deltas** — Rejected: more complex, tool-specific, and doesn't support arbitrary geometry types

---

## Decision 3: LinkML Schema Representation

**Decision**: Add `InputFeatureState` as a new class in `log-entry.yaml` and add an optional `input_state` attribute to `LogEntry`.

**Rationale**:
- Follows existing pattern: `TuneAnnotation` is defined in the same file and referenced by `LogEntry`
- `InputFeatureState` is a PROV concern (captures input state for replay), so it belongs in the log-entry schema
- Using `range: InputFeatureState` with `multivalued: true` matches the TypeScript `InputFeatureState[]`
- The `geometry` field uses `range: string` (JSON-serialized) because LinkML doesn't have a native GeoJSON geometry type — consistent with how the GeoJSON schema handles complex geometry

**Alternatives Considered**:
1. **Define in geojson.yaml** — Rejected: InputFeatureState is a provenance concept, not a GeoJSON concept
2. **Use JSON blob (untyped)** — Rejected: violates Constitution XV (strict type safety); no schema validation possible
3. **Reference GeoJSON geometry classes** — Rejected: would create circular dependency between log-entry.yaml and geojson.yaml; geometry is polymorphic (Point, Polygon, LineString, etc.)

---

## Decision 4: Python Model Field Typing

**Decision**: Create a `InputFeatureState` Pydantic model with `geometry: dict[str, Any]` and `properties: dict[str, Any] | None`.

**Rationale**:
- GeoJSON geometry is a dict with `type` and `coordinates` keys — this is the standard Pydantic representation
- `dict[str, Any]` is the established pattern in the codebase for GeoJSON structures (see `SelectionContext.features`, `ToolResult.features`)
- The `Any` in `dict[str, Any]` is acceptable here because GeoJSON coordinate arrays have variable nesting depth (Point: `[x, y]`, Polygon: `[[[x, y], ...]]`) — this is a system boundary where JSON data enters
- Adding a `feature_id: str` field (aliased as `featureId`) matches the TypeScript interface exactly

**Alternatives Considered**:
1. **Use `object` type** — Rejected: less descriptive than dict
2. **Create typed Geometry union** — Rejected: over-engineering; the geometry is opaque to the provenance system (it just stores and restores it)
3. **Reuse Shapely or GeoJSON library types** — Rejected: adds external dependency for a storage-only field

---

## Decision 5: Backward Compatibility

**Decision**: `inputState` is optional (`required: false` in LinkML, `| None` in Python). Existing LogEntries without inputState remain valid.

**Rationale**:
- Non-mutation tools don't need inputState
- Historical entries from before this feature won't have inputState
- The replay system already handles missing inputState gracefully (logService.ts:271 checks `if (inputState && inputState.length > 0)`)
- Pre-release (Article XIV) means we could make it required, but optional is correct: not all tools mutate coordinates

**Alternatives Considered**:
1. **Make required for mutation tools only** — Rejected: schema can't conditionally require a field based on tool type; would need a discriminated union (complex)
2. **Backfill existing entries** — Rejected: original geometry is lost for past operations; inputState must be captured at execution time
