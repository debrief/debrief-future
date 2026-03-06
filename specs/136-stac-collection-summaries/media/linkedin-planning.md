How do you populate nine filter dropdowns without reading every file in the catalog?

You pre-aggregate. In Future Debrief's STAC Browser backend, we're promoting Catalogs to Collections -- a STAC superset that adds temporal extent, spatial bounding box, and property enumerations maintained incrementally as items are added. One JSON read gives the filter bar everything it needs: date ranges, vessel classes present, nationalities, tags, track names.

The key trade-off: additions are O(1) (expand bounds, union sets), deletions require full recomputation (O(N) scan of remaining items). Since analysts add far more often than they delete, this keeps the common path fast without maintaining reference counts or inverse indexes.

No new dependencies. Lazy promotion means pre-existing catalogs upgrade transparently on next write. Pairs with the CQL2 filter engine (#126) -- summaries populate the UI, CQL2 filters the results.

Read the full planning post: [link]

#FutureDebrief #STAC #OpenSource
