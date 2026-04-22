# Phase 1 Data Model: Timeline Entry `kind` Discriminator

**Feature**: 208-timeline-entry-kind
**Date**: 2026-04-22

## Scope

This feature introduces one new type (`TimelineEntryKind`) and one new field on the existing UI projection `TimelineEntry`. No LinkML schema changes. No persistent data model changes. No new wire-format types.

## Entities

### TimelineEntryKind *(new)*

**Shape**: string-literal union

**Definition**:

```ts
export type TimelineEntryKind = 'snapshot' | 'tool' | 'tune';
```

**Semantics** (per-value):

| Value | Meaning | Populator in this feature |
|-------|---------|---------------------------|
| `'snapshot'` | A distinguished moment in the session — captured today via export/snapshot tools (the `ToolCategory === 'snapshot'` set: `export-png`, `export-csv`, `export-geojson`, plus any others the category map classifies as snapshot). In the future also sourced from a manual snapshot button and other PROV-side signals. | Emitted when `resolveToolCategory(entry.was_generated_by.tool).category === 'snapshot'` |
| `'tool'` | An ordinary tool invocation: anything that is not a snapshot. The default classification for the interim populator. | Emitted for every non-snapshot entry (see R5 in `research.md` — `tuneAnnotation`-carrying entries are ordinary tool entries today). |
| `'tune'` | Reserved for future analytical-adjustment / tune-marker entries. No populator emits this value in this feature; it lands with a future PROV-side signal. | **Not emitted.** Contract reserves the value so future populator is a populator change only, not a type-contract revision. |

**Validation rules**:

- Value MUST be one of the three literals. No other string is admissible at type level.
- The `TIMELINE_ENTRY_KINDS` readonly array exposes the three values at runtime for tests and fixtures (see `contracts/timeline-entry-kind.contract.md`).
- A renderer consuming a `TimelineEntry` with `kind` outside the declared union (for example, from a future populator writing `'annotation'` before the union is extended) MUST fall back to tool-row rendering (FR-007, spec.md edge cases).

**State transitions**: None. `TimelineEntryKind` values are immutable classifications; they describe the entry, they do not mutate it.

### TimelineEntry *(modified)*

**Shape**: UI projection type, declared in `shared/components/src/LogPanel/types.ts`.

**Provenance**: UI projection, not a schema type. See the T023 comment at `types.ts:66-71`. Constructed by `toTimelineEntry` in `apps/vscode/src/views/logPanelView.ts`.

**Change in this feature**: one new optional field.

**Before** (existing fields retained verbatim, see `types.ts:72-89`):

```ts
export interface TimelineEntry {
  activity_id: string;
  timestamp: string;
  toolName: string;
  tool_version: string;
  parameters: Record<string, ParameterValue>;
  usedFeatureIds: string[];
  generatedFeatureIds: string[];
  execution_duration: string;
  generated_result_id: string | null;
  operationCategory: OperationCategory;
  deleted?: boolean;
  disabled?: boolean;
  rationale?: string | null;
  tuneAnnotation?: { parameter: string; previous_value: unknown; new_value: unknown } | null;
  input_state?: InputFeatureState[] | null;
}
```

**After**:

```ts
export interface TimelineEntry {
  activity_id: string;
  timestamp: string;
  toolName: string;
  tool_version: string;
  parameters: Record<string, ParameterValue>;
  usedFeatureIds: string[];
  generatedFeatureIds: string[];
  execution_duration: string;
  generated_result_id: string | null;
  operationCategory: OperationCategory;
  deleted?: boolean;
  disabled?: boolean;
  rationale?: string | null;
  tuneAnnotation?: { parameter: string; previous_value: unknown; new_value: unknown } | null;
  input_state?: InputFeatureState[] | null;
  /**
   * Semantic classification of this entry, independent of its visual category.
   *
   * - `'snapshot'`: a distinguished moment (today: export/snapshot tools; future: manual snapshot button)
   * - `'tool'`: an ordinary tool invocation
   * - `'tune'`: reserved for future tune-marker entries (not emitted by any populator in feature 208)
   *
   * Optional because test fixtures may construct TimelineEntry without the host populator.
   * Consumers MUST fall back to legacy detection (resolveToolCategory) when `kind` is absent.
   */
  kind?: TimelineEntryKind;
}
```

**Invariants**:

- The field is optional at the type level but populated by the VS Code host on every entry it emits to the LogPanel (FR-002).
- The field is informational for the LogPanel; it is never persisted, never sent over the network outside the host→webview serialisation boundary, and never read from the schema `LogEntry`.
- The two existing "category" fields (`operationCategory` and — via `resolveToolCategory(toolName)` — `ToolCategory`) co-exist with `kind` and MAY legitimately disagree. For example, a future manual snapshot entry might carry `kind: 'snapshot'` alongside an unrelated `operationCategory` / `ToolCategory`. This disagreement is the whole point of introducing the discriminator.

**Relationships**:

- `TimelineEntry` is produced by `toTimelineEntry(entry: LogEntry)` in the VS Code host.
- `TimelineEntry` is consumed by the LogPanel renderer (`LogEntry.tsx`), which dispatches snapshot-specific rendering on `entry.kind === 'snapshot'`.
- `TimelineEntryKind` has no persistence relationship — it is not stored in LinkML, STAC, or any on-disk representation.

## Supporting types

### `TIMELINE_ENTRY_KINDS` *(new, co-located with `TimelineEntryKind`)*

```ts
export const TIMELINE_ENTRY_KINDS: readonly TimelineEntryKind[] = [
  'snapshot',
  'tool',
  'tune',
] as const;
```

**Purpose**: runtime enumeration for tests, fixtures, and documentation. Type-inferred as `readonly ['snapshot', 'tool', 'tune']` (via `as const`) so element types remain literal.

### `assertNeverKind` *(new, co-located with `TimelineEntryKind`)*

```ts
export function assertNeverKind(value: never): never {
  throw new Error(`Unhandled TimelineEntryKind: ${String(value)}`);
}
```

**Purpose**: exhaustiveness guard. Call at the default branch of any switch/if-chain that enumerates `TimelineEntryKind` values. Adding a new value without handling it surfaces as a TypeScript error at every enumerating site (FR-009).

**Contract**: never executed in the default path of a fully-covered discriminator-driven switch. If the parameter type is narrowed to `never` at that site, the compiler is satisfied. If a future `kind` value is added to the union without updating the switch, the parameter narrows to that new value instead of `never`, forcing a type-check failure.

## Data-flow diagram

```text
                  Schema LogEntry (from @debrief/session-state LogService)
                         │
                         │ toTimelineEntry (apps/vscode/src/views/logPanelView.ts)
                         ▼
                  TimelineEntry  ──── kind ────▶  'snapshot' | 'tool'
                                                     (interim populator;
                                                      'tune' reserved, unused)
                         │
                         │ host→webview postMessage (structured clone)
                         ▼
                  LogPanel React component tree
                         │
                         │ LogEntry.tsx:114  →  isSnapshot = entry.kind === 'snapshot'
                         ▼                         (fallback: legacy category check if kind absent)
                  Rendered row (snapshot presentation vs. ordinary tool row)
```

## What this feature does NOT add to the data model

- No LinkML schema change. No regeneration of `@debrief/schemas`.
- No new STAC asset, property, or extension.
- No new wire-format JSON structure beyond the `kind` field travelling inside the existing TimelineEntry postMessage payload.
- No new persistent storage of `kind` anywhere. If a future feature needs to persist the discriminator (for example, to carry it across session reloads), that feature introduces the persistence; this feature does not.
- No change to `OperationCategory`, `ToolCategory`, or their resolution functions. Both remain the drivers of visual classification; `kind` addresses entry semantics.
