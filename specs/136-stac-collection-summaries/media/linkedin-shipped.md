---
title: "Shipped: STAC Collection Summaries"
date: 2026-03-07
feature: 136-stac-collection-summaries
type: linkedin-shipped
---

Shipped STAC Collection summaries for Future Debrief's Browser Discovery backend.

STAC catalogs now automatically promote to Collections with pre-aggregated metadata when analysts create plots. Temporal ranges, spatial extents, and property enumerations update incrementally on additions — zero individual items loaded for filter queries.

Key decisions: O(1) incremental updates for adds, full rebuild only for deletes. Atomic writes with cross-platform file locking. Backwards compatible with existing catalogs.

This enables the CQL2 filter engine and filter bar UI to populate dropdowns and ranges directly from Collection metadata. 32 new tests, all passing.

#maritime #geospatial #stac #typescript #python
