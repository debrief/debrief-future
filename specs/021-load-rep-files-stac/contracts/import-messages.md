# Import Messages Contract

**Feature**: 021-load-rep-files-stac
**Date**: 2026-01-23

## Webview → Extension Host

### repFileDrop

Triggered when user drops file(s) onto the map webview.

```json
{
  "type": "repFileDrop",
  "uris": ["file:///path/to/track.rep"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `"repFileDrop"` | Yes | Message discriminator |
| uris | `string[]` | Yes | File URIs from dataTransfer (only first used) |

**Validation**:
- Must contain at least one URI
- URI must start with `file://`
- URI must end with `.rep` (case-insensitive)

**Response**: Extension sends `importProgress` messages back to webview.

---

## Extension Host → Webview

### importProgress

Progress updates during import operation.

```json
{
  "type": "importProgress",
  "stage": "parsing",
  "message": "Parsing track.rep..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `"importProgress"` | Yes | Message discriminator |
| stage | `"parsing" \| "storing" \| "complete" \| "error"` | Yes | Current stage |
| message | `string` | No | Human-readable status |

**Stage Progression**:
1. `parsing` - Reading and parsing REP file
2. `storing` - Writing asset and features to STAC
3. `complete` - Import finished successfully
4. `error` - Import failed (see `importError`)

---

### importComplete

Sent after successful import.

```json
{
  "type": "importComplete",
  "featureCount": 3,
  "bounds": [-21.6, 21.8, -20.5, 22.1]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `"importComplete"` | Yes | Message discriminator |
| featureCount | `number` | Yes | Number of features imported |
| bounds | `[number, number, number, number] \| null` | Yes | Bounding box [minLon, minLat, maxLon, maxLat] |

**Webview Action**: Call `map.fitBounds()` if bounds provided.

---

### importError

Sent when import fails.

```json
{
  "type": "importError",
  "errorCode": "PARSE_ERROR",
  "message": "Invalid coordinate at line 15",
  "details": {
    "lineNumber": 15,
    "field": "latitude"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `"importError"` | Yes | Message discriminator |
| errorCode | `string` | Yes | Machine-readable error code |
| message | `string` | Yes | Human-readable error message |
| details | `object` | No | Additional error context |

**Error Codes**:
- `DUPLICATE_FILE` - File already imported to this plot
- `PARSE_ERROR` - REP file parsing failed
- `STORAGE_ERROR` - STAC storage operation failed
- `FILE_NOT_FOUND` - Source file does not exist
- `INVALID_FILE_TYPE` - File is not a .rep file

---

### duplicateWarning

Sent when duplicate file detected, awaiting user confirmation.

```json
{
  "type": "duplicateWarning",
  "filename": "track.rep",
  "existingAssetKey": "source-track"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `"duplicateWarning"` | Yes | Message discriminator |
| filename | `string` | Yes | Name of duplicate file |
| existingAssetKey | `string` | Yes | Existing asset key in plot |

**Webview Action**: Display warning; user must confirm to proceed.

---

## Extension Host Internal Commands

### debrief.importRep

Command triggered by context menu or programmatically.

```typescript
interface ImportRepArgs {
  uri?: vscode.Uri;  // File URI if from context menu
  catalogPath?: string;  // Pre-selected catalog (for drag-drop)
  plotId?: string;  // Pre-selected plot (for drag-drop)
}
```

**Behavior**:
- If `uri` provided without catalog/plot: Show picker
- If all three provided: Import directly (drag-drop case)
- If none provided: Show file picker first

---

## JSON-RPC to Python Services

### debrief-io: parse_file

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "parse_file",
  "params": {
    "file_path": "/absolute/path/to/track.rep"
  }
}
```

**Response (success)**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "features": [/* GeoJSON Feature objects */],
    "metadata": {
      "parser": "Debrief REP Format",
      "version": "0.1.0",
      "timestamp": "2026-01-23T10:00:00Z",
      "source_hash": "abc123..."
    }
  }
}
```

**Response (error)**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32002,
    "message": "ParseError: Invalid coordinate",
    "data": {
      "line_number": 15,
      "field": "latitude"
    }
  }
}
```

---

### debrief-stac: copy_asset

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "copy_asset",
  "params": {
    "store_path": "/path/to/catalog",
    "plot_id": "plot-001",
    "source_path": "/path/to/track.rep",
    "asset_role": "source"
  }
}
```

---

### debrief-stac: add_features

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "add_features",
  "params": {
    "store_path": "/path/to/catalog",
    "plot_id": "plot-001",
    "features": [/* GeoJSON Feature objects */],
    "provenance": {
      "source_path": "/path/to/track.rep",
      "timestamp": "2026-01-23T10:00:00Z"
    }
  }
}
```
