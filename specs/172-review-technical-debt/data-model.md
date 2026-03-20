# Data Model: Review Technical Debt

**Feature**: 172-review-technical-debt
**Date**: 2026-03-20

## Overview

This feature does not introduce new data entities. It consolidates existing type definitions and configuration. The "data model" here documents the canonical type locations and their shapes after consolidation.

## Canonical Type Definitions (Post-Consolidation)

### SafeFeature (replaces all GeoJSONFeature copies)

**Location**: `shared/utils/src/types.ts`
**Package**: `@debrief/utils`

```typescript
export interface SafeGeometry {
  type: string;
  coordinates: unknown;
}

export interface SafeFeature {
  type: 'Feature';
  id?: string | number;
  geometry: SafeGeometry | null;
  properties: Record<string, unknown> | null;
}

export interface SafeFeatureCollection {
  type: 'FeatureCollection';
  features: SafeFeature[];
}
```

**Migration**: All 19+ local `GeoJSONFeature` definitions replaced with `import { SafeFeature } from '@debrief/utils'`.

### TimeRange (canonical, epoch milliseconds)

**Location**: `services/session-state/src/types/temporal.ts`
**Package**: `@debrief/session-state`

```typescript
export interface TimeRange {
  start: number; // epoch milliseconds
  end: number;   // epoch milliseconds
}
```

**Converters** (new, in same package):
```typescript
export function timeRangeFromISO(start: string, end: string): TimeRange;
export function timeRangeToISO(range: TimeRange): { start: string; end: string };
export function timeRangeFromMinMax(min: number, max: number): TimeRange;
```

### MCPToolDefinition (moved to shared package)

**Location**: `shared/utils/src/types.ts` (or new file `shared/utils/src/mcp-types.ts`)
**Package**: `@debrief/utils`

```typescript
export interface MCPSelectionRequirement {
  // ... existing shape preserved
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown> };
  annotations: {
    'debrief:selectionRequirements': MCPSelectionRequirement[];
    'debrief:category': string;
    'debrief:version': string;
    'debrief:outputKind': string;
  };
}

export interface MCPToolResponse { /* existing shape */ }
export interface MCPContentItem { /* existing shape */ }
export interface DebriefAnnotations { /* existing shape */ }
```

### Bounds (already canonical)

**Location**: `shared/utils/src/types.ts`
**Package**: `@debrief/utils`

```typescript
export type Bounds = [number, number, number, number]; // [west, south, east, north]
```

**Note**: The only duplicate is in a spec contract file (`specs/130-*/contracts/`), which is documentation, not production code. No migration needed.

## Configuration Entities (Post-Alignment)

### Dependency Version Registry

Not a code entity — this is the set of version constraints that must be consistent:

| Dependency | Canonical Version | Source of Truth |
|---|---|---|
| `@storybook/*` | `^8.4.0` | `shared/components/package.json` |
| `@typescript-eslint/*` | `^6.21.0` | `shared/components/package.json` |
| `eslint` | `^8.57.1` | `shared/components/package.json` |
| `pydantic` | `>=2.12.5` | Root `pyproject.toml` |
| `ruff` | `>=0.8.0` | Root `pyproject.toml` |

### Python Workspace Membership

| Service | uv workspace | ruff known-first-party |
|---|---|---|
| `debrief-schemas` | Yes | Yes |
| `debrief-stac` | Yes | Yes |
| `debrief-io` | Yes | Yes |
| `debrief-config` | Yes | Yes |
| `debrief-calc` | Yes | Yes |
| `debrief-cli` | Yes | **Add** |
| `debrief-tools` | **Add** | Yes |
| `debrief-session` | **Add** | Yes |
