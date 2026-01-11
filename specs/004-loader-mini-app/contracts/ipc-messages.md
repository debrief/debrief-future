# IPC Message Contracts

**Feature**: 004-loader-mini-app
**Date**: 2026-01-11
**Protocol**: JSON-RPC 2.0 over stdio

## Overview

The Loader app communicates with Python services via JSON-RPC 2.0 messages over stdin/stdout. This document defines the message contracts for each service integration.

## JSON-RPC 2.0 Base Types

```typescript
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: object;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: JsonRpcError;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}
```

---

## debrief-io Service

### `parse_file`

Parse a REP file and return GeoJSON features.

**Request**:
```typescript
{
  jsonrpc: "2.0",
  id: 1,
  method: "parse_file",
  params: {
    file_path: string;  // Absolute path to REP file
  }
}
```

**Response (success)**:
```typescript
{
  jsonrpc: "2.0",
  id: 1,
  result: {
    features: GeoJSONFeature[];  // Parsed track features
    metadata: {
      parser: string;     // Parser identifier (e.g., "rep-parser")
      version: string;    // Parser version (e.g., "1.0.0")
      timestamp: string;  // ISO 8601 parse timestamp
      source_hash: string; // SHA-256 of source file
    }
  }
}
```

**Response (error)**:
```typescript
{
  jsonrpc: "2.0",
  id: 1,
  error: {
    code: -32000,  // Application error
    message: "Parse failed",
    data: {
      line: number;     // Line number of error (if applicable)
      column: number;   // Column number (if applicable)
      details: string;  // Detailed error message
    }
  }
}
```

---

## debrief-stac Service

### `list_plots`

List all plots in a STAC store.

**Request**:
```typescript
{
  jsonrpc: "2.0",
  id: 2,
  method: "list_plots",
  params: {
    store_path: string;  // Absolute path to STAC catalog
  }
}
```

**Response (success)**:
```typescript
{
  jsonrpc: "2.0",
  id: 2,
  result: {
    plots: Array<{
      id: string;           // STAC Item ID
      name: string;         // Plot name
      description?: string; // Plot description
      created: string;      // ISO 8601 creation timestamp
      modified: string;     // ISO 8601 last modified
      feature_count: number; // Number of features
    }>
  }
}
```

### `create_plot`

Create a new plot in a STAC store.

**Request**:
```typescript
{
  jsonrpc: "2.0",
  id: 3,
  method: "create_plot",
  params: {
    store_path: string;  // Absolute path to STAC catalog
    name: string;        // Plot name
    description?: string; // Optional description
  }
}
```

**Response (success)**:
```typescript
{
  jsonrpc: "2.0",
  id: 3,
  result: {
    plot_id: string;  // Created plot ID
    name: string;     // Plot name
    created: string;  // ISO 8601 creation timestamp
  }
}
```

### `add_features`

Add features to an existing plot.

**Request**:
```typescript
{
  jsonrpc: "2.0",
  id: 4,
  method: "add_features",
  params: {
    store_path: string;         // Absolute path to STAC catalog
    plot_id: string;            // Target plot ID
    features: GeoJSONFeature[]; // Features to add
    provenance: {
      source_path: string;      // Original file path
      source_hash: string;      // SHA-256 of source file
      parser: string;           // Parser identifier
      parser_version: string;   // Parser version
      timestamp: string;        // ISO 8601 processing timestamp
    }
  }
}
```

**Response (success)**:
```typescript
{
  jsonrpc: "2.0",
  id: 4,
  result: {
    plot_id: string;        // Updated plot ID
    features_added: number; // Count of features added
    provenance_id: string;  // Provenance record ID
  }
}
```

### `copy_asset`

Copy source file to plot assets.

**Request**:
```typescript
{
  jsonrpc: "2.0",
  id: 5,
  method: "copy_asset",
  params: {
    store_path: string;    // Absolute path to STAC catalog
    plot_id: string;       // Target plot ID
    source_path: string;   // Path to source file
    asset_role: string;    // Asset role (e.g., "source-data")
  }
}
```

**Response (success)**:
```typescript
{
  jsonrpc: "2.0",
  id: 5,
  result: {
    asset_path: string;  // Path to copied asset
    asset_href: string;  // Relative href for STAC Item
  }
}
```

---

## Error Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| -32700 | Parse error | Invalid JSON received |
| -32600 | Invalid request | Malformed JSON-RPC |
| -32601 | Method not found | Unknown method name |
| -32602 | Invalid params | Missing/invalid parameters |
| -32603 | Internal error | Unexpected server error |
| -32000 | Application error | Domain-specific error (see data field) |

## Application Error Data

When code is -32000, the `data` field provides context:

```typescript
interface ApplicationErrorData {
  error_type: 'FILE_NOT_FOUND' | 'PERMISSION_DENIED' | 'PARSE_ERROR' |
              'STORE_NOT_FOUND' | 'PLOT_NOT_FOUND' | 'WRITE_ERROR' |
              'VALIDATION_ERROR';
  details: string;
  recoverable: boolean;
  suggestion?: string;
}
```

## Sequence Diagram

```
┌──────────┐     ┌───────────┐     ┌─────────────┐
│  Loader  │     │ debrief-io│     │debrief-stac │
└────┬─────┘     └─────┬─────┘     └──────┬──────┘
     │                 │                   │
     │  parse_file     │                   │
     │────────────────>│                   │
     │  {features}     │                   │
     │<────────────────│                   │
     │                 │                   │
     │                 │   create_plot     │
     │                 │   (if new)        │
     │─────────────────────────────────────>
     │                 │   {plot_id}       │
     │<─────────────────────────────────────
     │                 │                   │
     │                 │   add_features    │
     │─────────────────────────────────────>
     │                 │   {provenance_id} │
     │<─────────────────────────────────────
     │                 │                   │
     │                 │   copy_asset      │
     │─────────────────────────────────────>
     │                 │   {asset_path}    │
     │<─────────────────────────────────────
     │                 │                   │
```
