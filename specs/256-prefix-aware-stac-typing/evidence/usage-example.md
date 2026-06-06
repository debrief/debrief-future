# Usage Example — Prefix-Aware STAC Extension Typing (#256)

## 1. FR-002 — a new `debrief:*` field flows to the typed surface automatically

A schema author adds one slot to LinkML and regenerates. No generator edit, no
writer-type edit. The field appears at the writers' access sites, typed.

**Add the slot** (`shared/schemas/src/linkml/stac-extension.yaml`):

```yaml
      reviewed_by:
        description: Reviewer who signed off this plot.
        range: string
        required: false
        slot_uri: debrief:reviewed_by
```

**Regenerate**:

```sh
cd shared/schemas && uv run python scripts/generate.py
```

**Result** — the generated `StacExtensionProperties` (and therefore
`StacItemProperties`) now carries:

```ts
    'debrief:reviewed_by'?: string,
```

so in either writer host `props['debrief:reviewed_by']` is typed `string |
undefined` — **with no edit to `generate.py` or any writer-owned type**. This was
run end-to-end during implementation (slot added → regenerated → key confirmed →
reverted; the generated tree returned byte-clean).

The same flow is proven deterministically in CI by
`shared/schemas/tests/test_stac_prefix_transform.py::test_prefix_extension_slots_new_slot_flows_without_generator_edit`
(no full regen required).

## 2. Compile-time safety at the writer call sites (read)

```ts
// Before — untyped bag + cast:
const log = (props['debrief:provenance_log'] as PropertiesProvenanceEntry[]) ?? [];

// After — typed, cast removed:
const log = props['debrief:provenance_log'] ?? []; // PropertiesProvenanceEntry[] | undefined
```

Open content still works for STAC-core / unmodelled keys:

```ts
const datetime = props['datetime'];        // string (STAC core, declared)
const label = props['debrief:label'];      // unknown — feature/annotation key, not modelled
```

## 3. Write path — `props` typed as `StacItemProperties`, not `Record<string, unknown>`

```ts
// Before — widened bag (eslint-disable ADR-011), write-side typos silent:
const props = item.properties as Record<string, unknown>;
props['debrief:overrides'] = mergedOverrides;

// After — typed; modelled-key writes are checked, arbitrary keys still allowed:
const props: StacItemProperties = item.properties;
props['debrief:overrides'] = mergedOverrides;   // checked: string[]
for (const [k, v] of Object.entries(patch)) props[k] = v; // still OK via index sig
```

## 4. Asset metadata — `debrief:toolId` / `debrief:snapshotTimestamp` via `StacAsset`

```ts
// Before — hand-typed intersection cast:
const assetWithMetadata = asset as StacAsset & { 'debrief:toolId'?: string };
if (assetWithMetadata['debrief:toolId']) { ... }

// After — modelled slot, no cast:
if (asset['debrief:toolId']) { ... }           // string | undefined
```
