Storyboarding is one of the more ambitious pieces of the plan — an analyst capturing a narrated walk-through of a plot, then replaying it as a briefing. The epic (#024) splits into four specs, and I'm starting with the one that has nothing to show on screen: the schema and the CRUD core. Everything else — capture in #216, the panel and playback in #217, the edit suite in #218 — is going to lean on the shapes and invariants defined here.

## What this slice actually ships

Two LinkML entities — `Storyboard` and `Scene` — both carried as plain GeoJSON Features inside the plot's existing FeatureCollection. A `Viewport` sub-record. Nine fixtures that exercise the Article II adherence gates, split between single-Feature round-trip fixtures and fuller FeatureCollection shapes. And a headless TypeScript CRUD module at `shared/components/src/storyboard/` that enforces every invariant the downstream UI specs would otherwise have to re-implement in three places.

No capture shortcut. No panel. No playback. If that sounds thin, it's because the value here is that three follow-up specs can now proceed in parallel against a schema that round-trips cleanly.

## Decisions that moved during review

A few design choices flipped between the first draft and the current one, and they're worth recording because they're the kind of thing that's easy to get wrong.

**Discriminator pattern.** The first draft introduced a `properties["debrief:type"]` key to mark Storyboard and Scene Features. That's wrong for in-plot Features: the `debrief:` prefix is reserved for STAC `item.properties`. In-plot Features have always used the inherited `kind` enum — `TRACK`, `POINT`, `CIRCLE`, and so on — and switching conventions mid-project would split type-narrowing across two fields. So `FeatureKindEnum` gets two new values, `STORYBOARD` and `STORYBOARD_SCENE`, and the generated TypeScript unions narrow the same way every other Feature type already does.

**Single-surface provenance.** The earlier shape proposed a dedicated `history[]` array on each Storyboard and Scene, plus `created_by`, `last_modified_by`, and `last_modified_at` fields. That's two parallel audit surfaces — the existing `BaseFeatureProperties.provenance: LogEntry[]` slot was already doing the job for every other Feature type, and the Analysis Log (#176) already knew how to read it. The cleaner move was to drop the proposed `HistoryEntry` entirely, append one `LogEntry` to `provenance[]` on every mutation, and add a single optional `agent` slot to `LogEntry` for the human actor. Derived fields (`created_at`, `last_modified_at`) come from `provenance[0]` and `provenance[last]` at read time. One audit surface, zero duplicated bookkeeping, and the Analysis Log picks it up for free.

**Async-first CRUD.** `feature_set_hash` is a SHA-256 over the canonicalised `visible_feature_ids`, and the only cross-platform path to SHA-256 is Web Crypto's `subtle.digest` — which is async by specification. Rather than make only the hash-touching ops async and leave the rest sync (a trap for any caller who learns `createScene` is async but `deleteScene` is not), every mutation op on the public API returns a `Promise`. Pure queries — `listScenesOrdered`, `detectMissingDataForScene`, `validatePlot` — stay synchronous.

## Structural sharing, and why immer earns its place

The CRUD module uses `immer.produce(…)` on every mutation. That gives two properties that matter downstream. First, transactional semantics: if a recipe throws mid-op, the draft is discarded and the caller's input is byte-identical post-call, which is what satisfies the atomicity criterion for compound ops like `copySceneToOtherStoryboard` and cascading deletes. Second, reference equality on unmodified Features across input and output FeatureCollections — a testable invariant, and the property that downstream Zustand selectors in #217 will rely on for memoisation. Hand-rolling `structuredClone` on a 100k-position FeatureCollection measured over 50 ms in preliminary benching; that's a non-starter for the perf target.

## Article II gate lands in-slice

There's a temptation, when you're building a schema layer whose only consumers are other specs, to defer the expensive adherence tests. I'm not doing that. The Py→JSON→TS→JSON→Py round-trip harness ships as part of this spec — pytest spawns a Node subprocess that parses and re-serialises each valid single-Feature fixture through the generated TypeScript models, pipes JSON back, and Pydantic re-validates. If the generators drift, this catches it at the schema layer, not three specs downstream when a panel renders garbage.

Alongside that: a Vitest benchmark with a concrete target — p95 under 10 ms at 100k positions for `createScene`, `updateScene`, and `copySceneToOtherStoryboard` on the CI runner. Perf claims without a benchmark are just hopes.

## What's next

Once this lands, #216, #217, and #218 are unblocked and can be worked in parallel. The capture shortcut slots into the CRUD surface as a single `createScene` call. The panel and playback consume `listScenesOrdered` and `detectMissingDataForScene`. The edit suite wires rename, describe, duplicate, and copy-across-Storyboards. None of those three specs needs to reinvent a single invariant — which is the whole point of landing this slice first.
