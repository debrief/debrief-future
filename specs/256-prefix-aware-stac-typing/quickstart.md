# Quickstart: Prefix-Aware STAC Extension Typing

**Feature**: 256-prefix-aware-stac-typing

## What changed

The generated TypeScript now declares modelled `debrief:*` slots under their
on-disk `debrief:`-prefixed keys across **three** classes —
`StacExtensionProperties` (item properties), `StacSummaries` (collection
summaries), and `StacAsset` (asset metadata, with two newly-modelled keys
`debrief:toolId` / `debrief:snapshotTimestamp`). Reading **and writing** the
modelled fields is now type-checked — no more `as` casts on
`props['debrief:provenance_log']`, no `Record<string, unknown>` widening at the
write path, and no `asset as StacAsset & { 'debrief:toolId'?: string }` hand-cast.

(`debrief:label` is deliberately *not* modelled — it is a GeoJSON feature
property / MCP annotation, not a STAC property.)

## Regenerate the types

```sh
task schema:generate
# or (TS + Pydantic — StacAsset gains two optional fields):
cd shared/schemas && uv run python scripts/generate.py
```

This rewrites `shared/schemas/src/generated/typescript/types.ts` and the
Pydantic models. Commit the result — CI fails if the committed artefact drifts
from the generator output.

## Verify it works

```sh
# Type-level + unit assertions (the gate that catches type regressions):
pnpm -r typecheck

# Structural assertion on the generated artefact + round-trip golden:
uv run pytest shared/schemas/tests/ -k stac

# Full gate before pushing:
task verify
```

## Add a new `debrief:*` extension field (the FR-002 demo)

1. Add a slot to `StacExtensionProperties` in
   `shared/schemas/src/linkml/stac-extension.yaml`, including its `slot_uri`:

   ```yaml
       reviewed_by:
         range: string
         multivalued: false
         slot_uri: debrief:reviewed_by
   ```

2. Regenerate: `task schema:generate`.

3. The generated interface now carries `'debrief:reviewed_by'?: string`. In a
   writer, `props['debrief:reviewed_by']` is typed as `string | undefined` —
   **with no edit to `generate.py` or any writer type**.

## Using it in writer code

```ts
// Before — untyped bag + cast:
const log = (props['debrief:provenance_log'] as PropertiesProvenanceEntry[]) ?? [];

// After — typed, cast removed:
const log = props['debrief:provenance_log'] ?? []; // PropertiesProvenanceEntry[] | undefined
```

Unmodelled / STAC-core / third-party keys still work via open content:

```ts
const datetime = props['datetime'];        // string (STAC core, declared)
const label = props['debrief:label'];      // unknown — feature/annotation key, not modelled
```

Write path — `props` is now `StacItemProperties`, not `Record<string, unknown>`:

```ts
// Before — widened bag:
const props = item.properties as Record<string, unknown>; // eslint-disable ADR-011
// After — typed; modelled-key writes are checked, arbitrary keys still allowed:
const props: StacItemProperties = item.properties;
props['debrief:overrides'] = merged;       // checked: string[]
```

Asset metadata — `debrief:toolId` / `debrief:snapshotTimestamp` typed via `StacAsset`:

```ts
// Before — hand-cast:
const a = asset as StacAsset & { 'debrief:toolId'?: string };
// After — modelled:
const toolId = asset['debrief:toolId'];     // string | undefined
```
