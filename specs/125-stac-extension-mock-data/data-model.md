# Data Model: STAC Extension + Mock Data Fixtures

**Feature**: 125-stac-extension-mock-data
**Date**: 2026-03-06

## Entity: StacExtensionProperties

Properties added to `item.properties` under the `debrief:` namespace.

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `debrief:vessel_classes` | `string[]` | No | `[]` | Aggregated from tracks. Slash-separated taxonomy path (e.g., `surface/warship/frigate/type23`). |
| `debrief:tags` | `string[]` | No | `[]` | Plot-level. Trimmed non-empty strings. No duplicates. |
| `debrief:feature_tags` | `string[]` | No | `[]` | Aggregated from all features. Union of per-feature tags. No duplicates. |
| `debrief:track_names` | `string[]` | No | `[]` | Aggregated from tracks. Names from `TrackProperties.platform_name`. |
| `debrief:nationalities` | `string[]` | No | `[]` | Aggregated from tracks. ISO 3166-1 alpha-2 codes only. Pattern: `^[A-Z]{2}$`. |

**Not stored**: `author` — derived from W3C PROV `LogEntry.agent` in feature provenance at query time (see research.md R7).

### Validation Rules

1. All arrays MUST NOT contain empty strings
2. All arrays MUST NOT contain duplicates
3. `debrief:vessel_classes` paths MUST contain only lowercase alphanumeric characters, hyphens, and forward slashes
4. `debrief:vessel_classes` paths MUST have 1-4 slash-separated segments (domain/role/class/type)
5. If `start_datetime` and `end_datetime` are both present, `end_datetime` >= `start_datetime`

### Relationships

- `debrief:track_names` corresponds to track features in the item's GeoJSON asset where `properties.kind == "TRACK"`
- `debrief:feature_tags` is the union of `properties.tags` arrays from all GeoJSON features
- `debrief:vessel_classes` corresponds to platform metadata on track features
- `debrief:nationalities` corresponds to nationality metadata on track features

## Entity: VesselTaxonomyNode

Hierarchical vessel classification. Not stored in STAC items directly — used to validate `debrief:vessel_classes` paths and populate filter dropdowns.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Slug format: lowercase, hyphens only (e.g., `type23`) |
| `label` | `string` | Yes | Human-readable display name (e.g., `Type 23 Frigate`) |
| `parent_path` | `string` | No | Slash-separated ancestor path (empty for root nodes) |
| `children` | `VesselTaxonomyNode[]` | No | Child nodes in the hierarchy |

### Starter Taxonomy Tree

```
surface/
├── warship/
│   ├── frigate/
│   │   ├── type23         → "Type 23 Frigate"
│   │   └── type26         → "Type 26 Frigate"
│   ├── destroyer/
│   │   ├── type45         → "Type 45 Destroyer"
│   │   └── arleigh-burke  → "Arleigh Burke Destroyer"
│   ├── carrier/
│   │   └── queen-elizabeth → "Queen Elizabeth Carrier"
│   ├── corvette/
│   │   └── visby          → "Visby Corvette"
│   └── patrol/
│       └── river          → "River-class OPV"
├── auxiliary/
│   ├── tanker/
│   │   └── tide           → "Tide-class Tanker"
│   ├── supply/
│   │   └── fort-victoria  → "Fort Victoria Supply"
│   └── survey/
│       └── echo           → "Echo-class Survey"
└── merchant/
    ├── cargo/
    │   ├── container      → "Container Ship"
    │   └── bulk           → "Bulk Carrier"
    ├── tanker/
    │   └── vlcc           → "VLCC Tanker"
    └── passenger/
        └── ferry          → "Passenger Ferry"
subsurface/
└── submarine/
    ├── ssn/
    │   ├── astute         → "Astute-class SSN"
    │   └── virginia       → "Virginia-class SSN"
    ├── ssbn/
    │   └── vanguard       → "Vanguard-class SSBN"
    └── ssk/
        └── gotland        → "Gotland-class SSK"
unknown/                    → "Unknown/Unclassified"
```

**Total**: 3 domains (surface, subsurface, unknown), 8 roles, 20 leaf types (including `unknown`)

## Entity: MockFixtureItem

A complete STAC 1.0.0 Item JSON file used for Storybook development.

| Field | Source | Notes |
|-------|--------|-------|
| `type` | Fixed `"Feature"` | STAC spec requirement |
| `stac_version` | Fixed `"1.0.0"` | Current STAC spec version |
| `stac_extensions` | `["https://debrief.info/stac-extensions/debrief/v1.0.0/schema.json"]` | Declares Debrief extension usage |
| `id` | Generated slug | e.g., `exercise-neptune-strike-2024` |
| `geometry` | Generated polygon | Bounding box polygon from `bbox` |
| `bbox` | Generated | Realistic ocean coordinates |
| `properties` | Mixed | Core STAC + Debrief extension properties |
| `links` | Generated | `root`, `parent`, `self` links |
| `assets` | Generated | `data` asset pointing to `.geojson` |

### Distribution Requirements (across 100 fixtures)

| Dimension | Target Distribution |
|-----------|-------------------|
| Duration buckets | `<6H`: ~15, `<24H`: ~25, `<72H`: ~30, `<10D`: ~20, `>10D`: ~10 |
| Geographic regions | North Atlantic: ~30, Mediterranean: ~25, Indo-Pacific: ~20, Arctic: ~10, South Atlantic: ~10, Indian Ocean: ~5 |
| Vessel class categories | Surface warship: ~45, Subsurface: ~20, Auxiliary: ~15, Merchant: ~10, Mixed: ~10 |
| Nationalities | GB: ~30, US: ~20, FR: ~15, DE: ~10, NO: ~8, SE: ~7, Other: ~10 |
| Tag count | 15-20 distinct plot-level tags |
| Track counts per item | 0 tracks: ~5, 1-2 tracks: ~30, 3-4 tracks: ~40, 5+ tracks: ~25 |
| Year range | 2020-2026 |

### Edge Case Fixtures (included in the 100)

| ID Pattern | Purpose |
|-----------|---------|
| `exercise-empty-plot-*` (3 items) | Zero tracks, no vessel classes, tests empty array handling |
| `exercise-multi-nation-*` (5 items) | 4+ nationalities, tests multi-value filter |
| `exercise-single-point-*` (3 items) | Single timestamp only (`datetime` set, no `start_datetime`/`end_datetime`) |
| `exercise-long-duration-*` (3 items) | 10+ day exercises |
| `exercise-dense-tracks-*` (3 items) | 5-8 tracks per plot |
