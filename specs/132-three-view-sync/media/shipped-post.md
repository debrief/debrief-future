---
layout: future-post
title: "Shipped: Three-View Synchronization and Filter State"
date: 2026-03-07
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac-browser, e08, synchronization, filter-state]
excerpt: "Four views, three filter axes, one shared truth -- the STAC Browser now filters once and updates everywhere"
---

## What We Built

The STAC Browser's four views -- filter bar, exercise list, map, and timeline -- now share a single filter state. Add a metadata filter, pan the map to the North Atlantic, drag the timeline to Q1 2025, and every view narrows to the intersection. Remove a filter, and they all widen back. There is one source of truth and no view operates on its own copy of the data.

The core of this is a `useBrowserFilter` composition hook that reads three filter axes from the Zustand session-state store -- metadata, spatial, temporal -- and computes their AND intersection. The result is a single `filteredItems` array, memoised with reference equality so downstream views only re-render when the actual set of matching exercises changes.

```tsx
import { StacBrowser } from '@debrief/components';

<StacBrowser
  items={items}
  taxonomy={taxonomy}
  onItemSelect={(itemPath) => openExercise(itemPath)}
/>
```

That is the entire integration surface. `StacBrowser` orchestrates `FilterBar`, `ExerciseListView`, `MapView`, and `TimelineView` internally, threading the synchronised filter state through to each child.

## What Changed Along the Way

The planning post said `CatalogOverview` would stay in the codebase for simple two-view scenarios. It didn't. Once the new `StacBrowser` component was working, keeping `CatalogOverview` around meant maintaining two orchestrators with overlapping responsibilities. We migrated all 24 references and removed it entirely. `StacBrowserItem` is now the single canonical exercise type -- `ExerciseListItem` extends it with just a `trackDataHref` field. No backward compatibility layer, no duplicate types.

The other unplanned change was a temporal type refactor. The timeline code had accumulated a mix of `Date` objects, ISO strings, and epoch numbers across different modules. Synchronising the temporal filter axis forced us to pick one representation. We went with plain epoch numbers everywhere -- 38 files touched, but the result is a consistent temporal type surface across the entire codebase.

## By the Numbers

| | |
|---|---|
| Tests passing | 1,248 |
| New hook tests | 27 |
| New component tests | 8 |
| New store slice tests | 14 |
| Files touched (epoch refactor) | 38 |
| CatalogOverview references migrated | 24 |

## Lessons Learned

**Reference equality matters more than I expected.** The naive implementation recomputed `filteredItems` on every render, which triggered cascading re-renders in the list's virtualised rows, the map's feature layer, and the timeline's bars -- all simultaneously. Adding reference-equality memoisation to the hook (only returning a new array reference when the actual contents change) eliminated the problem. This is the kind of thing you only discover when you wire four views to the same state.

**The "exercises without data" edge case needed a policy decision, not just a guard.** An exercise without a bounding box can't be tested against a spatial filter. The spec said such exercises should "pass" the spatial filter (not be penalised for missing data). But exercises without temporal data "fail" the temporal filter. The asymmetry felt inconsistent until we thought about it from the analyst's perspective: spatial metadata is often missing in older exercises, so excluding them would hide legitimate results. Temporal metadata is fundamental to what an exercise *is* -- if it has no dates, something is genuinely wrong. The policy is: spatial missing = pass, temporal missing = fail.

**Removing CatalogOverview was the right call, but it was not in the plan.** The planning post explicitly said it would stay. In practice, two orchestrators sharing the same child views but with different filter logic was a maintenance trap. Migrating 24 references took about an hour. Keeping both would have cost more than that in confusion over the following weeks.

## What's Next

The three-axis filter model is the foundation for the rest of Epic E08. The immediate next step is wiring real STAC catalog data through the browser -- right now, tests use fixture data. After that, the filter persistence question from the planning post is still open: should active filters survive a panel reload, or stay ephemeral?

> [See the evidence](https://github.com/debrief/debrief-future/tree/main/specs/132-three-view-sync/evidence)
