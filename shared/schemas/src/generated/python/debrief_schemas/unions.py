"""DebriefFeature union type — canonical Python union of all GeoJSON feature types.

This module is hand-maintained (not auto-generated) because LinkML's gen-pydantic
does not emit discriminated unions. The union covers every feature kind that can
appear in a Debrief GeoJSON FeatureCollection.
"""

from __future__ import annotations

from typing import Union

from debrief_schemas import (
    CircleAnnotation,
    LineAnnotation,
    MultiPointFeature,
    MultiPolygonFeature,
    NarrativeEntry,
    PolyAnnotation,
    RectangleAnnotation,
    ReferenceLocation,
    StacCatalog,
    StacCollection,
    SystemState,
    TextAnnotation,
    TrackFeature,
    VectorAnnotation,
)

DebriefFeature = Union[
    TrackFeature,
    ReferenceLocation,
    NarrativeEntry,
    CircleAnnotation,
    RectangleAnnotation,
    LineAnnotation,
    TextAnnotation,
    VectorAnnotation,
    PolyAnnotation,
    MultiPointFeature,
    MultiPolygonFeature,
    SystemState,
]
"""Union of all Debrief GeoJSON feature types.

Use this instead of ``dict[str, Any]`` for domain feature data.
For runtime discrimination, check ``feature.properties.kind`` against
``FeatureKindEnum`` or use ``FEATURE_MODEL_MAP`` from ``debrief_schemas.validation``.
"""


StacCatalogOrCollection = Union[StacCatalog, StacCollection]
"""STAC root-object union — `catalog.json` is either a flat Catalog or
a STAC 1.1 Collection. Discriminate via the ``type`` field
(``"Catalog"`` vs ``"Collection"``).

This module is hand-maintained (not auto-generated): LinkML's
gen-pydantic emits the two concrete classes but does not produce a
named union. Mirrors the TS-only alias at
``shared/schemas/src/typescript/aliases/stac-unions.ts``.
"""
