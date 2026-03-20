# Usage Example: Technical Debt Cleanup

## Before / After: Import Paths

### 1. GeoJSONFeature — From local definitions to @debrief/utils

**Before** (21 separate local definitions):
```typescript
// apps/vscode/src/tools/track/styling/labelInterval.ts
interface GeoJSONFeature {
  type: 'Feature';
  id?: string | number;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}

// apps/web-shell/src/tools/track/analysis/trackStats.ts
interface GeoJSONFeature {
  type: 'Feature';
  id?: string | number;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}
// ... repeated 19 more times
```

**After** (single canonical import):
```typescript
// All files now use:
import type { GeoJSONFeature } from '@debrief/utils';
```

### 2. AnnotationFeature — From loose interface to strict union

**Before**:
```typescript
// shared/components/src/utils/types.ts
export interface AnnotationFeature {
  type: 'Feature';
  properties: { kind: string; name?: string };
  geometry: unknown;
}
```

**After**:
```typescript
// shared/schemas/src/generated/typescript/unions.ts
export type SchemaAnnotationFeature =
  | NarrativeEntry
  | CircleAnnotation
  | RectangleAnnotation
  | LineAnnotation
  | TextAnnotation
  | VectorAnnotation
  | PolyAnnotation;

// Consumer code:
import type { SchemaAnnotationFeature } from '@debrief/schemas';
```

### 3. MCP Types — From 3 copies to 1

**Before**:
```typescript
// apps/vscode/src/types/tool.ts (~40 lines)
export interface MCPToolDefinition { ... }
export interface MCPToolResponse { ... }
export interface MCPContentItem { ... }

// shared/components/src/ToolMatch/mcpAdapter.ts (~30 lines)
interface MCPToolDefinition { ... }
interface MCPSelectionRequirement { ... }
```

**After**:
```typescript
// shared/utils/src/mcp-types.ts (single source)
export interface MCPToolDefinition { ... }
export interface MCPToolResponse { ... }
export interface MCPContentItem { ... }

// All consumers:
import type { MCPToolDefinition } from '@debrief/utils';
```

### 4. Cross-Layer Imports — Services no longer import from components

**Before**:
```typescript
// apps/vscode/src/services/calcService.ts
import type { DebriefFeature } from '@debrief/components';  // ❌ cross-layer

// apps/vscode/src/services/sessionManager.ts
import type { TrackFeature, ReferenceLocation } from '@debrief/components';  // ❌
```

**After**:
```typescript
// apps/vscode/src/services/calcService.ts
import type { DebriefFeature } from '@debrief/schemas';  // ✅ domain layer

// apps/vscode/src/services/sessionManager.ts
import type { TrackFeature, ReferenceLocation } from '@debrief/schemas';  // ✅
```

## Before / After: Dependency Versions

| Dependency | Before | After |
|------------|--------|-------|
| @storybook/* | ^8.0.0 / ^8.4.0 | ^8.4.0 |
| @typescript-eslint/* | ^6.13.0 / ^6.21.0 | ^6.21.0 |
| eslint | ^8.55.0 / ^8.57.1 | ^8.57.1 |
| eslint-plugin-react | ^7.33.0 / ^7.37.5 | ^7.37.5 |
| @types/leaflet | ^1.9.4 / ^1.9.8 | ^1.9.8 |
| pydantic | >=2.0.0 / >=2.12.5 | >=2.12.5 |
| ruff | >=0.1.0 / >=0.8.0 | >=0.8.0 |

## Before / After: ESLint Coverage

| Package | Before | After |
|---------|--------|-------|
| shared/config-ts | No lint | ESLint configured |
| shared/utils | No lint | ESLint configured |
| apps/web-shell | No lint | ESLint configured |
| services/session-state | No lint | ESLint configured |

## Before / After: Python Workspace

| Component | Before | After |
|-----------|--------|-------|
| debrief-tools | Not in workspace | Registered member |
| session-state-py | Not in workspace | Registered member |
| debrief_cli | Not in ruff known-first-party | Added |
