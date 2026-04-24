---
title: "Building Unit Tests for STAC Service"
date: 2026-01-27
layout: future-post
author: Ian
track: credibility
excerpt: "64 unit tests now guard the service that manages all plot data storage"
---

## What We're Building

The STAC service is the backbone of plot data storage in Future Debrief. Every REP file import, every track color change, every plot listing goes through `stacService.ts`. Last week we discovered a bug where loading plot data returned an incomplete structure when no GeoJSON asset existed. The fix was simple, but the bug had been there for weeks.

The problem: our existing tests tested feature categorization logic by duplicating the service's code, not by actually calling the service. When the real implementation drifted, the tests kept passing.

We're adding proper unit tests that invoke the actual service methods with mocked file system operations. About 60 test cases covering all 10 public methods, targeting >80% code coverage.

## How It Fits

This is foundational reliability work. The STAC service sits between every user action and data persistence. If this service has edge cases that fail silently, users lose trust in their data — exactly what we can't afford in defence analysis.

The Constitution (Article VI) requires unit tests for all services. This makes the stacService compliant.

## Key Decisions

- **Inline mock data over fixture files** — keeps test intent co-located with test code
- **Test actual methods, not duplicated logic** — existing tests duplicated categorization logic rather than calling the service
- **Document current error handling, don't fix it** — the service has inconsistent patterns (null vs throw vs empty). Tests will document current behaviour; refactoring is a separate task.
- **Cache behaviour as explicit tests** — the service caches catalogs and items; we'll verify cache invalidation works correctly

Last week a bug slipped through. `loadPlotData()` returned an incomplete object when no GeoJSON asset existed - the code path nobody thought to test. The fix was five lines. The real problem was that our existing tests duplicated the service's categorization logic instead of calling the actual methods. When the real implementation drifted, the tests kept passing.

## Lessons Learned

The original test file (`stacService.shapes.test.ts`) tested feature categorization by reimplementing the logic in test code. That's a trap - when you duplicate logic in tests, you're not testing the actual implementation. You're testing your understanding of what the implementation should do.

The new approach mocks `fs.existsSync` and `fs.readFileSync`, then calls the real service methods. When the service code changes, the tests either pass (behaviour preserved) or fail (behaviour changed). No grey area.

Cache testing was worth the effort. The service caches catalogs and items for performance, and cache invalidation bugs are notoriously hard to catch in integration tests. Unit tests that count `fs.readFileSync` calls before and after cache operations caught several edge cases during development.

## What's Next

The STAC service is now the most thoroughly tested component in the VS Code extension. Next up: similar treatment for the session state service, which manages document-level state across the extension.

> [See the code](specs/028-stacservice-unit-tests/spec.md)
