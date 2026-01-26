---
layout: future-post
title: "Planning: Unit Tests for STAC Service"
date: 2026-01-26
track: [momentum]
author: Ian
reading_time: 2
tags: [tech-debt, testing, stac]
excerpt: "Adding comprehensive tests to the service that manages all plot data storage"
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

## What We'd Love Feedback On

- Are there edge cases we're missing? The spec covers null geometries, missing files, and malformed JSON — what else has bitten you in STAC catalog handling?
- Should we enforce the >80% coverage threshold in CI, or leave it advisory for now?
