---
layout: future-post
title: "Planning: Filter Bar with Lozenge UI and AND/OR Logic"
date: 2026-03-06
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, discovery-ui, filtering]
excerpt: "Building the filter bar where analysts compose metadata queries by adding, editing, and dragging pill-shaped lozenges"
---

## What We're Building

A persistent filter bar that sits above the results views in the STAC Browser. Analysts add pill-shaped lozenges -- one per metadata filter -- and the results across the feature list, map, and timeline narrow in real time. Ten filter types covering vessel class, tags, nationality, duration, author, track name, title, plot contents, and folder/collection.

The interesting part is how filters compose. By default, every lozenge is AND'd with the others: "French nationality" plus "duration under 24 hours" means both conditions must hold. But analysts also need OR logic -- "show me exercises involving Type 23 frigates OR Type 45 destroyers." For that, we are building OR container lozenges. You drag existing lozenges into an OR group, or add new ones directly inside it. The container is AND'd with everything else at the top level, but its children combine with OR. One level of nesting only -- the SRD does not call for deeper nesting, and neither does the UI.

The whole filter state serialises to CQL2 JSON using the engine from #126. When saved filter configurations arrive in #128, they will persist these CQL2 expressions directly.

## How It Fits

This is part of Epic E08 (STAC Stack Browser Discovery UI) and builds directly on two features that are in flight. Feature #125 defines the STAC extension properties and the 100-item mock data set that the filter bar will operate against. Feature #126 provides the CQL2 filter engine -- the pure function that takes an array of STAC items and a filter expression and returns the matching subset.

The filter bar is a standalone component in `@debrief/components`. It does not modify existing components. The integration is compositional: the parent view renders the filter bar above the results views, the filter bar produces a filtered item list, and that list flows down to FeatureList, MapView, and Timeline via props. Existing components do not need to know that filtering exists.

## Key Decisions

- **Single Lozenge component, polymorphic value editors.** All ten filter types share the same pill-shaped shell -- type label, value label, remove button, click-to-edit. The difference is what opens when you click to edit. Vessel class gets a hierarchical dropdown showing the full taxonomy tree. Tags, nationality, author, and track name get flat dropdowns populated from the data set. Title and plot contents get free-text inputs. Duration gets a dropdown with five fixed buckets. One component, four input strategies.

- **@dnd-kit for drag-to-group.** We need accessible drag-and-drop that works with React 18, supports keyboard navigation, and can handle cross-container movement (top level to OR group and back). `@dnd-kit` fits all of those. `react-beautiful-dnd` is deprecated and broken in strict mode. Native HTML5 drag-and-drop has poor accessibility and no touch support. This is a new dependency for the project.

- **Component-local state, not the session store.** Filter state is transient discovery UI state -- it affects which items are shown, but it is not part of the document or plot state. The filter bar owns a `FilterExpression` (the type from #126) via `useReducer`, passes it to the CQL2 engine on every change, and hands the filtered results down. When #128 adds saved filters, it will persist `FilterExpression` objects to storage. No need to couple this to the session store now.

- **200ms debounce on edits, immediate on remove.** Free-text typing and dropdown selections are debounced at 200ms to avoid flicker. Removing a lozenge is a discrete action -- it takes effect immediately.

- **Dropdowns populate from the full data set, not the filtered subset.** If you have already filtered to French exercises, the nationality dropdown still shows all nationalities. This avoids the confusing experience of filter options disappearing as you narrow results.

- **Full keyboard and screen reader support.** Tab between lozenges and the add button. Enter/Space to open editors. Escape to dismiss. Arrow keys in dropdowns. `@dnd-kit` provides keyboard-driven drag via its KeyboardSensor. ARIA roles on the filter bar (`toolbar`), lozenges (`group`), and OR containers (`group`).

## What We'd Love Feedback On

- **OR group discoverability.** The OR group appears as an option in the add (+) button dropdown alongside the ten filter types. Is this obvious enough? We considered a separate "Group" button, but that adds chrome to the bar. Another option is only surfacing OR groups after a second filter of the same type is added.

- **Empty OR container behaviour.** When the last lozenge is dragged out of an OR container, the empty container stays visible with its mini (+) button. Should it auto-remove instead? Keeping it avoids accidental loss of the grouping structure, but it could look odd sitting there empty.

- **Hierarchical vessel class selection.** Selecting a parent node like "warship" matches all descendant types (frigates, destroyers, etc.). Should the lozenge display "Vessel Class: Warship (12 types)" or just "Vessel Class: Warship"? The count helps analysts understand the breadth of the filter, but it adds visual noise.

- **Multiple lozenges of the same type.** We allow it -- you can have two nationality lozenges AND'd together, though that would typically yield an empty result set. Should we warn when this happens, or is it better to let the "No matches" state speak for itself?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
