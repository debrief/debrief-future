Filtering 100 naval exercises by vessel class, nationality, duration, tags, and five other dimensions -- entirely in the browser, no backend required.

We shipped a client-side CQL2 filter engine for Future Debrief's STAC Browser. It speaks OGC CQL2 JSON natively, meaning the same filter expressions that work against mock data in Storybook today will work against a production STAC API later. No rewrite needed.

The part I find most satisfying: hierarchical vessel taxonomy. Filter on "warship" and the engine automatically matches frigates, destroyers, carriers -- every descendant class. The taxonomy tree is walked once at construction time, so filtering stays fast regardless of how deep the hierarchy goes.

Nine filter types, AND/OR composition, 74 tests across 5 suites, one external dependency. Pure function: items in, filtered items out.

[Read the full post](https://debrief.github.io/blog/shipped-cql2-filter-engine)

#FutureDebrief #MaritimeAnalysis #CQL2
