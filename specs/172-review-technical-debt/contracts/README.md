# Contracts: Review Technical Debt

This feature does not introduce new API contracts. It consolidates existing type
definitions into canonical locations and aligns configuration across the monorepo.

See `data-model.md` for the canonical type definitions and their target locations.

## Import Path Contracts

After consolidation, these import paths become the canonical sources:

```typescript
// GeoJSON types — use SafeFeature, not GeoJSONFeature
import { SafeFeature, SafeFeatureCollection, SafeGeometry, Bounds } from '@debrief/utils';

// MCP tool types — shared, not per-app
import { MCPToolDefinition, MCPToolResponse, MCPContentItem } from '@debrief/utils';

// Temporal types — epoch milliseconds
import { TimeRange, timeRangeFromISO, timeRangeToISO } from '@debrief/session-state';
```

## Prohibited Import Patterns

After this feature, the following imports MUST NOT exist:

```typescript
// BAD: Service code importing from UI components
import { ... } from '@debrief/components';           // in services/ or apps/*/src/services/
import { ... } from '@debrief/components/ToolMatch';  // anywhere outside components

// BAD: Cross-app relative imports
import { ... } from '../../../vscode/src/types/tool'; // in web-shell

// BAD: Local GeoJSONFeature redefinitions
interface GeoJSONFeature { ... }                       // anywhere except @debrief/utils
```
