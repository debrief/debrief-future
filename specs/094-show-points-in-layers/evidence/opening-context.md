## What We're Building

The Layers panel currently shows composite features as single entries — a track with 500 positions, a multi-point analysis result with 20 locations. You can select the whole thing, but you can't drill down to individual elements. This feature adds expand/collapse controls so analysts can browse and select specific positions in a track, individual points in a multi-point result, or polygons in a multi-polygon calculation output.

This matters because maritime analysis often involves comparing specific moments or locations within larger datasets. "Show me position 347 in track NELSON" or "select the third exclusion zone from this buffer calculation" shouldn't require custom tooling — it should be a natural part of browsing your data.

## How It Fits

We already built the foundation in feature 053 (nested child selection), which established the selection path model. That feature focused on what happens when you select a position on the map. This feature completes the loop by making those same selections discoverable and actionable in the Layers panel itself.

We're also building on feature 048's position metadata work, which means expanded child entries can show timestamps, coordinates, or other contextual information inline — not just "Position 1, Position 2, Position 3."

## Key Decisions

- **Flattened tree, not nested scroll.** We're using a single virtualizer with a `flattenFeatures()` utility that computes visible rows on-demand. Expand a track with 500 positions, and those 500 rows slot into the virtualised list. Collapse it, and they disappear. The virtualizer handles the heavy lifting.

- **Two new level names: `points` and `polygons`.** Tracks already use `positions` and `segments` from feature 053. Multi-point and multi-polygon results needed their own path segments, added to the selection path registry and consistent with GeoJSON terminology.

- **No cross-package path construction.** The FeatureList component lives in `shared/components`, which can't depend on `session-state`. Selection paths are built via simple string concatenation, using the same pattern that already works for positions. The session-state store validates and normalises these paths when they arrive.

- **Expansion state is ephemeral.** We're not persisting which features are expanded/collapsed. It's UI affordance, not analysis state. If you reload the panel, everything starts collapsed.

- **Child labels from timestamps or indices.** For track positions, we show timestamps. For multi-point and multi-polygon results, we use indexed labels. If richer metadata exists, we use that instead.
