# Data Model: Import Handler Warnings for Unregistered Platforms

**Feature**: 182-import-platform-warnings  
**Date**: 2026-04-13

## Overview

This feature introduces no new data entities. It uses the existing `ImportWarning` model and `PlatformRegistry` API to validate platform IDs during import. This document describes the existing entities and the new warning codes.

## Existing Entities (No Changes)

### ImportWarning

**Location**: `services/io/src/debrief_io/models.py`

| Field | Type | Description |
|-------|------|-------------|
| `file` | `str` | Relative path to the source file that produced the warning |
| `code` | `str` | Machine-readable warning code for programmatic filtering |
| `message` | `str` | Human-readable description of the warning |

### ImportResult

**Location**: `services/io/src/debrief_io/models.py`

Contains `warnings: list[ImportWarning]` — warnings are accumulated in-place during import. This feature appends to this list; no structural changes needed.

### PlatformRegistry

**Location**: `shared/data/src/debrief_data/registry.py`

Used via `resolve(platform_id: str) -> ResolvedPlatform | None`. Returns `None` for unregistered platforms. Already fully implemented in #180.

### ResolvedPlatform

**Location**: `shared/data/src/debrief_data/registry.py`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` | Platform identifier (e.g., "NELSON") |
| `name` | `str` | Full name (e.g., "HMS Nelson") |
| `nationality` | `str` | ISO 3166-1 alpha-2 code |
| `vessel_class` | `str` | Full taxonomy path (e.g., "surface/warship/frigate/type23") |
| `vessel_type` | `str` | Leaf of class path (e.g., "type23") |
| `vessel_role` | `str` | Parent of leaf (e.g., "frigate") |
| `domain` | `str` | First segment (e.g., "surface") |
| `short_name` | `str \| None` | Abbreviated name (e.g., "NLSN") |

## New Warning Codes

| Code | Emitted When | Cardinality | Example Message |
|------|-------------|-------------|-----------------|
| `UNREGISTERED_PLATFORM` | A unique `platform_id` from a parsed file is not found in the registry | Once per unregistered platform ID per source file | `Platform 'PHANTOM' is not registered in the platform registry` |
| `REGISTRY_UNAVAILABLE` | The platform registry fails to load (missing file or invalid content) | Once per import call (not per file) | `Platform registry could not be loaded: [error detail]. Platform validation skipped.` |

## Validation Flow

```
import_legacy_data(source_dir, catalog_path)
│
├── registry = load_registry()  # Once at start
│   └── On failure: registry = None, emit REGISTRY_UNAVAILABLE warning
│
└── For each source file:
    ├── parse_result = parse(source_file)
    ├── _validate_platform_ids(features, file_rel, registry, warnings)
    │   ├── Collect unique non-empty platform_ids from features
    │   ├── For each unique ID: registry.resolve(id)
    │   └── If None: append ImportWarning(UNREGISTERED_PLATFORM)
    └── [existing: create STAC plot, write features, merge sensors]
```

## Data Relationships

```
Source File (REP/DPF)
  └─ contains Track(s)
       └─ each has platform_id (string)
              │
              ├── resolve against PlatformRegistry
              │     ├── Found: no action (platform is registered)
              │     └── Not found: emit ImportWarning(UNREGISTERED_PLATFORM)
              │
              └── written to features.geojson properties.platform_id
                  (unchanged — this feature does not modify feature output)
```
