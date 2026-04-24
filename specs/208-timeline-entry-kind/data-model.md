# Data Model: Kind discriminator for TimelineEntry

**Feature**: 208-timeline-entry-kind
**Date**: 2026-04-22

This feature adds one field at the schema layer, one union type + one field at the TS type layer, and one mapping function at the projection layer. No relational or persistent state changes.

## 1. Schema layer — LinkML `LogEntry` (source of truth)

**File**: `shared/schemas/src/linkml/log-entry.yaml`

### Change

Add an optional `activity_type` slot to the existing `LogEntry` class, constrained by a new `ActivityType` enum.

```yaml
# Diff on log-entry.yaml (conceptual — implementation may place enum block differently)

enums:
  ActivityType:
    description: >-
      Semantic discriminator for provenance records, used by consumers
      to select rendering / handling behaviour independent of visual
      tool-category grouping.
    permissible_values:
      snapshot:
        description: Manual checkpoint entry.
      tool:
        description: Regular tool invocation. Default for records without
                     an explicit activity_type.
      tune:
        description: Reserved for future standalone tune-action entries.

classes:
  LogEntry:
    # ...existing slots...
    attributes:
      # ...existing...
      activity_type:
        description: >-
          Semantic kind of this provenance record. Optional; absent records
          are treated as `tool` by consumers. Introduced by feature 208 so
          future entry types (manual checkpoint, standalone tune, manual
          rationale) can be distinguished without overloading visual
          tool-category.
        range: ActivityType
        required: false
```

### Validation rules

- **Required**: no (optional). Existing records without the field remain valid (Article III — audit trail immutable).
- **Enum**: closed. Values outside `{snapshot, tool, tune}` are rejected by generated Pydantic.
- **Default**: no schema-level default. Consumers apply a `'tool'` default at projection time so the schema truthfully reflects what is persisted.

### Adherence

- Golden fixtures added under `shared/schemas/fixtures/` covering (a) a LogEntry with `activity_type: 'snapshot'`, (b) a LogEntry with `activity_type` absent, (c) a LogEntry with `activity_type: 'invalid'` (invalid fixture — must fail validation).
- Round-trip test: Python LogEntry → JSON → TypeScript LogEntry → JSON → Python LogEntry preserves `activity_type` (including the absent case → still absent).
- Structural comparison: LinkML-generated JSON Schema + Pydantic-generated JSON Schema must match (existing test; no bypass).

## 2. Generated types — Pydantic + TypeScript + JSON Schema

**Files (regenerated)**:
- `shared/schemas/src/generated/pydantic/…` — Pydantic v2 `LogEntry.activity_type: Optional[ActivityType]` plus `ActivityType` enum class.
- `shared/schemas/src/generated/typescript/types.ts` — TS `LogEntry` gets `activity_type?: ActivityType;` and the `ActivityType` union / const-enum.
- `shared/schemas/src/generated/json-schema/…` — JSON Schema with `activity_type` property whose `enum` contains the three values and `required` does not include it.

No hand-edits: the types.ts file is rewritten by `gen-typescript`. Manual additions are preserved between the existing preservation markers (none of this feature's additions live inside those markers).

## 3. TimelineEntry UI projection — closed-union `kind`

**File**: `shared/components/src/LogPanel/types.ts`

### Change

Add a `TimelineEntryKind` exported type and a `kind?` field on the `TimelineEntry` interface.

```ts
/**
 * Semantic discriminator for timeline entries. Feature 208.
 *
 * - 'snapshot' — manual checkpoint entry
 * - 'tool' — regular tool invocation (default)
 * - 'tune' — reserved for future standalone tune entries
 *
 * Kept as a closed union so switches are exhaustiveness-checked at every
 * call site. When a fourth kind is needed, extend here and update every
 * consumer flagged by the compiler.
 */
export type TimelineEntryKind = 'snapshot' | 'tool' | 'tune';

export interface TimelineEntry {
  // ...existing fields unchanged...
  /**
   * Semantic kind of this entry. Optional during the transition for
   * consumer compatibility; the VS Code host always populates it.
   * Feature: 208
   */
  kind?: TimelineEntryKind;
}
```

### Invariants

- When a `TimelineEntry` comes from the VS Code host's `toTimelineEntry` projection, `kind` is always defined.
- When a `TimelineEntry` comes from a Storybook fixture or legacy test mock, `kind` may be undefined; consumers treat `undefined` the same as `'tool'`.
- No field is removed; `operationCategory` remains untouched (separate concern: see Assumption A2 in spec).

### Exhaustiveness contract

```ts
function handleKind(k: TimelineEntryKind): void {
  switch (k) {
    case 'snapshot': /* ... */ break;
    case 'tool':     /* ... */ break;
    case 'tune':     /* ... */ break;
    // Adding a fourth value without updating this switch fails CI.
  }
}
```

Consumer code that wants to gate on `'snapshot'` specifically uses `entry.kind === 'snapshot'`; the compiler does not require exhaustiveness at such narrowing sites, but the closed union keeps the set of possible values authoritative.

## 4. Projection mapping — LogEntry → TimelineEntry

**File**: `apps/vscode/src/views/logPanelView.ts`, function `toTimelineEntry`.

### Change

Add one line that reads `entry.activity_type` with a fallback to `'tool'`. No other projection logic changes.

```ts
function kindFromActivityType(
  activityType: ActivityType | undefined | null
): TimelineEntryKind {
  // Closed-union fallback. Unrecognised values from malformed records
  // (shouldn't occur because the schema is enum-validated, but defensive)
  // also fall back to 'tool' per FR-006.
  switch (activityType) {
    case 'snapshot': return 'snapshot';
    case 'tune':     return 'tune';
    case 'tool':     return 'tool';
    case undefined:
    case null:
      return 'tool';
    default:
      return 'tool';
  }
}

function toTimelineEntry(entry: LogEntry): TimelineEntry {
  return {
    // ...existing fields unchanged...
    kind: kindFromActivityType(entry.activity_type),
  };
}
```

### Invariants

- **Totality** (FR-002): every projected `TimelineEntry` has a defined `kind` value. Unit-tested over the sample catalogue (SC-002).
- **No tool-name matching** (FR-005 / SC-005): `kindFromActivityType` reads only the schema field; no `toolName`, `tool`, or tool-ID literals appear in the kind resolution path.
- **Non-throwing** (FR-006): malformed records (e.g. legacy without the field) produce `'tool'`, never a throw.

## 5. Consumer migration — LogEntry.tsx

**File**: `shared/components/src/LogPanel/LogEntry.tsx`

### Change

Replace line 114:

```ts
// BEFORE
const isSnapshot = resolveToolCategory(entry.toolName).category === 'snapshot';

// AFTER
const isSnapshot = entry.kind === 'snapshot';
```

No other code in this file changes. The `import { resolveToolCategory }` line remains — it is still used by `ToolCategoryIcon` and the icon/colour chip path (FR-008).

### Observable consequence

Export-tool entries (`export-png`, `export-csv`, `export-geojson`), which today render with the "manual checkpoint" placeholder and hidden duration (because their visual category is `'snapshot'`), will after migration render with their normal parameter chips and visible duration. See Research R2 for analysis; Storybook baselines rebased in the same commit.

## 6. Entity / type relationships

```text
┌────────────────────────────────────────────────────────┐
│  LinkML schema (source of truth)                       │
│    LogEntry.activity_type : ActivityType (optional)    │
└───────┬────────────────────────────────────────────────┘
        │ gen-pydantic, gen-typescript, gen-json-schema
        ▼
┌────────────────────────────────────────────────────────┐
│  Generated types                                       │
│    Python:     LogEntry.activity_type                  │
│    TypeScript: LogEntry.activity_type                  │
│    JSON:       #/properties/activity_type              │
└───────┬────────────────────────────────────────────────┘
        │ runtime ingestion                              │
        ▼
┌────────────────────────────────────────────────────────┐
│  Host projection (toTimelineEntry)                     │
│    kind = kindFromActivityType(entry.activity_type)    │
│    Fallback: undefined / null / unrecognised → 'tool'  │
└───────┬────────────────────────────────────────────────┘
        │ webview message payload                        │
        ▼
┌────────────────────────────────────────────────────────┐
│  TimelineEntry (UI projection)                         │
│    kind?: 'snapshot' | 'tool' | 'tune'                 │
└───────┬────────────────────────────────────────────────┘
        │ consumed by                                    │
        ▼
┌────────────────────────────────────────────────────────┐
│  LogEntry.tsx rendering                                │
│    isSnapshot = entry.kind === 'snapshot'              │
│    (was: ToolCategory === 'snapshot')                  │
└────────────────────────────────────────────────────────┘
```

## 7. Out-of-scope entities (explicitly not touched)

- `ToolCategory`, `ToolCategoryConfig`, `TOOL_CATEGORY_CONFIGS`, `resolveToolCategory` — unchanged (FR-008).
- `operationCategory` on TimelineEntry — unchanged.
- `FileProvEntry.type`, `SystemRecordProperties.provenance`, `snapshotService` — separate domain; not merged into the timeline.
- STAC asset roles (`roles: ['snapshot']`) — unrelated; stays.
- `branchService`'s `'snapshot-boundary'` location type — unrelated; stays.
