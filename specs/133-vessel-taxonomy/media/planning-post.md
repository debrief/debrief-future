---
layout: future-post
title: "Planning: Vessel Taxonomy and Hierarchical Filtering"
date: 2026-03-07
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, discovery-ui, filtering, vessel-taxonomy]
excerpt: "Making the vessel class filter actually usable with readable labels, in-menu search, and live match counts"
---

## What We're Building

The vessel class dropdown in the filter bar currently works -- you can navigate the four-level taxonomy (domain, role, class, type) and select a node. But once you select "Type 23 Frigate", the lozenge shows `surface/warship/frigate/type23`. Not great. And with 20+ vessel types spread across four levels, finding the one you want means clicking through nested menus even when you already know you want an Astute-class SSN.

This week we are fixing that. Three improvements to the vessel class filter:

**Human-readable labels everywhere.** Lozenges display "Type 23 Frigate" instead of the raw path. When you click to re-edit, the previously selected node is marked with a check. A label resolver utility does an O(1) lookup against a pre-computed map from the taxonomy JSON -- no tree traversal at render time.

**Type-ahead search in the dropdown.** A search input appears at the top of the cascading menu. Type "ast" and the tree collapses to show only Astute-class SSN and its ancestor path. The search wrapper (`SearchableCascadingMenu`) sits around the existing `CascadingMenu` rather than modifying it -- the base component already manages seven state variables and does not need search logic mixed in.

**Per-node match counts.** Each taxonomy node shows how many exercises in the current data set match that subtree. "Warship (26)" tells you there are 26 exercises involving any warship type. "Type 23 Frigate (12)" tells you twelve of those are specifically Type 23. Nodes with zero matches are dimmed and not selectable, so analysts never make a dead-end filter selection.

## How It Fits

This is part of Epic E08 (STAC Stack Browser Discovery UI) and builds directly on two shipped features. Feature #125 defined the vessel taxonomy -- the JSON file with 20+ vessel types in a four-level hierarchy. Feature #127 built the FilterBar, CascadingMenu, and the `taxonomyToCascadingItems` adapter that wires them together. The plumbing is there. This feature makes it usable.

All changes are within the `shared/components` package. About six new or modified source files plus tests. No new npm dependencies -- everything is built with React and the existing filter engine.

## Key Decisions

- **SearchableCascadingMenu wrapper, not modifying CascadingMenu.** The base menu component handles positioning, highlight tracking, hover timeouts, and keyboard navigation. Adding search would mean mixing tree-filtering logic into that state machine. A wrapper keeps the concerns separate and makes search opt-in. The recursive tree filter (`filterCascadingItems`) is a pure function tested independently.

- **Separate `useTaxonomyMatchCounts` hook.** The existing `useDistinctValues` hook extracts flat lists of available values per filter type. Match counting is fundamentally different -- it is hierarchical, it needs the descendant map, and its return type is `Map<string, number>` rather than `string[]`. A dedicated hook keeps single responsibility clear.

- **Label resolver as a standalone utility.** Labels need resolving in several places: the lozenge display, the editor's current-selection marking, eventually tooltips. A pre-computed `Map<string, string>` (built once, memoized) is cleaner than walking the tree on every render.

- **`badge` prop on CascadingMenuItem, not `matchCount`.** A string badge ("(12)", "(0)") is more flexible than a numeric prop. The menu does not need to know these numbers represent filter counts -- it just renders the badge. Keeps the component decoupled from filter semantics.

- **Counts reflect the filtered data set.** If a nationality filter is active, the vessel class counts show how many of the filtered exercises match each type. This makes the counts genuinely useful for iterative filtering rather than just showing totals.

- **Zero new dependencies.** The taxonomy JSON, the filter engine's `buildDescendantMap()`, and React are all that is needed.

## What We'd Love Feedback On

- **What should "zero matches" look like?** Currently the plan is to show zero-count nodes dimmed with "(0)" rather than hiding them. Hiding nodes changes the tree structure as you filter, which could be disorienting if you expect to see certain categories. But dimmed-but-visible nodes take up space. Which is less confusing?

- **Taxonomy extensibility.** Adding a vessel type means editing `vessel-taxonomy.json` -- no code changes. Is this sufficient, or should there be a UI for it? The current answer is that taxonomy changes are infrequent enough to be a JSON edit, but we are curious whether analysts would want to maintain their own vessel type lists.

- **Search scope.** Currently search filters by label text only. Should it also match against the path (so searching "warship" surfaces all warship descendants even if "warship" is not in their label)? This would help analysts who think in terms of the hierarchy rather than specific type names.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
