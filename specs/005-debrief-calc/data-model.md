# Data Model: debrief-calc

**Feature**: Context-Sensitive Analysis Tools
**Date**: 2026-01-15

## Overview

This document defines the data entities, their attributes, relationships, and validation rules for debrief-calc.

---

## Entities

### Tool

An analysis operation registered in the tool registry.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | ✓ | Unique identifier (kebab-case, e.g., "track-stats") |
| `description` | string | ✓ | Human-readable description |
| `version` | string | ✓ | Semantic version (e.g., "1.0.0") |
| `input_kinds` | list[string] | ✓ | Feature kinds this tool accepts (e.g., ["track"]) |
| `output_kind` | string | ✓ | Kind of features produced (e.g., "analysis-result") |
| `context_type` | ContextType | ✓ | Selection context requirement |
| `parameters` | list[ToolParameter] | | Optional configurable parameters |
| `handler` | callable | ✓ | Python function implementing the tool |

**Validation Rules**:
- `name` must be unique across registry
- `name` must match pattern `^[a-z][a-z0-9-]*$`
- `input_kinds` must contain at least one value
- `output_kind` must be a valid kind from schema

---

### ToolParameter

A configurable parameter for a tool.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | ✓ | Parameter identifier |
| `type` | string | ✓ | Data type ("string", "number", "boolean", "enum") |
| `description` | string | ✓ | Human-readable description |
| `required` | boolean | | Whether parameter is required (default: false) |
| `default` | any | | Default value if not provided |
| `choices` | list[any] | | Valid values for enum type |

**Validation Rules**:
- If `type` is "enum", `choices` must be provided
- If `required` is false, `default` should be provided

---

### ContextType (Enum)

Describes the selection context a tool requires.

| Value | Description |
|-------|-------------|
| `single` | Exactly one feature selected |
| `multi` | Two or more features selected |
| `region` | Geographic bounds (bbox or polygon) |
| `none` | No selection required |

---

### SelectionContext

The user's current data selection.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | ContextType | ✓ | The context classification |
| `features` | list[Feature] | | Selected GeoJSON features (for single/multi) |
| `bounds` | BBox | | Geographic bounds (for region) |

**Validation Rules**:
- If `type` is `single`, `features` must have exactly 1 item
- If `type` is `multi`, `features` must have 2+ items
- If `type` is `region`, `bounds` must be provided
- If `type` is `none`, `features` and `bounds` should be empty

---

### ToolResult

The output of a tool execution.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `tool` | string | ✓ | Name of tool that produced this result |
| `success` | boolean | ✓ | Whether execution succeeded |
| `features` | list[Feature] | | Output GeoJSON features (if success) |
| `error` | ToolError | | Error details (if not success) |
| `duration_ms` | number | ✓ | Execution time in milliseconds |

**Validation Rules**:
- If `success` is true, `features` must be provided
- If `success` is false, `error` must be provided
- All features must include provenance

---

### ToolError

Structured error information.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | ✓ | Error code (e.g., "KIND_MISMATCH") |
| `message` | string | ✓ | Human-readable error message |
| `details` | dict | | Additional context-specific details |

**Error Codes**:

| Code | Description |
|------|-------------|
| `TOOL_NOT_FOUND` | Requested tool does not exist |
| `INVALID_CONTEXT` | Selection context doesn't match tool requirement |
| `KIND_MISMATCH` | Feature kind not accepted by tool |
| `VALIDATION_FAILED` | Input or output failed schema validation |
| `EXECUTION_ERROR` | Tool handler raised an exception |

---

### Provenance

Lineage information attached to output features.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `tool` | string | ✓ | Tool that produced this feature |
| `version` | string | ✓ | Tool version |
| `timestamp` | datetime | ✓ | When the tool was executed |
| `sources` | list[SourceRef] | ✓ | Input features used |
| `parameters` | dict | | Parameters passed to tool |

**SourceRef**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✓ | Source feature ID |
| `kind` | string | ✓ | Source feature kind |

---

### ToolRegistry

Singleton registry of available tools.

| Operation | Input | Output |
|-----------|-------|--------|
| `register(tool)` | Tool | void |
| `get_tool(name)` | string | Tool |
| `find_tools(context, kinds)` | SelectionContext, list[string] | list[Tool] |
| `list_all()` | | list[Tool] |

**Behavior**:
- `find_tools` filters by context type AND input kinds
- Returns empty list if no tools match
- Tools are ordered by name alphabetically

---

## Relationships

```
┌─────────────┐       ┌───────────────┐
│    Tool     │       │ ToolParameter │
├─────────────┤       ├───────────────┤
│ name        │──────<│ name          │
│ input_kinds │       │ type          │
│ output_kind │       │ default       │
│ context_type│       └───────────────┘
└─────────────┘
       │
       │ produces
       ▼
┌─────────────┐       ┌───────────────┐
│ ToolResult  │       │  Provenance   │
├─────────────┤       ├───────────────┤
│ success     │       │ tool          │
│ features    │──────>│ sources       │
│ error       │       │ timestamp     │
└─────────────┘       └───────────────┘
```

---

## GeoJSON Extensions

All output features conform to the Debrief GeoJSON profile with these extensions:

```json
{
  "type": "Feature",
  "id": "result-001",
  "properties": {
    "kind": "analysis-result",
    "provenance": {
      "tool": "track-stats",
      "version": "1.0.0",
      "timestamp": "2026-01-15T10:30:00Z",
      "sources": [
        {"id": "track-001", "kind": "track"}
      ],
      "parameters": {}
    },
    // Tool-specific properties
    "statistics": {
      "point_count": 1247,
      "duration_hours": 24.5,
      "distance_nm": 142.3
    }
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [...]
  }
}
```

---

## State Transitions

Tools are stateless. The only state is the tool registry which is populated at import time:

```
[Module Import] → [Tool Decorators Execute] → [Registry Populated] → [Ready]
```

Tool execution is a pure function:
```
(SelectionContext, Parameters) → ToolResult
```
