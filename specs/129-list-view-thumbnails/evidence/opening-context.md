## What We're Building

About 70% of analyst sessions start the same way: reopen the exercise you were just working on. The remaining 30% involve scanning a list, recognising track patterns, and picking the right exercise from a filtered set. Both workflows need the same thing -- a list that shows enough context to make a decision without opening anything.

So this is the exercise list for the STAC Stack Browser. Each row shows the exercise title, a metadata summary (vessel classes, tags, author, duration), a date range, and a spatial thumbnail. The thumbnail is the interesting part: a miniature SVG rendering of the exercise's track patterns, generated client-side from the GeoJSON geometry stored in each STAC item. No pre-generated images, no server round-trips. The SVG adapts to whichever VS Code theme is active, so tracks stay legible in light mode, dark mode, and high contrast.

At the top of the list, a "Recently Opened" section surfaces the exercises the analyst has worked on recently, ordered by last-opened time with relative timestamps ("2 hours ago", "yesterday"). Below that, the full filtered list with a sort control offering three dimensions: recency, alphabetical, and duration. Each toggles between ascending and descending.

## How It Fits

This is #129 in the build sequence, part of Epic E08 (STAC Browser Discovery UI). It consumes the STAC extension properties and 100-item fixture set defined by #125, and will be filtered by the CQL2 engine from #126. The list is one of three synchronised views -- list, map, and timeline -- that share a common filter state. The synchronisation mechanism itself is #132; this component defines its contract with that shared state but does not implement it.

The component lives in `shared/components/` alongside CatalogOverview, FeatureList, and MapView. It receives data via props, sends user actions via typed postMessage, and knows nothing about VS Code or the extension host. Storybook-first development, same as every shared component.

## Key Decisions

- **SVG thumbnails rendered client-side from GeoJSON.** No image generation pipeline, no caching layer, no server dependency. The component reads the track geometry from each STAC item's linked GeoJSON, projects it into a small SVG viewport scaled to the item's bounding box, and renders it inline. This keeps the component fully offline and theme-adaptive.

- **Virtualised scrolling via @tanstack/react-virtual.** Already a project dependency from the FeatureList work. The list only renders items in and near the viewport, targeting smooth scrolling at 100+ items with sub-second initial render.

- **Sort state stays in the component, not in Zustand.** Sort preference is a UI concern local to this view. It does not affect the map or timeline, and it does not need to survive a panel close. Keeping it component-local avoids polluting the shared session state with view-specific configuration.

- **Recently opened items come from the extension host.** The `RecentPlotsService` already tracks recent exercises in VS Code workspace state. The list requests this data via postMessage on mount and receives updates when the list changes. No new persistence mechanism needed.

- **Following established CatalogOverview patterns.** VS Code CSS custom properties for theming, typed postMessage protocol for host communication, Storybook stories covering all theme variants and states (empty, loading, no-matches, populated). No architectural novelty -- deliberate reuse of patterns that work.
