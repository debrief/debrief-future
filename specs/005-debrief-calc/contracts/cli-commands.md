# CLI Commands Contract: debrief-cli

**Version**: 1.0.0
**Date**: 2026-01-15
**Command**: `debrief-cli`

## Overview

The `debrief-cli` command provides unified access to the Debrief service ecosystem from the command line.

---

## Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON instead of human-readable |
| `--help` | Show help for command |
| `--version` | Show version |

---

## Command Groups

### tools — Analysis Tool Operations

#### `tools list`

List available analysis tools.

```bash
debrief-cli tools list [OPTIONS]
```

**Options**:
| Option | Description |
|--------|-------------|
| `--input FILE` | Filter by applicable tools for this GeoJSON file |
| `--store NAME` | STAC store name (requires --item) |
| `--item ID` | STAC item ID (can be repeated) |
| `--json` | Output as JSON |

**Examples**:
```bash
# List all tools
debrief-cli tools list

# List tools applicable to a track file
debrief-cli tools list --input track.geojson

# List tools for a STAC item
debrief-cli tools list --store my-catalog --item track-001
```

**Human Output**:
```
Available Tools:
  track-stats     Calculate statistics for a single track      [track] → analysis-result
  range-bearing   Compute range and bearing between tracks     [track] → bearing
  area-summary    Summarize features within a region           [zone] → analysis-result
```

**JSON Output**:
```json
{
  "tools": [
    {"name": "track-stats", "description": "...", "input_kinds": ["track"], "output_kind": "analysis-result"}
  ]
}
```

---

#### `tools describe`

Show detailed metadata for a tool.

```bash
debrief-cli tools describe TOOL [OPTIONS]
```

**Arguments**:
| Argument | Description |
|----------|-------------|
| `TOOL` | Tool name |

**Examples**:
```bash
debrief-cli tools describe track-stats
debrief-cli tools describe track-stats --json
```

**Human Output**:
```
Tool: track-stats
Version: 1.0.0
Description: Calculate statistics for a single track

Input Kinds: track
Output Kind: analysis-result
Context: single (exactly one feature)

Parameters:
  include_segments  boolean  Include per-segment stats  (default: false)
```

---

#### `tools run`

Execute an analysis tool.

```bash
debrief-cli tools run TOOL [OPTIONS]
```

**Arguments**:
| Argument | Description |
|----------|-------------|
| `TOOL` | Tool name to execute |

**Options**:
| Option | Description |
|--------|-------------|
| `--input FILE` | Input GeoJSON file |
| `--store NAME` | STAC store name |
| `--item ID` | STAC item ID (can be repeated for multi-feature tools) |
| `--param KEY=VALUE` | Tool parameter (can be repeated) |
| `--json` | Output as JSON |

**Examples**:
```bash
# Run on a file
debrief-cli tools run track-stats --input track.geojson

# Run on STAC items
debrief-cli tools run range-bearing --store my-catalog --item track-001 --item track-002

# With parameters
debrief-cli tools run track-stats --input track.geojson --param include_segments=true
```

**Human Output** (stdout is the GeoJSON result):
```json
{"type": "Feature", "properties": {"kind": "analysis-result", ...}, "geometry": {...}}
```

**Stderr** (progress/status):
```
Tool: track-stats
Status: Success (150ms)
Output: 1 feature (analysis-result)
```

---

### validate — Schema Validation

```bash
debrief-cli validate FILE [OPTIONS]
```

**Arguments**:
| Argument | Description |
|----------|-------------|
| `FILE` | GeoJSON file to validate |

**Options**:
| Option | Description |
|--------|-------------|
| `--store NAME` | STAC store name (alternative to FILE) |
| `--item ID` | STAC item ID |
| `--json` | Output as JSON |

**Examples**:
```bash
debrief-cli validate track.geojson
debrief-cli validate --store my-catalog --item track-001
```

**Human Output (valid)**:
```
✓ Valid GeoJSON
  Type: Feature
  Kind: track
  Geometry: LineString (1247 points)
```

**Human Output (invalid)**:
```
✗ Invalid GeoJSON
  Error: Missing required property 'kind' in properties
  Path: $.properties.kind
```

**Exit Codes**:
| Code | Meaning |
|------|---------|
| 0 | Valid |
| 3 | Validation failed |

---

### catalog — STAC Catalog Operations

#### `catalog stores`

List available STAC stores.

```bash
debrief-cli catalog stores [OPTIONS]
```

**Human Output**:
```
Available Stores:
  my-catalog     /home/user/.local/share/debrief/catalogs/my-catalog
  project-data   /path/to/project/stac
```

---

#### `catalog list`

List items in a STAC store.

```bash
debrief-cli catalog list --store NAME [OPTIONS]
```

**Options**:
| Option | Description |
|--------|-------------|
| `--store NAME` | STAC store name (required) |
| `--kind KIND` | Filter by feature kind |
| `--json` | Output as JSON |

**Human Output**:
```
Items in 'my-catalog':
  track-001     track        2026-01-10  HMS Example track data
  track-002     track        2026-01-11  USS Sample track
  zone-001      zone         2026-01-12  Exercise area boundary
```

---

#### `catalog get`

Get details for a specific STAC item.

```bash
debrief-cli catalog get --store NAME --item ID [OPTIONS]
```

**Human Output**:
```
Item: track-001
Store: my-catalog
Kind: track
Created: 2026-01-10T14:30:00Z

Properties:
  platform: surface
  name: HMS Example
  point_count: 1247

Assets:
  data: track-001.geojson (application/geo+json)
```

---

## Exit Codes

| Code | Meaning | Triggered By |
|------|---------|--------------|
| 0 | Success | Operation completed |
| 1 | General error | Unexpected failure |
| 2 | Invalid arguments | Bad CLI arguments |
| 3 | Validation failed | GeoJSON validation error |
| 4 | Tool execution failed | Tool error |
| 5 | Store/item not found | STAC lookup failed |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBRIEF_CONFIG_DIR` | Override XDG config location | `~/.config/debrief` |
| `NO_COLOR` | Disable colored output | (not set) |

---

## Configuration

STAC stores are discovered from the debrief-config file at XDG location:

```json
// ~/.config/debrief/config.json
{
  "stac_stores": {
    "my-catalog": "/home/user/.local/share/debrief/catalogs/my-catalog",
    "project-data": "/path/to/project/stac"
  }
}
```
