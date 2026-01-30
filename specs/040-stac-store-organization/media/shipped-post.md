---
layout: future-post
title: "Shipped: STAC Store Per-Item Folder Reorganization"
date: 2026-01-29
track: [credibility]
author: Ian
reading_time: 4
tags: [040, stac, migration, tracer-bullet]
excerpt: "A migration function that safely reorganizes legacy STAC stores to per-item folder structure."
---

## What We Built

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
