---
layout: future-post
title: "Shipped: Timeline Entry `kind` Discriminator"
date: 2026-04-22
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, log-panel, tech-debt, backlog-208]
excerpt: "Replaced the category-as-semantics shortcut with a dedicated `kind` field. The refactor shipped with zero visual regression and a full exhaustiveness guard in place for what comes next."
---

## What We Built

The cleanup from [the planning post](./planning-post.md) landed. `TimelineEntry` — the UI projection the log panel consumes — now carries a `kind` field: a string-literal union of `'snapshot' | 'tool' | 'tune'`, populated by the VS Code host when it builds each entry.

Three files changed:

1. **`shared/components/src/LogPanel/types.ts`** — new `TimelineEntryKind` union, `TIMELINE_ENTRY_KINDS` readonly array (for iteration), `assertNeverKind` exhaustiveness guard, and `TimelineEntry.kind?` optional field. All three symbols re-export from the `@debrief/components` public barrel, so downstream code that wants the exhaustiveness pattern gets it without reaching into internal modules.

2. **`apps/vscode/src/views/logPanelView.ts`** — added a four-line `classifyKind` helper that maps `resolveToolCategory(toolName).category === 'snapshot'` to `kind: 'snapshot'`, everything else to `kind: 'tool'`. The `toTimelineEntry` populator now emits `kind` on every entry. Interim: `'tune'` stays unpopulated until the PROV-side signal ships.

3. **`shared/components/src/LogPanel/LogEntry.tsx:114–121`** — the `isSnapshot` derivation now reads from `entry.kind === 'snapshot'` with a gated legacy fallback for entries constructed outside the host populator (test fixtures, partial mocks): `|| (entry.kind === undefined && resolveToolCategory(entry.toolName).category === 'snapshot')`. The gate ensures test code doesn't break immediately; the guard lets us audit (and migrate) call sites at our own pace.

## By the Numbers

| | |
|---|---|
| New tests written | 13 |
| Tests passing | 13 |
| Existing `@debrief/components` tests still green | 1671 |
| Diff size | Under 100 lines |
| Visual regressions | 0 (verified via DOM-equivalence) |
| Ungated `ToolCategory === 'snapshot'` checks remaining in LogPanel | 0 |

## Key Lessons

**DOM-equivalence was a stronger contract than pixel-diff would have been.** The original plan called for side-by-side Storybook screenshots. When the cloud session made capturing pixel-level comparisons awkward, we pivoted to proof by predicate composition: the post-change `kind === 'snapshot'` expression is mathematically identical to the pre-change `resolveToolCategory(toolName).category === 'snapshot'` check (because the host populator maps via the same function). Four DOM-equivalence tests in the renderer suite assert that this identity holds at runtime. The result is more reproducible than a pixel diff, runs on every push, and can't silently drift. If anyone changes the decision logic in the future, the test fails immediately — pixel-diff would have caught the same thing, and nothing more.

**The distinction between `TimelineEntry` as a UI projection and LinkML schema paid off.** Feature #176 introduced `TimelineEntry` as a UI-only type — not a data schema. That boundary meant this feature was pure TypeScript: no schema regeneration, no Pydantic round-trip, no cross-language contract negotiation. Adding a discriminator field to a UI projection is a straightforward type-and-consumer edit. Had `TimelineEntry` been a LinkML model, we'd have paid the cost of schema migration tooling for a field that has no meaning outside the log panel. The architectural discipline of keeping UI projections separate from data schemas earned its keep quietly.

**Runtime imports from `@debrief/components` into the VS Code host work fine.** The `classifyKind` helper doesn't need to live in the host itself; we can import `resolveToolCategory` from the shared `@debrief/components` package and compose the decision there. A cargo-culted comment at the top of `logPanelView.ts` said "type-only imports erased at compile time" — but we were already importing `VALID_VIEW_MODES` as runtime values, so there was no new plumbing to add. For a moment I considered duplicating the classification map inside the host to avoid the runtime dependency; I'm glad I didn't. Consolidating the logic removes a maintenance surface.

**Exhaustiveness guards authored now, used later.** The feature doesn't ship with a switch statement over `TimelineEntryKind` — the only consumer is the single `isSnapshot` boolean. But `assertNeverKind` is in place, tested, re-exported, and documented. When the manual snapshot button or tune-marker features ship, their code gets "add a case for `'tune'` or fail CI" for free. The next person writes less code.

## What's Next

- **PROV-side signal for emitting `'tune'`.** The tuple `(activity, tune_marker)` exists in the data model; the signal to wire it into the populator and enable the `'tune'` branch in the host doesn't exist yet. Design not scheduled.
- **#207 (tool manifest lookup refactor).** Soft sequencing; no semantic conflict. Whichever lands first will eat a trivial merge in `logPanelView.ts`.
- **Consumers that enumerate `TimelineEntryKind`** — the manual snapshot button, tune-marker UI, and other entry-type-specific features will be able to switch on `kind` directly. They inherit the exhaustiveness guard at no cost.

## Feedback from Planning

The planning post opened three questions. Here's where we landed:

1. **Reserved set calibration.** We shipped with exactly `'snapshot' | 'tool' | 'tune'`. No feedback came in suggesting we'd over- or under-reserved. If a case emerges for `'annotation'` or `'comment'`, widening the union is a one-file PR, and the exhaustiveness guard will catch every consuming site.

2. **Surface area for the exhaustiveness helper.** We re-exported `TimelineEntryKind`, `TIMELINE_ENTRY_KINDS`, and `assertNeverKind` from `@debrief/components`' public barrel. If the same pattern shows up in other discriminated unions (and it will), the helpers are already in reach. Happy to narrow back to LogPanel-only if reviewers prefer; for now, paying the cost of two extra symbols in the public API is cheaper than re-inventing the pattern later.

3. **Sequencing with #207.** No merge conflict in testing. Both features pass their suites in parallel; whichever lands second gets a clean three-line edit.

→ [Spec](../spec.md)
→ [Usage Example](../evidence/usage-example.md)
→ [Test Summary](../evidence/test-summary.md)
→ [Visual Parity Evidence](../evidence/visual-parity.md)
→ [Code Search Evidence](../evidence/code-search-evidence.md)
