# Data Model: Nuke and Regenerate Sample Catalog

**Feature**: 184-regenerate-sample-catalog  
**Date**: 2026-04-13

## Overview

This feature introduces no new data models. It regenerates existing data using models already defined by features #180 (Platform Registry), #181 (LinkML Platform Overrides), and #182 (Import Platform Warnings). This document describes the target state of the regenerated data.

## Entities (existing, unchanged)

### STAC Item (`item.json`)

Each regenerated item follows the existing STAC Item schema with the debrief extension.

**Target properties** (after regeneration):

| Property | Type | Source | Notes |
|----------|------|--------|-------|
| `title` | string | Enrichment script | Exercise-themed name |
| `description` | string | Enrichment script | Domain + platform summary |
| `datetime` | ISO 8601 | Import pipeline | From parsed track data |
| `start_datetime` | ISO 8601 | Import pipeline | Earliest feature timestamp |
| `end_datetime` | ISO 8601 | Import pipeline | Latest feature timestamp |
| `debrief:platforms` | PlatformRecord[] | Enrichment script | Structured array, replaces flat fields |
| `debrief:tags` | string[] | Enrichment script | Exercise/domain tags |
| `debrief:feature_tags` | string[] | Enrichment script | Feature-level tags |

**Removed properties** (must NOT appear after regeneration):

| Property | Replaced by |
|----------|-------------|
| `debrief:vessel_classes` | `debrief:platforms[].vessel_class` |
| `debrief:nationalities` | `debrief:platforms[].nationality` |
| `debrief:track_names` | `debrief:platforms[].name` |

### PlatformRecord (existing, defined in #181)

Each entry in the `debrief:platforms` array:

| Field | Type | Required | Source |
|-------|------|----------|--------|
| `id` | string | Yes | Track's `platform_id` |
| `name` | string | No | Registry or enrichment |
| `nationality` | string | No | Registry or enrichment (ISO 3166-1 alpha-2) |
| `vessel_class` | string | No | Enrichment (slash-delimited path, e.g., `surface/warship/frigate/type23`) |
| `vessel_type` | string | No | Derived (leaf of vessel_class path) |
| `vessel_role` | string | No | Derived (parent of leaf) |
| `domain` | string | No | Derived (first segment: `surface` or `subsurface`) |

### Platform Registry (`shared/data/platform-registry.json`)

Hierarchical tree of vessel classes with platform instances as leaves. No changes needed for this feature — the registry already contains the 10 known legacy platforms.

### Collection Summaries (`catalog.json`)

After regeneration, the catalog's `summaries` section contains:

| Property | Type | Aggregation |
|----------|------|-------------|
| `debrief:platforms` | PlatformRecord[] | Deduplicated by `id` (first-seen wins) |
| `debrief:tags` | string[] | Union of all item tags, sorted |
| `debrief:feature_tags` | string[] | Union of all item feature_tags, sorted |

## State Transitions

```
[Current State]                    [After Regeneration]
item.json with flat fields    -->  item.json with debrief:platforms
  debrief:vessel_classes             (flat fields absent)
  debrief:nationalities
  debrief:track_names

catalog.json with mixed       -->  catalog.json with clean summaries
  summaries (old + new)              debrief:platforms only
```

## Validation Rules

1. Every `item.json` MUST have `debrief:platforms` as an array (may be empty for items with no tracks).
2. Every PlatformRecord MUST have a non-empty `id` field.
3. No `item.json` may contain `debrief:vessel_classes`, `debrief:nationalities`, or `debrief:track_names`.
4. The `stac_extensions` array MUST include the debrief extension URI.
5. All items MUST validate against the LinkML-generated JSON Schema.
