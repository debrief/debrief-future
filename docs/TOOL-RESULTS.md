# Tool Results Architecture

This document defines how DebriefNG handles results from `debrief-calc` tools, covering result types, persistence, MCP compliance, and user feedback mechanisms.

## Design Goals

1. **MCP-compliant** — use standard MCP content types and error handling; Debrief-specific metadata in annotations
2. **LLM-ready** — an LLM supervisor can replace the frontend; same result handling mechanism for both
3. **Graceful degradation** — consumers descend the type hierarchy as far as they understand
4. **Single source of truth** — debrief-stac owns persistence; frontends diff and render

## Result Type System

### Top-Level Types

Four top-level result types, defined in LinkML schema (generates Pydantic + TypeScript):

| Type | Description |
|------|-------------|
| `mutation` | Modifies existing feature(s) in the FeatureCollection |
| `addition` | Creates new GeoJSON feature(s) |
| `deletion` | Removes feature(s) from the FeatureCollection |
| `artifact` | Creates non-GeoJSON output (image, report, dataset) |

### Hierarchical Sub-Types

Each top-level type has domain-specific sub-categories forming a hierarchy:

```
mutation/
  track/
    smoothed
    interpolated
  sensor/
    recalibrated

addition/
  track/
    reconstructed
  analysis/
    cpa_point

deletion/
  track/
  sensor/

artifact/
  image/
    bearing_time_plot
    range_time_plot
  report/
    engagement_summary
  dataset/
    exported_csv
```

### Extension Model

- **Core schema** defines top-level types and common sub-types
- **Contrib extensions** extend freely below top-level without registration
- **Graceful degradation** — consumers match as deep as they understand:
  - DSTL custom UI recognises `artifact/report/ssa_assessment` → opens dedicated viewer
  - Generic Debrief UI recognises `artifact/report` → shows document preview
  - LLM recognises `artifact` → reports "I've generated a report"

### Schema Enforcement

- Top-level types are validated (must be one of four)
- Sub-types below top-level are convention-based for contrib; core sub-types defined in schema
- LinkML generates both Pydantic (Python) and TypeScript types for cross-boundary consistency

## Physical Storage

### Plot Structure

```
catalog/
  exercise_001/
    plot_001/
      item.json           # STAC Item metadata
      plot.geojson        # FeatureCollection (tracks, contacts, analysis results)
      assets/
        source_file.rep   # Original source files
      results/
        bt_plot_001.png   # Generated artifacts
        range_plot_001.png
```

### Storage Rules

1. **Mutations** — modified features updated in-place in `plot.geojson`
2. **Additions** — new features appended to FeatureCollection in `plot.geojson`
3. **Deletions** — features removed from FeatureCollection in `plot.geojson`
4. **Artifacts** — files written to `results/` subfolder

### STAC Item (item.json)

Lists source and result assets for navigation:

```json
{
  "assets": {
    "plot": {
      "href": "./plot.geojson",
      "type": "application/geo+json",
      "roles": ["data"]
    },
    "source_rep": {
      "href": "./assets/exercise_001.rep",
      "roles": ["source"]
    },
    "bt_plot_001": {
      "href": "./results/bt_plot_001.png",
      "type": "image/png",
      "roles": ["result"]
    }
  }
}
```

### Provenance

- **Location** — stored in feature `properties.provenance` for portability
- **Content** — links feature to source files, source features, tool, version, timestamp
- **Format** — W3C PROV compliance (details deferred)

## Persistence Flow

### Sequence

1. Frontend/LLM invokes tool via MCP
2. Tool executes, returns MCP response with content array (one or more items)
3. Frontend/LLM iterates content array:
   - Interprets `debrief:resultType` for each item
   - Calls appropriate atomic debrief-stac operation
   - Receives updated FeatureCollection
   - Diffs old FC vs new FC
   - Applies incremental UI update
4. User sees changes progressively as each operation completes

### Atomic STAC Operations

debrief-stac exposes simple, storage-focused operations with no knowledge of result types:

| Operation | Purpose |
|-----------|---------|
| `update_features(feature_ids, features)` | Modify existing features (for mutations) |
| `add_features(features)` | Add new features to FC (for additions) |
| `delete_features(feature_ids)` | Remove features from FC (for deletions) |
| `store_artifact(artifact_data, path)` | Write file to results/, update item.json |

Each operation:
- Performs its persistence task
- Writes PROV to affected feature properties
- Updates `item.json` as needed
- Returns full updated FeatureCollection

### Responsibility Boundaries

| Component | Responsibility |
|-----------|----------------|
| Tool (debrief-calc) | Pure computation; returns MCP content array; no persistence knowledge |
| Orchestrator (frontend/LLM) | Iterates content array, interprets result types, calls atomic STAC operations |
| debrief-stac | Atomic persistence — no result type knowledge, just storage operations |
| Frontend | Diffing after each operation, incremental rendering, user feedback |

### Diffing

- Shared `diffFeatureCollections(old, new)` utility
- Returns `{ added: Feature[], removed: string[], modified: { id, feature }[] }`
- Called after each atomic STAC operation for incremental UI updates
- React-Leaflet path: can rely on React reconciliation with keyed components
- VS Code imperative path: feeds diff into existing renderer add/remove/update methods

## MCP Response Structure

### Principle

Use MCP-native content types. Debrief metadata lives in `annotations` object.

### Mutations

Return modified features as `ResourceContent`:

```json
{
  "type": "resource",
  "resource": {
    "uri": "feature://track_a",
    "mimeType": "application/geo+json",
    "text": "{ \"type\": \"Feature\", ... }"
  },
  "annotations": {
    "debrief:resultType": "mutation/track/smoothed",
    "debrief:sourceFeatures": ["track_a"],
    "debrief:label": "Smoothed Track A"
  }
}
```

### Additions

Return new features as `ResourceContent`:

```json
{
  "type": "resource",
  "resource": {
    "uri": "feature://cpa_001",
    "mimeType": "application/geo+json",
    "text": "{ \"type\": \"Feature\", ... }"
  },
  "annotations": {
    "debrief:resultType": "addition/analysis/cpa_point",
    "debrief:sourceFeatures": ["track_a", "track_b"],
    "debrief:label": "CPA between Track A and Track B"
  }
}
```

### Deletions

Return deletion confirmation as `TextContent`:

```json
{
  "type": "text",
  "text": "Deleted 3 sensor contacts",
  "annotations": {
    "debrief:resultType": "deletion/sensor",
    "debrief:deletedFeatures": ["contact_001", "contact_002", "contact_003"],
    "debrief:sourceFeatures": ["track_a"]
  }
}
```

### Artifacts

Return via appropriate MCP content type:

```json
{
  "type": "image",
  "data": "base64...",
  "mimeType": "image/png",
  "annotations": {
    "debrief:resultType": "artifact/image/bearing_time_plot",
    "debrief:href": "./results/bt_plot_001.png",
    "debrief:sourceFeatures": ["track_a"],
    "debrief:label": "Bearing-time plot for Track A"
  }
}
```

### Required Annotations

| Annotation | Required | Description |
|------------|----------|-------------|
| `debrief:resultType` | Yes | Hierarchical type path |
| `debrief:sourceFeatures` | Yes | Feature IDs that were input to the tool |
| `debrief:label` | Yes | Human-readable description |
| `debrief:href` | Artifacts only | Relative path for persistence |
| `debrief:deletedFeatures` | Deletions only | Feature IDs removed |

### Multi-Result Responses

Tools may return multiple content items in a single MCP response. For example, a "trim outliers" tool might:
- Delete features exceeding a threshold
- Return a report artifact listing what was removed

```json
{
  "content": [
    {
      "type": "text",
      "text": "Removed 3 outlier contacts",
      "annotations": {
        "debrief:resultType": "deletion/sensor",
        "debrief:deletedFeatures": ["contact_001", "contact_002", "contact_003"],
        "debrief:sourceFeatures": ["track_a"],
        "debrief:label": "Outlier contacts removed"
      }
    },
    {
      "type": "resource",
      "resource": {
        "uri": "artifact://outlier_report",
        "mimeType": "application/json",
        "text": "{ \"threshold\": 2.5, \"removed\": [...] }"
      },
      "annotations": {
        "debrief:resultType": "artifact/dataset/outlier_report",
        "debrief:href": "./results/outlier_report_001.json",
        "debrief:sourceFeatures": ["track_a"],
        "debrief:label": "Outlier removal report"
      }
    }
  ]
}
```

Each content item is processed independently based on its `debrief:resultType`.

## User Feedback

### Mutations

- Visual change appears on existing features (map, timeline, properties)
- Optional transient halo/highlight effect to draw attention to changed features

### Artifacts

- **Notification appears** — toast or badge: "Bearing-time plot generated"
- **User clicks to open** — displays in panel at user's preferred location
- **Placement preference** — user configures default: above, below, right, floating

### LLM Orchestration

Same mechanism:
- LLM response includes artifact reference
- Chat UI renders notification inline
- User clicks to view full artifact in panel

This unifies the experience whether user invoked tool directly or LLM invoked it.

## Error Handling

### Principle

Use MCP-native error responses. Debrief adds structured data for programmatic handling.

### Error Response Structure

```json
{
  "error": {
    "code": -32000,
    "message": "Course smoothing failed: insufficient data points",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": ["track_a"]
    }
  }
}
```

### Error Categories

To be defined. Expected categories include:
- `invalid_input` — feature doesn't meet tool requirements
- `algorithm_failure` — computation failed
- `resource_not_found` — referenced feature/file missing

### Partial Completion

Not supported. Tool fails fast on first error — no partial results returned.

## Verification

An LLM can verify correct implementation by checking:

### Schema Layer
- LinkML compiles without errors
- Generated Pydantic models import and instantiate
- Generated TypeScript compiles
- Four top-level result types exist with correct names

### Tool Response Contract
- Tool output is valid MCP response (single or multi-content)
- Each content item has required annotations (`debrief:resultType`, `debrief:sourceFeatures`, `debrief:label`)
- Each `resultType` starts with valid top-level (`mutation/`, `addition/`, `deletion/`, `artifact/`)

### Atomic STAC Operations
- `update_features()` modifies specified features, returns updated FC
- `add_features()` appends features to FC, returns updated FC
- `delete_features()` removes features from FC, returns updated FC
- `store_artifact()` writes file to `results/`, updates `item.json`

### Persistence Outcomes
- After STAC calls: artifact files exist at `results/{filename}`
- FC contains new/modified features with PROV in properties
- `item.json` assets list includes new results with correct roles

### Diff Utility
- Given two FCs, returns correct `added`, `removed`, `modified` sets
- Empty diff when FCs identical
- Works correctly when called incrementally (after each atomic operation)

### Error Contract
- Failed tool returns MCP error structure
- Error `data` contains `debrief:errorCategory` and `debrief:affectedFeatures`

## Deferred Items

| Item | Notes |
|------|-------|
| PROV format | W3C PROV compliance; exact property structure TBD |
| Common sub-types | Flesh out core sub-types under each top-level |
| Annotation optionality | Which annotations required/optional per type |
| Error category definitions | Full enumeration of error categories |

## Out of Scope

- **Multi-tool workflows** — composition happens inside tools or via LLM orchestration; no workflow engine
- **Persistence failure handling** — assume debrief-stac writes succeed

## Document History

| Date | Change |
|------|--------|
| January 2026 | Initial architecture decisions |
| January 2026 | Added multi-result responses, atomic STAC operations, incremental diffing |
