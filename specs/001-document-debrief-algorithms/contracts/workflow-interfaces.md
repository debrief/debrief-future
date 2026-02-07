# Workflow Interfaces: Document Debrief Algorithms

**Feature**: 001-document-debrief-algorithms
**Date**: 2026-02-07

## Overview

This feature produces documentation artifacts through a 4-phase sequential workflow. The "interfaces" are the input/output contracts between phases — what each phase receives and what it produces. Since there is no runtime API, these contracts define file formats and structural requirements.

## Phase Interfaces

### Phase 1: Discovery

**Input**:
- Legacy Java source code in `debrief/debrief` repository
- 4 package roots to scan:
  - `org.mwc.debrief.core/src/`
  - `org.mwc.debrief.track_shift/src/`
  - `org.mwc.cmap.plotViewer/src/`
  - `Debrief/`
- Tool identification patterns (class names, interfaces, method signatures)
- Exclusion rules (UI plumbing, deprecated code)

**Output**:
- `_tool-migration/discovery-report.md` containing:
  - Summary table (tools per category by complexity)
  - Full inventory table (9 columns per tool)
  - Trigger type summary (count per type)
  - UX integration mapping table (10 triggers × 4 surfaces)
  - "Tools Requiring New UX Mechanisms" section
  - Triage lists (Ready, Needs Review, Out of Scope)

**Validation**:
- Every tool-bearing class has a row in the inventory
- All 9 columns populated (no blanks or placeholders)
- All 10 trigger types appear in the mapping table
- At least one tool per triage status (Ready, Needs Review, Out of Scope)

---

### Phase 2: Golden I/O Capture

**Input**:
- Discovery report (list of tools with status = Ready)
- Legacy Java source code (for running tools or manual construction)
- Java capture harness template (`docs/tool-migration/java-harness-template/`)

**Output**:
- For each Ready tool, at minimum:
  - `_tool-migration/tools/{category}/{tool-name}.basic.input.json`
  - `_tool-migration/tools/{category}/{tool-name}.basic.output.json`
- Additional cases per complexity level:
  - Low: 1 pair (`basic`)
  - Medium: 3 pairs (`basic`, `edge`, `complex`)
  - High: 4+ pairs (`basic`, `edge-1`, `edge-2`, `complex`)

**File Format Contract — Input JSON**:
```json
{
  "features": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "id": "<string>",
        "geometry": { "type": "<GeoJSON type>", "coordinates": [] },
        "properties": {
          "debrief:kind": "<string>",
          "debrief:style": {}
        }
      }
    ]
  },
  "<parameter_name>": "<parameter_value>"
}
```

**File Format Contract — Output JSON** (ToolResponse):
```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://<feature-id>",
      "mimeType": "application/geo+json",
      "text": "<serialized GeoJSON Feature>",
      "annotations": {
        "debrief:resultType": "<top_type>/<domain>/<specific_type>",
        "debrief:sourceFeatures": ["<input-feature-id>"],
        "debrief:label": "<human-readable description>"
      }
    }
  ]
}
```

**Serialisation Rules**:
- Floating-point: full precision (no rounding)
- Timestamps: ISO 8601 UTC (`Z` suffix)
- Coordinates: `[longitude, latitude]` (GeoJSON convention)
- Collections: deterministic ordering

**Validation**:
- All JSON files parse without error
- Input files contain valid GeoJSON FeatureCollection
- Output files use ToolResponse envelope with all required annotations
- Example count meets minimum for tool complexity level

---

### Phase 3: Specification Authoring

**Input**:
- Discovery report (tool metadata: name, category, Java class, complexity)
- Golden I/O pairs (define expected behaviour)
- Legacy Java source code (algorithm extraction)
- TEMPLATE.md structure (9 mandatory sections)

**Output**:
- For each tool: `_tool-migration/tools/{category}/{tool-name}.1.0.md`
- Spec follows the 9-section structure:

**Spec File Contract**:
```yaml
---
name: <kebab-case-tool-name>
version: 1.0
category: <domain/subdomain>
status: draft
migrated_from: <fully.qualified.JavaClassName>
---
```

Followed by 9 sections:
1. **MCP**: Description, when-to-use, parameters, returns
2. **Inputs**: Schema reference, constraints, defaults
3. **Outputs**: ToolResponse structure, result type path, annotations
4. **Algorithm**: Pseudocode using approved keywords only
5. **Edge Cases**: Table with 5+ entries
6. **Examples**: Inline basic example + golden file references
7. **Changelog**: Version 1.0 with date
8. **References**: Related tools, schemas, legacy class

**Pseudocode Vocabulary**:
- Keywords: `FUNCTION`, `END FUNCTION`, `FOR EACH`, `END FOR`, `IF`, `ELSE`, `ELSE IF`, `END IF`, `WHILE`, `END WHILE`, `RETURN`
- Operators: `IN`, `IS NULL`, `IS NOT NULL`, `IS EMPTY`, `AND`, `OR`, `NOT`
- Response builders: `build_mutation()`, `build_addition()`, `build_deletion()`, `build_artifact()`, `build_error()`, `build_response()`

**Result Subtype Pattern**: `^[a-z_]+/[a-z_]+$` (underscores, lowercase, two segments)

---

### Phase 4: Validation

**Input**:
- Completed spec files
- Golden I/O pairs
- Discovery report (for status updates)

**Output**:
- Each spec marked PASS or FAIL with specific evidence per checklist item
- Discovery report status updated to reflect current state

**Validation Checklist** (11 items):

| # | Check | Pass Criteria |
|---|-------|---------------|
| 1 | Spec file exists | File at `_tool-migration/tools/{category}/{tool-name}.1.0.md` |
| 2 | YAML frontmatter complete | Has `name`, `version`, `category`, `status`, `migrated_from` |
| 3 | All 9 sections present | Non-placeholder content in each section |
| 4 | MCP clarity | Clear enough for an LLM to decide when to invoke |
| 5 | Pseudocode compliance | Only approved keywords; no Java/Python/TS syntax |
| 6 | Response builder usage | Correct `build_*` function for the result type |
| 7 | Result subtype pattern | Matches `^[a-z_]+/[a-z_]+$` |
| 8 | Golden examples referenced | At least one pair exists and is referenced |
| 9 | Edge cases adequate | Table has 5+ entries covering boundary conditions |
| 10 | Provenance recorded | `migrated_from` references legacy Java class FQN |
| 11 | Changelog present | Version 1.0 with date |

---

## Cross-Phase Dependencies

```
Phase 1 ───► Phase 2 ───► Phase 3 ───► Phase 4
(Discovery)  (Golden I/O)  (Specs)      (Validation)
  │            │             │             │
  │            │             │             ▼
  │            │             │         Status updates
  │            │             │         back to Discovery
  │            │             │         Report
  │            │             ▼
  │            │          References golden
  │            │          files from Phase 2
  │            ▼
  │         Only processes tools
  │         with status = Ready
  ▼
Identifies tools and
sets initial status
```

## Error Handling

| Phase | Error Condition | Response |
|-------|----------------|----------|
| 1 | Class has no algorithmic body | Mark as `Out of Scope` with reason |
| 1 | Unclear tool purpose | Mark as `Needs Review` with notes |
| 2 | Cannot run tool in isolation | Use manual construction (Approach B) |
| 2 | Cannot determine expected output | Mark tool as `Needs Review`, skip golden I/O |
| 3 | Algorithm too complex for pseudocode | Add detailed comments; flag for human review |
| 3 | Ambiguous edge cases | Document known ambiguity in Edge Cases section |
| 4 | Spec fails checklist | Fix specific failures, re-validate |
| 4 | Unfixable issue found | Update tool status to `Needs Review` in discovery report |
