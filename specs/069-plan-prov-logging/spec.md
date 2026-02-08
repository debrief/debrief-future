# Feature Specification: Plan PROV Logging Integration with Application State

**Feature Branch**: `069-plan-prov-logging`
**Created**: 2026-02-08
**Status**: Draft
**Input**: User description: "Plan PROV logging integration with application state — transition plan from current state to SRD provenance target; covers ToolResult contract, Log Service, undo/redo split, schema migration, phased implementation sequence"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Transition Plan Document (Priority: P1)

A developer picks up a PROV-related backlog item (e.g. "Implement Log Recording") and needs an authoritative reference that maps the gap between the current codebase and the SRD target. The transition plan document is that reference: it describes every interface that must change, in what order, and with what dependencies.

**Why this priority**: Without this document, each PROV implementation item would start from scratch, re-analysing the same gap. The plan is the prerequisite for all six SRD priorities (P1-P6).

**Independent Test**: A developer reading the document can identify, for any SRD capability, exactly which current interfaces need changing and in what order.

**Acceptance Scenarios**:

1. **Given** the transition plan document exists, **When** a developer looks up "ToolResult contract expansion", **Then** they find a before/after comparison of the current `ToolResult` model (Python `models.py`) vs the SRD target, with every new field listed and typed
2. **Given** the transition plan document exists, **When** a developer looks up "Log Service design", **Then** they find the service boundary, its relationship to session-state, and the TypeScript API surface
3. **Given** the transition plan document exists, **When** a developer looks up any of the 7 areas from the idea document, **Then** that area has its own section with current state, target state, and migration steps

---

### User Story 2 - Phased Implementation Sequence (Priority: P1)

A project manager (or the-ideas-guy) needs to create backlog items for each PROV implementation phase. The transition plan provides a dependency graph and phase breakdown that maps SRD priorities (P1-P6) to concrete, self-contained backlog items.

**Why this priority**: Equal to US1 because the plan is only useful if it decomposes into actionable work. The phases are the deliverable output.

**Independent Test**: Each phase can be extracted as a standalone backlog item with clear inputs, outputs, and dependencies.

**Acceptance Scenarios**:

1. **Given** the phased sequence exists, **When** reviewing Phase 1 (Log Recording), **Then** it lists the exact interfaces to create/modify, the tests required, and the prerequisite items (if any)
2. **Given** the phased sequence exists, **When** checking dependencies between phases, **Then** a Mermaid dependency graph shows which phases block which, and no circular dependencies exist
3. **Given** the phased sequence exists, **When** comparing against SRD priorities P1-P6, **Then** every SRD priority maps to at least one phase, and every phase maps to at least one SRD priority

---

### User Story 3 - Breaking Change Inventory (Priority: P2)

A developer working on an unrelated feature needs to know whether their work will conflict with the upcoming PROV migration. The transition plan provides a clear inventory of every breaking change to existing interfaces.

**Why this priority**: Prevents wasted work and merge conflicts. Lower than P1 because it is derived from the detailed gap analysis.

**Independent Test**: A developer can look up any current interface (ToolResult, provenance schema, undo middleware) and see whether it will change and how.

**Acceptance Scenarios**:

1. **Given** the breaking change inventory exists, **When** a developer checks `ToolResult` (Python `models.py`), **Then** they see which fields are added, which are renamed, and which semantics change
2. **Given** the breaking change inventory exists, **When** a developer checks the undo middleware, **Then** they see that it will be split into UI-only undo/redo vs data-change Log, with the boundary clearly defined
3. **Given** the breaking change inventory exists, **When** a developer checks `feature.properties.provenance`, **Then** they see the current simple schema and the target PROV-aligned schema side by side

---

### Edge Cases

- What happens if an SRD capability has no current-state counterpart (e.g. Branching, Snapshots)? The plan must still document these as new additions with clear entry points
- What if a current interface is used by multiple consumers (e.g. ToolResult used by calc executor, VS Code extension, tests)? The plan must list all consumers and the migration impact on each
- What if two phases have a circular dependency? The plan must resolve this by splitting or reordering

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The transition plan document MUST cover all 7 areas defined in the idea document (ToolResult contract, Log Service, undo/redo split, provenance schema migration, system record, phased sequence, session-state integration)
- **FR-002**: Each area MUST include a "Current State" section referencing the actual codebase (file paths, line numbers, code snippets) and a "Target State" section referencing the SRD documents
- **FR-003**: The ToolResult contract expansion MUST specify every new field with its type, whether it is required or optional, and which SRD section mandates it
- **FR-004**: The Log Service design MUST define the TypeScript API surface, its relationship to the Zustand session-state store, and the data flow from Python ToolResult to persisted Log entry
- **FR-005**: The undo/redo split MUST define which current `StateSnapshot` fields remain in UI undo/redo and which move to the Log, with the decision rationale for each field
- **FR-006**: The provenance schema migration MUST provide before/after JSON examples for `feature.properties.provenance`, covering tool invocations, property edits, and artifact-producing tools
- **FR-007**: The system record section MUST define the null-geometry feature structure for snapshot links and branch records, consistent with SRD Annex A.4
- **FR-008**: The phased implementation sequence MUST produce a Mermaid dependency graph and a table mapping each phase to SRD priorities, prerequisite backlog items, and estimated scope
- **FR-009**: The session-state integration section MUST define how the Log Service interacts with dirty tracking, the existing `enableDirtyTracking()` subscription, and persistence via stacService
- **FR-010**: The plan MUST identify all breaking changes to existing interfaces with a migration checklist (files to update, tests to modify, sample data to regenerate)
- **FR-011**: The plan MUST be a single Markdown document stored at `docs/architecture/prov-transition-plan.md`
- **FR-012**: Each implementation phase MUST be self-contained enough to become a backlog item or epic, with clear inputs, outputs, and acceptance criteria

### Key Entities

- **ToolResult**: The Python model returned by calc services after tool execution. Currently defined in `services/calc/debrief_calc/models.py`. Will be expanded with `modifiedFeatures`, `createdFeatures`, `createdAssets`, full resolved parameters
- **Log Entry**: A PROV-vocabulary record of a data change, stored on `feature.properties.provenance`. Defined in SRD Annex A.3. Wraps a ToolResult with `activityId`, `timestamp`, and optional `tune` annotation
- **Log Service**: A new TypeScript shared library that converts ToolResults into Log entries and manages the timeline. Defined in SRD Annex A.2
- **System Record**: A null-geometry GeoJSON feature carrying plot-level metadata (snapshot links, branch records). Defined in SRD Annex A.4
- **StateSnapshot**: The current undo history record in the session-state store (`services/session-state/src/store/index.ts`). Will be narrowed to UI-only fields after the split
- **Provenance (current)**: The simple lineage model in `services/calc/debrief_calc/models.py` (tool, version, timestamp, sources, parameters). Will be replaced by the richer PROV-aligned schema

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The transition plan document covers all 7 areas from the idea document, each with Current State and Target State sections — verified by section heading check
- **SC-002**: The dependency graph has no circular dependencies — verified by graph inspection
- **SC-003**: Every SRD priority (P1-P6) maps to at least one implementation phase — verified by cross-reference table
- **SC-004**: Every breaking change is listed with the specific file paths and consumers affected — verified by searching the plan for all current interfaces listed in this spec
- **SC-005**: Each phase description is detailed enough to create a backlog item without re-reading the SRD — verified by extracting one phase and confirming it stands alone
- **SC-006**: The plan references actual codebase paths (not hypothetical) — verified by checking that all referenced files exist in the repository

### Document Deliverables

| Deliverable | Location | Purpose |
|-------------|----------|---------|
| Transition plan document | `docs/architecture/prov-transition-plan.md` | Main deliverable: gap analysis, migration path, phased sequence |
| Updated BACKLOG.md | `BACKLOG.md` | New backlog items for each implementation phase (added after plan review) |

### Constitutional Compliance

| Article | Requirement | How This Spec Complies |
|---------|-------------|----------------------|
| Art. I (Reliability) | Offline by default | Plan must ensure Log Service works offline; no network dependencies |
| Art. III (Provenance) | Every transformation records lineage | Plan defines the mechanism for recording every data change |
| Art. III (Immutable audit) | Provenance records cannot be modified | Plan specifies append-only Log entries with tune annotations |
| Art. IV (Boundaries) | Services never touch UI | Plan keeps Python services stateless; Log Service is TypeScript session-state |
| Art. VIII (Specs before code) | No implementation without spec | This spec and the resulting plan precede all PROV implementation |
| Art. XIV (Pre-Release Freedom) | Breaking changes permitted | Plan leverages this to replace the current provenance schema freely |

## Appendix: Current State Reference

### Current ToolResult (Python)

File: `services/calc/debrief_calc/models.py` (lines 115-137)

```python
class ToolResult(BaseModel):
    tool: str
    success: bool
    features: list[dict[str, Any]] | None
    error: ToolError | None
    duration_ms: float
```

### Current Provenance (Python)

File: `services/calc/debrief_calc/models.py` (lines 49-63)

```python
class Provenance(BaseModel):
    tool: str
    version: str
    timestamp: datetime
    sources: list[SourceRef]
    parameters: dict[str, Any]
```

### Current Undo Middleware (TypeScript)

File: `services/session-state/src/store/index.ts` (lines 23-58)

```typescript
interface StateSnapshot {
    currentTime, timeRange, timeFilter, stepSize,
    playbackRate, displayMode, viewport, rotation,
    featureCollectionUri, selection, hiddenFeatureIds, savePath
}
// 50-step history limit, records all non-ephemeral field changes
```

### Current Dirty Tracking (TypeScript)

File: `services/session-state/src/store/middleware/dirty.ts`

Triggers on changes to: `currentTime`, `timeRange`, `timeFilter`, `stepSize`, `playbackRate`, `displayMode`, `viewport`, `rotation`, `featureCollectionUri`, `selection`, `hiddenFeatureIds`

### SRD Target ToolResult (from Annex A.8)

```
modifiedFeatures: [featureId + changed properties]
createdFeatures: [references to new features]
createdAssets: [resultId + versioned path]
tool: identifier
toolVersion: semver
parameters: full resolved set including defaults
executionDuration: wall-clock time
```

### SRD Target Log Entry (from Annex A.3)

```json
{
    "activityId": "act-001",
    "timestamp": "2026-02-06T14:38:00Z",
    "wasGeneratedBy": {
        "tool": "calculate-range",
        "toolVersion": "1.2.0",
        "parameters": {
            "interval": { "value": "PT60S", "default": true, "tunable": true }
        }
    },
    "used": ["feature-id-Neptune"],
    "generated": ["feature-id-range-result"],
    "executionDuration": "PT0.3S",
    "tune": null
}
```
