---
layout: future-post
title: "Planning: Kind discriminator for TimelineEntry"
date: 2026-04-22
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, schemas, log-panel, tech-debt]
excerpt: "A small refactor that unblocks three upcoming LogPanel features — snapshot button, tune markers, and rationale entries."
---

## What We're Building

Right now, the LogPanel decides whether an entry is a manual checkpoint by asking the wrong question. It looks at the tool's **visual category** — what colour chip does this render as? — and treats `category === 'snapshot'` as the semantic answer to "is this a checkpoint?".

That worked while only one entry type needed distinguishing. It falls apart the moment a second one lands. And three such features are queued behind it: a snapshot button for manual checkpoints from a toolbar affordance, inline tune markers for standalone tune actions, and analyst-authored rationale-only entries.

So before any of those, this refactor: add an optional `activity_type` field (`snapshot | tool | tune`) to the LinkML `LogEntry` schema, project it onto a closed `kind` union on the UI-side `TimelineEntry` type, and migrate the single existing call site to read `entry.kind === 'snapshot'` instead of the visual category.

## How It Fits

The cleanest way to think about this is: the provenance record (what actually happened) and the rendering record (what chip to draw) are two different things that have been sharing one field. This separates them. The PROV schema gets the semantic signal; the UI keeps its visual category for styling; neither has to guess at the other's job.

Because `activity_type` is optional on the schema side and the projection falls back to `'tool'` when absent, existing log records remain valid — no data migration, no versioning churn. The closed TypeScript union on `TimelineEntry.kind` means exhaustiveness checking at every switch, so when we add a fourth kind later the compiler tells us exactly where to update.

There's also a latent bug that surfaces during the migration: export tools (export-png, export-csv, export-geojson) are visually categorised as `'snapshot'` today and therefore render with the "manual checkpoint" placeholder. After the refactor they render as normal tool entries. That's a behaviour change, so Storybook baselines get rebased with review attention rather than auto-accepted.

## Key Decisions

- **Schema field is optional, closed enum.** Optional keeps existing records valid. Closed enum (not free-form string) gives the TypeScript consumer exhaustiveness.
- **Derive from schema, not from tool name.** The alternative — inferring `kind` from matching tool names — recreates exactly the conflation we're trying to remove.
- **`'tune'` is declared but not emitted.** Reserved for the upcoming tune-markers feature. Declaring it now means consumers have to handle it (via default branch) from day one, instead of being surprised later.
- **Three atomic commits.** Schema + regeneration, then type + projection, then consumer migration + rebaselined stories. Each independently buildable — easier to bisect if something regresses.

## What We'd Love Feedback On

- **`activity_type` as the field name** — it mirrors the PROV vocabulary, but is it the right term? `entry_kind`, `semantic_type`, something else?
- **Should `'tune'` be emitted as a standalone entry, or stay an annotation on a tool entry?** A standalone tune entry is cleaner in the timeline but requires a new code path to create one. An annotation is lower-cost but muddies the "one entry, one kind" model. I've reserved the enum value either way; the emission question is still open.
- **Is there a fourth kind we should be planning for now?** Comments? Manually-edited entries? Imported-from-elsewhere entries? The enum is cheap to extend but cheaper to extend thoughtfully.

→ [Join the discussion](#)
