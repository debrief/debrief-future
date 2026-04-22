---
layout: future-post
title: "Planning: Timeline Entry `kind` Discriminator"
date: 2026-04-22
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, log-panel, tech-debt, backlog-208]
excerpt: "Replacing a short-term category check in the log panel with a proper discriminator field — cleanup in aisle 176 before the next wave of entry types lands."
---

## What We're Building

When feature #176 landed the log panel, it needed a way to tell snapshot entries apart from tool entries so the two could render differently. The quickest honest answer at the time was to check `ToolCategory === 'snapshot'` at the render site. That worked, it shipped, and it's been fine — but it also quietly welded two different concerns together. "What is this entry?" and "how should it look?" are now the same question, and the answer lives in an enum that was never meant to carry semantic weight.

#208 separates those two questions. `TimelineEntry` (the UI projection the log panel consumes) gains a new `kind` field: a string-literal union of `'snapshot' | 'tool' | 'tune'`, populated by the VS Code host when it builds the entry. Consumers switch on `kind` instead of re-deriving semantics from a category enum. The interim populator is a two-row decision table — snapshot tools map to `'snapshot'`, everything else maps to `'tool'` — which is deliberately boring and guarantees zero visual regression by construction.

## How It Fits

There are three entry types already on the horizon: a manual snapshot button, tune markers driven from PROV, and manual rationale entries for analyst annotations. Each of them needs a way to say "I am this kind of thing" without re-using `ToolCategory` as a sort of general-purpose semantic slot — which is the trajectory the current code is on.

`TimelineEntry` is a UI projection rather than a LinkML schema type, so this is a purely TypeScript-side change. No schema regeneration, no Pydantic round-trip, no cross-language contract. The type lives in `shared/components/src/LogPanel/types.ts`; the populator lives in `apps/vscode/src/views/logPanelView.ts`; the consumer switch is in `LogEntry.tsx`. Two test files get extended. The expected diff is under 100 lines.

The `'tune'` variant is in the union today but not emitted by any populator in this feature. It's a reservation, not a promise — the actual tune-marker work needs a PROV-side signal that isn't wired up yet. Reserving the slot now means the follow-on feature is a one-line populator change rather than a union-widening refactor that touches every consumer.

## Key Decisions

- **Discriminator is UI-only.** `TimelineEntry` is projection, not schema. Adding `kind` to LinkML would overcommit — these entries exist to drive rendering, not to be persisted or exchanged with Python services.
- **Interim populator is a lookup, not a heuristic.** `resolveToolCategory(toolName).category === 'snapshot'` is the sole rule for emitting `'snapshot'`; everything else is `'tool'`. This keeps the current visual behaviour bit-for-bit identical and isolates the semantic refactor from any behaviour change.
- **`'tune'` is reserved but unpopulated.** The union carries it so that consumers — including the exhaustiveness guard — already have to account for it. When the PROV signal lands, we flip a populator branch, not a contract.
- **Exhaustiveness is enforced.** An `assertNeverKind` helper plus a `TIMELINE_ENTRY_KINDS` const array means any future addition to the union is a compile error at every consuming site. This is the entire point of the refactor: widening the set of entry kinds becomes a guided edit instead of a grep-and-hope.
- **No new dependencies, no schema change, no visible UI change.** If a reviewer sees a screenshot diff, something has gone wrong.

## What We'd Love Feedback On

Three open questions, in rough order of how much we'd like outside input:

1. **Is the reserved set right?** We've committed to `'snapshot' | 'tool' | 'tune'`. Other candidates we considered and didn't reserve: `'annotation'` (manual analyst notes), `'comment'` (free-text), `'import'` (file-load events). Reserving them now is cheap; widening the union later is cheap too, as long as every consumer uses the exhaustiveness helper. The risk of over-reserving is a union cluttered with aspirational values nobody populates. The risk of under-reserving is a union that needs to grow three times in the next quarter. We've erred on the side of reserving only what has a named upcoming feature behind it — curious whether that's the right calibration.

2. **Where should the exhaustiveness helper live?** `assertNeverKind` and `TIMELINE_ENTRY_KINDS` currently sit inside the LogPanel module. They could plausibly graduate to `@debrief/components`' public surface if the same pattern shows up elsewhere (and it probably will — any discriminated union ends up wanting the same two helpers). The argument for keeping them internal is "don't export utilities on speculation"; the argument for exporting is "the next discriminator shouldn't have to reinvent this." We're leaning internal for now.

3. **Soft sequencing with #207.** Backlog item #207 refactors the tool-manifest lookup that `resolveToolCategory` sits on top of. Both features touch `logPanelView.ts`. They don't semantically conflict — #208 adds a field downstream of whatever #207 returns — but whichever lands second will eat a small merge. No strong preference on order. Flagging it so nobody's surprised.

→ [Spec](../spec.md)
→ [Plan](../plan.md)
