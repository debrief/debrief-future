How do you build a filter UI when the backend does not exist yet?

For Future Debrief's STAC Browser, we are writing a CQL2 filter engine that runs entirely in the browser. Nine filter types -- vessel class, tags, nationality, duration, and more -- evaluated against in-memory STAC item arrays. AND/OR logic, hierarchical vessel taxonomy expansion, duration computed on the fly from temporal properties.

The key decision: adopt CQL2 (the OGC query standard) from the start rather than inventing a bespoke filter model. Filter expressions serialise to CQL2 JSON. When a production STAC API arrives, the same expressions work against it directly. No rewrite, no translation layer.

Built on cql2-filters-parser (zero-dependency TypeScript CQL2 parser) with a thin evaluator on top. Simple matcher functions per filter type, pre-computed taxonomy lookups, deterministic evaluation under 10ms for 100 items.

Read the full planning post: [link]

#FutureDebrief #CQL2 #OpenSource
