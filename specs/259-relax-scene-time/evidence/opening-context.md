## Hook

A before/after table fits best here. The change is a behavioural one — the Storyboard panel looks the same, but the rules about what it accepts have shifted. A screenshot would show identical pixels; a diagram would dramatise an in-memory sort. The contrast the reader cares about is what happens when they try to capture two viewports at the same instant.

| Before | After |
|---|---|
| Capture Scene at `10:30:00Z` — accepted | Capture Scene at `10:30:00Z` — accepted |
| Capture a second Scene at `10:30:00Z` — rejected, "duplicate timestamp" | Capture a second Scene at `10:30:00Z` — accepted, appended to the tied group |
| Multi-viewport snapshots forced to fake the clock by a second | Multi-viewport snapshots share a single honest timestamp |
| Tied scenes impossible | Tied scenes ordered by capture sequence, reorderable within the group |

## What We're Building

We're removing a constraint that gets in the way of how analysts actually capture a Storyboard. Today, the moment you try to record a second Scene at the same timestamp as one you already have — say, a tactical view and a sensor view of the same instant — the Storyboard refuses it as a duplicate. Analysts have been working around this by nudging the clock forward by a second, which is dishonest to the underlying analysis: those two viewports really did belong to the same instant.

After this change, a Storyboard accepts as many Scenes at a single timestamp as the analyst wants to capture. They are ordered by the sequence in which they were taken, and that order is stable across save, reload, and playback. There's a new CRUD operation that lets future UI re-sequence the Scenes within a tied group; the gesture for invoking it is deferred to a follow-up feature, but the underlying behaviour is in place.

## How It Fits

This sits in the schema layer of the Storyboarding feature line (#215 onwards) — the LinkML master schema for `SceneProperties` gains a `creation_order` integer field, regenerated Python and TypeScript types flow outward through `@debrief/schemas`, and the only structural consumer is `shared/components/src/storyboard/`. Two existing inline sort sites in the VS Code extension's panel view and playback engine fold onto a single canonical `listScenesOrdered()` helper, which now sorts by `(timestamp, creation_order)`. No service changes, no new runtime dependencies, persistence path unchanged.

## Key Decisions

- **Add a `creation_order` field rather than rely on insertion order.** Insertion order is fragile across JSON round-trips and merges. An explicit integer per Scene, scoped per-Storyboard, gives a stable secondary sort that survives serialisation and any future reordering UI.

- **One sort, one place.** Before this change there were three sort sites — `listScenesOrdered()` plus two inline copies in the VS Code extension. We're folding the inline ones onto the canonical helper. The behavioural change is small; the structural cleanup that comes with it is the part that pays back later.

- **No backward compatibility for legacy plots.** A Storyboard saved before this change has Scenes without `creation_order`. Rather than infer a value at load time, the loader rejects such plots with a clear error and bumps `schema_version` from 1 to 2. Article XIV (pre-release freedom) authorises the hard break: no shipped user data exists, and silent inference would mask cases where two analysts disagree about what the right order was. An honest error beats a quiet guess.

- **Replace one error with another, more specific one.** The five `DuplicateTimestampError` throw-sites across the CRUD layer come out. A new `DuplicateCreationOrderError` covers the genuine integrity violation — two Scenes claiming the same slot within a tied group — and a `CreationOrderOutOfRangeError` covers reorder attempts that fall outside the group. The error surface gets narrower and more truthful, not broader.

- **Ship the CRUD, defer the gesture.** The new `reorderSceneInTiedGroup()` operation is in; the drag-handle or keyboard affordance to invoke it from the Storyboard panel is a separate feature. Splitting this way keeps the schema change reviewable on its own and lets the UI work iterate without re-litigating the data model.
