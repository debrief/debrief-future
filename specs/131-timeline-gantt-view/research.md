# Research: Timeline/Gantt View with Temporal Filtering

**Feature**: 131-timeline-gantt-view
**Date**: 2026-03-06

## R1: Time Range Interaction Model

**Decision**: Draggable brush overlay on the SVG time axis

**Rationale**: The CatalogOverview component already renders an SVG-based timeline. Adding a semi-transparent "brush" rectangle with draggable left/right edge handles is the standard Gantt chart interaction pattern. Users drag handles to narrow the time range, or drag the brush body to pan. This avoids introducing a new dependency — the SVG is already in place and DOM-based interactions are well-understood.

**Alternatives considered**:
- **Separate time input fields**: Precise but disrupts visual flow; better as a secondary mechanism
- **Mouse wheel zoom on timeline**: Intuitive for zooming but doesn't provide clear selection boundaries; could be added later as enhancement
- **d3-brush library**: Powerful but introduces a large dependency; the interaction is simple enough to implement with pointer events on SVG elements

## R2: Temporal Filter Integration with Shared State

**Decision**: Timeline emits a `TemporalFilter` object (`{ start: number; end: number } | null`) to the shared filter state store defined by #132

**Rationale**: The three-view synchronisation (#132) specifies a shared filter state store (likely Zustand) that all views subscribe to. The timeline owns temporal filtering — it writes temporal filter state, and the list/map views read it. Using `null` to represent "no temporal filter" (full range visible) is consistent with the existing `FilterExpression` model where empty expressions match all items. Epoch milliseconds match `parseTime()` output from CatalogOverview.

**Alternatives considered**:
- **ISO 8601 strings**: More readable but requires parsing at every consumer; epoch ms is more efficient
- **CQL2 temporal predicate**: Semantically correct but over-engineered for client-side filtering; CQL2 serialisation can happen at the store level when needed
- **Direct callback between components**: Tight coupling; violates the shared-state pattern established by #132

## R3: Reuse of CatalogOverview Timeline Helpers

**Decision**: Extract helpers into a shared `timeline-utils.ts` module, consumed by both CatalogOverview and the new TimelineView

**Rationale**: The CatalogOverview component contains `parseTime`, `computeTimeRange`, `formatDate`, `formatDateRange`, and bar positioning math as internal functions. The timeline.test.ts file already duplicates these for testing. Extracting them enables reuse without modifying the existing CatalogOverview component's behavior. The existing tests in `__tests__/timeline.test.ts` already validate these helpers.

**Helpers to extract**:
- `parseTime(s: string | null): number | null`
- `computeTimeRange(items: Item[]): TimeRange | null`
- `computeBarX(epoch, range, chartWidth): number`
- `computeBarWidth(start, end, range, chartWidth): number`
- `formatDate(epoch: number): string`
- `formatDateRange(start, end, datetime): string`

**Alternatives considered**:
- **Inline duplication**: Quick but violates DRY; divergence risk
- **Import from CatalogOverview**: Functions are not exported; would require refactoring that component

## R4: Data Item Type

**Decision**: Use `StacBrowserItem` (from filter-engine/types.ts) as the item type for the timeline view

**Rationale**: `StacBrowserItem` extends `CatalogOverviewItem` with all STAC extension properties (`vesselClasses`, `tags`, `author`, etc.). The timeline needs `startDatetime`, `endDatetime`, `datetime` (from `CatalogOverviewItem`) for bar positioning, plus extension properties for colour scheme support (#134). Using the same type as the filter engine ensures consistency across all three views.

**Alternatives considered**:
- **CatalogOverviewItem only**: Insufficient — no extension properties for colour scheme
- **New timeline-specific type**: Unnecessary fragmentation; `StacBrowserItem` already has everything needed

## R5: Colour Scheme Integration

**Decision**: Accept an optional `colourFn: (item: StacBrowserItem) => string | null` prop

**Rationale**: The colour scheme engine (#134) is a separate feature that maps exercise metadata to colours. The timeline should accept colours via a function prop, making it independent of #134's implementation. When no colour function is provided, bars use the default theme colour (consistent with current CatalogOverview). This is the standard React pattern for externally-driven styling.

**Alternatives considered**:
- **Direct Zustand subscription to colour state**: Tight coupling to #134's implementation
- **CSS custom properties per item**: Complex; doesn't scale to 100+ items with per-item colours
- **Colour as a property on StacBrowserItem**: Mixes display concerns with data model

## R6: Vertical Scrolling Strategy

**Decision**: Scrollable item row container with fixed time axis

**Rationale**: With 100+ exercises, the timeline must scroll vertically. The time axis (at bottom) should remain fixed so users can always reference the scale. This is achieved by rendering the time axis in a separate fixed-position container below the scrollable SVG area. The existing CatalogOverview doesn't handle large lists (it renders all items at full height) — this is a new requirement.

**Alternatives considered**:
- **Virtual scrolling (react-virtual)**: More performant for 1000+ items but introduces complexity for SVG rendering; overkill for 100-item target
- **Pagination**: Disrupts the visual Gantt overview; defeats the purpose of the timeline

## R7: Time Axis Formatting

**Decision**: Multi-granularity time axis labels based on range span

**Rationale**: The time axis must be readable whether showing 6 hours or 10 years. Use the following heuristic for tick label format:
- Range < 24h: HH:mm
- Range < 7d: ddd HH:mm
- Range < 90d: dd MMM
- Range < 2y: MMM yyyy
- Range >= 2y: yyyy

This adapts the existing `formatDate()` helper with range-aware formatting. ISO 8601 compliance is maintained via standard `Intl.DateTimeFormat`.

**Alternatives considered**:
- **Fixed format (always full date)**: Unreadable for short ranges
- **d3-time-scale**: Excellent formatting but large dependency
- **User-selectable format**: Over-engineering for the current scope

## R8: Performance Target Validation

**Decision**: 100 items target validated against existing CatalogOverview "Many Items" story

**Rationale**: The CatalogOverview Storybook story `ManyItems` already renders 50 items. SVG rendering of 100 bars + labels + tooltips is well within browser SVG performance limits. The interactive brush overlay adds minimal overhead (3 extra SVG elements). The 200ms filter update target (SC-002) is achievable because the filter engine's `filter()` method performs a simple array filter — O(n) where n is item count.

**Alternatives considered**:
- **Canvas rendering**: Better for 1000+ items but loses DOM tooltip and event handling; premature optimisation
- **WebGL**: Overkill; introduces heavy dependency for simple rectangle rendering
