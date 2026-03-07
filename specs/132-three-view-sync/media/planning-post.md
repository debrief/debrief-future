---
layout: future-post
title: "Planning: Three-View Synchronization and Filter State"
date: 2026-03-07
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac-browser, e08, synchronization, filter-state]
excerpt: "Wiring the filter bar, list, map, and timeline into a single shared filter state so analysts filter once and see results everywhere"
---

## What We're Building

The Stack Browser now has four views -- a filter bar (#127), a list (#129), a map (#130), and a timeline (#131). Each one works. None of them talk to each other.

That changes with feature #132. We are adding a shared filter state layer that coordinates all four views through a single source of truth. When an analyst adds a metadata filter, zooms the map to the North Atlantic, or drags the timeline range to Q1 2024, every other view updates to show only the exercises that match. Filter once, see everywhere.

The core abstraction is a `useBrowserFilter` composition hook. It reads three filter axes from the Zustand session-state store -- metadata (which exercise IDs pass the CQL2 filter), spatial (the current map viewport), and temporal (the timeline range) -- and computes their AND intersection. The result is a single `filteredItems` array passed as props to each child view. When no exercises match, all views show the same empty state. No view operates on its own copy of the truth.

## How It Fits

This is the integration layer for Epic E08 (STAC Stack Browser Discovery UI). Features #126 through #131 built the individual views and the filter engine. Feature #132 wires them together.

A new `BrowserFilterSlice` joins the existing Zustand store alongside the spatial and temporal slices we already have. Rather than introduce a separate store (which would create dual-ownership of viewport state), we extend the established slice pattern. The CQL2 filter engine from #126 handles metadata evaluation. Bounding box intersection handles spatial. Epoch-range overlap handles temporal. No new dependencies.

A new `StacBrowser` component replaces `CatalogOverview` as the top-level orchestrator. `CatalogOverview` stays in the codebase -- it still works for simple two-view scenarios -- but the browser panel will switch to `StacBrowser` for the full four-view experience.

## Key Decisions

- **Extend the existing Zustand store, don't create a new one.** The session-state store already holds viewport and time filter state. Adding a `BrowserFilterSlice` follows the same pattern as every other slice. A separate store would mean two sources of truth for spatial state.

- **Compute the intersection in a hook, not in the store.** Zustand does not natively support derived state, and the computation depends on the full item array (which lives in React state, not store state). A `useMemo` inside `useBrowserFilter`, subscribed to three selectors, gives us reactivity without middleware.

- **150ms debounce on spatial only.** Map viewport changes fire continuously during pan and zoom -- the existing `ViewportTracker` already debounces at 150ms. Filter bar and timeline emit on discrete user actions (add a lozenge, release a drag handle), so no debounce needed there.

- **Exercises with missing data are not penalised.** An exercise without a bounding box cannot fail a spatial filter. An exercise without timestamps cannot fail a temporal filter. They are simply excluded from that axis and evaluated on the others. This prevents incomplete metadata from hiding exercises that would otherwise match.

- **New orchestrator, not an in-place refactor.** `CatalogOverview` was built for two views and one filter axis. Extending it to four views and three axes would make it unwieldy. A clean `StacBrowser` component gives us a clear boundary. Migration is explicit -- nothing breaks in the process.

- **AND logic across axes, always.** Metadata, spatial, and temporal filters compose with AND. An exercise must pass all active axes to appear. This is the behaviour analysts expect: narrowing a search should always narrow the results.

## What We'd Love Feedback On

- **Should clearing the map viewport reset the spatial filter entirely?** Currently, zooming out to show the full world effectively makes the spatial filter pass-through. An alternative is to add an explicit "clear spatial filter" action that decouples filtering from viewport position. Which feels more natural during an analysis workflow?

- **Filter persistence across sessions.** The current design treats filter state as ephemeral -- close the browser, lose the filters. Should we persist active filters to the session store so they survive panel reloads? The infrastructure is there, but it adds complexity around stale state.

- **Performance at scale.** The 200ms propagation target is tested against 500 exercises. If catalogs grow beyond that, the `useMemo` intersection computation may need optimization (e.g., pre-indexed spatial lookups). Is 500 a realistic upper bound for the near term, or should we plan for larger datasets now?

- **Filter feedback.** When three axes are active, it can be hard to tell which one is most restrictive. Should the UI indicate per-axis match counts (e.g., "12 pass metadata, 8 pass spatial, 3 pass all")? This would help analysts understand why their result set is small.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
