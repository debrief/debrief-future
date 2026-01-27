---
layout: future-post
title: "Shipped: Unit Tests for STAC Service"
date: 2026-01-27
track: [credibility]
author: Ian
reading_time: 2
tags: [tech-debt, testing, stac]
excerpt: "64 unit tests now guard the service that manages all plot data storage"
---

## What We Built

Last week a bug slipped through. `loadPlotData()` returned an incomplete object when no GeoJSON asset existed - the code path nobody thought to test. The fix was five lines. The real problem was that our existing tests duplicated the service's categorization logic instead of calling the actual methods. When the real implementation drifted, the tests kept passing.

We added 64 unit tests that invoke actual `StacService` methods with mocked file system operations. The tests cover all 10 public methods - from `validateStorePath()` through `loadPlotData()` to `saveTrackColors()`.

Coverage hit 97% on stacService.ts. More importantly, the specific bug case is now tested: when there's no GeoJSON asset, `loadPlotData()` returns `{ tracks: [], locations: [], otherFeatures: [] }`, not undefined.

## Lessons Learned

The original test file (`stacService.shapes.test.ts`) tested feature categorization by reimplementing the logic in test code. That's a trap - when you duplicate logic in tests, you're not testing the actual implementation. You're testing your understanding of what the implementation should do.

The new approach mocks `fs.existsSync` and `fs.readFileSync`, then calls the real service methods. When the service code changes, the tests either pass (behaviour preserved) or fail (behaviour changed). No grey area.

Cache testing was worth the effort. The service caches catalogs and items for performance, and cache invalidation bugs are notoriously hard to catch in integration tests. Unit tests that count `fs.readFileSync` calls before and after cache operations caught several edge cases during development.

## What's Next

The STAC service is now the most thoroughly tested component in the VS Code extension. Next up: similar treatment for the session state service, which manages document-level state across the extension.

> [See the code](specs/028-stacservice-unit-tests/spec.md)
