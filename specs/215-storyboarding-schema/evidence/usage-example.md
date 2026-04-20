# Usage Walkthrough — `@debrief/components/storyboard`

This walkthrough mirrors the runnable `usage-example.ts` and explains
the contracts each call relies on.

## 1. Empty plot

Storyboards and Scenes live inside the plot's existing
`FeatureCollection`. No new persistence layer is introduced — the
FeatureCollection is the storage envelope.

```ts
let plot: Plot = { type: "FeatureCollection", features: [] };
```

## 2. Create a Storyboard (async)

All ten mutation ops are async because the module computes
`feature_set_hash` via Web Crypto's `subtle.digest`. Pure queries
remain synchronous.

```ts
const sb = await createStoryboard(plot, {
  name: "Op Harrier — usage example",
  actor: "alice",
  now: "2026-04-20T09:00:00Z",
  idOverride: "01JUSAGEEXAMPLESTORYBOARDA",
});
plot = sb.plot;
```

The returned `plot` is a **new reference**; the input `plot` is
byte-identical to its pre-call state. Every untouched Feature in
`plot.features` is reference-equal across input and output (FR-MODULE-022,
verified in `structural-sharing.test.ts`).

## 3. Capture two Scenes — ordering is derived from timestamp

We deliberately insert the *later* Scene first to demonstrate that
`listScenesOrdered` ignores insertion order:

```ts
const later   = await createScene(plot, { /* ts=11:00:00Z */ });
plot = later.plot;
const earlier = await createScene(plot, { /* ts=10:00:00Z */ });
plot = earlier.plot;
```

The output of step 4 confirms the listing comes back in ascending order:

```
[list] ordered timestamps: [ '2026-04-20T10:00:00Z', '2026-04-20T11:00:00Z' ]
```

Scene `feature_set_hash` is computed by canonicalising
`visible_feature_ids` (trim → reject empty → dedupe → sort) and then
SHA-256-hashing `JSON.stringify(canonical)`. The same logical visible
set always produces the same hash regardless of input ordering.

## 4. Read a Scene + check staleness — sync

`readSceneWithStaleness` is synchronous. It returns the stored hash and
the canonical visible-id list so the consumer can decide *when* to await
a recomputation:

```ts
const stale = readSceneWithStaleness(plot, sceneId);
const fresh = await computeFeatureSetHash(stale.canonicalVisibleIds);
const isStale = fresh !== stale.storedHash;
```

This pattern keeps the read query synchronous (consumers calling it
inside a tight render loop don't have to convert to async).

## 5. Update a Scene — provenance encoding

`updateScene` runs the patch through the invariant guards and appends
*exactly one* new `LogEntry` to the Scene's inherited `provenance[]`
slot. Encoding:

| LogEntry field | Value |
|----------------|-------|
| `was_generated_by.tool` | `"storyboard-crud"` |
| `was_generated_by.tool_version` | `"1.0.0"` |
| `was_generated_by.parameters[0].value` | one of the ten op codes (here `update-to-current` because `visibleFeatureIds` was in the patch) |
| `agent` | the caller-supplied `actor` string |
| `execution_duration` | `"PT0S"` |

Captured output:

```
[update] scene 01JUSAGESCENEEARLYAAAAAAAA op=update-to-current agent=bob new hash=2cc0afc98eb6ea6e…
```

`describe` would have been emitted instead if only `title` /
`description` had changed.

## 6. Structural sharing — verified at runtime

The example reads the same Scene object before and after the mutation
and prints whether they are reference-equal:

```
[invariant] structural sharing preserved: true
```

This is the FR-MODULE-022 contract that downstream Zustand stores
(#217) lean on for selector memoisation — every untouched Scene
remains the same object, so React re-renders only the row that changed.

## 7. Append-only provenance

Every CRUD call grows `provenance[]` by exactly one entry; existing
entries are never mutated. `getCreatedAt`/`getCreatedBy` read
`provenance[0]`; `getLastModifiedAt`/`getLastModifiedBy` read
`provenance[provenance.length - 1]`. There are no separate
`created_at` / `last_modified_*` slots.

## 8. Async-first API

The asymmetry between sync queries and async mutations is intentional:

| Sync (no crypto, no I/O) | Async (uses Web Crypto or async I/O) |
|--------------------------|--------------------------------------|
| `listScenesOrdered` | `createStoryboard` |
| `getStoryboard`, `getScene`, `getActiveStoryboardDefault` | `renameStoryboard` |
| `readSceneWithStaleness` | `deleteStoryboard` |
| `detectMissingDataForScene` | `createScene` |
| `validatePlot`, `runPlotOpenMigrations` | `updateScene` |
| `formatDtg`, `canonicaliseVisibleFeatureIds` | `deleteScene` |
| | `duplicateScene` |
| | `copySceneToOtherStoryboard` |
| | `computeFeatureSetHash` (helper) |

Consumers can blindly `await` every mutation; pure reads never need
async glue.
