---
title: "Building STAC Store Per-Item Folder Reorganization"
date: 2026-01-29
layout: future-post
author: Ian
track: credibility
excerpt: "A migration function that safely reorganizes legacy STAC stores to per-item folder structure."
tags:
  - migration
---

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

The Python debrief-stac service stores plots as STAC Items with GeoJSON payloads, and we've long assumed items should live in their own folders. But legacy stores created before this decision existed stored everything flat in a single catalog directory.

We built a migration function that converts those flat stores to the canonical per-item structure: each item gets its own folder containing `item.json`, associated GeoJSON data, and an `assets/` subfolder for source files. The function is idempotent—safe to run twice without corruption—and we've exposed it via JSON-RPC CLI so the Electron loader app can invoke it directly.

Eight migration tests cover typical and edge cases: empty stores, items without assets, mixed valid/invalid JSON. All pass. The VS Code extension test data is already migrated.

## How It Works

The interesting part is what *didn't* need to change. Our TypeScript `stacService` resolves asset paths relative to the item location. When we move an item folder from the flat catalog into its own subtree, those relative hrefs move with it—no rewriting needed.

We discovered that the original design decision to use per-item folders wasn't a guess about what would be nice; it was load-bearing infrastructure. Relative paths make items portable. They move with their assets. Constitution Article III (provenance: every transformation records lineage) now has structural support—source files live in `assets/` alongside the derived GeoJSON.

## Why This Matters

Until now, only new stores benefited from this structure. Legacy data remained fragile: if assets got separated from their item metadata during a file operation, there was no folder boundary to protect them. The migration closes that gap without touching any services. Existing code works with both flat and per-item stores because path resolution is relative.

## Lessons Learned

We expected this to be disruptive. Instead, it was invisible to consumers. That's not luck—it's a symptom of good design: the abstraction (path resolution via `stacService`) was doing its job, hiding implementation details.

The idempotent property emerged from simplicity: we check for the target structure before moving anything. No state machine, no markers. If the migration succeeds, running it again is a no-op.

## What's Next

This unblocks the broader STAC integration roadmap. Stores are now uniformly structured. Next up: schema validation to catch corrupted metadata before analysis, and tools for querying across multiple exercises to find patterns.

→ [See the spec](../spec.md)
→ [See the test contracts](../contracts/)
