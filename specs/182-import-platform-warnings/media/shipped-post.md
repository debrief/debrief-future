---
layout: future-post
title: "Shipped: Import Handler Warnings for Unregistered Platforms"
date: 2026-04-13
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, import-pipeline, e10-catalog-discovery, platform-registry]
excerpt: "Added validation to the import pipeline that warns when platform IDs aren't in the registry — imports always succeed regardless."
---

## What We Shipped

When analysts import legacy data files (REP or DPF format), the import handler now validates each extracted platform ID against the platform registry. If a platform isn't registered, the result includes an advisory warning — but the import always completes successfully.

The validation runs after each file parses. If the registry can't load (missing or corrupt), the import still proceeds with a single fallback warning. This keeps the import non-blocking while giving analysts visibility into registry coverage gaps.

## How It Works

Inside `import_catalog.py`, after each file parses, we call `_validate_platform_ids()` to check extracted platform IDs against the registry. The function:

- Loads the registry at import start (once per import session)
- Iterates through each feature's `platform_id` value
- Skips empty or whitespace-only IDs (no warning)
- Looks up each ID in the registry (case-sensitive, matching existing behaviour)
- Accumulates warnings for unregistered platforms
- Deduplicates: one warning per unique platform ID per source file, regardless of how many positions reference that platform

The warning includes the platform ID, source file name, and registry status. Analysts can filter warnings programmatically by code (`UNREGISTERED_PLATFORM` or `REGISTRY_UNAVAILABLE`) for downstream handling.

## Test Coverage

17 tests pass without regression:

| | |
|---|---|
| Unit tests | 9 |
| Integration tests | 8 |
| Scenario coverage | All 4 user stories (warnings, non-blocking, deduplication, file context) |
| Case sensitivity | Verified — "nelson" vs "NELSON" produces correct warnings |
| Edge cases | Empty IDs, whitespace, mixed registered/unregistered, registry unavailable |
| Existing tests | 344 tests continue to pass |

Key scenarios verified:

- Unregistered platform IDs produce `UNREGISTERED_PLATFORM` warnings with correct file attribution
- Imports always succeed regardless of registry coverage
- Multiple position records for one platform produce exactly one warning per source file
- Registry load failure produces a single `REGISTRY_UNAVAILABLE` warning; validation is skipped, import continues

## What's Next

This is item 3 of 11 in E10 (NL-Assisted Catalog Discovery). Next up:

- **#183 (Save-Time Resolution)** — enrich tracks with full platform metadata (nationality, vessel class) when saving to the catalog
- **#184 (Catalog Regeneration)** — rebuild existing catalogs to backfill platform metadata

→ [See the implementation](https://github.com/debrief/debrief/pull/182)
