---
layout: future-post
title: "Planning: STAC File Tree Component"
date: 2026-02-10
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac, provenance, shared-components, ui]
excerpt: "A shared React tree view that makes the STAC storage layer visible -- showing what files exist and what just changed."
---

## What We're Building

Run an interpolation on a track, create a snapshot, export a calculation result -- each of these operations writes files to the STAC catalog. Right now, those files are invisible. The analyst trusts that something happened because the map updated, but there's no direct view into what the operation actually produced on disk. Which files were created? Where did the snapshot land? Is the catalog growing in the way you'd expect?

We're adding a file tree component that renders the STAC catalog's directory structure as a collapsible sidebar panel. Catalogs, collections, items, and assets appear in their natural hierarchy. Expand a node, see its children. Double-click a STAC Item, open the plot. After a snapshot operation, the new files are highlighted so you can tell at a glance what just changed without remembering what was there before.

The component is shared across all our frontends. It works in the VS Code extension backed by the real filesystem, in the web-shell demo backed by an in-memory filesystem, and in Storybook for isolated development. Same React component, same behaviour, different storage underneath.

## How It Fits

This is the visual layer on top of the provenance infrastructure we've been building over the past few features. The PROV schema (#070) defines how change history is structured. The log recording service (#071) captures tool executions. Snapshots (#074) create checkpoint files at meaningful moments. The file tree is how an analyst actually sees that this machinery is doing its job -- a concrete, browsable view of the artifacts their work produces.

It joins our existing shared component library alongside FeatureList and CatalogOverview, and slots into the web-shell sidebar above the ActivityPanel. In the VS Code extension, the same component will connect to the real STAC store through a thin adapter.

## Key Decisions

- **Filesystem adapter pattern**: The component accepts an injected adapter with three methods -- read directory contents, get file stats, read file content. In VS Code, the adapter wraps Node.js `fs`. In the browser, it wraps memfs (an in-memory filesystem). The component never knows which one it's talking to. This keeps the React tree pure and testable without mocking filesystem internals.

- **Custom recursive tree, no third-party library**: We looked at existing tree components but chose to hand-roll one. Our needs are specific (STAC-aware node types, highlight propagation, lazy loading) and our existing components already follow this pattern. Adding a tree library would be the first third-party UI dependency in the shared component package.

- **memfs as devDependency only**: The in-memory filesystem is used in Storybook stories and the web-shell demo, but it's never bundled into production builds. Zero runtime overhead for VS Code extension users. Storybook stories pre-load memfs volumes with realistic STAC catalog structures so developers and stakeholders can interact with the tree without needing real data.

- **Lazy expansion with caching**: When you click to expand a node, the adapter reads that directory's contents at that moment. The results are cached so re-collapsing and re-expanding is instant. A `refreshKey` prop lets the parent force a full cache clear -- typically triggered after a snapshot creates new files.

- **Highlight propagation to collapsed ancestors**: When new files appear inside a collapsed subtree, the parent node shows a visual indicator that something changed below it. The component computes ancestor paths from the highlight set automatically. An analyst scanning a large catalog can spot which branches contain new work without expanding every node.

- **BEM classes with CSS custom properties**: Styling uses the existing `--debrief-*` design token system. No CSS-in-JS, no scoped modules -- just BEM class names and custom properties that inherit from whatever theme the host environment provides. Works in VS Code's dark and light themes, the web-shell, and Storybook's theme switcher without any environment-specific overrides.

## What We'd Love Feedback On

- **Node type detection**: We're identifying catalogs, collections, and items by scanning for `catalog.json`, `collection.json`, or `item.json` in each directory. This means a `readFile` call per expanded directory to check what kind of STAC entity it is. Should we instead rely on naming conventions or directory depth to reduce filesystem reads?

- **Refresh strategy**: Currently, the parent component is responsible for bumping a `refreshKey` to tell the tree that the catalog changed. An alternative is filesystem watching, where the tree detects changes itself. Watching adds complexity (especially cross-platform) but removes the coordination burden from the parent. Which trade-off makes more sense for typical analysis workflows?

- **Highlight lifetime**: After a snapshot highlights new files, when should those highlights clear? Options include: clear on next expand (the analyst has seen them), clear on next snapshot (a new operation replaces the old highlights), or clear only when the parent explicitly resets them. Each has different implications for analysts who step away mid-session and come back later.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
