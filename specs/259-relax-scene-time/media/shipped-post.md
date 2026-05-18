---
title: "Building Tied-Timestamp Scenes for Storyboards"
date: 2026-05-18
feature: 259-relax-scene-time
status: draft
tags: [storyboarding, schema, constitution-xiv]
---

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

## Screenshots

> **Note on screenshots**: this is a data-model + CRUD-semantics change. The user-visible Storyboard panel renders identically — three rows in the same component, same colours, same typography. The before/after that matters happens at the capture step: in `Before`, the second `Ctrl+Alt+C` at the same timestamp surfaces a Replace/Offset/Cancel banner; in `After`, it silently appends a third row to the tied group. A captured GIF of that gesture is the right asset for the eventual deployed post; the implementation pass focused on the data layer.

## By the Numbers

| Metric | Value |
|---|---|
| LinkML slots added | 1 (`SceneProperties.creation_order`) |
| LinkML slots changed | 2 (`SceneProperties.timestamp` description, `StoryboardProperties.schema_version` minimum) |
| Pydantic / TS / JSON Schema files regenerated | 1 / 1 / 32 |
| Fixtures retired | 1 (`storyboard-scene-duplicate-timestamp.json`) |
| Fixtures added | 3 (tied-timestamps, mixed-tied, duplicate-creation-order, missing-creation-order) |
| TypeScript files touched in `shared/components/src/storyboard/` | 5 (errors, crud, ordering, validate, index) |
| Throw-sites removed | 5 × `DuplicateTimestampError` from the CRUD module |
| Error classes deleted | 1 (`DuplicateTimestampError`) |
| Error classes added | 4 (`DuplicateCreationOrderError`, `CreationOrderOutOfRangeError`, `MissingCreationOrderError`, `UnsupportedSchemaVersionError`) |
| CRUD operations added | 1 (`reorderSceneInTiedGroup`) |
| VS Code call-sites moved onto `listScenesOrdered` | 1 (`storyboardPanelView` — playback was already on it) |
| Dead-code paths gutted in apps | ~250 lines (web-shell capture banner flow + VS Code Replace/Offset prompts + 3 collision result kinds) |
| Unit tests | 2089 components / 780 VS Code / 121 web-shell (storyboard scope all green) |
| Schema adherence tests | 863 pytest cases all green |
| New unit tests | 11 (4 in `errors.test.ts`, 7 in `reorder.test.ts`) plus 5 inverted in `crud.test.ts` + 3 in `ordering.test.ts` |
| Dependencies added | 0 |
| Bytes added to the prod bundle | net negative (a class came out, a smaller class went in) |

## Lessons Learned

- **A constraint that exists to keep a sort stable is the wrong abstraction.** Pre-#259, "no duplicate timestamps in a Storyboard" was load-bearing for `listScenesOrdered()`. It worked, but it shifted the cost of the analyst's real use case onto the analyst (fake the clock by 1 second). The right shape was always a tuple sort: timestamp first, then a tie-breaker the platform owns. Hindsight makes this look obvious; at the time it was a sensible reach for simplicity that turned into a workflow tax.

- **Pre-release schema breaks pay for themselves quickly.** Article XIV (pre-release freedom) gives the project licence to break the on-disk format whenever the cheaper path is the right one. The alternative — a migration shim that infers `creation_order` from insertion order at load — would have shipped twice the test surface and *still* required a re-export to fix the silent-coercion edge case. An explicit `UnsupportedSchemaVersionError` is half the code and twice as honest.

- **"No public-API breakage outside the storyboard module" was the wrong frame.** The original plan claimed deletion of `DuplicateTimestampError` would only ripple inside `shared/components/src/storyboard/`. In practice three consumer flows — the VS Code capture command, the VS Code edit-suite (duplicate + copy-to-other), and the web-shell capture command — had built entire Replace/Offset/Cancel banner machinery around catching that one error. Removing the constraint at the data layer made ~250 lines of UI orchestration unreachable. We took the aggressive-deletion path rather than leave dead code on a code-search.

- **Per-Storyboard scope matters more than uniqueness scope.** `creation_order` is unique within a Storyboard, not across the plot. The corresponding helper `nextCreationOrder(plot, storyboardId)` is six lines, but it has to be six lines that aren't confused: "find the maximum among Scenes whose `storyboard_id` matches" is not the same as "find the maximum across all Scenes in the plot." A `copySceneToOtherStoryboard` test caught that distinction during the first write.

## What's Next

- **The reorder gesture.** `reorderSceneInTiedGroup()` is wired and tested but has no UI affordance yet. A drag-handle on the Scene row plus a keyboard alternative (Alt+↑ / Alt+↓ within a tied group) is the natural follow-up. Spec to be filed.

- **A small visual cue for tied groups.** Right now three Scenes at `10:30:00Z` render with three identical DTG labels — `301030Z APR 26`. Users can already disambiguate via the title edit field, but a light visual hint ("…+2") on the timeline strip would make the tied state legible at a glance. Low priority; trigger when an analyst flags it.

- **Bulk-import of legacy Scenes with shared timestamps.** Right now the importer (REP loader, #137) doesn't produce Storyboard Scenes — it produces Tracks — so there's nothing to import that would benefit from this work today. If a future format does produce Scenes that share timestamps, the importer just has to assign `creation_order` in the order it parses them. Documented in the spec; no code today.
