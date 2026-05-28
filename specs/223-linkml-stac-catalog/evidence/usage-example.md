# Usage example — schema-rooted STAC catalog cluster

**Feature**: `223-linkml-stac-catalog`
**Captured**: 2026-05-20

## The single source of truth in one screen

Before this work, a STAC `Item` was hand-typed at five sites — three
in the VS Code extension, two in the web-shell mock, plus a fourth in
`@debrief/stac-writer` and the inline asset shape in
`sceneThumbnailService.ts`. Each declaration drifted independently;
divergence between the Python writer and any TypeScript reader was
silently corrupting per-plot `item.json` files.

After the migration, every site reads from one place:

### Python — write side

```python
from debrief_schemas import StacItem
import json

# Validate any in-memory dict against the canonical shape before
# persisting it to disk. Field-name typos, type mismatches, and
# missing required slots all raise at this boundary.
item = {
    "type": "Feature",
    "stac_version": "1.1.0",
    "id": "core--boat1",
    "geometry": {"type": "Polygon", "coordinates": [...]},
    "bbox": [-21.866, 21.947, -21.580, 22.186],
    "properties": {
        "datetime": "1995-12-12T05:00:00+00:00",
        "title": "Saxon Warrior: Boat1",
        "debrief:platforms": [{"id": "NELSON", "name": "HMS Nelson"}],
        # ...extension keys: file:size, proj:shape, processing:* — all
        # accepted via Article XV.2 open-record exception.
    },
    "links": [...],
    "assets": {...},
}

StacItem.model_validate(item)         # raises if invalid
with open(item_path, "w") as f:
    json.dump(item, f, indent=2)
```

### TypeScript — read side (VS Code extension)

```ts
import type { StacItem } from '@debrief/schemas';

// VS Code stacService reads item.json from disk; the TypeScript
// type is the SAME generated class the Python writer validates
// against. No projection cast required, no hand-type to maintain.
const item: StacItem = JSON.parse(content);

// Discriminator narrowing on the Catalog ↔ Collection union — no
// runtime predicates needed.
if (root.type === 'Collection') {
  // TypeScript knows `root` is StacCollection here; access
  // root.extent.spatial.bbox, root.license, root.summaries.
}
```

### TypeScript — write side (`@debrief/stac-writer`)

```ts
import type { StacItem } from '@debrief/stac-writer';
//                                ^^^^^^^^^^^^^^^^^^^^
//   The writer re-exports the same type from @debrief/schemas —
//   no separate StacItem declaration to drift. (Decision 1B closes
//   spec A-009; the JSON projection cast at
//   apps/web-shell/src/mocks/stacService.ts:464-474 is gone.)

const item: StacItem = buildItemFromUserInput(...);
await writer.writeItem({ ctx, itemPath, item, mode: 'create' });
```

## What the migration unlocks

1. **Adding a new top-level field on `StacItem`** — edit one LinkML
   file (`shared/schemas/src/linkml/stac.yaml`), re-run the schema
   build, and the field appears simultaneously in:
   - `debrief_schemas.StacItem` (Pydantic — Python writers + tests)
   - `@debrief/schemas#StacItem` (TypeScript — VS Code, web-shell,
     writer, sceneThumbnailService)
   - `*.schema.json` (JSON Schema — AJV validators, language-neutral
     consumers)

2. **Detecting schema drift in CI** — the new
   `test_stac_fixtures.py` corpus test loads every committed
   `item.json` (75 today: 73 STAC 1.1 + 2 STAC 1.0) and
   `catalog.json` (2 — one Collection, one Catalog) through the
   generated Pydantic validator. If the schema or any fixture
   drifts, CI fails immediately with a field-level error.

3. **Round-trip without coercion** — STAC's
   `<namespace>:<key>` extension convention (`debrief:platforms`,
   `file:size`, `proj:shape`, `processing:datetime`) survives
   Py → JSON → Py without field loss, courtesy of the Article XV.2
   `extra='allow'` exception on the three open-record classes
   (`StacItemProperties`, `StacAsset`, `StacSummaries`).

4. **Discriminated union narrowing** — `StacCatalogOrCollection` is a
   real TypeScript union, narrowable via the `type` field. No more
   `as unknown as StacCollection` casts in the catalog overview
   panel.

## Concrete payoff

The hallmark Schema-Change artefact for this feature is the
**round-trip evidence** at `round-trip-evidence.md`: three live
fixtures from `preview/workspace/samples/local-store/` go through Py
→ JSON → Py and emerge byte-equivalent. Combined with the 75-item
corpus loads-only sweep, this is the evidence that the migration is
**additive over the on-disk state of the world** (FR-011: schema
widens to accept fixtures, fixtures never rewritten).
