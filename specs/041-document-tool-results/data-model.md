# Data Model: Tool Results Architecture

**Feature**: #041 Tool Results Architecture
**Date**: 2026-01-30

## Entities

### ResultTopType (Enum)

The four permitted top-level result classifications.

| Value | Description |
|-------|-------------|
| `mutation` | Modifies existing feature(s) in the FeatureCollection |
| `addition` | Creates new GeoJSON feature(s) |
| `deletion` | Removes feature(s) from the FeatureCollection |
| `artifact` | Creates non-GeoJSON output (image, report, dataset) |

### ResultTypePath

A slash-delimited hierarchical type path.

| Field | Type | Description |
|-------|------|-------------|
| path | string | Full type path (e.g., `mutation/track/smoothed`) |
| top_level | ResultTopType | First segment — must be one of four valid values |
| segments | string[] | All segments split by `/` |

**Validation Rules**:
- Must start with a valid `ResultTopType`
- At least one segment (the top-level type)
- No empty segments, no leading/trailing slashes

### ToolResultAnnotations

Debrief-specific metadata attached to MCP responses.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| debrief:resultType | string (ResultTypePath) | Always | Hierarchical type path |
| debrief:sourceFeatures | string[] | Always | Feature IDs used as input |
| debrief:label | string | Always | Human-readable description |
| debrief:href | string | Artifacts only | Relative file path for persistence |
| debrief:deletedFeatures | string[] | Deletions only | Feature IDs removed |

### MutationResult

A result that modifies existing features in-place.

| Field | Type | Description |
|-------|------|-------------|
| content_type | "resource" | MCP ResourceContent |
| uri | string | `feature://{feature_id}` |
| mimeType | "application/geo+json" | GeoJSON media type |
| text | string | Serialised GeoJSON Feature |
| annotations | ToolResultAnnotations | Must include resultType starting with `mutation/` |

### AdditionResult

A result that creates new features.

| Field | Type | Description |
|-------|------|-------------|
| content_type | "resource" | MCP ResourceContent |
| uri | string | `feature://{new_feature_id}` |
| mimeType | "application/geo+json" | GeoJSON media type |
| text | string | Serialised GeoJSON Feature |
| annotations | ToolResultAnnotations | Must include resultType starting with `addition/` |

### DeletionResult

A result that removes features.

| Field | Type | Description |
|-------|------|-------------|
| content_type | "text" | MCP TextContent |
| text | string | Confirmation message (e.g., "Deleted 3 sensor contacts") |
| annotations | ToolResultAnnotations | Must include resultType starting with `deletion/` and `debrief:deletedFeatures` |

### ArtifactResult

A result that produces a non-GeoJSON file.

| Field | Type | Description |
|-------|------|-------------|
| content_type | "image" / "resource" | MCP content type matching the artifact |
| data | string (base64) | For images: base64-encoded content |
| mimeType | string | MIME type of the artifact |
| annotations | ToolResultAnnotations | Must include resultType starting with `artifact/` and `debrief:href` |

### ToolErrorResponse

Structured error from a failed tool execution.

| Field | Type | Description |
|-------|------|-------------|
| code | integer | MCP error code (e.g., -32000) |
| message | string | Human-readable error description |
| data.debrief:errorCategory | string | One of: `invalid_input`, `algorithm_failure`, `resource_not_found` |
| data.debrief:affectedFeatures | string[] | Feature IDs related to the error |

### FeatureProvenance

Lineage information stored in `properties.prov` of persisted features.

| Field | Type | Description |
|-------|------|-------------|
| tool | string | Tool identifier |
| version | string | Tool version |
| timestamp | string (ISO 8601) | Execution timestamp |
| sources | SourceRef[] | Input feature references |
| parameters | object | Tool parameters used |

### SourceRef

Reference to a source feature in provenance.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Source feature ID |
| kind | string | Source feature kind |

### FeatureCollectionDiff

Output of the diff utility comparing two FeatureCollections.

| Field | Type | Description |
|-------|------|-------------|
| added | Feature[] | Features present in new but not old |
| removed | string[] | Feature IDs present in old but not new |
| modified | ModifiedEntry[] | Features present in both but changed |

### ModifiedEntry

A single modified feature in a diff result.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Feature ID |
| feature | Feature | The updated feature from the new FeatureCollection |

## Relationships

```
Tool ──executes──► ToolResult (1:N over time)
ToolResult ──classified_as──► ResultTypePath (1:1)
ToolResult ──annotated_with──► ToolResultAnnotations (1:1)
ToolResult ──persisted_by──► debrief-stac (1:1)
FeatureCollection ──diffed_to──► FeatureCollectionDiff (1:1 per comparison)
Feature ──has_provenance──► FeatureProvenance (1:0..1)
FeatureProvenance ──references──► SourceRef (1:N)
```

## State Transitions

```
ToolResult:
  [computed] ──persist──► [persisted]

Feature (on mutation):
  [original] ──tool_mutates──► [modified_with_prov]

Feature (on addition):
  [nonexistent] ──tool_creates──► [added_with_prov]

Feature (on deletion):
  [existing] ──tool_deletes──► [removed]
```

## Hierarchical Type Examples

```
mutation/
  track/
    smoothed          # Track smoothing
    interpolated      # Track interpolation
  sensor/
    recalibrated      # Sensor recalibration

addition/
  track/
    reconstructed     # Track reconstruction
  analysis/
    cpa_point         # Closest Point of Approach

deletion/
  track/              # Track deletion
  sensor/             # Sensor contact deletion

artifact/
  image/
    bearing_time_plot  # Bearing-time plot
    range_time_plot    # Range-time plot
  report/
    engagement_summary # Engagement summary report
  dataset/
    exported_csv       # CSV export
```

## Validation Rules

1. `debrief:resultType` MUST start with one of: `mutation/`, `addition/`, `deletion/`, `artifact/`
2. `debrief:sourceFeatures` MUST be a non-empty array of strings
3. `debrief:label` MUST be a non-empty string
4. `debrief:href` MUST be present when `debrief:resultType` starts with `artifact/`
5. `debrief:deletedFeatures` MUST be present when `debrief:resultType` starts with `deletion/`
6. Error responses MUST include `debrief:errorCategory` from the defined set
7. Persisted features MUST have `properties.prov` populated after any persistence operation
