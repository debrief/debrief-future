# Data Model: Log Panel Flip-Card Interaction

**Feature**: 113-prov-card-flip
**Date**: 2026-02-27

## Entity Overview

```
┌─────────────────┐         ┌──────────────────────┐
│   TimelineEntry  │────────▶│   WasGeneratedBy     │
│                  │         │   .tool              │
│  .activityId     │         │   .toolVersion       │
│  .timestamp      │         │   .parameters        │──▶ Record<string, ParameterValue>
│  .disabled ★     │         └──────────────────────┘
│  .rationale ★    │
│  .deleted        │         ┌──────────────────────┐
│  .tune           │────────▶│   TuneAnnotation     │
│  .used[]         │         │   .timestamp         │
│  .generated[]    │         │   .parameter         │
└─────────────────┘         │   .previousValue     │
        │                    │   .newValue           │
        │                    └──────────────────────┘
        ▼
┌─────────────────┐         ┌──────────────────────┐
│   CardState      │────────▶│   ToolParameterSchema│
│                  │         │                      │
│  .face           │         │   .toolId            │
│  .schemaLoaded   │         │   .parameters[]      │──▶ ParameterSchemaEntry[]
│  .replayStatus   │         └──────────────────────┘
│  .editValues     │
└─────────────────┘
```

★ = New fields added by this feature

## Schema Changes (LinkML)

### log-entry.yaml additions

Two new attributes on `LogEntry`:

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `disabled` | `boolean` | `false` | Whether this entry is skipped during replay |
| `rationale` | `string` | `null` | Free-text analyst annotation explaining the operation |

These are **non-breaking additive changes** — existing entries without these fields default to `disabled: false` and `rationale: null`.

## Entity Definitions

### TimelineEntry (extended)

Extends the existing `TimelineEntry` from `shared/components/src/LogPanel/types.ts`.

| Field | Type | Source | New? |
|-------|------|--------|------|
| `activityId` | `string` | LogEntry | No |
| `timestamp` | `string` | LogEntry | No |
| `toolName` | `string` | Derived from `wasGeneratedBy.tool` | No |
| `toolVersion` | `string` | `wasGeneratedBy.toolVersion` | No |
| `parameters` | `Record<string, ParameterValue>` | `wasGeneratedBy.parameters` | No |
| `used` | `string[]` | LogEntry | No |
| `generated` | `string[]` | LogEntry | No |
| `executionDuration` | `string` | LogEntry | No |
| `generatedResultId` | `string \| null` | LogEntry | No |
| `operationCategory` | `OperationCategory` | Derived | No |
| `deleted` | `boolean` | LogEntry | No |
| `tune` | `TuneAnnotation \| null` | LogEntry | No |
| `disabled` | `boolean` | LogEntry | **Yes** |
| `rationale` | `string \| null` | LogEntry | **Yes** |

### CardState (new — UI-local)

Tracks the visual state of each card in the flip interaction. Managed in React component state, not persisted.

| Field | Type | Description |
|-------|------|-------------|
| `face` | `'front' \| 'back'` | Which face is currently displayed |
| `schemaLoaded` | `boolean` | Whether the tool schema has been fetched and cached |
| `replayStatus` | `'idle' \| 'pending' \| 'in-progress' \| 'error'` | Current replay state for this card |
| `editValues` | `Record<string, unknown>` | Working copy of parameter values during editing |
| `replayError` | `string \| null` | Error message if replay failed |

### ToolParameterSchema (new — cached in webview)

Describes the schema for a tool's parameters. Fetched from the extension on first flip, cached by `toolId`.

| Field | Type | Description |
|-------|------|-------------|
| `toolId` | `string` | Tool identifier (kebab-case) |
| `parameters` | `ParameterSchemaEntry[]` | Ordered list of parameter definitions |

### ParameterSchemaEntry (new)

Describes a single parameter's type and constraints for rendering the appropriate control.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Parameter name |
| `type` | `'number' \| 'string' \| 'boolean' \| 'enum' \| 'object' \| 'array'` | JSON Schema type |
| `description` | `string` | Human-readable description |
| `tunable` | `boolean` | Whether this parameter can be modified |
| `defaultValue` | `unknown` | Default value |
| `minimum` | `number \| null` | Lower bound (for bounded numeric → slider) |
| `maximum` | `number \| null` | Upper bound (for bounded numeric → slider) |
| `step` | `number \| null` | Step increment (for slider) |
| `choices` | `unknown[] \| null` | Allowed values (for enum) |
| `paramType` | `string \| null` | Custom type reference (e.g., `"NamedColor"`) from `x-debrief-param-type` |

### Control Type Mapping

Derived from `ParameterSchemaEntry` — determines which React component renders.

| Schema Condition | Control Component | Behaviour |
|-----------------|-------------------|-----------|
| `type: 'number'` + `minimum` + `maximum` set | `SliderControl` | Drag slider; numeric readout; debounced replay |
| `type: 'number'` + bounds missing | `ParameterEditor` (numeric input) | Step buttons; debounced replay |
| `type: 'enum'` OR `choices` set | `ParameterEditor` (dropdown) | Immediate replay on selection |
| `type: 'boolean'` | `ParameterEditor` (toggle) | Immediate replay on toggle |
| `type: 'string'` + `paramType: 'NamedColor'` | `ColorPickerControl` | Colour swatch grid; immediate replay |
| `type: 'string'` (no paramType) | `ParameterEditor` (text input) | Debounced replay |
| `type: 'object'` or `type: 'array'` | `JsonEditorControl` | JSON textarea; debounced replay |

## State Transitions

### Card Face Transitions

```
                ┌──────────┐
                │  front   │ ◀── initial state
                └────┬─────┘
                     │ click pencil icon
                     ▼
                ┌──────────┐
           ┌───▶│  back    │◀── schema loading → skeleton
           │    └────┬─────┘    schema loaded → controls render
           │         │
           │    ┌────┴──────────────────────────┐
           │    │                                │
           │    ▼                                ▼
           │  click Done              another card flipped
           │  (explicit)              (implicit Done)
           │    │                                │
           │    ▼                                ▼
           │  ┌──────────┐            commit current values
           └──│  front   │◀───────── flip back to front
              └──────────┘
```

### Replay State Transitions (per card)

```
  idle ──▶ pending ──▶ in-progress ──▶ idle (success)
                           │
                           ├──▶ error (replay failed)
                           │       │
                           │       ▼
                           │    idle (user adjusts value)
                           │
                           └──▶ idle (new value queued → restart)
```

### Entry Disable State

```
  enabled ──▶ disabled (toggle off)
     ▲              │
     │              ├── triggers replay without this step
     │              ├── front face: greyed out + strikethrough
     │              └── dependent entries: auto-disabled with warning
     │
  disabled ──▶ enabled (toggle on)
                     │
                     ├── triggers replay with this step restored
                     └── dependent entries: prompt to re-enable
```

### Entry Delete State

```
  active ──▶ delete clicked ──▶ confirmation shown
                                      │
                          ┌───────────┴──────────┐
                          ▼                      ▼
                      confirmed              cancelled
                          │                      │
                          ▼                      ▼
                   soft-deleted              active (no change)
                   (struck-through)
                          │
                          ├── subsequent entries replay
                          └── survives until next snapshot
```

## Dependency Graph for Disable Cascade

When disabling entry A, the system must determine which subsequent entries depend on A's output:

```
Entry A generates: [feature-X]
Entry B uses: [feature-X]  → B depends on A → auto-disable B
Entry C uses: [feature-Y]  → C independent → no change
Entry D uses: [feature-X, feature-Z]  → D partially depends on A → auto-disable D
```

**Algorithm**: For each subsequent entry after the disabled one, check if any element of `entry.used[]` appears in the disabled entry's `generated[]`. If so, the entry is auto-disabled. Then recursively check entries that depend on the auto-disabled entry's `generated[]`.

**REVIEW DECISION (F1): Visited guard required.** The algorithm MUST maintain a `visited: Set<string>` of already-processed activityIds to prevent infinite loops when the `used`/`generated` dependency graph contains cycles. Before processing each entry in the cascade, check `visited.has(entry.activityId)` and skip if already visited.

```
function cascadeDisable(entryId: string, timeline: TimelineEntry[]): string[] {
  const visited = new Set<string>();
  const disabled: string[] = [];
  const queue = [entryId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;  // ← prevents infinite loop
    visited.add(currentId);

    const entry = timeline.find(e => e.activityId === currentId);
    if (!entry) continue;

    const generatedFeatures = new Set(entry.generated);

    for (const subsequent of timeline.filter(e => /* after entry */)) {
      if (visited.has(subsequent.activityId)) continue;
      const dependsOnDisabled = subsequent.used.some(f => generatedFeatures.has(f));
      if (dependsOnDisabled) {
        disabled.push(subsequent.activityId);
        queue.push(subsequent.activityId);
      }
    }
  }

  return disabled;
}
```

## Validation Rules

| Rule | Scope | Description |
|------|-------|-------------|
| V-001 | CardState | `face` must be `'front'` or `'back'` — no intermediate states |
| V-002 | CardState | Only one card across the entire panel may have `face: 'back'` at any time |
| V-003 | ParameterSchemaEntry | If `minimum` and `maximum` both set, `minimum < maximum` |
| V-004 | ParameterSchemaEntry | If `step` set, `step > 0` |
| V-005 | Replay | Parameter value must match schema type before triggering replay |
| V-006 | Delete | Confirmation required — cannot soft-delete without user acknowledgement |
| V-007 | Disable cascade | Auto-disabled entries must carry reference to the cause entry |
