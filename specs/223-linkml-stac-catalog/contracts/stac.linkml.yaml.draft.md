# Contract sketch: shared/schemas/src/linkml/stac.yaml
#
# This is NOT the final implementation file — it is a contract sketch
# showing class-level structure and slot ranges. The /speckit.implement
# phase produces the real `stac.yaml` from this sketch; deviations MUST
# be justified in the PR description and round-tripped through the
# schema-comparison + fixture-corpus tests (FR-006).
#
# Conventions:
# - Class names match the audit's TS names verbatim.
# - Slot names use STAC-spec on-disk field names verbatim (snake_case
#   is the STAC convention, not a project preference).
# - Inline comments cite the spec section, the Article XV exception,
#   or the audit row being closed.

```yaml
id: https://debrief.info/schemas/stac
name: stac
title: Debrief STAC Catalog Envelopes
description: >-
  LinkML schema for STAC 1.0 + 1.1 catalog and item envelopes
  persisted on disk by the Debrief Python regeneration pipeline and
  consumed by TypeScript readers (VS Code extension, web-shell). The
  schema accepts both STAC 1.0 and 1.1 payloads via additive
  optional fields — see spec.md §Edge Cases and Assumption A-001.

  Resolves audit #206 §3.1 rows attributed to #223 (5 hand-typed
  declarations across three source files) plus 7 R4-masked siblings
  in apps/vscode/src/types/stac.ts that share the same drift risk.

  Article XV exception: two open-record extension slots
  (StacItem.properties, StacAsset) retain
  `additional_properties: true` to preserve the STAC
  <namespace>:<key> extension convention — see spec.md §Edge Cases
  and the raw-geojson.yaml JsonObject precedent.

prefixes:
  linkml: https://w3id.org/linkml/
  debrief: https://debrief.info/schemas/
  stac: https://schemas.stacspec.org/v1.1.0/

default_prefix: debrief
default_range: string

imports:
  - linkml:types
  - geojson           # for the 7 GeoJSON geometry classes used by StacItem.geometry
  - stac-extension    # for StacExtensionProperties (mixin) + PlatformRecord

# ============================================================================
# Enums
# ============================================================================

enums:

  StacTypeEnum:
    description: >-
      Top-level discriminator for STAC objects. STAC spec mandates
      one of these three values for the root `type` field.
    permissible_values:
      Feature: {}
      Catalog: {}
      Collection: {}

# ============================================================================
# Group 1 — Envelopes (P1)
# ============================================================================
#
# Slot names match the live wire format as observed in
# preview/workspace/samples/local-store/ (STAC 1.1) and
# apps/vscode/test-data/local-store/ (STAC 1.0). Field presence varies
# across versions; the schema is the union — see Research R-005.

classes:

  StacItem:
    description: >-
      A STAC Item describing one Debrief plot. Persisted to
      <store>/<catalog>/<plot-slug>/item.json. Closes audit §3.1
      rows 58, 77, 84 and §3.2 StacItem drift cluster.
    attributes:
      type:
        range: StacTypeEnum
        required: true
        equals_string: Feature   # R-001 discriminator pattern
      stac_version:
        range: string
        required: true
        # R-005: accepted as string to cover "1.0.0" and "1.1.0" without
        # locking the schema to a specific minor version.
      stac_extensions:
        range: string
        multivalued: true
        required: false
      id:
        range: string
        required: true
      geometry:
        # Reuses the existing GeoJSON geometry classes from geojson.yaml.
        # The any_of pattern mirrors RawGeoJSONFeature.geometry — see
        # shared/schemas/src/generated/typescript/types.ts:1799.
        any_of:
          - range: GeoJSONPoint
          - range: GeoJSONEmptyPoint
          - range: GeoJSONLineString
          - range: GeoJSONPolygon
          - range: GeoJSONMultiPoint
          - range: GeoJSONMultiLineString
          - range: GeoJSONMultiPolygon
        required: true
      bbox:
        range: float
        multivalued: true
        minimum_cardinality: 4
        maximum_cardinality: 6
        required: true
      properties:
        range: StacItemProperties
        required: true
        inlined: true
      links:
        range: StacLink
        multivalued: true
        required: true
        inlined_as_list: true
      assets:
        range: StacAsset
        multivalued: true
        required: true
        inlined_as_dict: true   # Record<string, StacAsset>
      collection:
        range: string
        required: false   # STAC 1.1 — present when item belongs to a Collection

  StacItemProperties:
    description: >-
      Open-record properties block on a STAC Item. Composes
      StacExtensionProperties (mixin) for debrief:* keys; declares
      STAC-spec core fields explicitly; accepts arbitrary
      <namespace>:<key> extension keys via additional_properties.
    mixins:
      - StacExtensionProperties   # R-003
    additional_properties: true   # Article XV.2 exception — spec §Edge Cases
    attributes:
      datetime:
        range: string
        required: true
      start_datetime:
        range: string
        required: false
      end_datetime:
        range: string
        required: false
      title:
        range: string
        required: false
      description:
        range: string
        required: false
      license:
        range: string
        required: false
      providers:
        range: StacProvider
        multivalued: true
        required: false
        inlined_as_list: true
      created:
        range: string
        required: false
      updated:
        range: string
        required: false

  StacCatalog:
    description: >-
      Flat STAC Catalog (no extent, no summaries). Persisted to
      <store>/<catalog>/catalog.json. Closes audit §3.1 rows 59, 85
      and §3.2 StacCatalog drift cluster.
    attributes:
      type:
        range: StacTypeEnum
        required: true
        equals_string: Catalog
      stac_version:
        range: string
        required: true
      stac_extensions:
        range: string
        multivalued: true
        required: false
      id:
        range: string
        required: true
      title:
        range: string
        required: false
      description:
        range: string
        required: true
      links:
        range: StacLink
        multivalued: true
        required: true
        inlined_as_list: true

# ============================================================================
# Group 2 — Members (P2)
# ============================================================================

  StacLink:
    description: >-
      Link entry within links[]. Used by StacItem, StacCatalog,
      StacCollection. Closes R4-masked audit row 175.
    attributes:
      rel:
        range: string
        required: true
      href:
        range: string
        required: true
      type:
        range: string
        required: false
      title:
        range: string
        required: false

  StacAsset:
    description: >-
      Asset entry within assets[key] or item_assets[key]. Closes
      R4-masked audit row 176 + inline StacItemAssets at
      apps/vscode/src/services/sceneThumbnailService.ts:63.

      Open-record per R-002: the live fixtures carry extension keys
      (file:checksum, file:size, processing:datetime, proj:shape,
      debrief:provenance). `additional_properties: true` permits
      these without rejection. Article XV.2 exception.
    additional_properties: true   # Article XV.2 exception
    attributes:
      href:
        range: string
        required: true
      type:
        range: string
        required: false
      title:
        range: string
        required: false
      description:
        range: string
        required: false
      roles:
        range: string
        multivalued: true
        required: false

# ============================================================================
# Group 3 — Collection family (P3)
# ============================================================================

  StacCollection:
    description: >-
      STAC 1.1 Collection extending the flat Catalog with extent,
      summaries, license, providers. Persisted to
      <store>/<catalog>/catalog.json when the store has been
      upgraded to STAC 1.1. Closes R4-masked audit row 179.
    attributes:
      type:
        range: StacTypeEnum
        required: true
        equals_string: Collection
      stac_version:
        range: string
        required: true
      stac_extensions:
        range: string
        multivalued: true
        required: false
      id:
        range: string
        required: true
      title:
        range: string
        required: false
      description:
        range: string
        required: true
      license:
        range: string
        required: true   # STAC 1.1 mandates on Collections
      extent:
        range: StacExtent
        required: true
        inlined: true
      summaries:
        range: StacSummaries
        required: false
        inlined: true
      providers:
        range: StacProvider
        multivalued: true
        required: false
        inlined_as_list: true
      item_assets:
        range: StacAsset
        multivalued: true
        required: false
        inlined_as_dict: true
      links:
        range: StacLink
        multivalued: true
        required: true
        inlined_as_list: true

  StacExtent:
    description: >-
      Spatial + temporal extent of a Collection. Closes R4-masked
      audit row 177.
    attributes:
      spatial:
        range: StacSpatialExtent
        required: true
        inlined: true
      temporal:
        range: StacTemporalExtent
        required: true
        inlined: true

  StacSpatialExtent:
    description: >-
      Spatial extent — array of bboxes. STAC permits multiple
      bboxes for disjoint coverage (e.g. one per continent).
    attributes:
      bbox:
        # List-of-lists modelling: LinkML has no native construct for
        # this shape; the wire format is list[list[float]] (4-or-6
        # element bboxes). The LinkML stays vanilla `multivalued:
        # true, range: float` (which generators emit as flat
        # `list[float]` / `number[]`), and `shared/schemas/scripts/
        # generate.py` adds a per-class fix-up entry that nests the
        # generated type to `list[list[float]]` / `number[][]`.
        # See research.md R-011 — same pattern is used today for
        # GeoJSONLineString, GeoJSONPolygon, and friends.
        range: float
        multivalued: true
        required: true

  StacTemporalExtent:
    description: >-
      Temporal extent — array of intervals. STAC permits multiple
      intervals for non-contiguous coverage.
    attributes:
      interval:
        # Same pattern as StacSpatialExtent.bbox — vanilla LinkML;
        # nesting (and the `string | null` widening for STAC's
        # "open-ended interval" null sentinel) applied via
        # generate.py post-processing. See research.md R-011.
        range: string
        multivalued: true
        required: true

  StacSummaries:
    description: >-
      Pre-aggregated extension summaries on a Collection. Re-uses
      PlatformRecord from stac-extension.yaml. Accepts arbitrary
      extension summary keys via additional_properties. Closes
      R4-masked audit row 178.
    additional_properties: true   # Article XV.2 exception
    attributes:
      'debrief:platforms':
        range: PlatformRecord
        multivalued: true
        required: false
        inlined_as_list: true
        slot_uri: debrief:platforms
      'debrief:tags':
        range: string
        multivalued: true
        required: false
        slot_uri: debrief:tags
      'debrief:feature_tags':
        range: string
        multivalued: true
        required: false
        slot_uri: debrief:feature_tags

  StacProvider:
    description: >-
      Provider entry within Collection.providers[]. STAC 1.1
      addition. Present in live fixtures — see R-006.
    attributes:
      name:
        range: string
        required: true
      description:
        range: string
        required: false
      roles:
        range: string
        multivalued: true
        required: false
      url:
        range: string
        required: false
```

## TypeScript / Python aliases produced by `gen-typescript` / `gen-pydantic`

The generators produce one `.ts` file and one `.py` module per LinkML
file. After the schema build:

- `shared/schemas/src/generated/typescript/types.ts` gains 8 new
  exports: `StacItem`, `StacItemProperties`, `StacCatalog`, `StacLink`,
  `StacAsset`, `StacCollection`, `StacExtent`, `StacSpatialExtent`,
  `StacTemporalExtent`, `StacSummaries`, `StacProvider`, plus
  `StacTypeEnum`.
- `shared/schemas/src/generated/python/debrief_schemas/__init__.py`
  gains the equivalent Pydantic exports.

In addition, the implementation creates the **TS-only union alias** at
`shared/schemas/src/typescript/aliases/stac-unions.ts`:

```ts
import type { StacCatalog, StacCollection } from '../generated/typescript/types';

export type StacCatalogOrCollection = StacCatalog | StacCollection;
```

(re-exported from the `@debrief/schemas` barrel — see
`shared/schemas/src/typescript/index.ts`).

The Python equivalent at
`shared/schemas/src/generated/python/debrief_schemas/aliases/stac_unions.py`:

```python
from __future__ import annotations
from typing import Union
from debrief_schemas import StacCatalog, StacCollection

StacCatalogOrCollection = Union[StacCatalog, StacCollection]
```

Both aliases are re-exports from generated code so the audit's R4 rule
classifies them as `schema-rooted`.
