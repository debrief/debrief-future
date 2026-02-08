# Research: PROV Logging Integration Gap Analysis

**Feature**: 069 — Plan PROV Logging Integration
**Date**: 2026-02-08

## 1. ToolResult Contract: Current vs SRD Target

### Decision: Expand ToolResult with structured change tracking

**Rationale**: The current `ToolResult` (Python `models.py:115-137`) returns a flat list of GeoJSON features without distinguishing which features were modified, created, or deleted. The SRD (Annex A.8) requires structured tracking of `modifiedFeatures` (with property deltas), `createdFeatures`, and `createdAssets` (with stable `resultId` and versioned `path`). The Log Service cannot construct meaningful Log entries without this granularity.

**Alternatives considered**:
- **Infer changes from before/after snapshots**: Rejected — requires the caller to maintain a copy of all features before tool execution, which is expensive and error-prone
- **Post-hoc diff in the Log Service**: Rejected — pushes domain logic (knowing what changed) into the frontend, violating Art. IV
- **Annotations-only approach**: The existing `ToolResultAnnotations` LinkML schema (`shared/schemas/src/linkml/tool-result.yaml`) already classifies results by type (mutation/addition/deletion/artifact) but lacks per-property delta information

### Current consumers that must adapt:

| Consumer | File | Impact |
|----------|------|--------|
| Python executor | `services/calc/debrief_calc/executor.py:97` | Must populate new fields |
| Python models | `services/calc/debrief_calc/models.py:115` | Model expansion |
| Python tests | `services/calc/tests/test_executor.py` | Update assertions |
| TS calcService | `apps/vscode/src/services/calcService.ts` | Parse new fields |
| TS executeTool | `apps/vscode/src/commands/executeTool.ts:78` | Route new fields to Log Service |
| TS types | `apps/vscode/src/types/tool.ts:342-407` | Update interfaces |
| Web shell | `apps/web-shell/src/services/toolService.ts` | Parse new fields |
| MCP response builder | `services/calc/debrief_calc/executor.py` | Include new annotations |

## 2. Log Service: Placement and Architecture

### Decision: New TypeScript shared library in `services/session-state` (or sibling package)

**Rationale**: The SRD (Annex A.2) explicitly states the Log Service is TypeScript, not Python, because it is a session-state concern tightly coupled to frontend orchestration. Python services remain stateless — they return ToolResults, Log Service wraps them.

**Alternatives considered**:
- **Separate `shared/log-service/` package**: More isolation, but adds a workspace member for a library that is tightly coupled to session-state
- **Inside session-state package**: Keeps Log state management co-located with existing Zustand store. Preferred because the Log entries are stored on features within the session state
- **Python service**: Rejected by SRD — would add latency and violate the architectural boundary (session state is frontend-owned)

### API Surface (from SRD Annex A.2-A.9):

- `recordToolResult(toolResult: ExpandedToolResult): LogEntry` — wraps ToolResult, assigns activityId/timestamp, writes to features
- `getTimeline(options?: {loadFromSnapshot?: string}): LogEntry[]` — assembles global timeline from all features
- `tuneEntry(activityId: string, parameter: string, newValue: unknown): void` — triggers replay
- `revertTo(activityId: string): void` — permanent truncation
- `revertThis(activityId: string): void` — soft-delete + replay
- `createSnapshot(): void` — saves clean state, resets Log
- `branchFrom(activityId: string): string` — creates new plot from history point

## 3. Undo/Redo Split

### Decision: Current undo middleware stays as-is for UI state; Log handles data changes

**Rationale**: The SRD (Section 5) explicitly separates UI undo/redo (viewport, time, visibility) from data-change history (the Log). The current undo middleware already tracks the right set of UI fields — it just also tracks fields that should move to the Log's domain.

**Analysis of current StateSnapshot fields**:

| Field | Current Undo | After Split | Rationale |
|-------|-------------|-------------|-----------|
| `currentTime` | Yes | **UI Undo** | Display-only, SRD Section 5 |
| `timeRange` | Yes | **UI Undo** | Display-only |
| `timeFilter` | Yes | **UI Undo** | Display-only |
| `stepSize` | Yes | **UI Undo** | Display-only |
| `playbackRate` | Yes | **UI Undo** | Display-only |
| `displayMode` | Yes | **UI Undo** | Display-only |
| `viewport` | Yes | **UI Undo** | SRD Section 5: pan/zoom |
| `rotation` | Yes | **UI Undo** | Display-only |
| `featureCollectionUri` | Yes | **Log** (implicit via file operations) | Data change when features loaded |
| `selection` | Yes | **UI Undo** | Display-only, transient |
| `hiddenFeatureIds` | Yes | **UI Undo** | SRD Section 5: layer visibility |
| `savePath` | Yes | **Neither** | Metadata, not undoable |

**Key finding**: `featureCollectionUri` is the only current undo field that represents a data change. All others are UI state. The split is clean: remove `featureCollectionUri` and `savePath` from the undo snapshot and leave the rest unchanged.

**Alternatives considered**:
- **Replace undo middleware entirely**: Rejected — it works correctly for UI state
- **Add Log entries for visibility changes**: Rejected — SRD explicitly classifies visibility as undo/redo, not Log

## 4. Provenance Schema Migration

### Decision: Replace `feature.properties.provenance` and `feature.properties.prov` with unified PROV-aligned model

**Rationale**: Two separate provenance implementations exist:
1. `feature.properties.provenance` written by debrief-calc (`services/calc/debrief_calc/provenance.py:69`) — simple model: `{tool, version, timestamp, sources, parameters}`
2. `feature.properties.prov` written by debrief-stac (`services/stac/src/debrief_stac/provenance.py:35`) — similar but different key name and structure

Both must be replaced by the SRD's PROV-aligned model (Annex A.3): `{activityId, timestamp, wasGeneratedBy: {tool, toolVersion, parameters: {name: {value, default, tunable}}}, used, generated, executionDuration, tune}`.

**Migration impact**:
- All test fixtures referencing `properties.provenance` or `properties.prov` must be updated
- Calc service's `attach_provenance()` function must produce new format
- STAC service's `write_provenance()` must be removed or unified
- No backward compatibility needed (Art. XIV)

**Alternatives considered**:
- **Keep both old formats and add new**: Rejected — creates confusion and technical debt
- **Gradual migration with adapter**: Rejected — Art. XIV explicitly permits breaking changes

## 5. System Record Feature

### Decision: Add null-geometry Feature per SRD Annex A.4

**Rationale**: The system record carries plot-level metadata (snapshot links, branch records) that doesn't belong on any spatial feature. The `SYSTEM` featureType kind already exists in the schema (added in feature 022).

**Key finding**: Feature 022 added `SYSTEM` kind discriminator (`specs/022-system-kind-discriminator/spec.md`), providing the schema foundation. The system record is a Feature with `geometry: null` and `properties.featureType: "system"`.

**Alternatives considered**:
- **Store in STAC Item metadata**: Rejected — snapshot links and branch records are per-plot, and the STAC Item may contain multiple GeoJSON files
- **Separate sidecar file**: Rejected — adds file management complexity; GeoJSON already supports null-geometry features

## 6. Phased Implementation Sequence

### Decision: 6 phases matching SRD priorities P1-P6, plus Phase 0 for schema work

**Rationale**: The SRD defines priorities P1-P6 (Section 7). Each maps naturally to one or more backlog items. Phase 0 (schema + ToolResult expansion) is a prerequisite for all others.

### Phase mapping:

| Phase | SRD Priority | Content | Prerequisites |
|-------|-------------|---------|---------------|
| 0 | (Foundation) | LinkML Log Entry schema, expanded ToolResult model, provenance schema migration, system record schema | #062 (FeatureKindEnum) |
| 1 | P1 Log Recording | Log Service TypeScript library, session-state integration, feature-level provenance writes | Phase 0 |
| 2 | P2 Log Panel | VS Code activity panel, timeline view, entry display, filter/search | Phase 1, #044 (unified panel) |
| 3 | P3 Undo/Redo | Split current middleware, narrow StateSnapshot, remove data fields | Phase 1 |
| 4 | P4 Snapshots | Doubly-linked chain, "Capture from here", snapshot assets in STAC | Phase 1 |
| 5 | P5 Branching | Branch creation, two-way links, plot duplication | Phase 4 |
| 6 | P6 Replay/Tune | Parameter editing, positional replay, cross-snapshot replay | Phase 1, Phase 4 |

### Dependency graph (acyclic, verified):

```
Phase 0 (Schema) → Phase 1 (Log Recording) → Phase 2 (Log Panel)
                                             → Phase 3 (Undo Split)
                                             → Phase 4 (Snapshots) → Phase 5 (Branching)
                                                                   → Phase 6 (Replay/Tune)
```

No circular dependencies. Phase 2 and Phase 3 are independent of each other. Phase 5 and Phase 6 both depend on Phase 4 but not on each other.

## 7. Session-State Integration Points

### Decision: Log Service writes Log entries to feature properties within Zustand store

**Rationale**: The Log entries live on `feature.properties.provenance` (per SRD A.3). The Zustand store holds features in memory. The Log Service modifies features in the store, which then triggers dirty tracking and persistence via stacService.

**Integration points identified**:

1. **Dirty tracking** (`services/session-state/src/store/middleware/dirty.ts`): Currently triggers on `featureCollectionUri` changes. After PROV integration, feature property mutations (from Log writes) must also trigger dirty. This requires adding a mechanism for the Log Service to signal "features changed" to the dirty middleware.

2. **Persistence** (`apps/vscode/src/services/stacService.ts:957-1018`): Currently uses `addFeatures()` to append features and `writeFileSync` for persistence. The Log Service writes to existing features' properties (not adding new features), so a new "update features" path may be needed, or the existing save-on-dirty mechanism handles it.

3. **Feature storage**: Currently features are stored as a single `FeatureCollection` GeoJSON file per STAC Item. Log entries on each feature grow this file over time. Snapshots (Phase 4) periodically create clean copies.

**Alternatives considered**:
- **Separate Log store alongside feature store**: Rejected — SRD mandates Log entries live on the features themselves
- **Event-based Log with external persistence**: Rejected — adds complexity; features-as-source-of-truth is simpler and aligns with offline-first (Art. I)
