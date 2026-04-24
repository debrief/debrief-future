## What We're Building

The platform registry (#180) is in place -- ten known platforms organised in a vessel class tree, queryable by nationality, domain, vessel type. But it only works if the registry actually contains every platform in your data. Load a legacy file with a platform called `AMBUSH` and nothing tells you it's missing from the registry. Your next "show me all UK submarines" query silently omits it.

This week we're adding a post-parse validation step to the import pipeline. After `import_legacy_data()` parses a REP or DPF file, it checks every extracted platform identifier against the registry. Unregistered platforms produce advisory warnings -- the import always succeeds, but the analyst gets a clear list of platforms needing registry entries.

The key word is "advisory". We never block an import because of missing metadata. The data gets in, the warnings tell you what to clean up, and the registry gradually becomes comprehensive as new exercises are loaded. It's a quality ratchet, not a gate.

## How It Fits

This is item 3 of 11 in the E10 epic (NL-Assisted Catalog Discovery). The sequence is deliberate: #180 built the registry, #181 updated the schemas to carry registry-derived fields, and now #182 connects the registry to the point where new data enters the system. Downstream, #183 will resolve platform metadata at save time and #184 will regenerate the sample catalog with proper vessel class data -- but neither of those features works well if the registry has gaps nobody knows about.

The validation sits inside `import_legacy_data()`, which is the single entry point for all format handlers. One check point covers REP and DPF files today, and any new format handler added later gets platform validation for free. The import function already returns a result object with a warnings list, so there's no new API surface -- just new warning types flowing through the existing channel.

The registry itself is loaded via `debrief-data`, the in-repo workspace package we created in #180. That package already exposes `load_registry()` and `resolve_platform()`. The new validation code is a thin consumer: load registry, iterate platform IDs, check each one.

## Key Decisions

- **Validation inside `import_legacy_data()`, not per-parser** -- each format parser (REP, DPF) extracts platform IDs, but the registry check happens after parsing completes. This avoids duplicating validation logic across parsers and means new format handlers get it automatically.
- **Deduplicated warnings** -- if a file contains 500 track positions for `AMBUSH`, you get one `UNREGISTERED_PLATFORM` warning for that file, not 500. The deduplication is per platform per source file. Clear signal, no noise.
- **Graceful registry load failure** -- if the registry JSON is missing or corrupt, the import still succeeds. A single `REGISTRY_UNAVAILABLE` warning tells the analyst that platform validation was skipped. We never fail an import because of a metadata subsystem problem.
- **Two warning codes, existing convention** -- `UNREGISTERED_PLATFORM` and `REGISTRY_UNAVAILABLE` follow the same pattern as existing import warnings. No new warning infrastructure needed.
- **Test-driven implementation** -- unit tests for the validation logic in isolation (given these platform IDs and this registry, expect these warnings), plus integration tests that run the full import pipeline with files containing unknown platforms. Both layers need to pass before merge.
