# Usage Example: Tool Migration Workflow

This document demonstrates the complete workflow for migrating a tool from Legacy Debrief to Future Debrief.

## Scenario

Migrate the `SetTrackColor` tool from Legacy Debrief Java to Python and TypeScript implementations.

## Step 1: Discover Tools

```
User: /tool.discover /path/to/legacy-debrief/org.mwc.debrief.core

Claude: Scanning Legacy Debrief source for migrateable tools...

# Tool Discovery Report

**Scan Date**: 2026-02-05
**Source Path**: /path/to/legacy-debrief/org.mwc.debrief.core
**Tools Found**: 12

## Discovered Tools

| Tool | Java Class | Category | Complexity |
|------|------------|----------|------------|
| set-track-color | SetTrackColor.java | format | Low |
| calculate-bearing | BearingCalculator.java | analysis | Medium |
| merge-tracks | TrackMerger.java | format | High |
| ... | ... | ... | ... |

## Recommended Migration Order

1. **set-track-color** (Low complexity, good starting point)
2. **filter-positions** (Low complexity)
3. **calculate-bearing** (Medium complexity)
...
```

## Step 2: Create Specification

```
User: /tool.spec set-track-color --java-source /path/to/SetTrackColor.java

Claude: Creating specification from Java source...

# Tool Specification Created

**Tool**: set-track-color
**Version**: v1
**Category**: format
**Location**: shared/tools/format/set-track-color.v1.md

## Summary

The specification includes:
- Algorithm extracted from Java source
- Input/output types defined
- Edge cases documented
- Golden example locations specified

## Next Steps

1. Create golden I/O examples using Java harness
2. Run `/tool.implement set-track-color` to generate code
```

## Step 3: Capture Golden I/O (Java Harness)

```java
// In Legacy Debrief test environment
ToolCaptureHarness harness = new ToolCaptureHarness("set-track-color", "format");

// Example 1: Basic
Track track = loadSampleTrack("boat1");
harness.captureInput("track", track);
harness.captureInput("parameters", Map.of("color", "#FF0000"));

Track result = SetTrackColor.execute(track, "#FF0000");
harness.captureOutput("result", result);
harness.writeGoldenFiles("basic");

// Example 2: Empty track
harness.clear();
Track emptyTrack = new Track();
harness.captureInput("track", emptyTrack);
harness.captureInput("parameters", Map.of("color", "#00FF00"));

Track emptyResult = SetTrackColor.execute(emptyTrack, "#00FF00");
harness.captureOutput("result", emptyResult);
harness.writeGoldenFiles("empty");
```

Output:
```
Wrote: shared/tools/format/set-track-color.basic.input.json
Wrote: shared/tools/format/set-track-color.basic.output.json
Wrote: shared/tools/format/set-track-color.empty.input.json
Wrote: shared/tools/format/set-track-color.empty.output.json
```

## Step 4: Generate Implementations

```
User: /tool.implement set-track-color

Claude: Generating implementations from specification...

# Implementation Generated

**Tool**: set-track-color
**Category**: format
**Spec**: shared/tools/format/set-track-color.v1.md

## Files Created

### Python
- services/debrief-calc/src/debrief_calc/tools/format/set_track_color.py
- services/debrief-calc/tests/tools/format/test_set_track_color.py

### TypeScript
- apps/vscode/src/tools/format/setTrackColor.ts
- apps/vscode/src/tools/format/setTrackColor.test.ts

## Basic Validation

| Language | Status | Notes |
|----------|--------|-------|
| Python | PASS | Syntax valid, imports resolve |
| TypeScript | PASS | Compiles without errors |

## Next Steps

1. Review the generated implementations
2. Run `/tool.verify set-track-color` for comprehensive validation
```

## Step 5: Verify Implementations

```
User: /tool.verify set-track-color

Claude: Running verification against golden examples...

# Verification Report: set-track-color

**Date**: 2026-02-05T14:30:00Z
**Epsilon**: 1e-9
**Examples Tested**: 2

## Summary

| Status | Count |
|--------|-------|
| PASS | 2 |
| FAIL | 0 |
| SKIP | 0 |

**Overall**: PASS ✓

## Results

| Example | Python | TypeScript | Cross-Check | Status |
|---------|--------|------------|-------------|--------|
| basic | PASS | PASS | MATCH | PASS |
| empty | PASS | PASS | MATCH | PASS |

## Cross-Implementation Comparison

| Example | Python vs TypeScript | Notes |
|---------|---------------------|-------|
| basic | MATCH | Identical outputs |
| empty | MATCH | Identical outputs |

All implementations verified successfully!
The tool migration is complete.
```

## Complete Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    Tool Migration Workflow                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. /tool.discover     → Find migrateable tools             │
│         ↓                                                   │
│  2. /tool.spec         → Create language-neutral spec       │
│         ↓                                                   │
│  3. Java Harness       → Capture golden I/O examples        │
│         ↓                                                   │
│  4. /tool.implement    → Generate Python & TypeScript       │
│         ↓                                                   │
│  5. /tool.verify       → Validate against golden examples   │
│         ↓                                                   │
│     ✓ Migration Complete                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Benefits

1. **Systematic**: Clear steps from discovery to verification
2. **Language-Neutral**: Spec drives both implementations
3. **Verifiable**: Golden examples ensure correctness
4. **Documented**: Every step produces traceable artifacts
