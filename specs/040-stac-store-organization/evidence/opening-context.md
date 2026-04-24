## What We're Building

Right now, when we save a plot to disk, we're storing items in a flat structure — all `.json` files and their `.geojson` data sitting together in a single `items/` directory. This works fine for the initial use case, but it doesn't scale. We're about to reorganize that store so each plot lives in its own folder, with space reserved for original source files alongside the STAC-compliant metadata.

The reorganization itself is straightforward: a Python migration function that detects old-style flat stores, moves files into per-item directories, creates an `assets/` subfolder in each, and updates all the internal references. Then we migrate the test data and expose the migration as a CLI command so users with legacy stores can upgrade at their own pace.

The real value isn't in the reorganization itself — it's what we've already built that depends on it. Our Python STAC service already creates stores in this hierarchical format. Our VS Code extension tests are built around test data that should follow the same layout. And most importantly, Constitution Article III requires us to preserve provenance: the original source files (REP files, exercise data, whatever format users bring) should be kept intact alongside derived products. The flat layout has nowhere to put those. The per-item folders do.

## How It Fits

This is the unsexy infrastructure work that sits between what we've built and what scientists can do with it. The debrief-stac service (tracer bullet item #001) already handles per-item folders when creating new plots. The test data for VS Code (item #035) is still using the old flat layout. We need them to converge.

More importantly, storing everything in one place — source files, STAC metadata, derived GeoJSON — is how we satisfy the Constitution's provenance requirements. It's how a scientist can hand a plot to a colleague and say "here's everything you need to understand where this came from." Later, when we build collaboration and export workflows, that unified folder structure becomes the atom of sharing.

## Key Decisions

**Migration is idempotent and optional.** We're not forcing anyone to upgrade immediately. The migration function detects whether a store is already in the new format and skips migrated items. Run it twice on the same store, nothing breaks.

**Python library, no new dependencies.** The migration uses only Python standard library — `json`, `pathlib`, `shutil`. No additional imports, no external tools. It's portable and testable in isolation.

**Assets folder is optional but required by default.** Each item folder will have an `assets/` subdirectory, created empty during migration. This is reserved space for source files and supplementary data. It costs nothing now and provides structure for later.

**Relative hrefs stay relative.** The STAC item JSON includes `href` links to its GeoJSON data file. When we move the item into a subfolder, those hrefs stay the same relative to the item — `./exercise-alpha.geojson` was a sibling in the flat structure, and it still is in the new structure. Same relative path, same file.

**TypeScript stacService doesn't change.** Our VS Code extension uses a simple path resolver that handles relative hrefs and catalog nesting. The new folder layout is just deeper nesting — the resolver already handles it. We don't need new code, just new test data.
