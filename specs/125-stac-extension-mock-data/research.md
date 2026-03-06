# Research: STAC Extension Spec + Mock Data Fixtures

**Feature**: 125-stac-extension-mock-data
**Date**: 2026-03-06

## R1: STAC Extension Namespace and Property Naming Convention

### Decision
Use `debrief:` as the extension namespace prefix, consistent with existing usage (`debrief:toolId`, `debrief:sourceFeatures`, `debrief:snapshotTimestamp` in STAC assets).

### Rationale
- The project already uses `debrief:` prefixed properties in STAC asset metadata (see `stacService.ts` lines 736-800)
- STAC best practices recommend prefix-based naming to distinguish vendor/community properties (e.g., `eo:` for electro-optical, `sar:` for SAR)
- Lowercase, hyphen-separated identifiers recommended by STAC spec for searchable values
- No formal registry submission needed pre-v4.0.0 (Constitution Article XIV: Pre-Release Freedom)

### Alternatives Considered
1. **`vessel:` namespace** (from SRD section 6) — rejected because only one of several property groups; using domain-specific prefixes per group would fragment the namespace
2. **Unprefixed custom properties** — rejected because indistinguishable from future STAC core additions
3. **Full JSON-LD namespacing** — overkill for local STAC catalogs; STAC extensions don't require it

## R2: Extension Property Schema

### Decision
Define these properties in `item.properties` under `debrief:` prefix:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `debrief:vessel_classes` | `string[]` | No | Hierarchical vessel classification paths (e.g., `["surface/warship/frigate/type23"]`) |
| `debrief:tags` | `string[]` | No | Plot-level tags (free text labels) |
| `debrief:feature_tags` | `string[]` | No | Union of all feature-level tags from GeoJSON features |
| `debrief:author` | `string` | No | Creator/analyst who authored the plot |
| `debrief:track_names` | `string[]` | No | Names of all tracks in the plot |
| `debrief:nationalities` | `string[]` | No | Distinct nationalities of vessels in the plot |

### Rationale
- All properties optional: existing items without extension properties remain valid
- Arrays for multi-valued fields (a plot may have multiple vessel classes, tags, tracks)
- `vessel_classes` uses hierarchical path notation (`category/class/type`) enabling prefix matching for subtree queries
- `feature_tags` aggregated at item level for discoverability; authoritative per-feature tags remain in GeoJSON features
- Property names use snake_case per STAC convention (lowercase, underscores)

### Alternatives Considered
1. **Storing vessel class as a nested object** — rejected because STAC filter extensions (CQL2) work best with flat string matching and prefix queries
2. **Separate `debrief:vessel_category`, `debrief:vessel_class`, `debrief:vessel_type`** — rejected because it requires knowing taxonomy depth in advance; hierarchical paths are more flexible
3. **Combining plot tags and feature tags** — rejected because they serve different purposes (plot-level categorisation vs. feature-level annotation)

## R3: Duration Representation

### Decision
Duration is **computed at query/filter time** from `start_datetime` and `end_datetime`. It is NOT stored as a separate property.

### Rationale
- Avoids redundancy: duration is derivable from existing STAC core properties
- Avoids staleness: if temporal bounds are updated (features added/removed), a stored duration would need recalculation
- The SRD filter buckets (`<6H`, `<24H`, `<72H`, `<10D`, `>10D`) are range comparisons that work naturally on computed differences
- Client-side filter functions (for Storybook) can trivially compute `end - start` duration

### Alternatives Considered
1. **Stored `debrief:duration_seconds`** — rejected because it introduces a field that can become stale
2. **Stored duration bucket** — rejected because bucket definitions might change; better to compute dynamically

## R4: Vessel Taxonomy Structure

### Decision
Three-level hierarchy: **category > class > type**. Stored as slash-separated path strings in `debrief:vessel_classes` array.

Starter taxonomy for mock data:

```
surface/
  warship/
    frigate/type23, frigate/type26, destroyer/type45, destroyer/arleigh-burke
    carrier/queen-elizabeth, corvette/visby, patrol/river
  auxiliary/
    tanker/tide, supply/fort-victoria, survey/echo
  merchant/
    cargo/container, cargo/bulk, tanker/vlcc, passenger/ferry
subsurface/
  submarine/
    ssn/astute, ssn/virginia, ssbn/vanguard, ssk/gotland
```

### Rationale
- Three levels provide meaningful grouping without excessive depth
- Slash-separated paths enable prefix matching: searching `surface/warship` returns all warships
- 15+ leaf types provide variety for realistic mock data
- Taxonomy contents are development team's responsibility pre-v4.0.0 (SRD Open Item #3)

### Alternatives Considered
1. **Enum-based flat list** — rejected because no hierarchy support for subtree filtering
2. **4+ level hierarchy** — rejected as unnecessary complexity for current needs
3. **NATO STANAG vessel codes** — deferred; could be added as an alias mapping later

## R5: Fixture Generation Strategy

### Decision
Generate 100 fixture `item.json` files using a deterministic Python script with seeded random distributions. Fixtures live in `shared/schemas/fixtures/stac-browser/`.

### Rationale
- 100 items provide volume for list scrolling, map clustering, timeline density testing
- Deterministic generation (seeded RNG) ensures reproducibility (Constitution Article I.4)
- Python script can be re-run if schema changes, avoiding manual fixture maintenance
- `shared/schemas/fixtures/` is the established location for schema test fixtures
- Script is a dev tool, not production code, so lighter testing requirements

### Alternatives Considered
1. **Hand-written 10 fixtures** — rejected because 100 provides better coverage of edge cases and filter selectivity
2. **Random (non-seeded) generation** — rejected because non-reproducible violates Constitution
3. **Storing fixtures in `specs/125-*/`** — rejected; fixtures are reusable data, not feature-specific documentation

## R6: LinkML Schema Module Design

### Decision
Create `shared/schemas/src/linkml/stac-extension.yaml` defining the extension properties as a LinkML class, importable from `debrief.yaml`.

### Rationale
- Constitution Article II: LinkML is the single source of truth for data structures
- Existing pattern: each domain has its own YAML module (`common.yaml`, `geojson.yaml`, `annotations.yaml`, etc.)
- Generated Pydantic model enables validation of fixture files in CI
- Generated TypeScript types enable type-safe access in frontend code

### Alternatives Considered
1. **Adding to `common.yaml`** — rejected because STAC extension properties are a distinct concern from GeoJSON feature types
2. **Standalone JSON Schema only** — rejected because it violates single-source-of-truth principle
3. **No schema, just documentation** — rejected because it violates Constitution Article II
