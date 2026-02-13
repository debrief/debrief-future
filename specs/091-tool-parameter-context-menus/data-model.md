# Data Model: Tool Parameter Context Menus

**Feature**: 091-tool-parameter-context-menus
**Date**: 2026-02-13

## Entity Overview

```
┌─────────────────────┐
│   ParameterTypeEnum  │  (LinkML enum in tool.yaml)
│   ─────────────────  │  Names of available parameter types
│   NamedColor         │
│   MarkerSymbol       │
│   CardinalDirection  │
│   DurationPreset     │
│   NumericPreset      │
└─────────┬───────────┘
          │ referenced by
          ▼
┌─────────────────────┐       ┌──────────────────────┐
│    ToolParameter     │       │  Parameter-Value Enum │
│   ─────────────────  │  ───► │  ──────────────────── │
│   name: string       │       │  NamedColorEnum       │
│   type: string       │       │  MarkerSymbolEnum     │
│   description: string│       │  CardinalDirectionEnum│
│   required: bool     │       │  DurationPresetEnum   │
│   default: any       │       │  NumericPresetEnum    │
│   choices: list[any] │       └──────────────────────┘
│   param_type: string │           (LinkML enums in common.yaml)
└─────────┬───────────┘
          │ belongs to
          ▼
┌─────────────────────┐
│       Tool           │
│   ─────────────────  │
│   name: string       │
│   parameters: list   │
│   ...                │
└─────────────────────┘
```

## Entity Definitions

### ToolParameter (extended)

Existing model in `services/calc/debrief_calc/models.py`, extended with `param_type`.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | Yes | — | Parameter identifier (kebab-case) |
| type | string | Yes | — | Value type: "string", "number", "boolean", "enum" |
| description | string | Yes | — | Human-readable description |
| required | boolean | No | false | Whether parameter must be provided |
| default | any | No | null | Default value if not provided |
| choices | list[any] | No | null | Valid values (required when type="enum" and param_type not set) |
| **param_type** | **string** | **No** | **null** | **NEW: References a schema-defined parameter-type enum by name** |

**Validation rules**:
- `type` must be one of: "string", "number", "boolean", "enum"
- If `type` is "enum", either `choices` or `param_type` must be provided (at least one)
- If `param_type` is set, its value must be a valid `ParameterTypeEnum` member
- `param_type` and `choices` may coexist (choices serves as a fallback if client can't resolve param_type)

### ParameterTypeEnum (new)

Defined in `shared/schemas/src/linkml/tool.yaml`. Enumerates the available parameter type names.

| Value | Description |
|-------|-------------|
| NamedColor | Predefined named colours for styling |
| MarkerSymbol | Marker shapes for point features |
| CardinalDirection | 8-point compass directions |
| DurationPreset | Common ISO 8601 duration intervals |
| NumericPreset | Common numeric values for counts/distances |

### NamedColorEnum (new)

Defined in `shared/schemas/src/linkml/common.yaml`.

| Value | Description |
|-------|-------------|
| red | Red |
| green | Green |
| blue | Blue |
| yellow | Yellow |
| orange | Orange |
| purple | Purple |
| cyan | Cyan |
| magenta | Magenta |
| white | White |
| black | Black |
| grey | Grey |

### MarkerSymbolEnum (new)

Defined in `shared/schemas/src/linkml/common.yaml`. Superset of `PointShapeEnum`.

| Value | Description |
|-------|-------------|
| circle | Filled/stroked circle (default marker) |
| square | Filled/stroked square (reference points) |
| triangle | Filled/stroked triangle (directional indicators) |
| diamond | Diamond shape |
| cross | Cross/plus shape |

**Note**: `PointShapeEnum` is also extended to include `diamond` and `cross` for consistency.

### CardinalDirectionEnum (new)

Defined in `shared/schemas/src/linkml/common.yaml`.

| Value | Description |
|-------|-------------|
| N | North |
| NE | North-East |
| E | East |
| SE | South-East |
| S | South |
| SW | South-West |
| W | West |
| NW | North-West |

### DurationPresetEnum (new)

Defined in `shared/schemas/src/linkml/common.yaml`. Values are ISO 8601 durations.

| Value | Description |
|-------|-------------|
| PT1M | 1 minute |
| PT5M | 5 minutes |
| PT15M | 15 minutes |
| PT30M | 30 minutes |
| PT1H | 1 hour |
| PT2H | 2 hours |
| PT6H | 6 hours |
| PT12H | 12 hours |
| PT24H | 24 hours |

### NumericPresetEnum (new)

Defined in `shared/schemas/src/linkml/common.yaml`. Common numeric values.

| Value | Description |
|-------|-------------|
| 1 | One |
| 2 | Two |
| 5 | Five |
| 10 | Ten |
| 25 | Twenty-five |
| 50 | Fifty |
| 100 | One hundred |

## TypeScript Type Extensions

### ToolParameter (ToolMatch types)

Extension to `shared/components/src/ToolMatch/types.ts`:

| Field | Type | Description |
|-------|------|-------------|
| paramType | string (optional) | Schema-defined parameter type name (from `x-debrief-param-type`) |
| choices | string[] (optional) | Explicit choices (fallback when paramType not available) |
| valueType | "string" \| "number" \| "boolean" \| "enum" \| "duration" | Parameter value type |
| defaultValue | unknown (optional) | Default value |

### ActivityPanelMessage (extended)

Extension to `shared/components/src/ActivityPanel/types.ts`:

| Field | Type | Description |
|-------|------|-------------|
| type | "tool:run" | Message type (unchanged) |
| payload.toolId | string | Tool identifier (unchanged) |
| payload.params | Record<string, unknown> (optional) | **NEW: Collected parameter values** |

## State Transitions

### Parameter Collection Flow

```
IDLE → COLLECTING → EXECUTING
  │        │
  │        ├── (Escape/click outside) → IDLE (cancelled)
  │        │
  │        └── (all params collected) → EXECUTING
  │
  └── (tool has no params) → EXECUTING (immediate)
```

### Context Menu States

```
HIDDEN → VISIBLE → SELECTED
  │         │          │
  │         │          └── (value chosen) → HIDDEN (proceed to next param or execute)
  │         │
  │         ├── (Escape) → HIDDEN (cancel flow)
  │         │
  │         └── (Custom selected) → CUSTOM_INPUT
  │                                      │
  │                                      ├── (valid input + Enter) → HIDDEN (proceed)
  │                                      ├── (invalid input + Enter) → ERROR (show message, stay)
  │                                      └── (Escape) → HIDDEN (cancel flow)
  │
  └── (trigger click) → VISIBLE
```

## No Storage Changes

This feature does not modify any persisted data formats. Parameter values flow through the existing `ParameterValue` model in log entries, which already supports `value: Any`. The STAC catalog structure is unchanged.
