A sample catalog that stores "German" and "frigate" as separate flat lists can't answer "which plots have a German frigate" -- it doesn't know which nationality belongs to which vessel.

This week we're deleting our 63-item demo catalog and rebuilding it from scratch. Same source files, same import pipeline, but now every item carries structured per-platform records that bundle identity, nationality, vessel class, and domain together. No migration code -- a clean reimport through the current pipeline produces the right shape by construction.

It's the fifth step in the E10 epic (NL-Assisted Catalog Discovery). We've already built the platform registry, updated the schemas, and wired import-time validation for unregistered platforms. This regeneration produces the clean data foundation that everything downstream depends on -- CQL2 array filters, filter bar chips, natural language search all assume structured platform records exist in the catalog.

The enrichment uses a seeded RNG, so output is deterministic across runs. Thumbnails are out of scope (separate browser automation concern). Planning post covers the three-phase pipeline and the decisions behind it.

https://debrief.github.io/blog/planning-regenerate-sample-catalog

#FutureDebrief #MaritimeAnalysis #STAC
