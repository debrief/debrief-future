# Quickstart: Prefix-Aware STAC Extension Typing

**Feature**: 256-prefix-aware-stac-typing

## What changed

The generated `StacExtensionProperties` TypeScript interface now declares its
slots under their on-disk `debrief:`-prefixed keys. Reading/writing the
modelled extension fields through `StacItem.properties` is now type-checked —
no more `as` casts on `props['debrief:provenance_log']` & friends.

## Regenerate the types

```sh
task schema:generate
# or:
cd shared/schemas && uv run python scripts/generate.py --target typescript
```

This rewrites `shared/schemas/src/generated/typescript/types.ts`. Commit the
result — CI fails if the committed artefact drifts from the generator output.

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
const label = props['debrief:label'];      // unknown — narrow before use
```
