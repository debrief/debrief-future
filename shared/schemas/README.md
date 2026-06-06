# Debrief Schemas

LinkML master schemas and generated artifacts for Debrief v4.x maritime tactical analysis platform.

## Overview

This is a **tracer bullet** implementation providing schema definitions for core entity types:

- **TrackFeature** - GeoJSON Feature representing vessel tracks
- **ReferenceLocation** - GeoJSON Feature for fixed reference points
- **SystemState** - GeoJSON Feature for non-spatial system state (viewports, selections)

Additional entity types (SensorContact, PlotMetadata, ToolMetadata) will be added in future iterations.

### System State Features

SystemState features store application state alongside spatial data using Point geometry with empty coordinates:

```json
{
  "type": "Feature",
  "id": "state.temporal",
  "geometry": {
    "type": "Point",
    "coordinates": []
  },
  "properties": {
    "kind": "SYSTEM",
    "state_type": "temporal",
    "start_time": "2024-01-15T09:00:00Z",
    "end_time": "2024-01-15T17:30:00Z"
  }
}
```

Three state variants are supported:
- `state.temporal` - Time viewport (start/end times)
- `state.spatial` - Map viewport (ViewportPolygon + rotation)
- `state.selection` - Selected feature IDs

## Generated Artifacts

From the LinkML master schemas, we generate:

- **Pydantic models** - Python dataclasses with validation
- **JSON Schema** - For frontend validation and API contracts
- **TypeScript interfaces** - For type-safe frontend development

## Usage

### Python (Pydantic)

```python
from debrief_schemas import TrackFeature, ReferenceLocation, SystemState

# Validate track data
track = TrackFeature(**track_dict)
print(track.properties.platform_id)

# Export to JSON
json_str = track.model_dump_json()
```

### TypeScript

```typescript
import { TrackFeature, TrackTypeEnum } from '@debrief/schemas';

const track: TrackFeature = {
  type: 'Feature',
  id: 'track-001',
  // ...
};
```

### JSON Schema (AJV)

```javascript
import Ajv from 'ajv/dist/2019.js';
import trackSchema from '@debrief/schemas/TrackFeature.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(trackSchema);
const valid = validate(trackData);
```

## Development

### Prerequisites

- Python 3.11+ with uv
- Node.js 18+ with pnpm

### Commands

```bash
# Generate all derived schemas
make generate

# Run tests
make test

# Clean generated files
make clean
```

## Worked example: MCP transport envelopes (cluster #222)

The MCP / tool-system cluster — sixteen hand-typed TypeScript shapes
that crossed the Python ↔ TypeScript boundary over JSON-RPC — was
promoted to LinkML under [spec 222](../../specs/222-linkml-mcp-envelopes/spec.md).
This is the canonical worked example for "consumer-narrowing over a
schema-rooted base" (FR-004, R4 import-based classification).

The cluster's source file is [`src/linkml/mcp.yaml`](src/linkml/mcp.yaml).
It groups 15 LinkML classes + 4 permissible-values enums into three
semantic sections (Envelopes / Discovery / Replay), each independently
shippable. The generated artefacts land at:

- `src/generated/python/debrief_schemas/__init__.py` (Pydantic v2)
- `src/generated/typescript/types.ts` (TypeScript)
- `src/generated/json-schema/debrief.schema.json` (JSON Schema)

### How consumer-narrowing works

LinkML describes the wire-format base shape; consumer code narrows that
shape with TS-only intersection types when the consumer needs tighter
field discriminators or Debrief-specific payload structures that
LinkML cannot express (e.g. `'debrief:resultType'` keys with colons).

Example — `shared/utils/src/mcp-types.ts`:

```ts
import type {
  MCPContentItem as MCPContentItemBase,
  MCPErrorResponse as MCPErrorResponseBase,
} from '@debrief/schemas';

// The schema base contributes `type`, `text`, `data`, `mimeType`, plus
// the free-form `resource` and `annotations` slots. The narrowing tightens
// `type` to the live discriminator union and pins the inner shapes.
export type MCPContentItem = Omit<MCPContentItemBase, 'type' | 'resource' | 'annotations'> & {
  type: 'resource' | 'text' | 'image';
  resource?: { uri: string; mimeType: string; text: string };
  annotations: DebriefAnnotations;
};
```

The audit's R4 rule reclassifies any file that imports from
`@debrief/schemas` as schema-rooted, so the cluster is fully resolved
(zero §3.1 rows, zero §3.2 `ToolParameter` rows) — see the changelog
in `docs/type-audit-2026.md` §5.

### Function-type aliases

LinkML doesn't model callable signatures. The two replay-engine
callbacks (`ToolExecutor`, `ToolVersionResolver`) live in
[`src/typescript/aliases/mcp-functions.ts`](src/typescript/aliases/mcp-functions.ts) —
a TS-only module that imports its parameter and return types from the
generated classes (Research R-002). The audit treats this file as
schema-rooted under the same R4 rule.

### Article XV.2 free-form fields

Six slots across the cluster retain `range: Any` (`MCPRequest.input`,
`MCPContentItem.{structured_content, annotations}`,
`MCPToolResponse.structured_content`, `MCPErrorResponse.{data, error}`,
plus several mock-service slots). They model intentionally-open
payload shapes that vary per tool. Article XV.2 narrowing is the
consumer's responsibility — see the per-slot docstrings in
`mcp.yaml` for the precedent (the `raw-geojson.yaml` `JsonObject`
pattern).

## Worked example: STAC catalog envelopes (cluster #223)

The STAC catalog cluster — five audit-flagged hand-typed TypeScript
shapes (3× `StacItem` + 2× `StacCatalog`) plus seven R4-masked sibling
shapes (`StacLink`, `StacAsset`, `StacExtent`, `StacSummaries`,
`StacCollection`, `StacCatalogOrCollection`, inline `StacItemAssets`)
— is rooted in LinkML at `src/linkml/stac.yaml`. STAC files are
persistent on-disk artefacts (Python writes them, TypeScript reads
them next session); a hand-type drift between the two languages
silently corrupts data, which is what motivated the migration.

The cluster composes existing classes from `stac-extension.yaml`
(`StacExtensionProperties`, `PlatformRecord`) and `geojson.yaml`
(the seven geometry classes) rather than redeclaring them, matching
the precedent set by #222 (MCP).

Generated artefacts:

- `StacItem`, `StacCatalog`, `StacCollection` — the three top-level
  STAC envelope classes. Each carries a literal-string `type`
  discriminator via the `equals_string` constraint on the
  `StacTypeEnum` slot, so TypeScript narrows via
  `if (root.type === 'Collection')` without `as unknown` casts.
- `StacItemProperties`, `StacAsset`, `StacSummaries` — the three
  Article XV.2 open-record classes (extra='allow' on Pydantic,
  `[key: string]: unknown` on TypeScript) that preserve the STAC
  `<namespace>:<key>` extension convention (`debrief:*`,
  `processing:*`, `file:*`, `proj:*`).
- `StacLink`, `StacExtent`, `StacSpatialExtent`,
  `StacTemporalExtent`, `StacProvider` — strictly-typed member
  classes.
- TS-only alias `StacCatalogOrCollection` at
  `src/typescript/aliases/stac-unions.ts` plus the Python mirror at
  `src/generated/python/debrief_schemas/unions.py` — LinkML emits
  the two concrete classes; the union is hand-maintained alongside.

Two pieces of generator post-processing are required (per Research
R-011 — same precedent as the GeoJSON coordinate fixes):

1. **Nested-array slots**: `StacSpatialExtent.bbox` and
   `StacTemporalExtent.interval` are authored as flat `multivalued`
   in LinkML and rewritten to `list[list[float]]` /
   `list[list[Optional[str]]]` in Pydantic + `number[][]` /
   `(string | null)[][]` in TypeScript by
   `scripts/generate.py`.
2. **Open-record asset map**: `StacItem.assets` is authored as
   `range: Any` (LinkML can't express `dict[str, X]` with a
   strongly-typed value) and rewritten to `dict[str, StacAsset]`
   in Pydantic + `Record<string, StacAsset>` in TypeScript.

The `tests/test_stac_*` modules cover round-trip, schema-comparison,
golden + negative fixtures, AND a corpus test that loads every
committed `item.json` / `catalog.json` under
`preview/workspace/samples/local-store/` (73 items + 1 STAC 1.1
Collection) and `apps/vscode/test-data/local-store/` (2 items + 1
STAC 1.0 Catalog) — the strongest evidence of additive correctness
(FR-011: schema widens to accept fixtures, fixtures never rewritten).

### Article XV.2 open-record exception

Three classes carry `extra='allow'` (Pydantic) + `[key: string]:
unknown` (TypeScript) to support STAC's namespaced extension keys:
`StacItemProperties`, `StacAsset`, `StacSummaries`. The pattern
matches the `raw-geojson.yaml` `JsonObject` precedent and the #222
`MCPContentItem.structuredContent` precedent. Consumers narrow per
extension via the existing per-extension type guards (e.g. the
`debrief:platforms` typed reader). See plan.md Complexity Tracking
for the exception rationale.

## Known Limitations

LinkML has a limitation with nested array types. GeoJSON coordinates should be arrays of position arrays (e.g., `[[lon, lat], ...]`), but the generated JSON Schema expects flat number arrays. Track features with proper GeoJSON coordinates will validate correctly with Pydantic models but may show validation errors in JSON Schema.

## License

See project root LICENSE file.
