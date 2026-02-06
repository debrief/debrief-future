# Data Model: Tool API Integration (#052)

**Date**: 2026-02-06
**Source**: spec.md Key Entities + research.md decisions

## Entity: MCPToolDefinition

The wire format for a single tool exposed via MCP's `tools/list` response. Both Python and TypeScript libraries produce entries conforming to this structure.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string (kebab-case) | Yes | Unique tool identifier (e.g., "set-track-color") |
| description | string | Yes | Human-readable description of what the tool does |
| inputSchema | JSON Schema object | Yes | Schema describing the tool's input parameters |
| annotations | object | Yes | MCP extension metadata (see below) |

### Annotations

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `debrief:selectionRequirements` | SelectionRequirement[] | Yes | Feature kind constraints for UI filtering |
| `debrief:category` | string | Yes | Tool category path (e.g., "track/styling", "analysis") |
| `debrief:version` | string | Yes | Semantic version of the tool (e.g., "1.0.0") |
| `debrief:outputKind` | string | Yes | Result type path (e.g., "mutation/track/styled") |

## Entity: SelectionRequirement

A single constraint on what kind of features a tool needs.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| kind | string | Yes | - | Feature kind (e.g., "TRACK", "CONTACT", "ZONE", "REGION") |
| min | integer | No | 1 | Minimum number of features of this kind |
| max | integer | No | undefined | Maximum number (undefined = no upper limit) |

### Validation Rules

- `kind` must be uppercase (convention established in existing fixtures)
- `min` must be >= 0
- If `max` is defined, `max` >= `min`
- An empty array means the tool has no selection requirements (always available)

## Entity: ToolResponse

The standard output envelope from tool execution. Same structure whether produced by Python or TypeScript.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | MCPContentItem[] | Yes | Result content items (features, text, images) |
| duration_ms | number | Yes | Execution time in milliseconds |

### MCPContentItem (existing, documented for completeness)

| Field | Type | Description |
|-------|------|-------------|
| type | "resource" \| "text" \| "image" | Content type discriminator |
| resource | object | For resource type: uri, mimeType, text (GeoJSON string) |
| data | string | For image type: base64-encoded data |
| mimeType | string | For image type: MIME type |
| text | string | For text type: plain text content |
| annotations | object | Debrief annotations (see below) |

### Content Item Annotations (existing)

| Key | Type | Description |
|-----|------|-------------|
| `debrief:resultType` | string | Hierarchical result type (e.g., "mutation/track/styled") |
| `debrief:sourceFeatures` | string[] | IDs of input features used |
| `debrief:label` | string | Human-readable description of result |
| `debrief:href` | string? | Relative file path (artifacts only) |
| `debrief:deletedFeatures` | string[]? | IDs of deleted features (deletions only) |

## Entity: ToolErrorResponse

Error envelope following MCP error conventions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| error.code | integer | Yes | Error code (default -32000) |
| error.message | string | Yes | User-facing error message |
| error.data | object | Yes | Additional error context |

### Error Data

| Key | Type | Description |
|-----|------|-------------|
| `debrief:errorCategory` | string | Category: "invalid_input", "algorithm_failure", "resource_not_found" |
| `debrief:affectedFeatures` | string[] | Feature IDs involved in the error |

## Entity: Provenance (existing, unchanged)

| Field | Type | Description |
|-------|------|-------------|
| tool | string | Tool name (kebab-case) |
| version | string | Tool version |
| timestamp | datetime | Execution timestamp (ISO 8601) |
| sources | SourceRef[] | Input feature references |
| parameters | object | Parameters used in execution |

### SourceRef

| Field | Type | Description |
|-------|------|-------------|
| id | string | Feature ID |
| kind | string | Feature kind |

## Entity: ToolParameter (existing, unchanged)

| Field | Type | Description |
|-------|------|-------------|
| name | string | Parameter name |
| type | "string" \| "number" \| "boolean" \| "enum" | Value type |
| description | string | Human-readable description |
| required | boolean | Whether the parameter must be provided |
| default | any | Default value (if not required) |
| choices | any[] | Valid values (enum type only) |

## State Transitions

### Tool Execution Lifecycle

```
IDLE → VALIDATING → EXECUTING → [SUCCESS | ERROR]
  │                      │
  │                      └→ CANCELLED (user cancellation)
  └→ ERROR (validation failure)
```

| State | Description |
|-------|-------------|
| IDLE | No tool execution in progress |
| VALIDATING | Checking selection requirements and parameters |
| EXECUTING | Tool handler running (Python subprocess or in-browser TypeScript) |
| SUCCESS | Execution complete, ToolResponse available |
| ERROR | Execution failed, ToolErrorResponse available |
| CANCELLED | User cancelled in-flight execution |

## Relationships

```
MCPToolDefinition 1──* SelectionRequirement
MCPToolDefinition 1──* ToolParameter (via inputSchema)

ToolResponse 1──* MCPContentItem
MCPContentItem 1──1 Provenance (embedded in annotations)

ToolErrorResponse 1──* affected Feature IDs
```
