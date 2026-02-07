# Data Model: Document Debrief Algorithms and Tools for Migration

**Feature**: 001-document-debrief-algorithms
**Date**: 2026-02-07

## Overview

This feature produces documentation artifacts, not runtime code. The data model describes the structured document formats and their relationships. All entities are file-based (Markdown and JSON), following conventions established in the TOOL-LIBRARY-SRD and LEGACY-REPO-TASK.md.

## Entities

### Discovery Report

A single Markdown document inventorying all migrateable tools.

**Location**: `_tool-migration/discovery-report.md` (staged) → `docs/tool-migration/discovery-report.md` (final)

**Sections**:

| Section | Content |
|---------|---------|
| Header | Source repo, date, total tool count |
| Summary Table | Tools per category, broken down by complexity and scope |
| Full Inventory | One row per tool with all 9 required columns |
| Trigger Type Summary | Count of tools per legacy trigger type |
| UX Integration Mapping | Maps 10 legacy triggers → 4 Future Debrief surfaces |
| Tools Requiring New UX | Tools with trigger-type gaps, proposed alternatives |
| Ready for Migration | Low-complexity tools ready for immediate spec authoring |
| Needs Review | Medium/High tools needing domain expert input |
| Out of Scope | Excluded classes with reasons |

### Tool Inventory Entry

One row in the discovery report's Full Inventory table.

**Required Columns** (9):

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| Name | string (kebab-case) | Tool identifier derived from Java class name | `set-track-color` |
| Category | string (path) | Hierarchical domain path | `track/styling` |
| Java Class | string (FQN) | Fully-qualified legacy class name | `org.mwc.debrief.core.actions.SetTrackColor` |
| Complexity | enum | `Low` / `Medium` / `High` | `Low` |
| Legacy Trigger | string | How user invokes in Eclipse RCP | `context-menu` |
| Selection Context | string | What must be selected to invoke | `1+ tracks selected` |
| Has Intermediate UI | enum | `Yes` / `No` — shows dialog before running? | `Yes (colour picker)` |
| Description | string | One-line summary | `Sets track display colour` |
| Status | enum | `Ready` / `Needs Review` / `Out of Scope` | `Ready` |

**Naming Convention**: Java `CamelCase` → kebab-case
- `SetTrackColor` → `set-track-color`
- `CPAAnalyzer` → `cpa-analyzer`
- `RangeBearingCalculator` → `range-bearing-calculator`

### Complexity Assessment

Five-factor assessment applied to each tool.

| Factor | Low | Medium | High |
|--------|-----|--------|------|
| Algorithm | Property set / simple assignment | Basic math, iteration | Complex geometric analysis, multi-track |
| Dependencies | None / Java stdlib only | Internal Debrief APIs | External libraries (JFreeChart, GeoTools) |
| State | Stateless | Simple state (counters) | Complex state (multi-pass, convergence) |
| I/O Shape | Single feature → single feature | Collection → collection | Multiple heterogeneous → mixed outputs |
| UI Coupling | None | Reads a preference value | Tightly coupled to SWT/Eclipse |

### Legacy Trigger Type

Classification of how a tool is invoked in legacy Eclipse RCP.

| Type | Description | Eclipse RCP Pattern |
|------|-------------|---------------------|
| `context-menu` | Right-click on selection | `IMenuCreator`, `contributeToPopupMenu` |
| `toolbar-button` | Click toolbar button | `IAction` in `plugin.xml` toolbar |
| `menu-bar` | Top-level menu item | `plugin.xml` `<menu>` / `<command>` |
| `drag-drop` | Drag operation on plot | `MouseListener`, `DragTracker` |
| `property-edit` | Edit value in properties panel | `IPropertySource`, property descriptors |
| `wizard` | Multi-step dialog | `IWizard`, `WizardPage` |
| `key-binding` | Keyboard shortcut | `plugin.xml` `<key>` binding |
| `auto/listener` | Triggered by data changes | `PropertyChangeListener` |
| `view-action` | Button inside a custom view | View-specific UI components |
| `bulk/batch` | Applied to multiple items | Wrapper over another trigger type |

### UX Integration Mapping

Maps legacy trigger types to Future Debrief surfaces.

| Legacy Trigger | MCP/LLM Tool | VS Code Command | Webview Panel | Context Menu | Gap? |
|----------------|-------------|-----------------|---------------|--------------|------|
| `context-menu` | Yes | Yes | Possible | Yes | No |
| `toolbar-button` | Yes | Yes | Yes | N/A | No |
| `menu-bar` | Yes | Yes | N/A | N/A | No |
| `drag-drop` | No | No | Possible | No | **YES** |
| `property-edit` | Partial | Partial | Yes | N/A | Partial |
| `wizard` | Partial | Partial | Yes | N/A | **YES** |
| `key-binding` | N/A | Yes | Possible | N/A | No |
| `auto/listener` | Yes | Yes | Yes | N/A | No |
| `view-action` | N/A | Possible | Yes | N/A | No |
| `bulk/batch` | Yes | Yes | Yes | N/A | No |

### Tool Specification

A 9-section Markdown document describing one tool's behaviour.

**Location**: `_tool-migration/tools/{category}/{tool-name}.1.0.md` (staged) → `shared/tools/{category}/{tool-name}.1.0.md` (final)

**Structure** (all 9 sections mandatory):

| # | Section | Content |
|---|---------|---------|
| 1 | Metadata | YAML frontmatter: `name`, `version`, `category`, `status`, `migrated_from` |
| 2 | MCP | LLM-optimised description, when-to-use, parameters, returns |
| 3 | Inputs | Schema reference, constraints, defaults |
| 4 | Outputs | ToolResponse structure, result type path, annotations |
| 5 | Algorithm | Language-neutral pseudocode using approved keywords only |
| 6 | Edge Cases | Table with 5+ boundary conditions and expected behaviour |
| 7 | Examples | Basic example inline + references to golden files |
| 8 | Changelog | Version 1.0 with date |
| 9 | References | Related tools, schemas, legacy Java class, external standards |

### Golden I/O Pair

Matched pair of JSON files capturing exact tool input/output.

**Location**: `_tool-migration/tools/{category}/{tool-name}.{case}.{input|output}.json`

**Input File** (FeatureCollection wrapper):
```json
{
  "features": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "id": "track-001",
        "geometry": { "type": "LineString", "coordinates": [[...]] },
        "properties": { "debrief:kind": "track", "debrief:style": {} }
      }
    ]
  },
  "parameter_name": "parameter_value"
}
```

**Output File** (ToolResponse envelope):
```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://track-001",
      "mimeType": "application/geo+json",
      "text": "{...serialized GeoJSON Feature...}",
      "annotations": {
        "debrief:resultType": "mutation/track/styled",
        "debrief:sourceFeatures": ["track-001"],
        "debrief:label": "Human-readable description"
      }
    }
  ]
}
```

**Naming Convention**:
- Format: `{tool-name}.{case-name}.{input|output}.json`
- Standard case names: `basic`, `empty`, `edge`, `edge-1`, `edge-2`, `complex`, `multi-track`, `error`

**Serialisation Rules**:
- Floating-point: full precision, no rounding
- Timestamps: ISO 8601 UTC with `Z` suffix
- Coordinates: `[longitude, latitude]` (GeoJSON convention)
- Collections: deterministic ordering

### ToolResponse Envelope

Standard output structure for all Future Debrief tools.

**Success Response**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | array | Yes | Array of content items |
| `content[].type` | string | Yes | Always `"resource"` |
| `content[].uri` | string | Yes | `feature://{feature-id}` |
| `content[].mimeType` | string | Yes | `application/geo+json` |
| `content[].text` | string | Yes | Serialised GeoJSON Feature |
| `content[].annotations` | object | Yes | Debrief metadata |
| `annotations.debrief:resultType` | string | Yes | `{top_type}/{domain}/{specific_type}` |
| `annotations.debrief:sourceFeatures` | array | Yes | IDs of input features |
| `annotations.debrief:label` | string | Yes | Human-readable description |

**Error Response**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `error.code` | number | Yes | JSON-RPC error code (e.g., -32000) |
| `error.message` | string | Yes | Human-readable error description |
| `error.data.debrief:errorCategory` | string | Yes | `invalid_input`, `no_matching_features`, etc. |
| `error.data.debrief:affectedFeatures` | array | Yes | IDs of features affected |

### Result Type Path

**Format**: `{top_type}/{domain}/{specific_type}`

| Top Type | When to Use |
|----------|-------------|
| `mutation` | Modifying existing features |
| `addition` | Creating new derived features |
| `deletion` | Removing features |
| `artifact` | Producing non-GeoJSON output |

**Naming Rules**:
- Use underscores, not hyphens: `range_bearing` not `range-bearing`
- Lowercase only: `cpa_point` not `CPA_Point`
- Two segments required after top type: `analysis/cpa_point` not just `cpa_point`
- Pattern: `^[a-z_]+/[a-z_]+$`

### Tool Category

Hierarchical classification path organising tools by domain.

| Category | Expected Content | Example Tool |
|----------|-----------------|--------------|
| `track/styling` | Colour, symbol, label, line style | `set-track-color` |
| `track/analysis` | CPA, range/bearing, statistics | `cpa-analyzer` |
| `track/manipulation` | Splitting, merging, interpolation | `split-tracks-into-legs` |
| `track/measurement` | Distance, speed, course | `range-bearing-calculator` |
| `sensor/calibration` | Bias correction, alignment | `sensor-bias-calibration` |
| `sensor/analysis` | Detection analysis, coverage | `sensor-coverage-analysis` |
| `dataset/export` | Clipboard, CSV, format conversion | `export-to-csv` |
| `spatial/geometry` | Area calculations, intersections | `area-calculator` |
| `narrative/formatting` | Report generation, annotations | `format-narrative-entry` |

## Relationships

```
Discovery Report ─────────────────────────────────────────────────┐
  │ (contains many)                                               │
  ▼                                                               │
Tool Inventory Entry ──► Complexity Assessment                    │
  │                                                               │
  │ (status = Ready)                                              │
  ▼                                                               │
Golden I/O Pair ◄───── Java Source Analysis ───► Tool Specification
  │                                                │
  │ (referenced by)                                │ (uses)
  │                                                ▼
  │                                         Result Type Path
  │                                         ToolResponse Envelope
  │
  ▼ (validates, future phase)
Verification Report
```

## State Transitions

### Tool Status Lifecycle

```
[Discovered]     Phase 1: Tool found in Java source scan
     │
     ├── (no algorithmic body) ──► [Out of Scope]
     │
     ├── (too complex / unclear) ──► [Needs Review]
     │
     ▼
[Ready]          Phase 1: Tool assessed, ready for golden I/O
     │
     ▼
[Golden I/O]     Phase 2: Golden examples captured
     │
     ▼
[Spec Draft]     Phase 3: 9-section spec authored
     │
     ├── (fails checklist) ──► [Spec Draft] (fix and revalidate)
     │
     ▼
[Spec Complete]  Phase 4: Passes all 11 checklist items
     │
     ▼
[Implemented]    (Future: /tool.implement in debrief-future)
     │
     ▼
[Verified]       (Future: /tool.verify in debrief-future)
```
