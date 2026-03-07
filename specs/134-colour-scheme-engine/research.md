# Research: Colour Scheme Engine with Legend (#134)

**Date**: 2026-03-07
**Feature Branch**: `134-colour-scheme-engine`

## Decision 1: Component Architecture — Headless Engine + Render Components

**Decision**: Implement as a headless colour engine module (pure functions + types) consumed by thin React components (ColourDimensionSelector, ColourLegend).

**Rationale**:
- Constitution Art. IV mandates thick services, thin frontends — the colour logic (palette generation, dimension mapping, gradient interpolation) belongs in a pure module, not embedded in React components.
- The map view (#130) expects a pre-computed `ReadonlyMap<string, string>` while the timeline (#131) expects a `ColourFn`. Both can be derived from the same engine output.
- Headless approach enables unit testing of all colour logic without React rendering.

**Alternatives considered**:
- **React Context provider only**: Would couple colour logic to React lifecycle; harder to test and reuse.
- **Zustand store with computed selectors**: Adds store complexity; colour computation is stateless — given items + dimension, output is deterministic.

## Decision 2: Integration Pattern — Dual Export (colorMap + colourFn)

**Decision**: The engine exports two consumption functions that wrap the same core logic:
1. `computeColorMap(items, dimension) → ReadonlyMap<string, string>` for the map (#130)
2. `makeColourFn(dimension) → ColourFn` for the timeline (#131)

**Rationale**:
- #130's `CatalogOverviewProps.colorMap` expects a pre-computed map (zero render-loop overhead).
- #131's `TimelineViewProps.colourFn` expects a function `(item) => string | null`.
- Both derive from the same dimension + palette, so a single internal `resolveColour(item, dimension, palette)` function powers both.

**Alternatives considered**:
- **Single function-based API only**: Would require the map to call the function per-item during render — contradicts the memoisation strategy in #130's safety requirements.
- **Single map-based API only**: Timeline would need to pre-compute and pass a map; less ergonomic for the function-based prop.

## Decision 3: Colour Palette Strategy

**Decision**: Use a curated 12-colour categorical palette with automatic recycling beyond 12 categories. Age dimension uses a two-stop gradient (faded → vivid) interpolated linearly.

**Rationale**:
- 12 colours is a well-established limit for categorical perception (research by Ware, 2004). Beyond 12, human ability to distinguish colours degrades.
- For >12 categories, cycle through the palette with alternating lightness/saturation shifts to maintain some distinctiveness.
- The age gradient uses a single hue (e.g., blue) from low to high saturation, avoiding the "rainbow effect" that misleads perception of continuous data.

**Alternatives considered**:
- **D3 colour scales**: Would add a dependency; the palette is small enough to hand-curate (Constitution Art. IX — minimal dependencies).
- **User-configurable palettes**: Deferred to a future enhancement; initial palette is hardcoded but replaceable via the extensibility mechanism.

## Decision 4: State Management — Dimension Selection in Session State

**Decision**: Store the active colour dimension ID in the existing Zustand session-state store (or a lightweight React state at the CatalogOverview parent level if no session store exists yet).

**Rationale**:
- The colour dimension is session-scoped state (resets on reload, not persisted).
- Both map and timeline need to react to dimension changes — shared state ensures consistency.
- Zustand is already a project dependency (^5.0.0).

**Alternatives considered**:
- **React Context**: Would work but adds a provider layer; Zustand is already established.
- **URL query parameter**: Over-engineered for session state; no sharing/bookmarking requirement.

## Decision 5: Legend Component — Two Rendering Modes

**Decision**: A single `ColourLegend` React component that accepts a `LegendModel` and renders either a gradient bar (for continuous dimensions like Age) or discrete swatches (for categorical dimensions like Vessel Class, Tag).

**Rationale**:
- The spec requires two distinct visual representations (FR-012).
- A single component with mode switching is simpler than two separate components.
- The legend model (produced by the engine) determines the mode, keeping render logic minimal.

**Alternatives considered**:
- **Two separate components (GradientLegend, CategoricalLegend)**: More modular but adds unnecessary indirection for two modes of the same concept.

## Decision 6: Module Location

**Decision**: Place the colour engine in `shared/components/src/colour-engine/` alongside the existing filter-engine module.

**Rationale**:
- Follows established pattern — `filter-engine/` already exists as a headless module in `shared/components/src/`.
- Both map and timeline import from `shared/components/`, so the engine is accessible to both consumers.
- React components (selector, legend) live alongside as thin wrappers.

**Alternatives considered**:
- **Separate package (`shared/colour-engine/`)**: Over-engineered for the scope; the engine is tightly coupled to the Discovery UI components.
- **Inside CatalogOverview**: Would make it inaccessible to TimelineView without cross-component imports.

## Decision 7: Unclassified Item Handling

**Decision**: Items missing metadata for the active dimension receive a fixed neutral colour (grey). The legend always includes an "Unclassified" entry when any items lack metadata.

**Rationale**:
- The spec explicitly requires unclassified items to be visually distinct (FR-009).
- Using a fixed neutral colour (not part of the categorical palette) ensures it doesn't collide with assigned colours.
- Showing/hiding the "Unclassified" legend entry based on data presence avoids confusing the analyst when all items are classified.

## Decision 8: Extensibility Mechanism

**Decision**: Colour dimensions are registered via a `ColourDimensionRegistry` — an array of `ColourDimension` objects. New dimensions are added by pushing to the registry. The selector and legend automatically reflect registry contents.

**Rationale**:
- The spec requires new dimensions to appear without modifying existing code (FR-010, SC-005).
- A simple array-based registry is the minimum viable mechanism.
- Each `ColourDimension` provides: `id`, `label`, `type` (gradient/categorical), and a `resolve(item) → string | null` function.

**Alternatives considered**:
- **Plugin manifest / dynamic loading**: Over-engineered for the current scope; dimensions are known at build time.
- **Decorator pattern**: TypeScript decorators are experimental; a simple array is more straightforward.
