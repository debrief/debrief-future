# Usage Example: schema-driven flow for `PropertiesProvenanceEntry`

**Feature**: 240-linkml-stac-writer-types
**Captured**: 2026-05-09

This example demonstrates how a future contributor would change the `PropertiesProvenanceEntry` shape end-to-end after this feature lands. It's intentionally a *small* schema change — adding a single optional attribute — to keep the demonstration concrete and focused on the flow, not the change.

## Starting point — the canonical class in LinkML

The class lives at `shared/schemas/src/linkml/stac-extension.yaml`, lines 63–110. Today it looks like:

```yaml
PropertiesProvenanceEntry:
  description: >
    Single entry in item.properties["debrief:provenance_log"] recording one
    Properties Panel commit. Appended by stacService.updateItemMetadata
    (single writer — Article IV.2). Immutable once written (Article III.3)…
  attributes:
    activity_id: {range: string, required: true}
    timestamp: {range: string, required: true}
    tool: {range: string, required: true, pattern: "^debrief\\.propertiesPanel$"}
    method: {range: string, required: true, pattern: "^properties-panel@.+$"}
    fields: {range: string, multivalued: true, required: true, minimum_cardinality: 1}
    source: {range: string, required: true, pattern: "^user$"}
```

## Hypothetical change — add an optional `correlation_id` attribute

Suppose a future feature wants to thread a higher-level correlation token (e.g. for cross-tool replay) through every Properties Panel write. The change is one attribute in LinkML:

```diff
   attributes:
     activity_id: {range: string, required: true}
     timestamp: {range: string, required: true}
     tool: {range: string, required: true, pattern: "^debrief\\.propertiesPanel$"}
     method: {range: string, required: true, pattern: "^properties-panel@.+$"}
     fields: {range: string, multivalued: true, required: true, minimum_cardinality: 1}
     source: {range: string, required: true, pattern: "^user$"}
+    correlation_id: {range: string, required: false}
```

That's the only LinkML edit needed.

## Step 2 — regenerate

```sh
task schema:generate
```

(Equivalent: `cd shared/schemas && uv run python scripts/generate.py`.)

## Step 3 — what the regen produces, automatically

`shared/schemas/src/generated/typescript/types.ts` gains a new field on the generated interface (excerpt):

```diff
 export interface PropertiesProvenanceEntry {
     activity_id: string,
     timestamp: string,
     tool: string,
     method: string,
     fields: string[],
     source: string,
+    correlation_id?: string,
 }
```

`shared/schemas/src/generated/python/debrief_schemas/__init__.py` gets the matching Pydantic field. `shared/schemas/src/generated/json-schema/PropertiesProvenanceEntry.schema.json` gets the matching JSON Schema property.

## Step 4 — what flows automatically through the writer

The hybrid intersection in `shared/components/src/PropertiesPanel/provenanceTypes.ts` wraps `Generated`:

```typescript
export type PropertiesProvenanceEntry =
  Omit<Generated, 'tool' | 'method' | 'source'> &
  {
    tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL;
    method: `properties-panel@${string}`;
    source: 'user';
  };
```

After regeneration:

- `Generated.correlation_id?: string` exists.
- `Omit<Generated, 'tool' | 'method' | 'source'>` keeps `correlation_id` (the omit only strips `tool`/`method`/`source`).
- `PropertiesProvenanceEntry.correlation_id?: string` is now visible to **every** consumer:
  - `apps/vscode/src/services/stacService.ts` (the entry construction at line 1323+).
  - `apps/web-shell/src/services/stacWriterIdb.ts` (line 332+).
  - All tests that import the type (`provenanceRotation`, `updateItemMetadata`, `sampleCatalog.roundtrip`).
  - `@debrief/stac-writer`'s public `PropertiesProvenanceEntry` re-export.
- The two production write sites can populate the new field without any hand-edit beyond the call-site code that *writes* the value.

**Zero hand-edits to writer-side or components-side type bodies were required.** SC-001 and SC-006 demonstrated.

## Step 5 — what about the literal-narrowed fields (`tool`, `method`, `source`)?

Suppose the schema change *also* widened the `source` pattern to admit `'tool'` (e.g. for non-user-initiated writes):

```diff
-    source: {range: string, required: true, pattern: "^user$"}
+    source: {range: string, required: true, pattern: "^(user|tool)$"}
```

The generator still emits `source: string` for both shapes (LinkML's `gen-typescript` cannot translate regex into TS literal types — see research R2). The components-side intersection's `source: 'user'` literal would *not* admit `'tool'` automatically.

To take advantage of the wider pattern, the components-side intersection needs an in-lock-step edit:

```diff
   {
     tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL;
     method: `properties-panel@${string}`;
-    source: 'user';
+    source: 'user' | 'tool';
   };
```

This is the **only** kind of change that requires a hand-edit to `provenanceTypes.ts` post-migration: a deliberate widening of one of the literal-narrowed fields. Documented in research R2 ("If a future use case needs `'tool'` or `'import'`…").

## Step 6 — drift detection

If a contributor were to edit `shared/schemas/src/generated/typescript/types.ts` by hand (e.g. to "fix" the new `correlation_id` field while forgetting to update LinkML), CI catches it:

```
::error::Generated artefacts under shared/schemas/src/generated/ have drifted from the LinkML source.
::error::Run 'task schema:generate' (or 'cd shared/schemas && uv run python scripts/generate.py') and commit the result.
```

The contributor regenerates, commits the regen, and the gate clears. SC-003 demonstrated.

## Recap

| Action | Edits required |
|---|---|
| Add a new optional non-pattern attribute to `PropertiesProvenanceEntry` | 1 line in `stac-extension.yaml` + regenerate. Zero hand-edits in writer or components. |
| Widen one of the pattern-constrained fields (`tool`/`method`/`source`) | 1 line in `stac-extension.yaml` + regenerate + 1 line in `provenanceTypes.ts` (intersection). Zero hand-edits anywhere else. |
| Hand-edit a generated artefact directly | CI gate fails the PR; instructions to regenerate are in the failure log. |

The promise of Article II.1 — schemas as the single source of truth, hand-written types eliminated — holds for `PropertiesProvenanceEntry` after this feature. (`StacItem` remains hand-written; that follow-up is tracked at backlog #256.)
