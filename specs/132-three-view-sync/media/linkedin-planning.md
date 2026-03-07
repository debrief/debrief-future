We built four views for the Future Debrief Stack Browser -- filter bar, list, map, timeline. Each works independently. This week we are wiring them together.

Feature #132 adds a shared filter state layer. An analyst adds a metadata filter, zooms the map to a region, narrows the timeline to a date range -- and every view updates to show only exercises matching all three criteria. One source of truth, computed via AND intersection in a composition hook, distributed as props.

The interesting constraint: exercises with incomplete metadata (no bounding box, no timestamps) should not disappear from views where they could still be relevant. An exercise without coordinates cannot fail a spatial filter. It just does not participate in that axis.

Full planning post with technical details and open questions: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
