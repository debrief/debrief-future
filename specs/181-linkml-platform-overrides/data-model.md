# Data Model: LinkML Per-Platform Override Fields

**Feature**: 181-linkml-platform-overrides  
**Date**: 2026-04-13

## Entity Changes

### Modified: TrackProperties (geojson.yaml)

TrackProperties gains six optional override fields. These are **analyst-set overrides** -- they are only populated when the analyst explicitly provides values that differ from the platform registry. When absent, downstream consumers resolve the values from the registry at runtime.

**New fields** (all optional, appended after existing fields):

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| `display_name` | string | None | Human-readable name (e.g., "HMS Nelson"). Overrides registry `name`. |
| `nationality` | string | `^[A-Z]{2}$` | ISO 3166-1 alpha-2 country code. Overrides registry `nationality`. |
| `vessel_class` | string | `^[a-z0-9-]+(/[a-z0-9-]+){0,3}$` | Full taxonomy path (e.g., "surface/warship/frigate/type23"). Overrides registry-derived path. |
| `vessel_type` | string | `^[a-z0-9-]+$` | Leaf of class path (e.g., "type23"). Overrides registry-derived type. |
| `vessel_role` | string | `^[a-z0-9-]+$` | Parent of leaf (e.g., "frigate"). Overrides registry-derived role. |
| `domain` | VesselDomainEnum | surface, subsurface, unknown | First segment of class path. Overrides registry-derived domain. |

**Existing fields unchanged**: `kind`, `platform_id`, `platform_name`, `track_type`, `start_time`, `end_time`, `positions`, `style`, `default_position_style`, `symbol_interval`, `label_interval`, `position_style_overrides`, `segments`, `sensors`, `tuas` (inherited: `tags`, `provenance`).

### New: PlatformRecord (stac-extension.yaml)

Represents fully-resolved metadata for a single platform within a STAC item. Produced by the save-time resolution handler (#183) by merging registry lookups with analyst-set overrides.

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|-------------|
| `id` | string | Yes | None | Platform identifier (e.g., "NELSON"). Matches `platform_id` on TrackProperties. |
| `name` | string | No | None | Human-readable name (e.g., "HMS Nelson"). |
| `nationality` | string | No | `^[A-Z]{2}$` | ISO 3166-1 alpha-2 country code. |
| `vessel_class` | string | No | `^[a-z0-9-]+(/[a-z0-9-]+){0,3}$` | Full taxonomy path. |
| `vessel_type` | string | No | `^[a-z0-9-]+$` | Leaf of class path. |
| `vessel_role` | string | No | `^[a-z0-9-]+$` | Parent of leaf. |
| `domain` | VesselDomainEnum | No | surface, subsurface, unknown | Vessel domain classification. |

**Sparsity rule**: Only `id` is required. A record with only `id` is valid -- this represents an unregistered platform with no registry data and no analyst overrides.

### Modified: StacExtensionProperties (stac-extension.yaml)

**Added**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platforms` | PlatformRecord[] | No | Fully-resolved per-platform metadata array. Each entry represents one platform in the plot with merged registry + override data. |

**Removed** (replaced by `platforms`):

| Field | Reason |
|-------|--------|
| `vessel_classes` | Flat list of taxonomy paths -- now `platforms[].vessel_class` |
| `nationalities` | Flat list of country codes -- now `platforms[].nationality` |
| `track_names` | Flat list of track names -- now `platforms[].name` |

**Retained** (not platform-related):
- `tags` -- plot-level tags (independent of platforms)
- `feature_tags` -- union of feature-level tags (independent of platforms)

### Modified: StacItemSummary (stac-extension.yaml)

**Added**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platforms` | PlatformRecord[] | No | Same structure as StacExtensionProperties.platforms. Carried on the summary for filtering. |

**Removed** (same three fields as StacExtensionProperties):
- `vessel_classes`, `nationalities`, `track_names`

**Retained**: `id`, `title`, `datetime`, `item_path`, `catalog_id`, `store_id`, `bbox`, `start_datetime`, `end_datetime`, `tags`, `feature_tags`, `platforms`.

## Enum Changes

### Moved: VesselDomainEnum (common.yaml <-- stac-extension.yaml)

Relocated from `stac-extension.yaml` to `common.yaml` to enable cross-module use. Definition unchanged.

| Value | Description |
|-------|-------------|
| `surface` | Surface vessels (warships, auxiliaries, merchant) |
| `subsurface` | Subsurface vessels (submarines) |
| `unknown` | Vessel domain not determined or not applicable |

## Relationships

```
TrackProperties (geojson.yaml)
  ├── platform_id: string (required, existing -- key for registry lookup)
  ├── display_name: string (optional, NEW -- override)
  ├── nationality: string (optional, NEW -- override)
  ├── vessel_class: string (optional, NEW -- override)
  ├── vessel_type: string (optional, NEW -- override)
  ├── vessel_role: string (optional, NEW -- override)
  └── domain: VesselDomainEnum (optional, NEW -- override)

PlatformRecord (stac-extension.yaml)
  ├── id: string (required -- matches platform_id)
  ├── name: string (optional)
  ├── nationality: string (optional)
  ├── vessel_class: string (optional)
  ├── vessel_type: string (optional)
  ├── vessel_role: string (optional)
  └── domain: VesselDomainEnum (optional)

StacExtensionProperties.platforms → PlatformRecord[]
StacItemSummary.platforms → PlatformRecord[]
```

## Validation Rules

1. `nationality` pattern `^[A-Z]{2}$` enforces ISO 3166-1 alpha-2 format (exactly 2 uppercase letters).
2. `vessel_class` pattern `^[a-z0-9-]+(/[a-z0-9-]+){0,3}$` enforces 1-4 lowercase path segments separated by `/`.
3. `vessel_type` and `vessel_role` pattern `^[a-z0-9-]+$` enforces a single lowercase segment.
4. `domain` constrained to VesselDomainEnum permissible values.
5. All new fields are optional -- omission is valid and expected for the common case (no overrides).
6. PlatformRecord `id` is the only required field in the record.
