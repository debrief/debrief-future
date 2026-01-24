# JSON-RPC IPC Methods for REP Import

**Feature**: 021-load-rep-files-stac
**Protocol**: JSON-RPC 2.0 over stdio

## Overview

The VS Code extension communicates with Python services (debrief-io, debrief-stac) using JSON-RPC 2.0 over stdio. This document defines the methods required for REP file import.

## Transport

- **Protocol**: JSON-RPC 2.0
- **Transport**: stdio (stdin/stdout)
- **Encoding**: UTF-8
- **Message delimiter**: newline (`\n`)

## Methods

### `io.parse_rep`

Parse a REP file and return GeoJSON features.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "io.parse_rep",
  "params": {
    "file_path": "/path/to/track.rep"
  }
}
```

**Success Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "features": [
      {
        "type": "Feature",
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "geometry": {
          "type": "LineString",
          "coordinates": [[-4.5, 50.2], [-4.6, 50.3]]
        },
        "properties": {
          "kind": "TRACK",
          "platform_id": "S01",
          "platform_name": "HMS Defender",
          "start_time": "2026-01-24T09:00:00Z",
          "end_time": "2026-01-24T12:00:00Z"
        }
      }
    ],
    "warnings": [],
    "source_file": "track.rep",
    "parse_time_ms": 45.2,
    "handler": "REPHandler"
  }
}
```

**Error Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Parse error",
    "data": {
      "code": "INVALID_FORMAT",
      "details": "Invalid position format at line 47: expected 'YYMMDD HHMMSS'",
      "line_number": 47
    }
  }
}
```

---

### `stac.list_assets`

List all assets on a STAC item.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "stac.list_assets",
  "params": {
    "catalog_path": "/home/user/.local/share/debrief/catalogs/local",
    "plot_id": "exercise-alpha"
  }
}
```

**Success Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "assets": [
      {
        "key": "features",
        "href": "./features.geojson",
        "type": "application/geo+json",
        "title": "GeoJSON Features",
        "roles": ["data"]
      },
      {
        "key": "source-track1",
        "href": "./assets/track1.rep",
        "type": "application/x-debrief-rep",
        "title": "track1.rep",
        "roles": ["source"]
      }
    ]
  }
}
```

---

### `stac.add_asset`

Add a source file as an asset on a STAC item.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "stac.add_asset",
  "params": {
    "catalog_path": "/home/user/.local/share/debrief/catalogs/local",
    "plot_id": "exercise-alpha",
    "source_path": "/tmp/exercise_data.rep",
    "asset_key": "source-exercise_data",
    "media_type": "application/x-debrief-rep"
  }
}
```

**Success Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "asset_key": "source-exercise_data",
    "href": "./assets/exercise_data.rep"
  }
}
```

---

### `stac.add_features`

Add GeoJSON features to a STAC item's feature collection.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "stac.add_features",
  "params": {
    "catalog_path": "/home/user/.local/share/debrief/catalogs/local",
    "plot_id": "exercise-alpha",
    "features": [
      {
        "type": "Feature",
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "geometry": {
          "type": "LineString",
          "coordinates": [[-4.5, 50.2], [-4.6, 50.3]]
        },
        "properties": {
          "kind": "TRACK",
          "platform_name": "HMS Defender"
        }
      }
    ]
  }
}
```

**Success Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "feature_count": 5,
    "added_count": 1,
    "bounds": [-4.6, 50.2, -4.5, 50.3]
  }
}
```

---

### `stac.read_plot`

Read a STAC item (plot) with all metadata and assets.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "stac.read_plot",
  "params": {
    "catalog_path": "/home/user/.local/share/debrief/catalogs/local",
    "plot_id": "exercise-alpha"
  }
}
```

**Success Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "type": "Feature",
    "stac_version": "1.0.0",
    "id": "exercise-alpha",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[-5, 50], [-4, 50], [-4, 51], [-5, 51], [-5, 50]]]
    },
    "bbox": [-5, 50, -4, 51],
    "properties": {
      "title": "Exercise Alpha",
      "datetime": "2026-01-24T00:00:00Z"
    },
    "assets": {
      "features": {
        "href": "./features.geojson",
        "type": "application/geo+json",
        "roles": ["data"]
      }
    },
    "links": []
  }
}
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid request | Missing required fields |
| -32601 | Method not found | Unknown method name |
| -32602 | Invalid params | Invalid method parameters |
| -32000 | Application error | Service-level error (see data.code) |

### Application Error Codes (`data.code`)

| Code | Description |
|------|-------------|
| `FILE_NOT_FOUND` | Specified file does not exist |
| `INVALID_FORMAT` | REP file has invalid format |
| `CATALOG_NOT_FOUND` | STAC catalog path does not exist |
| `PLOT_NOT_FOUND` | Plot ID does not exist in catalog |
| `ASSET_EXISTS` | Asset with same key already exists |
| `DISK_FULL` | Insufficient disk space for operation |
| `PERMISSION_DENIED` | Insufficient permissions |

## Example Sequence

Complete REP import sequence:

```
Extension                          Python Service
    │                                    │
    │  io.parse_rep(file_path)          │
    │ ──────────────────────────────────>│
    │                                    │
    │  {features, warnings}              │
    │ <──────────────────────────────────│
    │                                    │
    │  stac.list_assets(catalog, plot)  │
    │ ──────────────────────────────────>│
    │                                    │
    │  {assets: [...]}                   │
    │ <──────────────────────────────────│
    │                                    │
    │  [Check for duplicate filename]    │
    │                                    │
    │  stac.add_asset(...)              │
    │ ──────────────────────────────────>│
    │                                    │
    │  {asset_key, href}                 │
    │ <──────────────────────────────────│
    │                                    │
    │  stac.add_features(...)           │
    │ ──────────────────────────────────>│
    │                                    │
    │  {feature_count, bounds}           │
    │ <──────────────────────────────────│
    │                                    │
```
