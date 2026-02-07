# Quickstart: Tool Migration Workflow

**Feature**: 050-tool-migration-workflow
**Date**: 2026-02-05

## Overview

This guide walks through migrating a tool from Legacy Debrief (Java/Eclipse RCP) to Future Debrief using the four-command workflow.

## Prerequisites

- Access to Legacy Debrief Java source code
- Ability to run Legacy Debrief (for capturing golden I/O)
- Familiarity with feature 049's tool documentation model

## Workflow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: DISCOVER                                                 │
│ /tool.discover /path/to/legacy-debrief/src                       │
│ → Produces: docs/tool-migration/discovery-report.md              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: CAPTURE GOLDEN I/O (Manual)                              │
│ Use Java harness template to capture input/output from legacy    │
│ → Produces: {tool-name}.{example}.input.json, .output.json       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: SPEC                                                     │
│ /tool.spec set-track-color --golden ./golden/*.json              │
│ → Produces: shared/tools/track/styling/set-track-color.1.0.md    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: IMPLEMENT                                                │
│ /tool.implement set-track-color                                  │
│ → Produces: Python + TypeScript implementations with tests       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: VERIFY                                                   │
│ /tool.verify set-track-color                                     │
│ → Produces: Verification report (PASS/FAIL per example)          │
└─────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Guide

### Step 1: Discover Tools

Run discovery to inventory all tools in the legacy codebase:

```bash
/tool.discover /path/to/legacy-debrief/src
```

**What it does**:
- Scans Java source for tool implementations
- Identifies tool categories (styling, analysis, measurement, etc.)
- Estimates migration complexity
- Produces a discovery report

**Output**: `docs/tool-migration/discovery-report.md`

**Example output**:
```markdown
| Name | Category | Java Class | Complexity | Description |
|------|----------|------------|------------|-------------|
| set-track-color | track/styling | o.m.d.core.actions.SetTrackColor | Low | Sets track color |
| label-interval | track/styling | o.m.d.core.actions.LabelInterval | Low | Sets label frequency |
| cpa-analysis | track/analysis | o.m.cmap.analysis.CPAAnalyzer | High | Calculates CPA |
```

### Step 2: Capture Golden I/O (Manual)

For each tool you want to migrate, capture input/output examples from the running Java application.

**Setup the harness**:
1. Copy `docs/tool-migration/java-harness-template/ToolCaptureHarness.java` to your test source
2. Add dependencies from `pom-fragment.xml`
3. Implement capture for your tool

**Example harness usage**:
```java
@Test
public void captureSetTrackColor() {
    // Create input
    FeatureCollection input = loadTestData("sample-tracks.json");

    // Run tool
    SetTrackColor tool = new SetTrackColor();
    FeatureCollection output = tool.execute(input, "#FF0000");

    // Export for migration
    ToolCaptureHarness.capture(
        "set-track-color",
        "basic",
        input,
        output
    );
}
```

**Output files**:
```
set-track-color.basic.input.json
set-track-color.basic.output.json
```

Place these files in `shared/tools/track/styling/`.

### Step 3: Create Specification

Generate a language-neutral specification from the Java source:

```bash
/tool.spec set-track-color --golden shared/tools/track/styling/set-track-color.*.json
```

**What it does**:
- Analyzes Java source for the tool
- Extracts algorithm logic as pseudocode
- Creates spec following TEMPLATE.md structure
- Links golden example files

**Output**: `shared/tools/track/styling/set-track-color.1.0.md`

**Review the spec**:
- Verify Algorithm section captures the logic correctly
- Check Edge Cases are comprehensive
- Ensure MCP section is clear for LLM understanding

### Step 4: Generate Implementations

Generate Python and TypeScript implementations from the spec:

```bash
/tool.implement set-track-color
```

**What it does**:
- Reads the spec and golden examples
- Generates Python implementation in `services/debrief-calc/`
- Generates TypeScript implementation in `apps/vscode/`
- Creates test files for each implementation

**Output files**:
```
services/debrief-calc/src/debrief_calc/tools/track/styling/set_track_color.py
services/debrief-calc/tests/tools/track/styling/test_set_track_color.py
apps/vscode/src/tools/track/styling/setTrackColor.ts
apps/vscode/src/tools/track/styling/setTrackColor.test.ts
```

**Options**:
- `--python-only`: Generate only Python implementation
- `--typescript-only`: Generate only TypeScript implementation

### Step 5: Verify Implementations

Run all golden examples through both implementations:

```bash
/tool.verify set-track-color
```

**What it does**:
- Loads all golden example pairs for the tool
- Runs input through Python implementation
- Runs input through TypeScript implementation
- Compares outputs against expected results
- Produces verification report

**Output**: Verification report showing pass/fail per example

**Example report**:
```markdown
# Verification Report: set-track-color

| Example | Python | TypeScript | Status |
|---------|--------|------------|--------|
| basic   | PASS   | PASS       | PASS   |
| empty   | PASS   | PASS       | PASS   |

Overall: PASS
```

**If verification fails**:
1. Review the failure details showing expected vs actual
2. Fix the implementation
3. Re-run verification

## Complete Example: Migrating set-track-color

```bash
# 1. Discover all tools
/tool.discover /home/user/legacy-debrief/src

# 2. Capture golden I/O (manual step in Legacy Debrief)
# ... produces set-track-color.basic.input.json, .output.json

# 3. Create specification
/tool.spec set-track-color --golden shared/tools/track/styling/set-track-color.*.json

# 4. Generate implementations
/tool.implement set-track-color

# 5. Verify
/tool.verify set-track-color
# Output: Overall: PASS

# 6. Commit all artifacts
git add shared/tools/ services/debrief-calc/ apps/vscode/
git commit -m "feat(tools): migrate set-track-color from legacy"
```

## Troubleshooting

### "Java source not found"

Ensure you're providing the correct path to Legacy Debrief source. The path should contain Java files with tool implementations.

### "Cannot determine algorithm"

The Java source may be too complex or obfuscated. Try:
- Providing additional context about what the tool does
- Manually writing the Algorithm section
- Breaking complex tools into smaller pieces

### "Golden example validation failed"

Ensure your captured JSON files:
- Have valid GeoJSON structure (input)
- Have valid ToolResponse structure (output)
- Match the schema requirements from data-model.md

### "Verification FAIL: floating-point difference"

Small floating-point differences may occur between implementations. If the difference is within 1e-9, it's acceptable. For larger differences, check:
- Algorithm implementation accuracy
- Coordinate system handling
- Math library differences

## Tips for Successful Migration

1. **Start with simple tools**: Begin with Low complexity tools to learn the workflow
2. **Capture multiple examples**: Include edge cases in your golden I/O
3. **Review specs carefully**: The spec is the contract - errors here propagate to implementations
4. **Test incrementally**: Verify after each tool migration before moving to the next
5. **Document quirks**: Note any legacy behavior that may be intentional vs bugs
