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
