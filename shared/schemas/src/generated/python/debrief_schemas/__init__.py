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
     'imports': ['linkml:types', 'common', 'geojson'],
     'name': 'debrief',
     'prefixes': {'debrief': {'prefix_prefix': 'debrief',
                              'prefix_reference': 'https://debrief.info/schemas/'},
                  'geojson': {'prefix_prefix': 'geojson',
                              'prefix_reference': 'https://purl.org/geojson/vocab#'},
                  'linkml': {'prefix_prefix': 'linkml',
                             'prefix_reference': 'https://w3id.org/linkml/'}},
     'source_file': '/home/user/debrief-future/shared/schemas/src/linkml/debrief.yaml',
     'title': 'Debrief Maritime Analysis Schemas'} )

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

    time: datetime  = Field(default=..., description="""Position timestamp (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition']} })
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
                       'ReferenceLocation'],
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
                       'ReferenceLocation'],
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
                       'ReferenceLocation'],
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

    platform_id: str = Field(default=..., description="""Platform/vessel identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    platform_name: Optional[str] = Field(default=None, description="""Human-readable platform name""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    track_type: TrackTypeEnum = Field(default=..., description="""Type of track""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    start_time: datetime  = Field(default=..., description="""Track start time (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    end_time: datetime  = Field(default=..., description="""Track end time (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    positions: list[TimestampedPosition] = Field(default=..., description="""Array of timestamped positions""", min_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    source_file: Optional[str] = Field(default=None, description="""Original source file path""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    color: Optional[str] = Field(default=None, description="""Display color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties', 'ReferenceLocationProperties']} })


class TrackFeature(ConfiguredBaseModel):
    """
    GeoJSON Feature representing a vessel track
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'TrackFeature',
                       'ReferenceLocation'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier (UUID recommended)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature', 'ReferenceLocation']} })
    geometry: GeoJSONLineString = Field(default=..., description="""Track path as GeoJSON LineString""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature', 'ReferenceLocation']} })
    properties: TrackProperties = Field(default=..., description="""Track metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature', 'ReferenceLocation']} })
    bbox: Optional[list[float]] = Field(default=[], description="""Bounding box [minLon, minLat, maxLon, maxLat]""", min_length=4, max_length=4, json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature']} })


class ReferenceLocationProperties(ConfiguredBaseModel):
    """
    Properties for a ReferenceLocation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    name: str = Field(default=..., description="""Reference location name""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })
    location_type: LocationTypeEnum = Field(default=..., description="""Type of reference""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })
    description: Optional[str] = Field(default=None, description="""Additional description""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })
    symbol: Optional[str] = Field(default=None, description="""Map symbol identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })
    color: Optional[str] = Field(default=None, description="""Display color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties', 'ReferenceLocationProperties']} })
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
                       'ReferenceLocation'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature', 'ReferenceLocation']} })
    geometry: GeoJSONPoint = Field(default=..., description="""Location (Point) or area (Polygon)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature', 'ReferenceLocation']} })
    properties: ReferenceLocationProperties = Field(default=..., description="""Reference metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature', 'ReferenceLocation']} })


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
