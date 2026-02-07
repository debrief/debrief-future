# Usage Example — Walkthrough of a Completed Tool Spec with Golden I/O

**Feature**: 001-document-debrief-algorithms
**Date**: 2026-02-07

## Overview

This walkthrough demonstrates the complete pipeline for a single tool: **group-tracks** (track/manipulation, Low complexity). It shows how the discovery report entry, golden I/O pair, and 9-section specification work together.

## Step 1: Discovery Report Entry

From the discovery report, the tool entry looks like:

| Tool Name | Java Class | Category | Complexity | Trigger | Status |
|-----------|-----------|----------|------------|---------|--------|
| group-tracks | `GroupTracks` | track/manipulation | Low | context-menu | Ready |

**Package**: `org.mwc.debrief.core.ContextOperations`
**Pattern**: `RightClickContextItemGenerator` + inner `CMAPOperation`
**Selection**: 2+ tracks
**UI**: None (direct action)

## Step 2: Java Source Analysis

The Java source at `org.mwc.debrief.core.ContextOperations.GroupTracks`:

1. **Trigger**: `generate()` method checks for 2+ `TrackWrapper` subjects
2. **Core Algorithm**: `TrackWrapper.groupTracks(wrapper, layers, parents, subjects)`
3. **Input**: Multiple `TrackWrapper` objects, sorted by start time
4. **Output**: First track becomes the target, all others are merged as segments
5. **Side Effects**: Calls `_layers.fireExtended()` to update UI

## Step 3: Golden I/O Construction (Manual — Approach B)

Since the tool can't run in isolation (Eclipse RCP coupling), we manually construct the golden I/O:

### Input (`group-tracks.basic.input.json`)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "track-ownship",
      "geometry": {
        "type": "LineString",
        "coordinates": [[-1.0, 50.0], [-1.02, 50.01]]
      },
      "properties": {
        "debrief:kind": "track",
        "debrief:platform_name": "OWNSHIP",
        "debrief:start_time": "2024-06-15T10:00:00Z",
        "debrief:end_time": "2024-06-15T10:05:00Z",
        "debrief:positions": [
          {"time": "2024-06-15T10:00:00Z", "coordinates": [-1.0, 50.0], "course": 225.0, "speed": 10.0},
          {"time": "2024-06-15T10:05:00Z", "coordinates": [-1.02, 50.01], "course": 225.0, "speed": 10.0}
        ]
      }
    },
    {
      "type": "Feature",
      "id": "track-target1",
      "geometry": {
        "type": "LineString",
        "coordinates": [[-0.95, 50.05], [-0.93, 50.03]]
      },
      "properties": {
        "debrief:kind": "track",
        "debrief:platform_name": "TARGET-1",
        "debrief:start_time": "2024-06-15T10:10:00Z",
        "debrief:end_time": "2024-06-15T10:15:00Z",
        "debrief:positions": [
          {"time": "2024-06-15T10:10:00Z", "coordinates": [-0.95, 50.05], "course": 45.0, "speed": 8.0},
          {"time": "2024-06-15T10:15:00Z", "coordinates": [-0.93, 50.03], "course": 45.0, "speed": 8.0}
        ]
      }
    }
  ],
  "properties": {
    "tool": "group-tracks",
    "params": {}
  }
}
```

### Output (`group-tracks.basic.output.json`)

```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://track-ownship",
      "mimeType": "application/geo+json",
      "text": "{\"type\":\"Feature\",\"id\":\"track-ownship\",\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[-1.0,50.0],[-1.02,50.01],[-0.95,50.05],[-0.93,50.03]]},\"properties\":{\"debrief:kind\":\"track\",\"debrief:platform_name\":\"OWNSHIP\",\"debrief:start_time\":\"2024-06-15T10:00:00Z\",\"debrief:end_time\":\"2024-06-15T10:15:00Z\",\"debrief:segments\":[{\"name\":\"OWNSHIP\",\"start_time\":\"2024-06-15T10:00:00Z\",\"end_time\":\"2024-06-15T10:05:00Z\"},{\"name\":\"TARGET-1\",\"start_time\":\"2024-06-15T10:10:00Z\",\"end_time\":\"2024-06-15T10:15:00Z\"}]}}",
      "annotations": {
        "debrief:resultType": "mutation/track/grouped",
        "debrief:sourceFeatures": ["track-ownship", "track-target1"],
        "debrief:label": "Grouped 2 tracks into OWNSHIP"
      }
    }
  ]
}
```

## Step 4: Spec Authoring

The spec follows the 9-section TEMPLATE.md structure:

1. **YAML Frontmatter**: name, version, category, status, migrated_from
2. **MCP**: Clear description for LLM tool selection
3. **Inputs**: Schema reference, constraints, defaults
4. **Outputs**: Result type path, content items, annotations
5. **Algorithm**: Pseudocode using approved keywords only
6. **Edge Cases**: 7 scenarios with expected behaviors
7. **Examples**: Inline JSON + golden file references
8. **Changelog**: Version 1.0 with date
9. **References**: Legacy class, related tools, schemas

## Step 5: Validation

Run the 11-item checklist. All items pass → tool marked as **Spec-Complete** in the discovery report.

## Key Decisions in This Example

- **Manual construction**: Chosen because GroupTracks depends on Eclipse `CorePlugin.run()` and `Layers.fireExtended()`
- **Result type**: `mutation/track/grouped` — a mutation (modifies existing feature), subtype track/grouped
- **Sorting**: Tracks sorted by start time, matching the Java `Collections.sort()` in the source
- **Overlap check**: Added as an edge case — the Java source doesn't explicitly validate this but it's a logical constraint
