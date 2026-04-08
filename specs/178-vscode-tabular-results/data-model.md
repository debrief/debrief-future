# Phase 1: Data Model — Tabular Results Panel (VS Code)

**Feature**: 178-vscode-tabular-results
**Date**: 2026-04-07

This feature is *integration plumbing* — it does not introduce new persisted entities. The data shapes below are either:
- **Reused** from feature 177 (`shared/components`, `shared/utils`, `services/session-state`), or
- **New in-memory** state owned by `ResultsPanelService` in the VS Code extension host.

The only persisted-schema addition is **R7's `FileSavedEvent`** — an additive `LogEntry` variant that does not require a LinkML version bump under Article XIV (Pre-Release Freedom).

---

## Reused entities (no changes)

### `DatasetEnvelope`
**Source**: `shared/components/src/ChartRenderer/types.ts`
**Status**: Unchanged. The `displayHint: 'table' | 'chart'` field added in feature 177 is the dispatch key.

### `ChartTabData`
**Source**: `shared/components/src/panels/PanelContext.tsx`
**Status**: Unchanged. Existing fields used by the VS Code path: `id`, `title`, `displayHint`, `tableData`, `chartSpec`, `isSaved`, `isLoading`, `errorMessage`, `artifactType`.

### `ChartContextProps`
**Source**: `shared/components/src/panels/PanelContext.tsx`
**Status**: Unchanged. Existing callbacks used: `onChartTabSelect`, `onChartTabClose`, `onSave`, `onSaveAs`, `onRetry`, `labels`.

### `AssociatedFile`
**Source**: `apps/vscode/src/services/stacService.ts:23`
**Status**: Unchanged. Used to surface saved CSVs in the LayersToolbar dropdown via the existing `_resultFiles` state in `ActivityPanelViewProvider`.

### `LogEntry` / `RecordResult`
**Source**: `services/session-state/src/log/types.ts:34`
**Status**: Reused. The new `recordFileSaved` method appends a new `LogEntry` linked by `parent_activity_id`.

---

## New in-memory entity: `ResultTab` (host-side)

Owned by `ResultsPanelService`. Mirrors `ChartTabData` but adds the host-only fields needed for save / retry coordination.

**Location**: `apps/vscode/src/services/resultsPanelService.ts`

```ts
export interface ResultTab {
  /** Stable id, generated host-side. */
  id: string;
  /** Tool id that produced the dataset (FR-019 retry). */
  toolId: string;
  /** Plot the tab belongs to (cleared on plot close — FR-021). */
  plotKey: PlotKey;
  /** The DatasetEnvelope ready to render. */
  envelope: DatasetEnvelope;
  /** Selected feature ids that produced the result (FR-020 retry). */
  sourceFeatureIds: string[];
  /** Tool params used (FR-020 retry). */
  parameters?: Record<string, unknown>;
  /** Activity id of the originating ToolRunEvent (FR-009 provenance link). */
  parentActivityId: string;
  /** Save state. */
  state:
    | { kind: 'unsaved' }
    | { kind: 'saved'; filename: string; savedActivityId: string }
    | { kind: 'error'; message: string };
  /** Creation order (for tab ordering). */
  createdAt: number;
}

export interface PlotKey {
  storePath: string;
  itemPath: string;
}
```

### Validation rules

| Rule | Source |
|------|--------|
| `id` MUST be globally unique within a session. | FR-006 |
| `parentActivityId` MUST reference an existing `LogEntry` in the plot's analysis log. | FR-009 |
| `sourceFeatureIds` MUST NOT be empty (the tool always runs against a selection). | FR-019 / executeTool.ts:127 |
| `state.filename` MUST be present iff `state.kind === 'saved'`. | FR-008 / FR-012 |
| `state.savedActivityId` MUST reference a `FileSavedEvent` LogEntry. | R7 |

### State transitions

```text
unsaved ──save / saveAs──▶ saved
unsaved ──tool error─────▶ error
error   ──retry──────────▶ unsaved (new envelope on success) or error
saved   ──(terminal)─────▶ saved   // Save button disabled
unsaved ──plot close─────▶ (discarded; orphan ToolRunEvent deleted from prov)
saved   ──plot close─────▶ (discarded; FileSavedEvent retains pairing)
```

---

## New persisted entity: `FileSavedEvent` (provenance)

Additive variant of `LogEntry`. Not a new top-level type — reuses the existing `LogEntry` envelope with semantically distinct field values.

**Location**: appended to the analysis log via `LogService.recordFileSaved` (R7).

```ts
// Conceptual shape — wire format remains LogEntry.
{
  activity_id: '<new ULID>',
  timestamp: '<ISO>',
  was_generated_by: {
    tool: 'debrief.fileSave',         // sentinel value identifying the save action
    tool_version: '1',
    parameters: {
      parent_activity_id: { value: '<ToolRunEvent activity_id>', default: false, tunable: false },
      filename:           { value: 'assets/<csv>',                default: false, tunable: false },
    },
  },
  used: ['<ToolRunEvent activity_id>'],   // PROV link to the originating tool run
  generated: ['assets/<csv>'],            // the saved file
  execution_duration: '0',
  generated_result_id: null,
  tune: null,
}
```

### Validation rules

| Rule | Source |
|------|--------|
| `was_generated_by.tool` MUST equal `'debrief.fileSave'`. | R7 |
| `used[0]` MUST be the `activity_id` of an existing `ToolRunEvent` in the same plot's log. | R7, FR-009 |
| `generated[0]` MUST equal a registered STAC asset filename. | FR-009 |

### Cleanup-on-close (FR-021) algorithm

```text
On plot close:
  1. Read the timeline for the closing plot.
  2. Build the set of "saved" parent ids:
       saved_parents := { entry.used[0] for entry in timeline if entry.was_generated_by.tool == 'debrief.fileSave' }
  3. For each ToolRunEvent (was_generated_by.tool != 'debrief.fileSave'):
       if entry.activity_id NOT IN saved_parents:
           markEntryDeleted(entry.activity_id)   // existing LogService.deleteEntry path
  4. Discard ResultsPanelService in-memory tabs for the closing plot.
```

---

## Existing types touched

| Type | Change |
|------|--------|
| `LogService` (interface) | Add method `recordFileSaved(...)` (see R7 signature). |
| `LogService` (implementation) | Implement `recordFileSaved` — appends a `LogEntry` with the sentinel tool name. |
| `LogService.deleteEntry` (or equivalent) | Reused for orphan cleanup; no signature change. |
| `ActivityPanelViewProvider._resultFiles` | Already exists — populated by `ResultsPanelService` after each successful save (calls existing `addResultFile`). |

No schema-generated types are regenerated; the additive log entry uses pre-existing wire fields.
