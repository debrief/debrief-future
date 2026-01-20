from __future__ import annotations

import re
import sys
from datetime import (
    date,
    datetime,
    time
)
from decimal import Decimal
from enum import Enum
from typing import (
    Any,
    ClassVar,
    Literal,
    Optional,
    Union
)

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    RootModel,
    SerializationInfo,
    SerializerFunctionWrapHandler,
    field_validator,
    model_serializer
)


metamodel_version = "None"
version = "None"


class ConfiguredBaseModel(BaseModel):
    model_config = ConfigDict(
        serialize_by_alias = True,
        validate_by_name = True,
        validate_assignment = True,
        validate_default = True,
        extra = "forbid",
        arbitrary_types_allowed = True,
        use_enum_values = True,
        strict = False,
    )

    @model_serializer(mode='wrap', when_used='unless-none')
    def treat_empty_lists_as_none(
            self, handler: SerializerFunctionWrapHandler,
            info: SerializationInfo) -> dict[str, Any]:
        if info.exclude_none:
            _instance = self.model_copy()
            for field, field_info in type(_instance).model_fields.items():
                if getattr(_instance, field) == [] and not(
                        field_info.is_required()):
                    setattr(_instance, field, None)
        else:
            _instance = self
        return handler(_instance, info)



class LinkMLMeta(RootModel):
    root: dict[str, Any] = {}
    model_config = ConfigDict(frozen=True)

    def __getattr__(self, key:str):
        return getattr(self.root, key)

    def __getitem__(self, key:str):
        return self.root[key]

    def __setitem__(self, key:str, value):
        self.root[key] = value

    def __contains__(self, key:str) -> bool:
        return key in self.root


linkml_meta = LinkMLMeta({'default_prefix': 'debrief',
     'default_range': 'string',
     'description': 'LinkML schemas for Debrief v4.x maritime tactical analysis '
                    'platform. Defines GeoJSON profile extensions for tracks and '
                    'reference locations. This is a tracer bullet implementation '
                    'covering core entity types.',
     'id': 'https://debrief.info/schemas/debrief',
     'imports': ['linkml:types', 'common', 'geojson', 'annotations'],
     'name': 'debrief',
     'prefixes': {'debrief': {'prefix_prefix': 'debrief',
                              'prefix_reference': 'https://debrief.info/schemas/'},
                  'geojson': {'prefix_prefix': 'geojson',
                              'prefix_reference': 'https://purl.org/geojson/vocab#'},
                  'linkml': {'prefix_prefix': 'linkml',
                             'prefix_reference': 'https://w3id.org/linkml/'}},
     'source_file': 'C:\\git\\debrief-future\\shared\\schemas\\src\\linkml\\debrief.yaml',
     'title': 'Debrief Maritime Analysis Schemas'} )

class FeatureKindEnum(str, Enum):
    """
    Discriminator for GeoJSON feature types
    """
    TRACK = "TRACK"
    """
    Vessel track (LineString geometry)
    """
    POINT = "POINT"
    """
    Reference point/location (Point geometry)
    """
    NARRATIVE = "NARRATIVE"
    """
    Timestamped narrative/log entry (no geometry)
    """
    CIRCLE = "CIRCLE"
    """
    Circle annotation (Polygon geometry, center+radius in properties)
    """
    RECTANGLE = "RECTANGLE"
    """
    Rectangle annotation (Polygon geometry)
    """
    LINE = "LINE"
    """
    Line annotation (LineString geometry)
    """
    TEXT = "TEXT"
    """
    Text annotation at a position (Point geometry)
    """
    VECTOR = "VECTOR"
    """
    Vector annotation (LineString geometry, origin+range+bearing in properties)
    """


class TrackTypeEnum(str, Enum):
    """
    Type of track feature
    """
    OWNSHIP = "OWNSHIP"
    """
    Own ship track
    """
    CONTACT = "CONTACT"
    """
    Contact/target track
    """
    REFERENCE = "REFERENCE"
    """
    Reference track
    """
    SOLUTION = "SOLUTION"
    """
    Solution/analysis track
    """


class LocationTypeEnum(str, Enum):
    """
    Type of reference location
    """
    WAYPOINT = "WAYPOINT"
    """
    Navigation waypoint
    """
    EXERCISE_AREA = "EXERCISE_AREA"
    """
    Exercise area boundary
    """
    DANGER_AREA = "DANGER_AREA"
    """
    Danger/exclusion zone
    """
    ANCHORAGE = "ANCHORAGE"
    """
    Anchorage location
    """
    PORT = "PORT"
    """
    Port/harbor
    """
    REFERENCE = "REFERENCE"
    """
    Generic reference point
    """



class TimestampedPosition(ConfiguredBaseModel):
    """
    A position with timestamp and optional kinematic data
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/common'})

    time: datetime  = Field(default=..., description="""Position timestamp (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition', 'NarrativeEntryProperties']} })
    coordinates: list[float] = Field(default=..., description="""[longitude, latitude] in degrees""", min_length=2, max_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition',
                       'GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon']} })
    depth: Optional[float] = Field(default=None, description="""Depth in meters (negative = below surface)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition']} })
    course: Optional[float] = Field(default=None, description="""Course in degrees (0-360)""", ge=0, le=360, json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition']} })
    speed: Optional[float] = Field(default=None, description="""Speed in knots""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition']} })


class GeoJSONPoint(ConfiguredBaseModel):
    """
    GeoJSON Point geometry
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Point"] = Field(default=..., description="""Geometry type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation'],
         'equals_string': 'Point'} })
    coordinates: list[float] = Field(default=..., description="""[longitude, latitude] in degrees""", min_length=2, max_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition',
                       'GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon']} })


class GeoJSONLineString(ConfiguredBaseModel):
    """
    GeoJSON LineString geometry
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["LineString"] = Field(default=..., description="""Geometry type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation'],
         'equals_string': 'LineString'} })
    coordinates: list[float] = Field(default=..., description="""Array of [longitude, latitude] pairs""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition',
                       'GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon']} })


class GeoJSONPolygon(ConfiguredBaseModel):
    """
    GeoJSON Polygon geometry
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Polygon"] = Field(default=..., description="""Geometry type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation'],
         'equals_string': 'Polygon'} })
    coordinates: list[float] = Field(default=..., description="""Array of linear rings (arrays of [lon, lat] pairs)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition',
                       'GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon']} })


class TrackProperties(ConfiguredBaseModel):
    """
    Properties for a TrackFeature
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    kind: Literal["TRACK"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties'],
         'equals_string': 'TRACK'} })
    platform_id: str = Field(default=..., description="""Platform/vessel identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    platform_name: Optional[str] = Field(default=None, description="""Human-readable platform name""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    track_type: TrackTypeEnum = Field(default=..., description="""Type of track""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    start_time: datetime  = Field(default=..., description="""Track start time (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    end_time: datetime  = Field(default=..., description="""Track end time (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    positions: list[TimestampedPosition] = Field(default=..., description="""Array of timestamped positions""", min_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    source_file: Optional[str] = Field(default=None, description="""Original source file path""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    color: Optional[str] = Field(default=None, description="""Display color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })


class TrackFeature(ConfiguredBaseModel):
    """
    GeoJSON Feature representing a vessel track
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier (UUID recommended)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    geometry: GeoJSONLineString = Field(default=..., description="""Track path as GeoJSON LineString""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    properties: TrackProperties = Field(default=..., description="""Track metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    bbox: Optional[list[float]] = Field(default=[], description="""Bounding box [minLon, minLat, maxLon, maxLat]""", min_length=4, max_length=4, json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature']} })


class ReferenceLocationProperties(ConfiguredBaseModel):
    """
    Properties for a ReferenceLocation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    kind: Literal["POINT"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties'],
         'equals_string': 'POINT'} })
    name: str = Field(default=..., description="""Reference location name""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })
    location_type: LocationTypeEnum = Field(default=..., description="""Type of reference""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })
    description: Optional[str] = Field(default=None, description="""Additional description""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })
    symbol: Optional[str] = Field(default=None, description="""Map symbol identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    color: Optional[str] = Field(default=None, description="""Display color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    valid_from: Optional[datetime ] = Field(default=None, description="""Start of validity period""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })
    valid_until: Optional[datetime ] = Field(default=None, description="""End of validity period""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })


class ReferenceLocation(ConfiguredBaseModel):
    """
    GeoJSON Feature for fixed reference points
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    geometry: GeoJSONPoint = Field(default=..., description="""Location (Point) or area (Polygon)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    properties: ReferenceLocationProperties = Field(default=..., description="""Reference metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })


class NarrativeEntryProperties(ConfiguredBaseModel):
    """
    Properties for a NarrativeEntry annotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["NARRATIVE"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties'],
         'equals_string': 'NARRATIVE'} })
    time: datetime  = Field(default=..., description="""Narrative timestamp (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition', 'NarrativeEntryProperties']} })
    text: str = Field(default=..., description="""Narrative text content""", json_schema_extra = { "linkml_meta": {'domain_of': ['NarrativeEntryProperties', 'TextAnnotationProperties']} })
    track_id: Optional[str] = Field(default=None, description="""Associated track identifier (optional)""", json_schema_extra = { "linkml_meta": {'domain_of': ['NarrativeEntryProperties']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    color: Optional[str] = Field(default=None, description="""Display color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    source_file: Optional[str] = Field(default=None, description="""Original source file path""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })


class NarrativeEntry(ConfiguredBaseModel):
    """
    GeoJSON Feature for timestamped narrative/log entries. Narratives are operator notes associated with a timestamp and optionally a track. Geometry is optional (Point for display position, or null).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    geometry: Optional[GeoJSONPoint] = Field(default=None, description="""Optional display position (Point) or null""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    properties: NarrativeEntryProperties = Field(default=..., description="""Narrative metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })


class CircleAnnotationProperties(ConfiguredBaseModel):
    """
    Properties for a CircleAnnotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["CIRCLE"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties'],
         'equals_string': 'CIRCLE'} })
    center: list[float] = Field(default=..., description="""Circle center as [longitude, latitude] for precise reconstruction""", min_length=2, max_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['CircleAnnotationProperties']} })
    radius: float = Field(default=..., description="""Circle radius in meters for precise reconstruction""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['CircleAnnotationProperties']} })
    label: Optional[str] = Field(default=None, description="""Annotation label text""", json_schema_extra = { "linkml_meta": {'domain_of': ['CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    color: Optional[str] = Field(default=None, description="""Display color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    source_file: Optional[str] = Field(default=None, description="""Original source file path""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })


class CircleAnnotation(ConfiguredBaseModel):
    """
    GeoJSON Feature for circle annotations. Geometry is a Polygon approximating the circle (vertices at regular intervals). Properties contain center and radius for precise reconstruction and smooth rendering.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    geometry: GeoJSONPolygon = Field(default=..., description="""Circle as Polygon (approximated with vertices, e.g., every 45 degrees)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    properties: CircleAnnotationProperties = Field(default=..., description="""Circle metadata including center and radius for reconstruction""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })


class RectangleAnnotationProperties(ConfiguredBaseModel):
    """
    Properties for a RectangleAnnotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["RECTANGLE"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties'],
         'equals_string': 'RECTANGLE'} })
    label: Optional[str] = Field(default=None, description="""Annotation label text""", json_schema_extra = { "linkml_meta": {'domain_of': ['CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    color: Optional[str] = Field(default=None, description="""Display color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    source_file: Optional[str] = Field(default=None, description="""Original source file path""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })


class RectangleAnnotation(ConfiguredBaseModel):
    """
    GeoJSON Feature for rectangle annotations. Geometry is a Polygon with 4 corners (plus closing point).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    geometry: GeoJSONPolygon = Field(default=..., description="""Rectangle as Polygon (4 corners + close)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    properties: RectangleAnnotationProperties = Field(default=..., description="""Rectangle metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })


class LineAnnotationProperties(ConfiguredBaseModel):
    """
    Properties for a LineAnnotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["LINE"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties'],
         'equals_string': 'LINE'} })
    label: Optional[str] = Field(default=None, description="""Annotation label text""", json_schema_extra = { "linkml_meta": {'domain_of': ['CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    color: Optional[str] = Field(default=None, description="""Display color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    source_file: Optional[str] = Field(default=None, description="""Original source file path""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })


class LineAnnotation(ConfiguredBaseModel):
    """
    GeoJSON Feature for line segment annotations. Geometry is a LineString with 2 points (start and end).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    geometry: GeoJSONLineString = Field(default=..., description="""Line as LineString (2 points)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    properties: LineAnnotationProperties = Field(default=..., description="""Line metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })


class TextAnnotationProperties(ConfiguredBaseModel):
    """
    Properties for a TextAnnotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["TEXT"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties'],
         'equals_string': 'TEXT'} })
    text: str = Field(default=..., description="""Text content to display""", json_schema_extra = { "linkml_meta": {'domain_of': ['NarrativeEntryProperties', 'TextAnnotationProperties']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    color: Optional[str] = Field(default=None, description="""Display color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    source_file: Optional[str] = Field(default=None, description="""Original source file path""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })


class TextAnnotation(ConfiguredBaseModel):
    """
    GeoJSON Feature for text annotations at a position. Geometry is the Point where text should be displayed.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    geometry: GeoJSONPoint = Field(default=..., description="""Text display position""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    properties: TextAnnotationProperties = Field(default=..., description="""Text metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })


class VectorAnnotationProperties(ConfiguredBaseModel):
    """
    Properties for a VectorAnnotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["VECTOR"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties'],
         'equals_string': 'VECTOR'} })
    origin: list[float] = Field(default=..., description="""Vector origin as [longitude, latitude] for precise reconstruction""", min_length=2, max_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['VectorAnnotationProperties']} })
    range: float = Field(default=..., description="""Vector length/range in meters for precise reconstruction""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['VectorAnnotationProperties']} })
    bearing: float = Field(default=..., description="""Vector bearing in degrees (0-360, from north) for precise reconstruction""", ge=0, le=360, json_schema_extra = { "linkml_meta": {'domain_of': ['VectorAnnotationProperties']} })
    label: Optional[str] = Field(default=None, description="""Annotation label text""", json_schema_extra = { "linkml_meta": {'domain_of': ['CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    color: Optional[str] = Field(default=None, description="""Display color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })
    source_file: Optional[str] = Field(default=None, description="""Original source file path""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties']} })


class VectorAnnotation(ConfiguredBaseModel):
    """
    GeoJSON Feature for vector annotations. Geometry is a LineString from origin to endpoint (computed from range/bearing). Properties contain origin, range, and bearing for precise reconstruction.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    geometry: GeoJSONLineString = Field(default=..., description="""Vector as LineString (origin to computed endpoint)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })
    properties: VectorAnnotationProperties = Field(default=..., description="""Vector metadata including origin, range, and bearing for reconstruction""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation']} })


# Model rebuild
# see https://pydantic-docs.helpmanual.io/usage/models/#rebuilding-a-model
TimestampedPosition.model_rebuild()
GeoJSONPoint.model_rebuild()
GeoJSONLineString.model_rebuild()
GeoJSONPolygon.model_rebuild()
TrackProperties.model_rebuild()
TrackFeature.model_rebuild()
ReferenceLocationProperties.model_rebuild()
ReferenceLocation.model_rebuild()
NarrativeEntryProperties.model_rebuild()
NarrativeEntry.model_rebuild()
CircleAnnotationProperties.model_rebuild()
CircleAnnotation.model_rebuild()
RectangleAnnotationProperties.model_rebuild()
RectangleAnnotation.model_rebuild()
LineAnnotationProperties.model_rebuild()
LineAnnotation.model_rebuild()
TextAnnotationProperties.model_rebuild()
TextAnnotation.model_rebuild()
VectorAnnotationProperties.model_rebuild()
VectorAnnotation.model_rebuild()
