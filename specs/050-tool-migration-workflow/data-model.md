# Data Model: Tool Migration Workflow

**Feature**: 050-tool-migration-workflow
**Date**: 2026-02-05

## Overview

This document describes the data structures used in the tool migration workflow. Since this feature primarily creates command and agent definition files (Markdown), the data model focuses on the structured output formats produced by each phase of the workflow.

## Entities

### Tool Inventory Entry

Represents a discovered tool in the legacy codebase.

**Location**: Output of `/tool.discover` → `docs/tool-migration/discovery-report.md`

| Field | Type | Description |
|-------|------|-------------|
| name | string | Tool identifier (e.g., "set-track-color") |
| category | string | Hierarchical category (e.g., "track/styling") |
| java_class | string | Fully qualified Java class name |
| description | string | Brief description of tool purpose |
| complexity | enum | Low / Medium / High (migration difficulty) |
| dependencies | string[] | Other tools this depends on |
| notes | string | Additional observations for migrator |

**Example**:
```markdown
| Name | Category | Java Class | Complexity | Description |
|------|----------|------------|------------|-------------|
| set-track-color | track/styling | org.mwc.debrief.core.actions.SetTrackColor | Low | Sets the color of a track |
| cpa-analysis | track/analysis | org.mwc.cmap.analysis.CPAAnalyzer | High | Calculates closest point of approach |
```

### Tool Specification

Language-neutral tool specification following TEMPLATE.md from feature 049.

**Location**: `shared/tools/{category}/{tool-name}.{version}.md`

**Structure**: See `shared/tools/TEMPLATE.md` for canonical structure with 9 sections:
1. Metadata (YAML frontmatter)
2. MCP (LLM-optimized description)
3. Inputs (schema references)
4. Outputs (ToolResponse structure)
5. Algorithm (language-neutral pseudocode)
6. Edge Cases (boundary conditions)
7. Examples (inline or golden file references)
8. Changelog (version history)
9. References (related tools, schemas, legacy code)

### Golden Example Pair

Input/output JSON files that define expected tool behavior.

**Location**: `shared/tools/{category}/{tool-name}.{example-name}.{input|output}.json`

**Input File Structure** (FeatureCollection):
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "track-001",
      "geometry": { "type": "LineString", "coordinates": [...] },
      "properties": {
        "debrief:kind": "track",
        "debrief:style": { ... }
      }
    }
  ]
}
```

**Output File Structure** (ToolResponse):
```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://track-001",
      "mimeType": "application/geo+json",
      "text": "{...serialized modified feature...}",
      "annotations": {
        "debrief:resultType": "mutation/track/styled",
        "debrief:sourceFeatures": ["track-001"],
        "debrief:label": "Applied color change to 1 feature(s)"
      }
    }
  ]
}
```

### Verification Report

Summary of implementation testing against golden examples.

**Location**: `specs/050-tool-migration-workflow/evidence/verification-{tool-name}.md`

| Field | Type | Description |
|-------|------|-------------|
| tool_name | string | Name of the tool being verified |
| timestamp | datetime | When verification was run |
| examples | VerificationResult[] | Results per example |
| overall_status | enum | PASS / FAIL |
| failures | FailureDetail[] | Details of any failures |

**VerificationResult**:
| Field | Type | Description |
|-------|------|-------------|
| example_name | string | Golden example identifier |
| python_status | enum | PASS / FAIL / SKIP |
| typescript_status | enum | PASS / FAIL / SKIP |
| comparison_notes | string | Any comparison notes |

**FailureDetail**:
| Field | Type | Description |
|-------|------|-------------|
| example_name | string | Which example failed |
| implementation | enum | python / typescript |
| expected | object | Expected output (or excerpt) |
| actual | object | Actual output (or excerpt) |
| diff | string | Specific differences |

### Java Harness Configuration

Configuration for the Java harness template.

**Location**: `docs/tool-migration/java-harness-template/`

| File | Purpose |
|------|---------|
| ToolCaptureHarness.java | Template JUnit test class |
| pom-fragment.xml | Maven dependency fragment for JSON serialization |
| README.md | Setup instructions |
| example-usage.java | Example of integrating harness with a tool |

## Relationships

```
Discovery Report
      │
      ▼ (identifies tools)
Tool Inventory Entry ──────────────────────────────────────┐
      │                                                    │
      ▼ (selected for migration)                           │
Java Source Analysis ─────► Tool Specification ◄───────────┤
      │                            │                       │
      │                            │ (references)          │
      │                            ▼                       │
      │                     Golden Example Pair ◄──────────┘
      │                            │         (captured from Java via Harness)
      │                            │
      ▼ (generates)                ▼ (validates against)
Python Implementation ────────► Verification Report ◄───── TypeScript Implementation
```

## State Transitions

### Tool Migration Status

```
discovered ─► spec_created ─► implemented ─► verified ─► migrated
     │              │              │             │
     │              │              │             └── (FAIL) → implemented (fix & retry)
     │              │              └── (missing golden) → spec_created
     │              └── (complex tool) → needs_manual_review
     └── (UI-only tool) → out_of_scope
```

## Validation Rules

### Golden Example Validation

1. Input file MUST be valid GeoJSON FeatureCollection
2. Input file MUST contain at least one feature
3. Output file MUST be valid ToolResponse structure
4. Output file MUST have `content` array with at least one item
5. Each content item MUST have `annotations` with required Debrief properties

### Specification Validation

1. Spec MUST have all 9 sections from TEMPLATE.md
2. Metadata MUST include name, version, category, status
3. Algorithm section MUST use pseudocode style guide conventions
4. Examples section MUST reference at least one golden example
5. References section MUST link to relevant legacy Java class

### Verification Validation

1. All golden examples MUST be tested
2. Both Python and TypeScript MUST produce output (unless --python-only/--typescript-only)
3. Floating-point comparisons MUST use configured epsilon tolerance
4. Array ordering MUST be preserved (order-sensitive comparison)
