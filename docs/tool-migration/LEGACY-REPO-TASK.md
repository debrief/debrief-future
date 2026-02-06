# Tool Library Discovery — Task Brief for Legacy Repo

> **Run this from**: `debrief/debrief` (the legacy Java repo)
> **Companion SRD**: `debrief-future/docs/tool-migration/TOOL-LIBRARY-SRD.md`
>
> This document is self-contained. The `/tool.discover`, `/tool.spec`, and related
> agents live in `debrief-future` and are **not available** in the legacy repo.
> All necessary instructions are inlined below.

---

## Objective

Scan the legacy Debrief Java codebase and produce:

1. A **discovery report** — inventory of every migrateable tool.
2. **Golden I/O files** — captured JSON input/output from running Java tools.
3. **Language-neutral tool specs** — Markdown documents describing each tool's
   algorithm in pseudocode, following a strict 9-section template.

All outputs are staged in a `_tool-migration/` directory at the repo root,
ready to be copied into `debrief-future/`.

---

## Output directory layout

Create this structure at the repo root:

```
_tool-migration/
├── discovery-report.md
└── tools/
    └── {category}/
        ├── {tool-name}.1.0.md                   # spec
        ├── {tool-name}.{case}.input.json         # golden input
        └── {tool-name}.{case}.output.json        # golden output
```

**Final destination** (in `debrief-future`):
- `discovery-report.md` → `docs/tool-migration/discovery-report.md`
- `tools/**` → `shared/tools/**`

---

## Phase 1: Discovery

### What to scan

Search for Java source files under these roots:

| Root | Likely content |
|------|----------------|
| `org.mwc.debrief.core/src/` | Track actions, styling, formatting |
| `org.mwc.debrief.track_shift/src/` | Track manipulation, drag operations |
| `org.mwc.cmap.plotViewer/src/` | Plot-level tools |
| `Debrief/` | Wrappers, algorithms, legacy analysis |

### How to identify tools

Look for classes that match **any** of these patterns:

**Package patterns**:
```
*.actions.*
*.tools.*
*.analysis.*
*.algorithms.*
*.operations.*
```

**Class name patterns**:
- Ends with `Tool`, `Action`, `Analyzer`, `Calculator`, `Operation`
- Implements `IAction`, `AbstractAction`, `IMenuCreator`, or similar

**Method signatures** (the tool has algorithmic content if it has methods like):
```java
public void execute(Layers layers, ...)
public TrackWrapper process(TrackWrapper track, ...)
public double calculate(WatchableList primary, WatchableList secondary)
public FeatureCollection transform(FeatureCollection input)
```

### Exclusions

Skip classes that are **purely UI plumbing**:
- Dialog launchers (`*Dialog`, `*Wizard`, `*Page`)
- View factories (`*ViewFactory`, `*Perspective`)
- Preference pages (`*PreferencePage`)
- Menu/toolbar wiring with no algorithmic body
- Deprecated or dead code (check for `@Deprecated`, or unreachable via callers)

### Complexity assessment

Rate each tool:

| Factor | Low | Medium | High |
|--------|-----|--------|------|
| Algorithm | Property set / simple assignment | Basic math, iteration over positions | Complex geometric analysis, multi-track |
| Dependencies | None / Java stdlib only | Internal Debrief APIs (wrappers, layers) | External libraries (JFreeChart, GeoTools) |
| State | Stateless | Simple state (counters, accumulators) | Complex state (multi-pass, convergence) |
| I/O shape | Single feature in → single feature out | FeatureCollection in → FeatureCollection out | Multiple heterogeneous inputs → mixed outputs |
| UI coupling | None | Reads a preference value | Tightly coupled to SWT/Eclipse UI |

### Discovery report format

Write `_tool-migration/discovery-report.md`:

```markdown
# Tool Discovery Report

**Source**: {repo path}
**Date**: {YYYY-MM-DD}
**Tools found**: {count}

## Summary

| Category | Count | Low | Medium | High | Out of Scope |
|----------|-------|-----|--------|------|--------------|
| track/styling | … | … | … | … | … |
| track/analysis | … | … | … | … | … |
| … | … | … | … | … | … |

## Full Inventory

| # | Name | Category | Java Class | Complexity | Description | Status |
|---|------|----------|------------|------------|-------------|--------|
| 1 | set-track-color | track/styling | o.m.d.core.actions.SetTrackColor | Low | Sets track display colour | Ready |
| 2 | … | … | … | … | … | … |

Status values: Ready | Needs Review | Out of Scope

## Ready for Migration

{list each Low-complexity tool with a one-line summary}

## Needs Review

{list each Medium/High-complexity tool with a note on why}

## Out of Scope

{list each excluded class with the reason}
```

### Naming convention

Derive tool names from Java class names:
- `SetTrackColor` → `set-track-color`
- `CPAAnalyzer` → `cpa-analyzer`
- `RangeBearingCalculator` → `range-bearing-calculator`
- `LabelInterval` → `label-interval`

### Category assignment

Map Java packages to categories:

| Package fragment | Category |
|-----------------|----------|
| `core.actions` (styling-related) | `track/styling` |
| `core.actions` (data manipulation) | `track/manipulation` |
| `analysis` | `track/analysis` |
| `algorithms` | `track/analysis` or `spatial/geometry` |
| `sensor` | `sensor/calibration` or `sensor/analysis` |
| `export`, `clipboard` | `dataset/export` |
| `narrative` | `narrative/formatting` |

Use judgement. These are starting suggestions — create new categories if needed.

---

## Phase 2: Golden I/O Capture

> This is a **manual** phase. It requires running the legacy Java tool and
> serializing what goes in and what comes out.

### Approach A: Java capture harness (preferred)

A reusable harness template is available at
`debrief-future/docs/tool-migration/java-harness-template/`.

The pattern:

```java
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

// 1. Create input data (or load from existing test fixtures)
TrackWrapper track = TestDataFactory.createSingleTrack();
String color = "#FF0000";

// 2. Run the tool
SetTrackColor.execute(track, color);

// 3. Serialize input and output to JSON
Gson gson = new GsonBuilder().setPrettyPrinting().serializeSpecialFloatingPointValues().create();

// Input JSON — the arguments the tool received
Map<String, Object> input = Map.of(
    "type", "FeatureCollection",
    "features", List.of(trackToGeoJSON(track))  // before execution
);

// Output JSON — what the tool produced, wrapped in ToolResponse envelope
Map<String, Object> output = Map.of(
    "content", List.of(Map.of(
        "type", "resource",
        "uri", "feature://" + track.getId(),
        "mimeType", "application/geo+json",
        "text", gson.toJson(trackToGeoJSON(track)),  // after execution
        "annotations", Map.of(
            "debrief:resultType", "mutation/track/styled",
            "debrief:sourceFeatures", List.of(track.getId()),
            "debrief:label", "Set color to #FF0000 for 1 track(s)"
        )
    ))
);

// 4. Write files
writeJson(input,  "_tool-migration/tools/track/styling/set-track-color.basic.input.json");
writeJson(output, "_tool-migration/tools/track/styling/set-track-color.basic.output.json");
```

### Approach B: Manual construction

If the tool is too entangled to run in isolation, construct the golden
examples manually by reading the Java source and determining what the
output would be for a given input. This is acceptable for Low-complexity tools.

### Required examples per tool

| Complexity | Minimum examples |
|------------|-----------------|
| Low | 1 (`basic`) |
| Medium | 3 (`basic`, `edge`, `complex`) |
| High | 4+ (`basic`, `edge-1`, `edge-2`, `complex`) |

### File naming

```
{tool-name}.{case-name}.input.json
{tool-name}.{case-name}.output.json
```

Standard case names: `basic`, `empty`, `edge`, `complex`, `multi-track`, `error`

### Serialisation rules

- **Floating-point**: Full precision, no rounding (verified with epsilon 1e-9)
- **Timestamps**: ISO 8601, always UTC (`Z` suffix)
- **Collections**: Deterministic ordering (same order every run)
- **Coordinates**: `[longitude, latitude]` (GeoJSON convention)

---

## Phase 3: Specification Authoring

For each tool with golden I/O captured, write a spec.

### Spec file location

```
_tool-migration/tools/{category}/{tool-name}.1.0.md
```

### Template (all 9 sections required)

Every spec must follow this exact structure. **Do not omit sections.**

````markdown
---
name: {tool-name}
version: 1.0
category: {category}
status: draft
migrated_from: {fully.qualified.JavaClassName}
---

# {Tool Display Name}

> One-line description of what the tool does.

## MCP

**Description**: A concise (1-2 sentence) description optimized for LLM
understanding. Focus on what the tool does, not how.

**When to use**: Guidance on when this tool is appropriate. Describe the
user intent or scenario.

**Parameters**:
- `param1`: Brief description
- `param2`: Brief description

**Returns**: Brief description of what the tool returns.

## Inputs

**Schema**: `shared/schemas/src/linkml/{schema}.yaml#{Class}`

**Constraints**:
- Constraint 1 (validation rules beyond schema)
- Constraint 2

**Defaults**:
- `optional_param`: default value

## Outputs

Tools return a **ToolResponse** containing one or more content items with
Debrief annotations.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

### Result Type Path

**Format**: `{top_type}/{domain}/{specific_type}`

| Top Type | When to Use |
|----------|-------------|
| `mutation` | Modifying existing features |
| `addition` | Creating new derived features |
| `deletion` | Removing features |
| `artifact` | Producing non-GeoJSON output (files, reports) |

### Naming Convention

The `result_subtype` (`{domain}/{specific_type}`) MUST:
1. Use underscores, not hyphens: `range_bearing` not `range-bearing`
2. Lowercase only
3. Two segments required: `analysis/cpa_point` not just `cpa_point`
4. Match pattern: `^[a-z_]+/[a-z_]+$`

### Annotations

Required on each content item:
- `debrief:resultType`: Full type path
- `debrief:sourceFeatures`: IDs of input features used
- `debrief:label`: Human-readable description

## Algorithm

```pseudocode
FUNCTION {tool_name}(input: InputType, options: OptionsType) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Process features
    modified_features = empty list
    source_ids = empty list

    FOR EACH feature IN input.features:
        source_ids.append(feature.id)

        // Apply transformation
        IF condition:
            processed = transform(feature)
            modified_features.append(processed)
        END IF
    END FOR

    // Build response
    content_items = build_mutation(
        features: modified_features,
        result_subtype: "domain/specific_type",
        source_feature_ids: source_ids,
        label: "Applied {action} to {n} feature(s)"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Response Builder Functions

| Function | Result Type | Use When |
|----------|-------------|----------|
| `build_mutation(features, subtype, sources, label)` | `mutation/*` | Modifying existing features |
| `build_addition(features, subtype, sources, label)` | `addition/*` | Creating new features |
| `build_deletion(deleted_ids, subtype, sources, label)` | `deletion/*` | Removing features |
| `build_artifact(data, mime, subtype, sources, label, href)` | `artifact/*` | Producing files |
| `build_error(message, category, affected_ids)` | Error | Reporting failures |

### Pseudocode Style Guide

**Keywords**: `FUNCTION`, `END FUNCTION`, `FOR EACH`, `END FOR`, `IF`,
`ELSE`, `ELSE IF`, `END IF`, `WHILE`, `END WHILE`, `RETURN`

**Operators**: `IN`, `IS NULL`, `IS NOT NULL`, `IS EMPTY`, `AND`, `OR`, `NOT`

**Types**: Use schema class names (`FeatureCollection`, `TrackFeature`,
`ToolResponse`)

**Comments**: `//` for inline comments

**No implementation details**: No Java, Python, or TypeScript syntax.
No language-specific APIs or libraries.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty input collection | Return error: `invalid_input` |
| Invalid input type | Return error: `invalid_input` |
| Missing required property | Return error specifying the missing property |
| Null optional value | Use default value |
| No matching features | Return error or empty content array |

## Examples

### Basic Example

**Input**: (inline JSON or reference to golden file)

**Output**: (inline JSON or reference to golden file)

### Golden Example Files

- Input: `{tool-name}.basic.input.json`
- Output: `{tool-name}.basic.output.json`

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "Description of what went wrong",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": []
    }
  }
}
```

## Changelog

### 1.0 ({YYYY-MM-DD})
- Initial migration from Legacy Debrief

## References

**Related Tools**:
- [related-tool](./related-tool.1.0.md) - Relationship description

**Schemas**:
- [SchemaClass](../../schemas/src/linkml/schema.yaml) - Schema used

**Legacy**:
- Debrief 3.x: `{fully.qualified.JavaClassName}`

**External**:
- [External Reference](https://example.com) - Relevant standard
````

---

## Phase 4: Validation Checklist

Before considering any tool spec **complete**, verify:

- [ ] Spec file exists at `_tool-migration/tools/{category}/{tool-name}.1.0.md`
- [ ] YAML frontmatter has `name`, `version`, `category`, `status`, `migrated_from`
- [ ] All 9 sections are present with non-placeholder content
- [ ] MCP section is clear enough for an LLM to decide when to invoke the tool
- [ ] Algorithm pseudocode uses only approved keywords (no Java/Python/TS syntax)
- [ ] Response builder functions used correctly (`build_mutation`, etc.)
- [ ] Result subtype matches pattern `^[a-z_]+/[a-z_]+$` (underscores, not hyphens)
- [ ] At least one golden example pair exists and is referenced
- [ ] Edge cases table has at least 5 entries
- [ ] `migrated_from` metadata references the legacy Java class
- [ ] Changelog records version 1.0 with today's date

---

## Reference: Existing Tool Specs

Four tools have already been migrated and can be used as reference. They live
in `debrief-future/shared/tools/track/styling/`:

| Spec file | Tool | What it does |
|-----------|------|--------------|
| `set-track-color.1.0.md` | set-track-color | Sets track display colour |
| `apply-symbol-style.1.0.md` | apply-symbol-style | Configures position marker symbols |
| `label-interval.1.0.md` | label-interval | Sets label display interval (ISO 8601) |
| `symbol-interval.1.0.md` | symbol-interval | Sets symbol display interval (ISO 8601) |

If you have access to the `debrief-future` repo, read these before authoring
new specs to match tone, detail level, and structure.

---

## Reference: ToolResponse Envelope

Every tool returns this structure:

```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://{feature-id}",
      "mimeType": "application/geo+json",
      "text": "{serialized GeoJSON Feature}",
      "annotations": {
        "debrief:resultType": "mutation/track/styled",
        "debrief:sourceFeatures": ["input-feature-id"],
        "debrief:label": "Human-readable description"
      }
    }
  ]
}
```

Error responses:

```json
{
  "error": {
    "code": -32000,
    "message": "Description of what went wrong",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": []
    }
  }
}
```

---

## Workflow summary

```
┌─────────────────────────────────────────────────────────┐
│ PHASE 1: DISCOVER                                       │
│                                                         │
│ Scan Java source → identify tool classes →              │
│ assess complexity → write discovery-report.md           │
└───────────────────────┬─────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│ PHASE 2: CAPTURE GOLDEN I/O                             │
│                                                         │
│ For each Ready tool → construct input data →            │
│ run Java tool → serialize input + output as JSON        │
└───────────────────────┬─────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│ PHASE 3: AUTHOR SPECS                                   │
│                                                         │
│ For each tool with golden I/O → read Java source →      │
│ extract algorithm as pseudocode → write 9-section spec  │
└───────────────────────┬─────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│ PHASE 4: VALIDATE                                       │
│                                                         │
│ Check each spec against the validation checklist →      │
│ flag incomplete specs → update discovery report status  │
└─────────────────────────────────────────────────────────┘
                        ▼
           Outputs ready in _tool-migration/
           Copy to debrief-future/shared/tools/
```

---

## Priority order

1. **Low-complexity tools first** — build confidence in the process.
2. **Within a category** — batch related tools (all `track/styling`, then `track/analysis`).
3. **High-complexity tools last** — may need manual pseudocode or domain expert input.
4. **Out of Scope** — document why, but do not spec.
