# Data Model: Load Existing Result Files

**Feature**: 051-load-result-attachments
**Date**: 2026-02-05

## Existing Types (No Changes Required)

### AssociatedFile

Already defined in `shared/components/src/LayersToolbar/types.ts`:

```typescript
export interface AssociatedFile {
  /** Display name */
  name: string;
  /** Path relative to STAC item */
  path: string;
  /** Source or result */
  category: 'source' | 'result';
  /** Parsed from multi-suffix convention (e.g., '2d', 'table') */
  viewerType?: string;
  /** File format (e.g., 'json', 'geojson', 'csv') */
  format?: string;
}
```

### STAC Asset Structure

Existing structure in STAC item.json files:

```typescript
interface StacAsset {
  href: string;              // e.g., "./assets/range-bearing-result.json"
  type: string;              // e.g., "application/json"
  title?: string;            // Display name
  roles?: string[];          // ["result"] for tool outputs
  "debrief:toolId"?: string; // Tool that generated the result
  "debrief:sourceFeatures"?: string[]; // Source features used
}
```

## New Types

### ResultAssetFilter (Internal)

Used internally by the extraction method:

```typescript
interface ResultAssetFilter {
  /** Include assets with 'result' role */
  includeResultRole: boolean;
  /** Filename patterns to match (glob-style) */
  filenamePatterns?: string[];
  /** Exclude assets with these roles */
  excludeRoles?: string[];
}
```

### ExtractedResultFile (Internal)

Intermediate representation before transformation to AssociatedFile:

```typescript
interface ExtractedResultFile {
  /** Asset key from STAC item */
  assetKey: string;
  /** Resolved file path */
  filePath: string;
  /** Display name (from title or derived from filename) */
  displayName: string;
  /** Tool ID if available */
  toolId?: string;
  /** Source features if available */
  sourceFeatures?: string[];
  /** File modification time for sorting */
  modifiedTime?: Date;
}
```

## Entity Relationships

```
┌─────────────────────┐
│    STAC Catalog     │
│  (debrief.store)    │
└─────────┬───────────┘
          │ contains
          ▼
┌─────────────────────┐
│     STAC Item       │
│      (plot)         │
│  - id, properties   │
│  - assets{}         │
└─────────┬───────────┘
          │ has many
          ▼
┌─────────────────────┐      transforms      ┌─────────────────────┐
│     STAC Asset      │  ─────────────────▶  │   AssociatedFile    │
│  - href             │                      │  - name             │
│  - type             │                      │  - path             │
│  - roles[]          │                      │  - category         │
│  - debrief:toolId   │                      │  - viewerType       │
│  - debrief:source.. │                      │  - format           │
└─────────────────────┘                      └─────────────────────┘
```

## State Transitions

### Result File Lifecycle

```
┌──────────────┐
│  NOT EXISTS  │  (no result files in plot)
└──────┬───────┘
       │ tool execution
       ▼
┌──────────────┐
│   CREATED    │  (saved to assets/, added to item.json)
└──────┬───────┘
       │ session ends
       ▼
┌──────────────┐
│  PERSISTED   │  (exists on disk, not in memory)
└──────┬───────┘
       │ plot reopened
       ▼
┌──────────────┐
│   LOADED     │  (extracted from STAC, displayed in UI)
└──────────────┘
```

## Validation Rules

### STAC Asset Validation

1. `href` MUST be a valid relative path
2. `roles` array SHOULD contain `"result"` for tool outputs
3. `debrief:toolId` SHOULD match a known tool identifier
4. `type` SHOULD be a valid MIME type

### AssociatedFile Validation

1. `name` MUST be non-empty string
2. `path` MUST be valid relative path from item location
3. `category` MUST be either `'source'` or `'result'`
4. `format` SHOULD be lowercase file extension without dot
