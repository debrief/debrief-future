# Migration Demonstration: SetTrackColor Tool

This document demonstrates the complete migration of a hypothetical `SetTrackColor` tool from Legacy Debrief Java to Future Debrief Python and TypeScript.

## Tool Overview

**Name**: set-track-color
**Category**: format
**Purpose**: Apply a color to a track for visual differentiation

### Original Java Implementation

```java
// org.mwc.debrief.core.tools.SetTrackColor.java
public class SetTrackColor implements ITool {
    @Override
    public Track execute(Track track, Map<String, Object> params) {
        String color = (String) params.get("color");
        if (color == null || !isValidHexColor(color)) {
            throw new IllegalArgumentException("Invalid color: " + color);
        }
        Track result = track.clone();
        result.setColor(Color.decode(color));
        return result;
    }

    private boolean isValidHexColor(String color) {
        return color.matches("^#[0-9A-Fa-f]{6}$");
    }
}
```

## Step 1: Discovery

The `/tool.discover` command identifies this tool in the codebase:

```
Tool: set-track-color
Class: org.mwc.debrief.core.tools.SetTrackColor
Category: format (modifies track appearance)
Complexity: Low (single property change)
Dependencies: None (standalone)
```

## Step 2: Specification

The `/tool.spec` command produces:

```markdown
# Tool Specification: set-track-color

**Version**: v1
**Category**: format
**Last Updated**: 2026-02-05

## Overview

Apply a hex color value to a track's stroke property for visual differentiation
in map displays.

## Algorithm

1. Validate color is 6-digit hex format (#RRGGBB)
2. If invalid, return error
3. Clone input track to avoid mutation
4. Set stroke property to new color
5. Return modified track

## Input Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| track | GeoJSON Feature | Yes | Track to colorize |
| parameters.color | string | Yes | Hex color (#RRGGBB) |

## Output Schema

Returns modified GeoJSON Feature with `properties.stroke` set to the color.

## Edge Cases

| Case | Behavior |
|------|----------|
| Invalid color format | Return error object |
| Empty track | Apply color, return empty track |
| Track already has color | Overwrite with new color |
```

## Step 3: Golden I/O Capture

Using the Java harness:

### basic.input.json
```json
{
  "track": {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [[0, 0], [1, 1], [2, 0.5]]
    },
    "properties": {
      "name": "Track1",
      "stroke": "#0000FF"
    }
  },
  "parameters": {
    "color": "#FF0000"
  }
}
```

### basic.output.json
```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [[0, 0], [1, 1], [2, 0.5]]
  },
  "properties": {
    "name": "Track1",
    "stroke": "#FF0000"
  }
}
```

## Step 4: Implementation

### Python (generated)

```python
# services/debrief-calc/src/debrief_calc/tools/format/set_track_color.py
"""
Set Track Color Tool

Apply a hex color to a track's stroke property.
Spec: shared/tools/format/set-track-color.v1.md
"""

import re
import copy
from typing import Any


def set_track_color(track: dict[str, Any], parameters: dict[str, Any]) -> dict[str, Any]:
    """Apply color to track.

    Args:
        track: GeoJSON Feature representing the track
        parameters: Dict containing 'color' (hex format #RRGGBB)

    Returns:
        Modified GeoJSON Feature with updated stroke property

    Raises:
        ValueError: If color format is invalid
    """
    color = parameters.get("color")

    # Validate hex color format
    if not color or not re.match(r"^#[0-9A-Fa-f]{6}$", color):
        raise ValueError(f"Invalid color format: {color}")

    # Clone to avoid mutation
    result = copy.deepcopy(track)

    # Apply color
    if "properties" not in result:
        result["properties"] = {}
    result["properties"]["stroke"] = color

    return result
```

### TypeScript (generated)

```typescript
// apps/vscode/src/tools/format/setTrackColor.ts
/**
 * Set Track Color Tool
 *
 * Apply a hex color to a track's stroke property.
 * Spec: shared/tools/format/set-track-color.v1.md
 */

import type { Feature, LineString } from 'geojson';

interface SetTrackColorParams {
  color: string;
}

interface TrackProperties {
  name?: string;
  stroke?: string;
  [key: string]: unknown;
}

type TrackFeature = Feature<LineString, TrackProperties>;

/**
 * Apply color to track.
 *
 * @param track - GeoJSON Feature representing the track
 * @param parameters - Object containing 'color' (hex format #RRGGBB)
 * @returns Modified GeoJSON Feature with updated stroke property
 * @throws Error if color format is invalid
 */
export function setTrackColor(
  track: TrackFeature,
  parameters: SetTrackColorParams
): TrackFeature {
  const { color } = parameters;

  // Validate hex color format
  if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new Error(`Invalid color format: ${color}`);
  }

  // Clone to avoid mutation
  const result: TrackFeature = JSON.parse(JSON.stringify(track));

  // Apply color
  if (!result.properties) {
    result.properties = {};
  }
  result.properties.stroke = color;

  return result;
}
```

## Step 5: Verification

The `/tool.verify` command confirms correctness:

```
# Verification Report: set-track-color

**Epsilon**: 1e-9
**Examples Tested**: 2

## Results

| Example | Python | TypeScript | Cross-Check | Status |
|---------|--------|------------|-------------|--------|
| basic | PASS | PASS | MATCH | PASS |
| empty | PASS | PASS | MATCH | PASS |

**Overall**: PASS ✓
```

## Migration Complete

The tool has been successfully migrated:

| Artifact | Location | Status |
|----------|----------|--------|
| Specification | `shared/tools/format/set-track-color.v1.md` | ✓ |
| Golden Examples | `shared/tools/format/set-track-color.*.json` | ✓ |
| Python Implementation | `services/debrief-calc/.../set_track_color.py` | ✓ |
| TypeScript Implementation | `apps/vscode/.../setTrackColor.ts` | ✓ |
| Verification | All tests pass | ✓ |

## Lessons Learned

1. **Clone before modify**: Both implementations must clone input to avoid mutation
2. **Regex matching**: Use language-appropriate regex for validation
3. **Property initialization**: Handle missing `properties` object gracefully
4. **Type safety**: TypeScript benefits from explicit interface definitions
